import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process';
import { SkillDefinition } from '../core/types.js';

interface ActiveProcess {
  skillId: string;
  process: ChildProcessWithoutNullStreams;
}

export class ProcessManager {
  private runningProcesses: Map<string, ActiveProcess> = new Map();

  // Bir skill'i arka planda başlat
  public startSkillProcess(skill: SkillDefinition): ChildProcessWithoutNullStreams | null {
    if (this.runningProcesses.has(skill.id)) {
      return this.runningProcesses.get(skill.id)!.process;
    }

    try {
      // npx veya belirtilen komutu izole stdio pipe ile ayağa kaldır
      const child = spawn(skill.runtime, [skill.command, ...(skill.args || [])], {
        env: { ...process.env },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      child.on('error', (err) => {
        console.error(`[Process Manager Hatası] '${skill.id}' başlatılamadı:`, err.message);
        this.runningProcesses.delete(skill.id);
      });

      child.on('exit', (code, signal) => {
        if (code !== 0 && code !== null) {
          console.warn(`[Process Manager] '${skill.id}' beklenmedik şekilde kapandı (Exit code: ${code}, Sinyal: ${signal})`);
        }
        this.runningProcesses.delete(skill.id);
      });

      // stderr loglarını gateway'i kirletmeden yakala
      child.stderr.on('data', (chunk) => {
        const msg = chunk.toString().trim();
        if (msg) {
          // Gerekirse hata takibi için loglanabilir
        }
      });

      this.runningProcesses.set(skill.id, {
        skillId: skill.id,
        process: child
      });

      return child;
    } catch (err) {
      console.error(`[Process Manager] '${skill.id}' spawn edilirken hata:`, err);
      return null;
    }
  }

  // Skill devre dışı bırakıldığında alt süreci güvenle sonlandır (Zombi engelleme)
  public stopSkillProcess(skillId: string): void {
    const active = this.runningProcesses.get(skillId);
    if (!active) return;

    try {
      // Önce nazikçe kapatmayı dene (SIGTERM)
      active.process.kill('SIGTERM');

      // 1 saniye içinde kapanmazsa zorla sonlandır (SIGKILL)
      setTimeout(() => {
        if (this.runningProcesses.has(skillId)) {
          active.process.kill('SIGKILL');
          this.runningProcesses.delete(skillId);
        }
      }, 1000);
    } catch {
      // Process zaten kapanmışsa yok say
      this.runningProcesses.delete(skillId);
    }
  }

  // Gateway kapanırken arkada hiçbir zombi süreç bırakma
  public killAll(): void {
    for (const [id] of this.runningProcesses) {
      this.stopSkillProcess(id);
    }
  }
}