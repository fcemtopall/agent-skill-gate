import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  ListToolsRequestSchema, 
  CallToolRequestSchema 
} from '@modelcontextprotocol/sdk/types.js';
import { StateManager } from '../core/state-manager.js';
import { SkillDefinition } from '../core/types.js';

export class DynamicMcpGateway {
  private server: Server;
  private stateManager: StateManager;
  private registeredSkills: Map<string, SkillDefinition> = new Map();

  constructor(stateManager: StateManager, skills: SkillDefinition[]) {
    this.stateManager = stateManager;
    for (const skill of skills) {
      this.registeredSkills.set(skill.id, skill);
    }

    // MCP sunucusunu tanımlıyoruz
    // tools.listChanged: true özelliği agent'a "benim tool listem dinamik değişebilir" mesajı verir
    this.server = new Server(
      { name: "skill-gateway", version: "1.0.0" },
      { capabilities: { tools: { listChanged: true } } }
    );

    this.bindHandlers();
    this.listenStateChanges();
  }

  private bindHandlers(): void {
    // 1. Agent "Hangi toolların var?" dediğinde çağrılan handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const activeIds = this.stateManager.getActiveSkills();
      const tools = [];

      for (const id of activeIds) {
        const skill = this.registeredSkills.get(id);
        if (skill) {
          // Namespace kuralı: skill_id__action biçiminde çakışma önlenir
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

    // 2. Agent bir tool'u çalıştırmak istediğinde çağrılan handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const toolName = request.params.name;
      const [skillId] = toolName.split('__');
      const activeIds = this.stateManager.getActiveSkills();

      // Disaster Pattern Önlemi: Tool deaktif edildiyse ama agent eski context'ten çağırmaya kalkarsa
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

      // Simülasyon: Skill aktifse operasyon başarılı döner
      return {
        content: [{ 
          type: "text", 
          text: `[${targetSkill?.name} Başarılı]: Parametreler alındı, işlem yürütüldü.` 
        }]
      };
    });
  }

  private listenStateChanges(): void {
    // State değiştiğinde agent'a "tool listem güncellendi, tekrar iste" sinyali fırlatılır
    this.stateManager.on('change', () => {
      this.server.notification({
        method: "notifications/tools/list_changed"
      });
    });
  }

  public async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}