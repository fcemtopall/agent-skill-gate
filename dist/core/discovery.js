import fs from 'node:fs';
import path from 'node:path';
export class ProjectDiscovery {
    projectRoot;
    constructor(projectRoot) {
        this.projectRoot = projectRoot;
    }
    analyze() {
        const recommendedSkillIds = [];
        const reasons = {};
        // 1. Git Kontrolü
        const gitDir = path.join(this.projectRoot, '.git');
        if (fs.existsSync(gitDir)) {
            recommendedSkillIds.push('git-manager');
            reasons['git-manager'] = 'Proje bir Git reposu olarak algılandı.';
        }
        // 2. Veritabanı (Postgres / SQL) İpuçları
        const packageJsonPath = path.join(this.projectRoot, 'package.json');
        const composePath = path.join(this.projectRoot, 'docker-compose.yml');
        const envPath = path.join(this.projectRoot, '.env');
        let hasPostgresEvidence = false;
        if (fs.existsSync(packageJsonPath)) {
            try {
                const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
                const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
                if (allDeps['pg'] || allDeps['@prisma/client'] || allDeps['drizzle-orm'] || allDeps['supabase']) {
                    hasPostgresEvidence = true;
                    reasons['postgres-inspector'] = 'package.json içinde PostgreSQL/ORM kütüphanesi bulundu.';
                }
            }
            catch { }
        }
        if (!hasPostgresEvidence && fs.existsSync(composePath)) {
            try {
                const composeContent = fs.readFileSync(composePath, 'utf-8');
                if (composeContent.toLowerCase().includes('postgres')) {
                    hasPostgresEvidence = true;
                    reasons['postgres-inspector'] = 'docker-compose.yml içinde postgres servisi tespit edildi.';
                }
            }
            catch { }
        }
        if (!hasPostgresEvidence && fs.existsSync(envPath)) {
            try {
                const envContent = fs.readFileSync(envPath, 'utf-8');
                if (envContent.includes('DATABASE_URL') || envContent.includes('POSTGRES_')) {
                    hasPostgresEvidence = true;
                    reasons['postgres-inspector'] = '.env dosyasında veritabanı değişkenleri tespit edildi.';
                }
            }
            catch { }
        }
        if (hasPostgresEvidence) {
            recommendedSkillIds.push('postgres-inspector');
        }
        // 3. Stripe / Ödeme İpuçları
        if (fs.existsSync(envPath)) {
            try {
                const envContent = fs.readFileSync(envPath, 'utf-8');
                if (envContent.includes('STRIPE_') || envContent.includes('NEXT_PUBLIC_STRIPE_')) {
                    recommendedSkillIds.push('stripe-mock');
                    reasons['stripe-mock'] = '.env dosyasında Stripe anahtarları tespit edildi.';
                }
            }
            catch { }
        }
        return {
            recommendedSkillIds,
            reasons
        };
    }
}
