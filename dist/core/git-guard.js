import fs from 'node:fs';
import path from 'node:path';
export class GitGuard {
    projectRoot;
    constructor(projectRoot) {
        this.projectRoot = projectRoot;
    }
    // .agent-skills.json dosyasını .gitignore'a otomatik ekle (Bozulma ve kirletmeyi engeller)
    ensureGitIgnore() {
        const gitignorePath = path.join(this.projectRoot, '.gitignore');
        const entry = '.agent-skills.json';
        if (fs.existsSync(gitignorePath)) {
            try {
                const content = fs.readFileSync(gitignorePath, 'utf-8');
                if (!content.includes(entry)) {
                    fs.appendFileSync(gitignorePath, `\n# Agent Skill Gate Yerel Yapılandırması\n${entry}\n`);
                }
            }
            catch { }
        }
        else {
            // .gitignore yoksa sadece git repo kontrolü yap
            const gitDir = path.join(this.projectRoot, '.git');
            if (fs.existsSync(gitDir)) {
                try {
                    fs.writeFileSync(gitignorePath, `# Agent Skill Gate Yerel Yapılandırması\n${entry}\n`, 'utf-8');
                }
                catch { }
            }
        }
    }
    // Opsiyonel: Branch değişiminde profili hatırlamak için local branch hook'u
    getCurrentBranch() {
        const headPath = path.join(this.projectRoot, '.git', 'HEAD');
        if (!fs.existsSync(headPath))
            return null;
        try {
            const content = fs.readFileSync(headPath, 'utf-8').trim();
            if (content.startsWith('ref: refs/heads/')) {
                return content.replace('ref: refs/heads/', '');
            }
        }
        catch { }
        return null;
    }
}
