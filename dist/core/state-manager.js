import fs from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';
export class StateManager extends EventEmitter {
    configPath;
    state;
    constructor(projectRoot) {
        super();
        this.configPath = path.join(projectRoot, '.agent-skills.json');
        this.state = this.loadState();
        this.watchFile();
    }
    // Dosyayı oku; dosya yoksa veya bozuksa güvenli varsayılana dön
    loadState() {
        if (!fs.existsSync(this.configPath)) {
            const defaultState = {
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
                return parsed;
            }
        }
        catch {
            // Disaster Pattern: Bozuk dosya okunursa hata fırlatmak yerine güvenli fallback üret
            console.warn(`[UYARI] .agent-skills.json bozuk veya okunamadı, varsayılan profil yükleniyor.`);
        }
        return {
            version: "1.0.0",
            activeSkillIds: [],
            updatedAt: new Date().toISOString()
        };
    }
    writeState(newState) {
        try {
            fs.writeFileSync(this.configPath, JSON.stringify(newState, null, 2), 'utf-8');
        }
        catch (err) {
            console.error('[HATA] .agent-skills.json yazılamadı:', err);
        }
    }
    watchFile() {
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
    getActiveSkills() {
        return [...this.state.activeSkillIds];
    }
    isSkillActive(skillId) {
        return this.state.activeSkillIds.includes(skillId);
    }
    toggleSkill(skillId) {
        const exists = this.state.activeSkillIds.includes(skillId);
        if (exists) {
            this.state.activeSkillIds = this.state.activeSkillIds.filter(id => id !== skillId);
        }
        else {
            this.state.activeSkillIds.push(skillId);
        }
        this.state.updatedAt = new Date().toISOString();
        this.writeState(this.state);
        this.emit('change', this.state);
        return !exists; // Yeni durum: açık mı kapalı mı?
    }
}
