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
                // Hata durumunda varsayılan yapıya dön
            }
        }
        return {
            version: '1.1.0',
            activeSkillIds: [],
            branchProfiles: {},
            branchStates: {},
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
    // --- Branch Memory API ---
    saveBranchSnapshot(branch, skillIds) {
        if (!this.state.branchStates) {
            this.state.branchStates = {};
        }
        this.state.branchStates[branch] = [...skillIds];
        this.state.activeSkillIds = [...skillIds];
        this.saveState();
    }
    getBranchSnapshot(branch) {
        if (this.state.branchStates && Array.isArray(this.state.branchStates[branch])) {
            return [...this.state.branchStates[branch]];
        }
        return null;
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
    resolveProfileForBranch(branchName) {
        const mappings = this.getBranchMappings();
        if (mappings[branchName])
            return mappings[branchName];
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
