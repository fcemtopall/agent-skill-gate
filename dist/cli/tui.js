import * as p from '@clack/prompts';
import pc from 'picocolors';
import { SkillCatalog } from '../core/catalog.js';
export async function showSkillSelector(stateManager) {
    console.clear();
    p.intro(pc.bgCyan(pc.black(' AGENT SKILL GATE ')));
    const allSkills = SkillCatalog.getSkills();
    const builtInCount = SkillCatalog.builtInCount;
    if (builtInCount > 0) {
        p.log.success(pc.dim(`${builtInCount} adet yerleşik CLI komutu aktif ve kilitli.`));
    }
    // Sadece kullanıcının önceden bilerek açtığı skilleri getir
    const activeIds = stateManager.getActiveSkills();
    const options = allSkills.map((skill) => {
        return {
            value: skill.id,
            label: pc.bold(skill.name),
            hint: `${pc.dim(skill.description)} ${pc.yellow(`[~${skill.estimatedTokens} tok]`)}`
        };
    });
    const selected = await p.multiselect({
        message: `Açmak veya kapatmak istediğiniz 3rd-party yetenekleri belirleyin:`,
        options: options,
        initialValues: activeIds, // Öneri yok, ne açıksa sadece o seçili gelir
        required: false
    });
    if (p.isCancel(selected)) {
        p.cancel('İşlem iptal edildi.');
        process.exit(0);
    }
    const newSelectedIds = selected;
    // Kullanıcının manuel seçimine göre state'i güncelle
    for (const skill of allSkills) {
        const shouldBeActive = newSelectedIds.includes(skill.id);
        const isCurrentlyActive = stateManager.isSkillActive(skill.id);
        if (shouldBeActive !== isCurrentlyActive) {
            stateManager.toggleSkill(skill.id);
        }
    }
    const totalTokens = allSkills
        .filter(s => newSelectedIds.includes(s.id))
        .reduce((acc, curr) => acc + curr.estimatedTokens, 0);
    p.note(`Seçilen Yetenek Sayısı: ${pc.green(newSelectedIds.length.toString())} / ${allSkills.length}\nTahmini Token Yükü: ${pc.yellow(`~${totalTokens} token`)}`, 'Mevcut Durum');
    p.outro(pc.green('✓ Seçimler diske işlendi.'));
}
