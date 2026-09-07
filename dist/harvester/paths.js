import path from 'node:path';
import os from 'node:os';
const home = os.homedir();
export const KNOWN_CLI_TARGETS = [
    {
        name: 'claude',
        baseDir: path.join(home, '.claude'),
        commandsDir: path.join(home, '.claude', 'commands'),
        hooksDir: path.join(home, '.claude', 'hooks'),
        configFile: path.join(home, '.claude', 'config.json')
    },
    {
        name: 'gemini',
        baseDir: path.join(home, '.gemini'),
        commandsDir: path.join(home, '.gemini', 'commands'),
        hooksDir: path.join(home, '.gemini', 'hooks'),
        configFile: path.join(home, '.gemini', 'config.json')
    },
    {
        name: 'antigravity',
        baseDir: path.join(home, '.antigravity'),
        commandsDir: path.join(home, '.antigravity', 'commands'),
        hooksDir: path.join(home, '.antigravity', 'hooks'),
        configFile: path.join(home, '.antigravity', 'config.json')
    }
];
