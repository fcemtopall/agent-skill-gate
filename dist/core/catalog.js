import { PluginScanner } from '../harvester/scanner.js';
export class SkillCatalog {
    static cachedSkills = null;
    static builtInCount = 0;
    static getSkills() {
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
