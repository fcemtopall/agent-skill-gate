import { StateManager } from '../core/state-manager.js';
import { SymlinkManager } from '../core/symlink-manager.js';
import { ProfileStore } from '../core/profile-store.js';
import { PROFILES } from '../core/profiles.js';
import { PluginScanner, DiscoveredCapability } from '../harvester/scanner.js';
import { GitGuard } from '../core/git-guard.js';
import { runTui } from './tui.js';
import pc from 'picocolors';

function applyState(
  symlinkManager: SymlinkManager,
  capabilities: DiscoveredCapability[],
  activeIds: string[]
): void {
  for (const cap of capabilities) {
    if (activeIds.includes(cap.id)) {
      symlinkManager.enableCapability(cap.canonicalFilePath);
    } else {
      symlinkManager.disableCapability(cap.canonicalFilePath);
    }
  }
}

export async function runCli(args: string[]): Promise<void> {
  const projectRoot = process.cwd();
  const stateManager = new StateManager(projectRoot);
  const symlinkManager = new SymlinkManager();
  const profileStore = new ProfileStore();
  const gitGuard = new GitGuard(projectRoot);

  gitGuard.ensureGitIgnore();

  const scanner = new PluginScanner();
  const scanResult = scanner.scanManageable();
  const capabilities: DiscoveredCapability[] = scanResult.details;

  // 1. Reset / Panic Modu: Tüm symlink ve dosyaları varsayılan haline döndürür
  if (args.includes('--reset') || args.includes('--panic')) {
    symlinkManager.restoreAll(capabilities);
    stateManager.setActiveSkills([]);
    console.log(pc.green('✓ All agent capabilities have been restored to their default state.'));
    return;
  }

  // 2. Background Watcher Modu: Git dal değişimlerinde profili arka planda otomatik uygular
  if (args.includes('--watch')) {
    console.log(pc.cyan('ℹ Agent Skill Gate branch watcher active. Waiting for git branch changes...'));
    gitGuard.watchBranchChanges();

    gitGuard.on('branchChange', ({ to }: { from: string | null; to: string }) => {
      console.log(pc.yellow(`\n⎇ Branch switched to: ${to}`));
      const targetProfile = stateManager.resolveProfileForBranch(to);

      if (targetProfile) {
        console.log(pc.cyan(`➔ Applying mapped profile: ${targetProfile}`));
        let targetIds: string[] = [];

        const builtin = PROFILES.find((p) => p.id === targetProfile);
        if (builtin) {
          targetIds = capabilities.filter(builtin.filter).map((c) => c.id);
        } else {
          const custom = profileStore.getProfiles().find((p) => p.id === targetProfile);
          if (custom) targetIds = custom.skillIds;
        }

        stateManager.setActiveSkills(targetIds);
        applyState(symlinkManager, capabilities, targetIds);
        console.log(pc.green(`✓ Autoswitched to "${targetProfile}" with ${targetIds.length} active capabilities.`));
      } else {
        console.log(pc.dim('No profile rule matched for this branch. Retaining current capability state.'));
      }
    });

    // Node.js sürecinin açık kalmasını sağlar
    process.stdin.resume();
    return;
  }

  // 3. Normal İnteraktif Arayüz (TUI)
  await runTui(stateManager, symlinkManager, profileStore, capabilities, gitGuard);
}