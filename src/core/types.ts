export type SkillRuntime = 'npx' | 'node' | 'python' | 'binary';
export interface BranchProfileMapping {
  [branchPattern: string]: string; // Örn: "main": "builtin:prototyping", "release/*": "builtin:audit"
}

export interface WorkspaceSkillConfig {
  version: string;
  activeSkillIds: string[];
  branchProfiles?: BranchProfileMapping;
  updatedAt: string;
}

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  category: 'core' | 'git' | 'analysis' | 'devops' | 'database' | 'api';
  runtime: 'binary' | 'node' | 'python' | 'docker' | 'npx';
  command: string;
  args?: string[];
  estimatedTokens: number;
  requiredEnv?: string[];
}

export interface ProjectSkillState {
  version: "1.0.0";
  activeSkillIds: string[];        // O an devrede olan skillerin id listesi
  updatedAt: string;
}