import { StateManager } from '../core/state-manager.js';
import { SymlinkManager } from '../core/symlink-manager.js';
import { ProfileStore } from '../core/profile-store.js';
import { PROFILES } from '../core/profiles.js';
import { PluginScanner } from '../harvester/scanner.js';
import { GitGuard } from '../core/git-guard.js';
import { runTui } from './tui.js';
import pc from 'picocolors';
function applyState(symlinkManager, capabilities, activeIds) {
    for (const cap of capabilities) {
        if (activeIds.includes(cap.id)) {
            symlinkManager.enableCapability(cap.canonicalFilePath);
        }
        else {
            symlinkManager.disableCapability(cap.canonicalFilePath);
        }
    }
}
export async function runCli(args) {
    const projectRoot = process.cwd();
    const stateManager = new StateManager(projectRoot);
    const symlinkManager = new SymlinkManager();
    const profileStore = new ProfileStore();
    const gitGuard = new GitGuard(projectRoot);
    gitGuard.ensureGitIgnore();
    const scanner = new PluginScanner();
    const scanResult = scanner.scanManageable();
    const capabilities = scanResult.details;
    // 1. Reset / Panic Modu
    if (args.includes('--reset') || args.includes('--panic')) {
        symlinkManager.restoreAll(capabilities);
        stateManager.setActiveSkills([]);
        console.log(pc.green('✓ All agent capabilities have been restored to their default state.'));
        return;
    }
    // 2. Background Watcher Modu
    if (args.includes('--watch')) {
        console.log(pc.cyan('ℹ Agent Skill Gate branch watcher active. Waiting for git branch changes...'));
        gitGuard.watchBranchChanges();
        gitGuard.on('branchChange', ({ from, to }) => {
            console.log(pc.yellow(`\n⎇ Branch switched to: ${to}`));
            // 0. ADIM: Ayrılınan dal varsa (from), o daldaki son aktif durumu hafızasına mühürle
            if (from) {
                const currentActive = stateManager.getActiveSkills();
                stateManager.saveBranchSnapshot(from, currentActive);
            }
            // 1. ÖNCELİK: Geçilen dal (to) için daha önceden kaydedilmiş bir hafıza var mı?
            const savedSnapshot = stateManager.getBranchSnapshot(to);
            if (savedSnapshot !== null) {
                stateManager.setActiveSkills(savedSnapshot);
                applyState(symlinkManager, capabilities, savedSnapshot);
                console.log(pc.green(`✓ Restored branch memory state: ${savedSnapshot.length} capabilities active.`));
                return;
            }
            // 2. ÖNCELİK: Bu dal için bir profil kuralı eşleşiyor mu?
            const targetProfile = stateManager.resolveProfileForBranch(to);
            if (targetProfile) {
                console.log(pc.cyan(`➔ Initializing branch from profile rule: ${targetProfile}`));
                let targetIds = [];
                const builtin = PROFILES.find((p) => p.id === targetProfile);
                if (builtin) {
                    targetIds = capabilities.filter(builtin.filter).map((c) => c.id);
                }
                else {
                    const custom = profileStore.getProfiles().find((p) => p.id === targetProfile);
                    if (custom)
                        targetIds = custom.skillIds;
                }
                // Bu dalın ilk snapshot'ı olarak diske kaydet
                stateManager.saveBranchSnapshot(to, targetIds);
                applyState(symlinkManager, capabilities, targetIds);
                console.log(pc.green(`✓ Applied profile "${targetProfile}" (${targetIds.length} capabilities) and saved snapshot.`));
                return;
            }
            // 3. ÖNCELİK: Ne kural ne hafıza var; mevcut durumu bu dala devret
            const currentActive = stateManager.getActiveSkills();
            stateManager.saveBranchSnapshot(to, currentActive);
            console.log(pc.dim(`No profile rule or previous memory for [${to}]. Inherited ${currentActive.length} active capabilities.`));
        });
        // Node.js sürecinin ayakta kalmasını sağla
        process.stdin.resume();
        return;
    }
    // 3. Normal İnteraktif Arayüz (TUI)
    await runTui(stateManager, symlinkManager, profileStore, capabilities, gitGuard);
}
