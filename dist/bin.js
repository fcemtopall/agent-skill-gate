#!/usr/bin/env node
import { StateManager } from './core/state-manager.js';
import { showSkillSelector } from './cli/tui.js';
import { AVAILABLE_SKILLS } from './core/mock-skills.js';
import { DynamicMcpGateway } from './gateway/mcp-proxy.js';
const args = process.argv.slice(2);
const projectRoot = process.cwd();
const stateManager = new StateManager(projectRoot);
async function run() {
    // Eğer argüman olarak "serve" verilirse doğrudan MCP Gateway çalışır (Cursor / Claude bağlamak için)
    if (args.includes('--serve') || args.includes('serve')) {
        const gateway = new DynamicMcpGateway(stateManager, AVAILABLE_SKILLS);
        await gateway.start();
        return;
    }
    // Argümansız çağrılırsa interaktif TUI seçim ekranı açılır
    await showSkillSelector(stateManager);
}
run().catch((err) => {
    console.error('[HATA]', err.message);
    process.exit(1);
});
