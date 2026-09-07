import * as p from '@clack/prompts';
import pc from 'picocolors';
import { StateManager } from '../core/state-manager.js';
import { AVAILABLE_SKILLS } from '../core/mock-skills.js';

export async function showSkillSelector(stateManager: StateManager): Promise<void> {
  // Ekranı temizle ve başlık at
  console.clear();
  p.intro(pc.bgCyan(pc.black(' AGENT SKILL GATEWAY ')));

  const activeIds = stateManager.getActiveSkills();

  // Seçenek listesini hazırla
  const options = AVAILABLE_SKILLS.map((skill) => {
    return {
      value: skill.id,
      label: pc.bold(skill.name),
      // Altta görünecek 1 satırlık net açıklama
      hint: `${pc.dim(skill.description)} ${pc.yellow(`[~${skill.estimatedTokens} tok]`)}`
    };
  });

  // Çoklu seçim kutusu
  const selected = await p.multiselect({
    message: 'Bu oturumda aktif olacak agent skillerini seçin:',
    options: options,
    initialValues: activeIds,
    required: false
  });

  // Kullanıcı Ctrl+C veya iptal yaparsa
  if (p.isCancel(selected)) {
    p.cancel('İşlem iptal edildi.');
    process.exit(0);
  }

  // State'i güncelle: Mevcut aktifleri yeni seçilenlerle eşitle
  const newSelectedIds = selected as string[];
  
  // Eskiden olup şimdi olmayanları kapat, yeni eklenenleri aç
  for (const skill of AVAILABLE_SKILLS) {
    const shouldBeActive = newSelectedIds.includes(skill.id);
    const isCurrentlyActive = stateManager.isSkillActive(skill.id);

    if (shouldBeActive !== isCurrentlyActive) {
      stateManager.toggleSkill(skill.id);
    }
  }

  // Toplam harcanacak yaklaşık context token'ı hesapla
  const totalTokens = AVAILABLE_SKILLS
    .filter(s => newSelectedIds.includes(s.id))
    .reduce((acc, curr) => acc + curr.estimatedTokens, 0);

  p.note(
    `Aktif Skill Sayısı: ${pc.green(newSelectedIds.length.toString())}\nTahmini Token Yükü: ${pc.yellow(`~${totalTokens} token`)}`,
    'Oturum Yapılandırması'
  );

  p.outro(pc.green('✓ Skiller başarıyla güncellendi!'));
}