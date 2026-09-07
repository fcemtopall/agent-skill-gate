import { StateManager } from './core/state-manager.js';
import { AVAILABLE_SKILLS } from './core/mock-skills.js';
import { DynamicMcpGateway } from './gateway/mcp-proxy.js';

const projectRoot = process.cwd();
const stateManager = new StateManager(projectRoot);
const gateway = new DynamicMcpGateway(stateManager, AVAILABLE_SKILLS);

console.log("=== Agent Skill Gateway Başlatılıyor ===");
console.log("Kayıtlı Skill Havuzu Sayısı:", AVAILABLE_SKILLS.length);
console.log("Şu an Aktif Skill'ler:", stateManager.getActiveSkills());

// Gateway sunucusunu dinlemeye alıyoruz
await gateway.start();
console.log("Gateway stdio üzerinden başarıyla dinlemeye başladı.");