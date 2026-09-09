import fs from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { WorkspaceSkillConfig, BranchProfileMapping } from './types.js';

export class StateManager extends EventEmitter {
  private configPath: string;
  private state: WorkspaceSkillConfig;

  constructor(projectRoot: string) {
    super();
    this.configPath = path.resolve(projectRoot, '.agent-skills.json');
    this.state = this.loadState();
  }

  public reload(): WorkspaceSkillConfig {
    this.state = this.loadState();
    return this.state;
  }

  private loadState(): WorkspaceSkillConfig {
    if (fs.existsSync(this.configPath)) {
      try {
        const content = fs.readFileSync(this.configPath, 'utf-8');
        return JSON.parse(content);
      } catch (e) {
        // Parse hatası olursa
      }
    }

    const defaultState: WorkspaceSkillConfig = {
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
    } catch {}

    return defaultState;
  }

  private saveState(): void {
    this.state.updatedAt = new Date().toISOString();
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write .agent-skills.json:', err);
    }
    this.emit('stateChanged', this.state);
  }

  public getActiveSkills(): string[] {
    this.reload();
    return [...this.state.activeSkillIds];
  }

  public isSkillActive(skillId: string): boolean {
    this.reload();
    return this.state.activeSkillIds.includes(skillId);
  }

  public setActiveSkills(skillIds: string[]): void {
    this.reload();
    this.state.activeSkillIds = [...skillIds];
    this.saveState();
  }

  // --- Branch Memory API ---

  public saveBranchSnapshot(branch: string, skillIds: string[]): void {
    this.reload();
    if (!this.state.branchStates) {
      this.state.branchStates = {};
    }
    this.state.branchStates[branch] = [...skillIds];
    this.state.activeSkillIds = [...skillIds];
    this.saveState();
  }

  public getBranchSnapshot(branch: string): string[] | null {
    this.reload();
    if (
      this.state.branchStates &&
      Array.isArray(this.state.branchStates[branch]) &&
      this.state.branchStates[branch].length > 0
    ) {
      return [...this.state.branchStates[branch]];
    }
    return null;
  }

  // --- Branch Profile Mapping API ---

  public getBranchMappings(): BranchProfileMapping {
    this.reload();
    return this.state.branchProfiles || {};
  }

  public setBranchMapping(pattern: string, profileId: string): void {
    this.reload();
    if (!this.state.branchProfiles) {
      this.state.branchProfiles = {};
    }
    this.state.branchProfiles[pattern] = profileId;
    this.saveState();
  }

  public removeBranchMapping(pattern: string): void {
    this.reload();
    if (this.state.branchProfiles && this.state.branchProfiles[pattern]) {
      delete this.state.branchProfiles[pattern];
      this.saveState();
    }
  }

  public resolveProfileForBranch(branchName: string): string | null {
    const mappings = this.getBranchMappings();

    if (mappings[branchName]) return mappings[branchName];

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