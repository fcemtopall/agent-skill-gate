"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
// Ortak Skill Havuzu (Projenin mock-skills'i ile uyumlu)
const AVAILABLE_SKILLS = [
    {
        id: "git-manager",
        name: "Git Safe Manager",
        description: "Git diff analizi yapar, commit mesajı üretir ve branch durumunu inceler.",
        estimatedTokens: 350
    },
    {
        id: "postgres-inspector",
        name: "PostgreSQL Schema Inspector",
        description: "Tablo şemalarını okur, read-only SQL sorguları çalıştırır ve migration'ları inceler.",
        estimatedTokens: 750
    },
    {
        id: "stripe-mock",
        name: "Stripe API Helper",
        description: "Stripe webhook yüklerini simüle eder ve test ödeme akışlarını doğrular.",
        estimatedTokens: 500
    }
];
let statusBarItem;
function activate(context) {
    // 1. Status Bar Öğesini Oluştur (Sağ altta yer alır)
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'agentSkillGate.toggleSkills';
    context.subscriptions.push(statusBarItem);
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        return;
    }
    const rootPath = workspaceFolders[0].uri.fsPath;
    const configPath = path.join(rootPath, '.agent-skills.json');
    // Status Bar'ı güncelleyen fonksiyon
    function updateStatusBar() {
        let activeCount = 0;
        if (fs.existsSync(configPath)) {
            try {
                const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                activeCount = Array.isArray(data.activeSkillIds) ? data.activeSkillIds.length : 0;
            }
            catch {
                // Okuma hatasında 0 kabul et
            }
        }
        statusBarItem.text = `$(circuit-board) Skills: ${activeCount} Aktif`;
        statusBarItem.tooltip = "Agent Skillerini Aç/Kapat (Agent Skill Gate)";
        statusBarItem.show();
    }
    // İlk açılışta güncelle
    updateStatusBar();
    // Dosyayı izle: Terminalden bir şey değişirse VS Code'da anında yenilensin
    const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(rootPath, '.agent-skills.json'));
    watcher.onDidChange(() => updateStatusBar());
    watcher.onDidCreate(() => updateStatusBar());
    context.subscriptions.push(watcher);
    // 2. Komut: QuickPick Menüsü Açma
    const toggleCommand = vscode.commands.registerCommand('agentSkillGate.toggleSkills', async () => {
        let activeSkillIds = [];
        if (fs.existsSync(configPath)) {
            try {
                const raw = fs.readFileSync(configPath, 'utf8');
                const parsed = JSON.parse(raw);
                activeSkillIds = parsed.activeSkillIds || [];
            }
            catch {
                activeSkillIds = [];
            }
        }
        // Seçenekleri oluştur
        const items = AVAILABLE_SKILLS.map(skill => {
            const isActive = activeSkillIds.includes(skill.id);
            return {
                label: `${isActive ? '$(check) ' : '$(circle-slash) '} ${skill.name}`,
                description: `[~${skill.estimatedTokens} tok]`,
                detail: skill.description,
                picked: isActive,
                // Gizli id'yi saklamak için
                alwaysShow: true
            };
        });
        const selectedItem = await vscode.window.showQuickPick(items, {
            placeHolder: 'Durumunu değiştirmek istediğiniz skill üzerine tıklayın',
            matchOnDescription: true,
            matchOnDetail: true
        });
        if (!selectedItem) {
            return;
        }
        // Seçilen skill'i bul ve state'ini tersine çevir
        const targetSkill = AVAILABLE_SKILLS.find(s => selectedItem.label.includes(s.name));
        if (targetSkill) {
            if (activeSkillIds.includes(targetSkill.id)) {
                activeSkillIds = activeSkillIds.filter(id => id !== targetSkill.id);
                vscode.window.showInformationMessage(`Devre dışı bırakıldı: ${targetSkill.name}`);
            }
            else {
                activeSkillIds.push(targetSkill.id);
                vscode.window.showInformationMessage(`Aktifleştirildi: ${targetSkill.name}`);
            }
            // Dosyaya yaz
            const newState = {
                version: "1.0.0",
                activeSkillIds: activeSkillIds,
                updatedAt: new Date().toISOString()
            };
            fs.writeFileSync(configPath, JSON.stringify(newState, null, 2), 'utf8');
            updateStatusBar();
        }
    });
    context.subscriptions.push(toggleCommand);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map