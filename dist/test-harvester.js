import { PluginScanner } from './harvester/scanner.js';
import { KNOWN_CLI_TARGETS } from './harvester/paths.js';
import fs from 'node:fs';
console.log('=== AI CLI Harvester Taraması Başlatılıyor ===\n');
for (const target of KNOWN_CLI_TARGETS) {
    const exists = fs.existsSync(target.baseDir);
    console.log(`Hedef [${target.name.toUpperCase()}]: ${target.baseDir} -> ${exists ? 'BULUNDU ✓' : 'YOK ✗'}`);
}
const scanner = new PluginScanner();
const { manageable, builtInCount } = scanner.scanManageable();
console.log(`\nKorunan / Yerleşik Komut Sayısı: ${builtInCount}`);
console.log(`Yönetilebilir 3rd-Party Yetenek Sayısı: ${manageable.length}`);
manageable.forEach((r) => {
    console.log(`- ${r.name}: ${r.description}`);
});
