import fs from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';
export class GitGuard extends EventEmitter {
    projectRoot;
    gitWatcher = null;
    currentBranchCache = null;
    constructor(projectRoot) {
        super();
        this.projectRoot = projectRoot;
        this.currentBranchCache = this.getCurrentBranch();
    }
    ensureGitIgnore() {
        const gitignorePath = path.join(this.projectRoot, '.gitignore');
        const entry = '.agent-skills.json';
        if (fs.existsSync(gitignorePath)) {
            try {
                const content = fs.readFileSync(gitignorePath, 'utf-8');
                if (!content.includes(entry)) {
                    fs.appendFileSync(gitignorePath, `\n# Agent Skill Gate Local Workspace State\n${entry}\n`);
                }
            }
            catch {
                // İzin veya dosya okuma hatası durumunda sessizce devam et
            }
        }
        else {
            const gitDir = path.join(this.projectRoot, '.git');
            if (fs.existsSync(gitDir)) {
                try {
                    fs.writeFileSync(gitignorePath, `# Agent Skill Gate Local Workspace State\n${entry}\n`, 'utf-8');
                }
                catch {
                    // İzin hatasında sessizce geç
                }
            }
        }
    }
    getCurrentBranch() {
        const headPath = path.join(this.projectRoot, '.git', 'HEAD');
        if (!fs.existsSync(headPath))
            return null;
        try {
            const content = fs.readFileSync(headPath, 'utf-8').trim();
            if (content.startsWith('ref: refs/heads/')) {
                return content.replace('ref: refs/heads/', '');
            }
            // Detached HEAD durumu (kısa commit hash)
            return content.slice(0, 8);
        }
        catch {
            return null;
        }
    }
    watchBranchChanges() {
        const gitDir = path.join(this.projectRoot, '.git');
        if (!fs.existsSync(gitDir))
            return;
        try {
            // macOS ve Linux uyumlu: .git klasörünü izler, atomic rename / HEAD güncellemelerini yakalar
            this.gitWatcher = fs.watch(gitDir, (_eventType, filename) => {
                const fileNameStr = filename ? filename.toString() : '';
                // HEAD dosyası veya refs altındaki değişikliklerde kontrol et
                if (fileNameStr === 'HEAD' || fileNameStr.startsWith('refs') || fileNameStr === '') {
                    const newBranch = this.getCurrentBranch();
                    if (newBranch && newBranch !== this.currentBranchCache) {
                        const oldBranch = this.currentBranchCache;
                        this.currentBranchCache = newBranch;
                        const eventData = { from: oldBranch, to: newBranch };
                        this.emit('branchChange', eventData);
                    }
                }
            });
        }
        catch {
            // Watcher açılamazsa süreci düşürme
        }
    }
    matchBranchPattern(currentBranch, pattern) {
        if (pattern === currentBranch)
            return true;
        if (pattern.endsWith('*')) {
            const prefix = pattern.slice(0, -1);
            return currentBranch.startsWith(prefix);
        }
        return false;
    }
    dispose() {
        if (this.gitWatcher) {
            this.gitWatcher.close();
            this.gitWatcher = null;
        }
    }
}
