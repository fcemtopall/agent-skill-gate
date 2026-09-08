import * as p from '@clack/prompts';
import pc from 'picocolors';
import { StateManager } from '../core/state-manager.js';
import { SymlinkManager } from '../core/symlink-manager.js';
import { ProfileStore } from '../core/profile-store.js';
import { PROFILES } from '../core/profiles.js';
import { DiscoveredCapability } from '../harvester/scanner.js';
import { GitGuard } from '../core/git-guard.js';

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

export async function runTui(
  stateManager: StateManager,
  symlinkManager: SymlinkManager,
  profileStore: ProfileStore,
  capabilities: DiscoveredCapability[],
  gitGuard: GitGuard
): Promise<void> {
  p.intro(pc.bgCyan(pc.black(' AGENT SKILL GATE ')));

  const currentBranch = gitGuard.getCurrentBranch();
  if (currentBranch) {
    p.log.info(pc.dim(`Current Branch: ${pc.cyan(currentBranch)}`));
  }

  const action = await p.select({
    message: 'What would you like to configure?',
    options: [
      { value: 'skills', label: 'Toggle Individual Skills' },
      { value: 'profile', label: 'Switch Active Profile' },
      { value: 'branch', label: 'Configure Branch Autoswitch' },
      { value: 'exit', label: 'Exit' }
    ]
  });

  if (p.isCancel(action) || action === 'exit') {
    p.outro('Configuration complete.');
    return;
  }

  // --- 1. TEKİL YETENEK YÖNETİMİ ---
  if (action === 'skills') {
    const activeSkills = stateManager.getActiveSkills();
    const selected = await p.multiselect({
      message: 'Select capabilities to enable for this workspace:',
      options: capabilities.map((cap) => ({
        value: cap.id,
        label: cap.name || cap.id,
        hint: `${cap.cliTarget} (${cap.capabilityType})`
      })),
      initialValues: activeSkills,
      required: false
    });

    if (p.isCancel(selected)) {
      p.cancel('Operation cancelled.');
      return;
    }

    const targetIds = selected as string[];
    
    // Dal hafızasına yaz
    if (currentBranch) {
      stateManager.saveBranchSnapshot(currentBranch, targetIds);
    } else {
      stateManager.setActiveSkills(targetIds);
    }

    applyState(symlinkManager, capabilities, targetIds);
    p.outro(pc.green(`✓ Saved ${targetIds.length} capabilities for branch [${currentBranch || 'detached'}].`));
    return;
  }

  // --- 2. PROFİL SEÇİMİ ---
  if (action === 'profile') {
    const customProfiles = profileStore.getProfiles();
    const options = [
      ...PROFILES.map((prof) => ({
        value: prof.id,
        label: prof.label,
        hint: prof.description
      })),
      ...customProfiles.map((prof) => ({
        value: prof.id,
        label: `${prof.name} (Custom)`,
        hint: prof.description
      }))
    ];

    const selectedProfileId = await p.select({
      message: 'Choose a capability profile:',
      options
    });

    if (p.isCancel(selectedProfileId)) return;

    let targetIds: string[] = [];
    const builtin = PROFILES.find((pr) => pr.id === selectedProfileId);
    if (builtin) {
      targetIds = capabilities.filter(builtin.filter).map((c) => c.id);
    } else {
      const custom = profileStore.getProfiles().find((pr) => pr.id === selectedProfileId);
      if (custom) targetIds = custom.skillIds;
    }

    // Dal hafızasına yaz
    if (currentBranch) {
      stateManager.saveBranchSnapshot(currentBranch, targetIds);
    } else {
      stateManager.setActiveSkills(targetIds);
    }

    applyState(symlinkManager, capabilities, targetIds);
    p.outro(pc.green(`✓ Switched branch [${currentBranch || 'detached'}] to profile "${selectedProfileId}".`));
    return;
  }

  // --- 3. DAL BAZLI OTOMATİK GEÇİŞ AYARLARI ---
  if (action === 'branch') {
    const mappings = stateManager.getBranchMappings();
    p.log.message(pc.bold('Current Branch Rules:'));
    const keys = Object.keys(mappings);
    if (keys.length === 0) {
      p.log.warn(pc.dim('No rules defined yet.'));
    } else {
      for (const [pattern, prof] of Object.entries(mappings)) {
        p.log.step(`${pc.yellow(pattern)} ➔ ${pc.cyan(prof)}`);
      }
    }

    const branchAction = await p.select({
      message: 'Branch Action:',
      options: [
        { value: 'add', label: 'Add or Update Rule' },
        { value: 'delete', label: 'Delete Rule' },
        { value: 'back', label: 'Back' }
      ]
    });

    if (branchAction === 'add') {
      const pattern = await p.text({
        message: 'Enter branch name or pattern (e.g. main, feat/*, release/*):',
        validate: (val) => (!val ? 'Branch pattern cannot be empty' : undefined)
      });

      if (p.isCancel(pattern)) return;

      const profileOptions = [
        ...PROFILES.map((pr) => ({ value: pr.id, label: pr.label })),
        ...profileStore.getProfiles().map((pr) => ({ value: pr.id, label: pr.name }))
      ];

      const chosenProfile = await p.select({
        message: `Select profile for "${pattern}":`,
        options: profileOptions
      });

      if (p.isCancel(chosenProfile)) return;

      stateManager.setBranchMapping(pattern as string, chosenProfile as string);
      p.outro(pc.green(`✓ Branch rule saved: ${pattern} ➔ ${chosenProfile}`));
    } else if (branchAction === 'delete') {
      const patterns = Object.keys(mappings);
      if (patterns.length === 0) {
        p.outro('No rules to delete.');
        return;
      }

      const toDelete = await p.select({
        message: 'Select rule to remove:',
        options: patterns.map((patternKey) => ({ value: patternKey, label: patternKey }))
      });

      if (p.isCancel(toDelete)) return;

      stateManager.removeBranchMapping(toDelete as string);
      p.outro(pc.green(`✓ Removed rule for ${toDelete}`));
    }
  }
}