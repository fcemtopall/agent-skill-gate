import * as p from '@clack/prompts';
import pc from 'picocolors';
import { PluginScanner } from '../harvester/scanner.js';
import { PROFILES } from '../core/profiles.js';
import { ProfileStore } from '../core/profile-store.js';
export async function showSkillSelector(stateManager) {
    console.clear();
    p.intro(pc.bgCyan(pc.black(' AGENT SKILL GATE ')));
    const scanner = new PluginScanner();
    const { manageable, builtInCount, details } = scanner.scanManageable();
    const profileStore = new ProfileStore();
    if (builtInCount > 0) {
        p.log.success(pc.dim(`${builtInCount} adet yerleşik CLI komutu aktif ve koruma altında.`));
    }
    const userProfiles = profileStore.getProfiles();
    // Menü Seçenekleri
    const menuOptions = [
        ...PROFILES.map(prof => ({
            value: `builtin:${prof.id}`,
            label: prof.label,
            hint: prof.description
        })),
        ...userProfiles.map(u => ({
            value: `custom:${u.id}`,
            label: pc.cyan(u.name),
            hint: `${u.description} (${u.skillIds.length} yetenek)`
        })),
        {
            value: 'action:create',
            label: pc.green('➕ Yeni Özel Profil Oluştur'),
            hint: 'Belirlediğiniz skilleri bir profil olarak kaydedin.'
        },
        {
            value: 'action:manual',
            label: '⚙️ Tek Seferlik Manuel Seçim',
            hint: 'Kayıt yapmadan anlık checkbox listesini açar.'
        }
    ];
    const selection = await p.select({
        message: 'Çalışma modunu veya profilinizi belirleyin:',
        options: menuOptions
    });
    if (p.isCancel(selection)) {
        p.cancel('İşlem iptal edildi.');
        process.exit(0);
    }
    const choice = selection;
    let targetSkillIds = [];
    // 1. Yeni Profil Oluşturma Akışı
    if (choice === 'action:create') {
        const profileName = await p.text({
            message: 'Profil Adı:',
            placeholder: 'örn: 🚀 Seri Girişim / MVP',
            validate: (v) => (!v.trim() ? 'Profil adı boş bırakılamaz.' : undefined)
        });
        if (p.isCancel(profileName))
            return;
        const profileDesc = await p.text({
            message: 'Profil Açıklaması:',
            placeholder: 'örn: MVP aşamasında hızlı ilerlemek için seçili araçlar.'
        });
        if (p.isCancel(profileDesc))
            return;
        const skillChoices = await p.multiselect({
            message: 'Bu profile dahil edilecek yetenekleri seçin:',
            options: manageable.map(s => ({
                value: s.id,
                label: s.name,
                hint: `${s.description} [~${s.estimatedTokens} tok]`
            }))
        });
        if (p.isCancel(skillChoices))
            return;
        const newProfile = {
            id: profileName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
            name: profileName,
            description: profileDesc || 'Özel kullanıcı profili.',
            skillIds: skillChoices
        };
        profileStore.saveProfile(newProfile);
        p.log.success(pc.green(`'${newProfile.name}' profili başarıyla kaydedildi!`));
        targetSkillIds = newProfile.skillIds;
    }
    // 2. Kullanıcı Özel Profilini Uygulama
    else if (choice.startsWith('custom:')) {
        const profileId = choice.replace('custom:', '');
        const profile = userProfiles.find(u => u.id === profileId);
        if (profile) {
            targetSkillIds = profile.skillIds;
        }
    }
    // 3. Sistem Dahili Modları
    else if (choice.startsWith('builtin:')) {
        const builtinId = choice.replace('builtin:', '');
        const profile = PROFILES.find(p => p.id === builtinId);
        targetSkillIds = details
            .filter(cap => profile.filter(cap))
            .map(cap => cap.id);
    }
    // 4. Manuel Anlık Seçim
    else {
        const activeIds = stateManager.getActiveSkills();
        const manualSelected = await p.multiselect({
            message: 'Aktif edilecek yetenekleri belirleyin:',
            options: manageable.map(s => ({
                value: s.id,
                label: s.name,
                hint: `${s.description} [~${s.estimatedTokens} tok]`
            })),
            initialValues: activeIds,
            required: false
        });
        if (p.isCancel(manualSelected))
            return;
        targetSkillIds = manualSelected;
    }
    // State senkronizasyonu
    for (const skill of manageable) {
        const shouldBeActive = targetSkillIds.includes(skill.id);
        const isCurrentlyActive = stateManager.isSkillActive(skill.id);
        if (shouldBeActive !== isCurrentlyActive) {
            stateManager.toggleSkill(skill.id);
        }
    }
    const totalTokens = manageable
        .filter(s => targetSkillIds.includes(s.id))
        .reduce((acc, curr) => acc + curr.estimatedTokens, 0);
    p.note(`Aktif Yetenek: ${pc.green(targetSkillIds.length.toString())} / ${manageable.length}\nTahmini Token Yükü: ${pc.yellow(`~${totalTokens} token`)}`, 'Yapılandırma Uygulandı');
    p.outro(pc.green('✓ Seçimler başarıyla senkronize edildi.'));
}
