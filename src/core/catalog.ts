import { PluginScanner } from '../harvester/scanner.js';
import { SkillDefinition } from './types.js';

export class SkillCatalog {
  private static cachedSkills: SkillDefinition[] | null = null;
  public static builtInCount: number = 0;

  public static getSkills(): SkillDefinition[] {
    if (this.cachedSkills) {
      return this.cachedSkills;
    }

    const scanner = new PluginScanner();
    const { manageable, builtInCount } = scanner.scanManageable();
    this.builtInCount = builtInCount;

    // Sadece gerçekten sistemde var olan 3rd-party yetenekleri listele
    this.cachedSkills = manageable;
    return this.cachedSkills;
  }
}