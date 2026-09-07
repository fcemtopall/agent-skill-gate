#!/usr/bin/env node
import { StateManager } from './core/state-manager.js';
import { showSkillSelector } from './cli/tui.js';
import { SkillCatalog } from './core/catalog.js';
import { DynamicMcpGateway } from './gateway/mcp-proxy.js';
import { SymlinkManager } from './core/symlink-manager.js';
import { PluginScanner } from './harvester/scanner.js';
const args = process.argv.slice(2);
const projectRoot = process.cwd();
const stateManager = new StateManager(projectRoot);
const symlinkManager = new SymlinkManager();
async function run() {
    const scanner = new PluginScanner();
    const { details } = scanner.scanManageable();
    // PANİK / RESET MODU: Bütün devre dışı bırakılmış dosyaları orijinal haline çevirir
    if (args.includes('--reset') || args.includes('reset')) {
        symlinkManager.restoreAll(details);
        console.log('✓ Sistemdeki tüm 3rd-party CLI yetenekleri orijinal haline getirildi.');
        process.exit(0);
    }
    const allSkills = SkillCatalog.getSkills();
    // State değişimini diske yansıt
    stateManager.on('change', (newState) => {
        symlinkManager.syncState(details, newState.activeSkillIds);
    });
    // Başlangıçta da o anki kayıtlı state neyse diskteki dosyaları onunla eşitle
    symlinkManager.syncState(details, stateManager.getActiveSkills());
    if (args.includes('--serve') || args.includes('serve')) {
        const gateway = new DynamicMcpGateway(stateManager, allSkills);
        await gateway.start();
        return;
    }
    await showSkillSelector(stateManager);
}
run().catch((err) => {
    console.error('[HATA]', err.message);
    process.exit(1);
});
