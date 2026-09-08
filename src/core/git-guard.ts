import fs from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';

export class GitGuard extends EventEmitter {
  private projectRoot: string;
  private headWatcher: fs.FSWatcher | null = null;
  private currentBranchCache: string | null = null;

  constructor(projectRoot: string) {
    super();
    this.projectRoot = projectRoot;
    this.currentBranchCache = this.getCurrentBranch();
  }

  public ensureGitIgnore(): void {
    const gitignorePath = path.join(this.projectRoot, '.gitignore');
    const entry = '.agent-skills.json';

    if (fs.existsSync(gitignorePath)) {
      try {
        const content = fs.readFileSync(gitignorePath, 'utf-8');
        if (!content.includes(entry)) {
          fs.appendFileSync(gitignorePath, `\n# Agent Skill Gate Local Workspace State\n${entry}\n`);
        }
      } catch {}
    } else {
      const gitDir = path.join(this.projectRoot, '.git');
      if (fs.existsSync(gitDir)) {
        try {
          fs.writeFileSync(gitignorePath, `# Agent Skill Gate Local Workspace State\n${entry}\n`, 'utf-8');
        } catch {}
      }
    }
  }

  public getCurrentBranch(): string | null {
    const headPath = path.join(this.projectRoot, '.git', 'HEAD');
    if (!fs.existsSync(headPath)) return null;

    try {
      const content = fs.readFileSync(headPath, 'utf-8').trim();
      if (content.startsWith('ref: refs/heads/')) {
        return content.replace('ref: refs/heads/', '');
      }
      // Detached HEAD durumu (commit hash döner)
      return content.slice(0, 8);
    } catch {
      return null;
    }
  }

  // Dal değişimlerini (git checkout / git switch) yakalar
  public watchBranchChanges(): void {
    const gitDir = path.join(this.projectRoot, '.git');
    const headPath = path.join(gitDir, 'HEAD');
    if (!fs.existsSync(headPath)) return;

    try {
      this.headWatcher = fs.watch(headPath, () => {
        const newBranch = this.getCurrentBranch();
        if (newBranch && newBranch !== this.currentBranchCache) {
          const oldBranch = this.currentBranchCache;
          this.currentBranchCache = newBranch;
          this.emit('branchChange', { from: oldBranch, to: newBranch });
        }
      });
    } catch {}
  }

  // Wildcard desteği: "feat/*" deseni "feat/auth" dalıyla eşleşir
  public matchBranchPattern(currentBranch: string, pattern: string): boolean {
    if (pattern === currentBranch) return true;
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      return currentBranch.startsWith(prefix);
    }
    return false;
  }

  public dispose(): void {
    if (this.headWatcher) {
      this.headWatcher.close();
      this.headWatcher = null;
    }
  }
}