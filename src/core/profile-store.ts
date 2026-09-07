import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export interface UserProfile {
  id: string;
  name: string;
  description: string;
  skillIds: string[];
}

export class ProfileStore {
  private configDir: string;
  private filePath: string;

  constructor() {
    this.configDir = path.join(os.homedir(), '.agent-skill-gate');
    this.filePath = path.join(this.configDir, 'profiles.json');
    this.ensureFile();
  }

  private ensureFile(): void {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }
    if (!fs.existsSync(this.filePath)) {
      const defaults: UserProfile[] = [
        {
          id: 'mvp-builder',
          name: '🚀 Lean MVP Builder',
          description: 'Optimized preset for rapid iteration and essential tooling.',
          skillIds: []
        }
      ];
      fs.writeFileSync(this.filePath, JSON.stringify(defaults, null, 2), 'utf-8');
    }
  }

  public getProfiles(): UserProfile[] {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public saveProfile(profile: UserProfile): void {
    const profiles = this.getProfiles();
    const index = profiles.findIndex(p => p.id === profile.id);

    if (index >= 0) {
      profiles[index] = profile;
    } else {
      profiles.push(profile);
    }

    fs.writeFileSync(this.filePath, JSON.stringify(profiles, null, 2), 'utf-8');
  }

  public deleteProfile(profileId: string): void {
    const profiles = this.getProfiles().filter(p => p.id !== profileId);
    fs.writeFileSync(this.filePath, JSON.stringify(profiles, null, 2), 'utf-8');
  }
}