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
    }
    loadState() {
        if (fs.existsSync(this.configPath)) {
            try {
                const content = fs.readFileSync(this.configPath, 'utf-8');
                return JSON.parse(content);
            }
            catch {
                // Hatalı veya bozuk json durumunda default'a düş
            }
        }
        return {
            version: '1.1.0',
            activeSkillIds: [],
            branchProfiles: {},
            updatedAt: new Date().toISOString()
        };
    }
    saveState() {
        this.state.updatedAt = new Date().toISOString();
        fs.writeFileSync(this.configPath, JSON.stringify(this.state, null, 2), 'utf-8');
        this.emit('stateChanged', this.state);
    }
    getActiveSkills() {
        return [...this.state.activeSkillIds];
    }
    isSkillActive(skillId) {
        return this.state.activeSkillIds.includes(skillId);
    }
    setActiveSkills(skillIds) {
        this.state.activeSkillIds = [...skillIds];
        this.saveState();
    }
    toggleSkill(skillId) {
        const index = this.state.activeSkillIds.indexOf(skillId);
        let isActive = false;
        if (index >= 0) {
            this.state.activeSkillIds.splice(index, 1);
            isActive = false;
        }
        else {
            this.state.activeSkillIds.push(skillId);
            isActive = true;
        }
        this.saveState();
        return isActive;
    }
    // --- Branch Profile Mapping API ---
    getBranchMappings() {
        return this.state.branchProfiles || {};
    }
    setBranchMapping(pattern, profileId) {
        if (!this.state.branchProfiles) {
            this.state.branchProfiles = {};
        }
        this.state.branchProfiles[pattern] = profileId;
        this.saveState();
    }
    removeBranchMapping(pattern) {
        if (this.state.branchProfiles && this.state.branchProfiles[pattern]) {
            delete this.state.branchProfiles[pattern];
            this.saveState();
        }
    }
    // Aktif branch için geçerli bir profil var mı? (Wildcard destekli)
    resolveProfileForBranch(branchName) {
        const mappings = this.getBranchMappings();
        // 1. Birebir eşleşme
        if (mappings[branchName])
            return mappings[branchName];
        // 2. Wildcard eşleşmeleri (örn: feat/* -> feat/login)
        for (const [pattern, profileId] of Object.entries(mappings)) {
            if (pattern.endsWith('*')) {
                const prefix = pattern.slice(0, -1);
                if (branchName.startsWith(prefix)) {
                    return profileId;
                }
            }
        }
        return null;
    }
}
