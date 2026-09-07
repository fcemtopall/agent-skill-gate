import { SkillDefinition } from './types.js';

export const AVAILABLE_SKILLS: SkillDefinition[] = [
  {
    id: "git-manager",
    name: "Git Safe Manager",
    description: "Git diff analizi yapar, commit mesajı üretir ve branch durumunu inceler.",
    category: "git",
    runtime: "npx",
    command: "@modelcontextprotocol/server-git",
    estimatedTokens: 350
  },
  {
    id: "postgres-inspector",
    name: "PostgreSQL Schema Inspector",
    description: "Tablo şemalarını okur, read-only SQL sorguları çalıştırır ve migration'ları inceler.",
    category: "database",
    runtime: "npx",
    command: "@modelcontextprotocol/server-postgres",
    requiredEnv: ["DATABASE_URL"],
    estimatedTokens: 750
  },
  {
    id: "stripe-mock",
    name: "Stripe API Helper",
    description: "Stripe webhook yüklerini simüle eder ve test ödeme akışlarını doğrular.",
    category: "api",
    runtime: "npx",
    command: "stripe-mcp-server",
    requiredEnv: ["STRIPE_SECRET_KEY"],
    estimatedTokens: 500
  }
];