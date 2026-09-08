import fs from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { WorkspaceSkillConfig, BranchProfileMapping } from './types.js';

export class StateManager extends EventEmitter {
  private configPath: string;
  private state: WorkspaceSkillConfig;

  constructor(projectRoot: string) {
    super();
    this.configPath = path.join(projectRoot, '.agent-skills.json');
    this.state = this.loadState();
  }

  private loadState(): WorkspaceSkillConfig {
    if (fs.existsSync(this.configPath)) {
      try {
        const content = fs.readFileSync(this.configPath, 'utf-8');
        return JSON.parse(content);
      } catch {
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

  private saveState(): void {
    this.state.updatedAt = new Date().toISOString();
    fs.writeFileSync(this.configPath, JSON.stringify(this.state, null, 2), 'utf-8');
    this.emit('stateChanged', this.state);
  }

  public getActiveSkills(): string[] {
    return [...this.state.activeSkillIds];
  }

  public isSkillActive(skillId: string): boolean {
    return this.state.activeSkillIds.includes(skillId);
  }

  public setActiveSkills(skillIds: string[]): void {
    this.state.activeSkillIds = [...skillIds];
    this.saveState();
  }

  public toggleSkill(skillId: string): boolean {
    const index = this.state.activeSkillIds.indexOf(skillId);
    let isActive = false;

    if (index >= 0) {
      this.state.activeSkillIds.splice(index, 1);
      isActive = false;
    } else {
      this.state.activeSkillIds.push(skillId);
      isActive = true;
    }

    this.saveState();
    return isActive;
  }

  // --- Branch Profile Mapping API ---

  public getBranchMappings(): BranchProfileMapping {
    return this.state.branchProfiles || {};
  }

  public setBranchMapping(pattern: string, profileId: string): void {
    if (!this.state.branchProfiles) {
      this.state.branchProfiles = {};
    }
    this.state.branchProfiles[pattern] = profileId;
    this.saveState();
  }

  public removeBranchMapping(pattern: string): void {
    if (this.state.branchProfiles && this.state.branchProfiles[pattern]) {
      delete this.state.branchProfiles[pattern];
      this.saveState();
    }
  }

  // Aktif branch için geçerli bir profil var mı? (Wildcard destekli)
  public resolveProfileForBranch(branchName: string): string | null {
    const mappings = this.getBranchMappings();
    
    // 1. Birebir eşleşme
    if (mappings[branchName]) return mappings[branchName];

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