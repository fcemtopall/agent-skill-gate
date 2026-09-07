export const PROFILES = [
    {
        id: 'prototyping',
        label: '⚡ Fast Prototyping',
        description: 'Bypasses guard and audit hooks for maximum speed and minimal token consumption.',
        filter: (cap) => {
            const lower = cap.canonicalFilePath.toLowerCase();
            const isHeavyHook = lower.includes('guard') ||
                lower.includes('scanner') ||
                lower.includes('audit') ||
                lower.includes('check');
            return !isHeavyHook;
        }
    },
    {
        id: 'audit',
        label: '🛡️ Full Guard & Audit',
        description: 'Enables all scanners, review workflows, and commit verification hooks.',
        filter: () => true
    },
    {
        id: 'clean',
        label: '🧹 Clean Slate',
        description: 'Disables all 3rd-party capabilities. Retains native built-in CLI commands only.',
        filter: () => false
    }
];
