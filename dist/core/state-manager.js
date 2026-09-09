import fs from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';
export class StateManager extends EventEmitter {
    configPath;
    state;
    constructor(projectRoot) {
        super();
        this.configPath = path.resolve(projectRoot, '.agent-skills.json');
        this.state = this.loadState();
    }
    reload() {
        this.state = this.loadState();
        return this.state;
    }
    loadState() {
        if (fs.existsSync(this.configPath)) {
            try {
                const content = fs.readFileSync(this.configPath, 'utf-8');
                return JSON.parse(content);
            }
            catch (e) {
                // Parse hatası olursa
            }
        }
        const defaultState = {
            version: '1.1.0',
            activeSkillIds: [],
            branchProfiles: {
                "feat/*": "prototyping"
            },
            branchStates: {},
            updatedAt: new Date().toISOString()
        };
        // Dosya yoksa hemen oluştur
        try {
            fs.writeFileSync(this.configPath, JSON.stringify(defaultState, null, 2), 'utf-8');
        }
        catch { }
        return defaultState;
    }
    saveState() {
        this.state.updatedAt = new Date().toISOString();
        try {
            fs.writeFileSync(this.configPath, JSON.stringify(this.state, null, 2), 'utf-8');
        }
        catch (err) {
            console.error('Failed to write .agent-skills.json:', err);
        }
        this.emit('stateChanged', this.state);
    }
    getActiveSkills() {
        this.reload();
        return [...this.state.activeSkillIds];
    }
    isSkillActive(skillId) {
        this.reload();
        return this.state.activeSkillIds.includes(skillId);
    }
    setActiveSkills(skillIds) {
        this.reload();
        this.state.activeSkillIds = [...skillIds];
        this.saveState();
    }
    // --- Branch Memory API ---
    saveBranchSnapshot(branch, skillIds) {
        this.reload();
        if (!this.state.branchStates) {
            this.state.branchStates = {};
        }
        this.state.branchStates[branch] = [...skillIds];
        this.state.activeSkillIds = [...skillIds];
        this.saveState();
    }
    getBranchSnapshot(branch) {
        this.reload();
        if (this.state.branchStates &&
            Array.isArray(this.state.branchStates[branch]) &&
            this.state.branchStates[branch].length > 0) {
            return [...this.state.branchStates[branch]];
        }
        return null;
    }
    // --- Branch Profile Mapping API ---
    getBranchMappings() {
        this.reload();
        return this.state.branchProfiles || {};
    }
    setBranchMapping(pattern, profileId) {
        this.reload();
        if (!this.state.branchProfiles) {
            this.state.branchProfiles = {};
        }
        this.state.branchProfiles[pattern] = profileId;
        this.saveState();
    }
    removeBranchMapping(pattern) {
        this.reload();
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
