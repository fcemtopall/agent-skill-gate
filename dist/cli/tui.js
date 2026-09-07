import * as p from '@clack/prompts';
import pc from 'picocolors';
import { PluginScanner } from '../harvester/scanner.js';
import { PROFILES } from '../core/profiles.js';
export async function showSkillSelector(stateManager) {
    console.clear();
    p.intro(pc.bgCyan(pc.black(' AGENT SKILL GATE ')));
    const scanner = new PluginScanner();
    const { manageable, builtInCount, details } = scanner.scanManageable();
    if (builtInCount > 0) {
        p.log.success(pc.dim(`${builtInCount} adet yerleşik CLI komutu aktif ve koruma altında.`));
    }
    // 1. Adım: Çalışma Modu / Profil Seçimi
    const modeOptions = [
        ...PROFILES.map(prof => ({
            value: prof.id,
            label: prof.label,
            hint: prof.description
        })),
        {
            value: 'custom',
            label: '⚙️ Özel Yapılandırma (Manuel Seçim)',
            hint: 'Yetenekleri tek tek checkbox listesinden seçin.'
        }
    ];
    const selectedMode = await p.select({
        message: 'Çalışma modunu belirleyin:',
        options: modeOptions
    });
    if (p.isCancel(selectedMode)) {
        p.cancel('İşlem iptal edildi.');
        process.exit(0);
    }
    let finalSelectedIds = [];
    // 2. Adım: Mod Mantığına Göre ID Belirleme
    if (selectedMode !== 'custom') {
        const profile = PROFILES.find(p => p.id === selectedMode);
        finalSelectedIds = details
            .filter(cap => profile.filter(cap))
            .map(cap => cap.id);
    }
    else {
        // Manuel seçim ekranı
        const activeIds = stateManager.getActiveSkills();
        const options = manageable.map((skill) => ({
            value: skill.id,
            label: pc.bold(skill.name),
            hint: `${pc.dim(skill.description)} ${pc.yellow(`[~${skill.estimatedTokens} tok]`)}`
        }));
        const manualSelected = await p.multiselect({
            message: 'Aktif etmek istediğiniz yetenekleri belirleyin:',
            options: options,
            initialValues: activeIds,
            required: false
        });
        if (p.isCancel(manualSelected)) {
            p.cancel('İşlem iptal edildi.');
            process.exit(0);
        }
        finalSelectedIds = manualSelected;
    }
    // State senkronizasyonu
    for (const skill of manageable) {
        const shouldBeActive = finalSelectedIds.includes(skill.id);
        const isCurrentlyActive = stateManager.isSkillActive(skill.id);
        if (shouldBeActive !== isCurrentlyActive) {
            stateManager.toggleSkill(skill.id);
        }
    }
    const totalTokens = manageable
        .filter(s => finalSelectedIds.includes(s.id))
        .reduce((acc, curr) => acc + curr.estimatedTokens, 0);
    p.note(`Aktif 3rd-Party: ${pc.green(finalSelectedIds.length.toString())} / ${manageable.length}\nTahmini Token Yükü: ${pc.yellow(`~${totalTokens} token`)}`, 'Yapılandırma Tamamlandı');
    p.outro(pc.green('✓ Seçilen mod başarıyla diske işlendi.'));
}
