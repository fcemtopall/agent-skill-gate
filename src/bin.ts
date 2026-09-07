#!/usr/bin/env node

import { StateManager } from './core/state-manager.js';
import { showSkillSelector } from './cli/tui.js';
import { SkillCatalog } from './core/catalog.js';
import { DynamicMcpGateway } from './gateway/mcp-proxy.js';
import { SymlinkManager } from './core/symlink-manager.js';
import { PluginScanner } from './harvester/scanner.js';
import { GitGuard } from './core/git-guard.js';

const args = process.argv.slice(2);
const projectRoot = process.cwd();
const stateManager = new StateManager(projectRoot);
const symlinkManager = new SymlinkManager();
const gitGuard = new GitGuard(projectRoot);

async function run() {
  gitGuard.ensureGitIgnore();

  const scanner = new PluginScanner();
  const { details } = scanner.scanManageable();

  if (args.includes('--reset') || args.includes('reset')) {
    symlinkManager.restoreAll(details);
    console.log('✓ All 3rd-party CLI capabilities restored to original state.');
    process.exit(0);
  }

  const allSkills = SkillCatalog.getSkills();

  stateManager.on('change', (newState) => {
    symlinkManager.syncState(details, newState.activeSkillIds);
  });

  symlinkManager.syncState(details, stateManager.getActiveSkills());

  if (args.includes('--serve') || args.includes('serve')) {
    const gateway = new DynamicMcpGateway(stateManager, allSkills);
    await gateway.start();
    return;
  }

  await showSkillSelector(stateManager);
}

run().catch((err) => {
  console.error('[ERROR]', err.message);
  process.exit(1);
});