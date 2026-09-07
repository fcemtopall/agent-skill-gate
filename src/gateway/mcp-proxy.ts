import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  ListToolsRequestSchema, 
  CallToolRequestSchema 
} from '@modelcontextprotocol/sdk/types.js';
import { StateManager } from '../core/state-manager.js';
import { SkillDefinition } from '../core/types.js';
import { ProcessManager } from './process-manager.js';

export class DynamicMcpGateway {
  private server: Server;
  private stateManager: StateManager;
  private processManager: ProcessManager;
  private registeredSkills: Map<string, SkillDefinition> = new Map();

  constructor(stateManager: StateManager, skills: SkillDefinition[]) {
    this.stateManager = stateManager;
    this.processManager = new ProcessManager();

    for (const skill of skills) {
      this.registeredSkills.set(skill.id, skill);
    }

    this.server = new Server(
      { name: "skill-gateway", version: "1.0.0" },
      { capabilities: { tools: { listChanged: true } } }
    );

    this.bindHandlers();
    this.listenStateChanges();
    this.registerProcessGuards();
  }

  private bindHandlers(): void {
    // 1. Tool Listesi
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const activeIds = this.stateManager.getActiveSkills();
      const tools = [];

      for (const id of activeIds) {
        const skill = this.registeredSkills.get(id);
        if (skill) {
          tools.push({
            name: `${skill.id}__exec`,
            description: `[${skill.name}]: ${skill.description}`,
            inputSchema: {
              type: "object",
              properties: {
                command: { 
                  type: "string", 
                  description: "Çalıştırılacak operasyon parametresi" 
                }
              }
            }
          });
        }
      }

      return { tools };
    });

    // 2. Tool Çalıştırma (Gerçek Sürece İletim)
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const toolName = request.params.name;
      const [skillId] = toolName.split('__');
      const activeIds = this.stateManager.getActiveSkills();

      if (!activeIds.includes(skillId)) {
        return {
          content: [{
            type: "text",
            text: `[GATEWAY BLOCKED]: '${skillId}' şu anda devre dışı bırakılmış. Bu yeteneği kullanmak için lütfen skill panelinden aktifleştirin.`
          }],
          isError: true
        };
      }

      const targetSkill = this.registeredSkills.get(skillId);
      if (!targetSkill) {
        return {
          content: [{ type: "text", text: `[GATEWAY ERROR]: '${skillId}' tanımı bulunamadı.` }],
          isError: true
        };
      }

      // Alt süreci hazırla / başlat
      const child = this.processManager.startSkillProcess(targetSkill);
      if (!child) {
        return {
          content: [{ type: "text", text: `[GATEWAY ERROR]: '${skillId}' process başlatılamadı.` }],
          isError: true
        };
      }

      return {
        content: [{ 
          type: "text", 
          text: `[${targetSkill.name} - CANLI PROCESS]: Süreç çalışır durumda (PID: ${child.pid}). Parametre iletildi.` 
        }]
      };
    });
  }

  private listenStateChanges(): void {
    this.stateManager.on('change', (newState) => {
      const activeIds = newState.activeSkillIds;

      // Kapatılan skillerin arka plan process'lerini temizle
      for (const [id] of this.registeredSkills) {
        if (!activeIds.includes(id)) {
          this.processManager.stopSkillProcess(id);
        }
      }

      // Agent'a listenin değiştiğini bildir
      this.server.notification({
        method: "notifications/tools/list_changed"
      });
    });
  }

  // Terminal kapatıldığında veya Ctrl+C yapıldığında tüm alt süreçleri öldür
  private registerProcessGuards(): void {
    const cleanup = () => {
      this.processManager.killAll();
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('beforeExit', cleanup);
  }

  public async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}