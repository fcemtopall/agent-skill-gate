export type SkillRuntime = 'npx' | 'node' | 'python' | 'binary';

export interface SkillDefinition {
  id: string;                      // Benzersiz kimlik: örn. "postgres-inspector"
  name: string;                    // Görünen isim: örn. "PostgreSQL Inspector"
  description: string;             // Arayüzde görünecek 1 satırlık net özet
  category: 'database' | 'api' | 'testing' | 'devops' | 'git';
  runtime: SkillRuntime;
  command: string;                 // Çalıştırılacak paket/komut: örn. "@modelcontextprotocol/server-postgres"
  args?: string[];
  requiredEnv?: string[];          // İhtiyaç duyduğu env: örn. ["DATABASE_URL"]
  estimatedTokens: number;         // Bağlam maliyet hesabı için yaklaşık token
}

export interface ProjectSkillState {
  version: "1.0.0";
  activeSkillIds: string[];        // O an devrede olan skillerin id listesi
  updatedAt: string;
}