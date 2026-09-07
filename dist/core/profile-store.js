import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
export class ProfileStore {
    configDir;
    filePath;
    constructor() {
        this.configDir = path.join(os.homedir(), '.agent-skill-gate');
        this.filePath = path.join(this.configDir, 'profiles.json');
        this.ensureFile();
    }
    ensureFile() {
        if (!fs.existsSync(this.configDir)) {
            fs.mkdirSync(this.configDir, { recursive: true });
        }
        if (!fs.existsSync(this.filePath)) {
            const defaults = [
                {
                    id: 'mvp-builder',
                    name: '🚀 Seri Girişim / MVP',
                    description: 'Hızlı prototipleme, hafif araçlar ve temel iş akışları devrede.',
                    skillIds: []
                }
            ];
            fs.writeFileSync(this.filePath, JSON.stringify(defaults, null, 2), 'utf-8');
        }
    }
    getProfiles() {
        try {
            const raw = fs.readFileSync(this.filePath, 'utf-8');
            return JSON.parse(raw);
        }
        catch {
            return [];
        }
    }
    saveProfile(profile) {
        const profiles = this.getProfiles();
        const index = profiles.findIndex(p => p.id === profile.id);
        if (index >= 0) {
            profiles[index] = profile;
        }
        else {
            profiles.push(profile);
        }
        fs.writeFileSync(this.filePath, JSON.stringify(profiles, null, 2), 'utf-8');
    }
    deleteProfile(profileId) {
        const profiles = this.getProfiles().filter(p => p.id !== profileId);
        fs.writeFileSync(this.filePath, JSON.stringify(profiles, null, 2), 'utf-8');
    }
}
