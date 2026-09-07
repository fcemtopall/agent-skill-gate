import fs from 'node:fs';
import path from 'node:path';
import { KNOWN_CLI_TARGETS } from './paths.js';
const BUILT_IN_COMMANDS = {
    claude: ['help', 'init', 'config', 'login', 'logout', 'doctor', 'bug', 'compact', 'cost', 'clear'],
    gemini: ['help', 'config', 'settings', 'update', 'undo', 'status', 'auth', 'version', 'workspace'],
    antigravity: ['init', 'help', 'status', 'config', 'rules']
};
export class PluginScanner {
    extractMetadata(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const lines = content.split('\n');
            for (let i = 0; i < Math.min(lines.length, 15); i++) {
                const line = lines[i].trim();
                if (line.startsWith('# '))
                    return line.replace(/^#+\s*/, '').trim();
                if (line.startsWith('#') && !line.startsWith('#!')) {
                    const desc = line.replace(/^#+\s*/, '').trim();
                    if (desc.length > 5)
                        return desc;
                }
                if (line.startsWith('//')) {
                    const desc = line.replace(/^\/+\s*/, '').trim();
                    if (desc.length > 5)
                        return desc;
                }
            }
        }
        catch { }
        return '3rd-party CLI capability / script.';
    }
    scanDirectoryRecursive(targetDir, cliName, dirType) {
        const capabilities = [];
        if (!fs.existsSync(targetDir))
            return capabilities;
        const builtIns = BUILT_IN_COMMANDS[cliName] || [];
        try {
            const entries = fs.readdirSync(targetDir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(targetDir, entry.name);
                if (entry.isDirectory()) {
                    capabilities.push(...this.scanDirectoryRecursive(fullPath, cliName, dirType));
                }
                else if (entry.isFile()) {
                    if (entry.name.startsWith('.') && !entry.name.includes('.asg-disabled'))
                        continue;
                    if (entry.name.endsWith('.lock'))
                        continue;
                    const isCurrentlyDisabled = entry.name.endsWith('.asg-disabled');
                    const cleanFileName = isCurrentlyDisabled
                        ? entry.name.replace(/\.asg-disabled$/, '')
                        : entry.name;
                    const canonicalFilePath = path.join(targetDir, cleanFileName);
                    const ext = path.extname(cleanFileName);
                    const baseName = path.parse(cleanFileName).name;
                    if (!['.md', '.sh', '.bash', '.js', '.mjs', '.py', ''].includes(ext)) {
                        continue;
                    }
                    const isBuiltIn = builtIns.includes(baseName.toLowerCase());
                    const metadata = this.extractMetadata(fullPath);
                    capabilities.push({
                        id: `${cliName}::${dirType}::${baseName}`,
                        name: `${baseName} (${cliName})`,
                        description: `[${cliName.toUpperCase()} / ${dirType}] ${metadata}`,
                        cliTarget: cliName,
                        capabilityType: dirType === 'hooks' ? 'lifecycle-hook' : 'slash-command',
                        canonicalFilePath,
                        actualFilePath: fullPath,
                        isCurrentlyDisabled,
                        isBuiltIn
                    });
                }
            }
        }
        catch { }
        return capabilities;
    }
    scanManageable() {
        const manageable = [];
        const details = [];
        let builtInCount = 0;
        for (const target of KNOWN_CLI_TARGETS) {
            const caps = [
                ...this.scanDirectoryRecursive(target.commandsDir, target.name, 'commands'),
                ...this.scanDirectoryRecursive(target.hooksDir, target.name, 'hooks'),
                ...this.scanDirectoryRecursive(path.join(target.baseDir, 'rules'), target.name, 'rules')
            ];
            for (const cap of caps) {
                if (cap.isBuiltIn) {
                    builtInCount++;
                    continue;
                }
                details.push(cap);
                manageable.push({
                    id: cap.id,
                    name: cap.name,
                    description: cap.description,
                    category: cap.capabilityType === 'lifecycle-hook' ? 'devops' : 'api',
                    runtime: 'binary',
                    command: cap.canonicalFilePath,
                    estimatedTokens: cap.capabilityType === 'slash-command' ? 500 : 180
                });
            }
        }
        return { manageable, builtInCount, details };
    }
}
