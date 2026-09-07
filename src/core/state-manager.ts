import fs from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { ProjectSkillState } from './types.js';

export class StateManager extends EventEmitter {
  private configPath: string;
  private state: ProjectSkillState;

  constructor(projectRoot: string) {
    super();
    this.configPath = path.join(projectRoot, '.agent-skills.json');
    this.state = this.loadState();
    this.watchFile();
  }

  // Dosyayı oku; dosya yoksa veya bozuksa güvenli varsayılana dön
  private loadState(): ProjectSkillState {
    if (!fs.existsSync(this.configPath)) {
      const defaultState: ProjectSkillState = {
        version: "1.0.0",
        activeSkillIds: [],
        updatedAt: new Date().toISOString()
      };
      this.writeState(defaultState);
      return defaultState;
    }

    try {
      const raw = fs.readFileSync(this.configPath, 'utf-8');
      const parsed = JSON.parse(raw);

      // Veri şeması doğrulaması
      if (Array.isArray(parsed.activeSkillIds)) {
        return parsed as ProjectSkillState;
      }
    } catch {
      // Disaster Pattern: Bozuk dosya okunursa hata fırlatmak yerine güvenli fallback üret
      console.warn(`[UYARI] .agent-skills.json bozuk veya okunamadı, varsayılan profil yükleniyor.`);
    }

    return {
      version: "1.0.0",
      activeSkillIds: [],
      updatedAt: new Date().toISOString()
    };
  }

  private writeState(newState: ProjectSkillState): void {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(newState, null, 2), 'utf-8');
    } catch (err) {
      console.error('[HATA] .agent-skills.json yazılamadı:', err);
    }
  }

  private watchFile(): void {
    // Harici değişiklikleri (örn. VS Code eklentisi tarafından güncellendiğinde) 300ms aralıkla kontrol et
    fs.watchFile(this.configPath, { interval: 300 }, () => {
      const fresh = this.loadState();
      // Yalnızca aktif ID listesi gerçekten değiştiyse event tetikle
      if (JSON.stringify(fresh.activeSkillIds) !== JSON.stringify(this.state.activeSkillIds)) {
        this.state = fresh;
        this.emit('change', this.state);
      }
    });
  }

  public getActiveSkills(): string[] {
    return [...this.state.activeSkillIds];
  }

  public isSkillActive(skillId: string): boolean {
    return this.state.activeSkillIds.includes(skillId);
  }

  public toggleSkill(skillId: string): boolean {
    const exists = this.state.activeSkillIds.includes(skillId);
    if (exists) {
      this.state.activeSkillIds = this.state.activeSkillIds.filter(id => id !== skillId);
    } else {
      this.state.activeSkillIds.push(skillId);
    }

    this.state.updatedAt = new Date().toISOString();
    this.writeState(this.state);
    this.emit('change', this.state);

    return !exists; // Yeni durum: açık mı kapalı mı?
  }
}