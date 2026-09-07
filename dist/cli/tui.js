import * as p from '@clack/prompts';
import pc from 'picocolors';
import { AVAILABLE_SKILLS } from '../core/mock-skills.js';
import { ProjectDiscovery } from '../core/discovery.js';
export async function showSkillSelector(stateManager) {
    console.clear();
    p.intro(pc.bgCyan(pc.black(' AGENT SKILL GATE ')));
    // Proje stack taramasını yap
    const discovery = new ProjectDiscovery(process.cwd());
    const { recommendedSkillIds, reasons } = discovery.analyze();
    const activeIds = stateManager.getActiveSkills();
    // İlk defa çalışıyorsa ve aktif skill yoksa, önerilenleri varsayılan olarak seç
    const initialSelections = activeIds.length === 0 ? recommendedSkillIds : activeIds;
    const options = AVAILABLE_SKILLS.map((skill) => {
        const isRecommended = recommendedSkillIds.includes(skill.id);
        const badge = isRecommended ? pc.bgGreen(pc.black(' ÖNERİLEN ')) + ' ' : '';
        const reasonText = isRecommended ? ` ↳ ${pc.italic(reasons[skill.id])}` : '';
        return {
            value: skill.id,
            label: `${badge}${pc.bold(skill.name)}`,
            hint: `${pc.dim(skill.description)} ${pc.yellow(`[~${skill.estimatedTokens} tok]`)}${reasonText ? pc.cyan(reasonText) : ''}`
        };
    });
    const selected = await p.multiselect({
        message: 'Bu oturumda aktif olacak agent skillerini seçin:',
        options: options,
        initialValues: initialSelections,
        required: false
    });
    if (p.isCancel(selected)) {
        p.cancel('İşlem iptal edildi.');
        process.exit(0);
    }
    const newSelectedIds = selected;
    for (const skill of AVAILABLE_SKILLS) {
        const shouldBeActive = newSelectedIds.includes(skill.id);
        const isCurrentlyActive = stateManager.isSkillActive(skill.id);
        if (shouldBeActive !== isCurrentlyActive) {
            stateManager.toggleSkill(skill.id);
        }
    }
    const totalTokens = AVAILABLE_SKILLS
        .filter(s => newSelectedIds.includes(s.id))
        .reduce((acc, curr) => acc + curr.estimatedTokens, 0);
    p.note(`Aktif Skill Sayısı: ${pc.green(newSelectedIds.length.toString())}\nTahmini Token Yükü: ${pc.yellow(`~${totalTokens} token`)}`, 'Oturum Yapılandırması');
    p.outro(pc.green('✓ Skiller başarıyla güncellendi!'));
}
