import { StateManager } from '../core/state-manager.js';
import { showSkillSelector } from './tui.js';

async function main() {
  const projectRoot = process.cwd();
  const stateManager = new StateManager(projectRoot);

  // 1. Önce interaktif TUI menüsünü göster
  await showSkillSelector(stateManager);

  console.log('\nAgent oturumu için ortam hazır. Gateway arka planda dinlemede...');
}

main().catch(console.error);