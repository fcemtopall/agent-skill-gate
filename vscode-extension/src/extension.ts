import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface SkillConfig {
  version: string;
  activeSkillIds: string[];
  updatedAt: string;
}

interface CapabilityItem {
  id: string;
  label: string;
  description: string;
  canonicalPath: string;
}

export function activate(context: vscode.ExtensionContext) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) return;

  const projectRoot = workspaceFolders[0].uri.fsPath;
  const configPath = path.join(projectRoot, '.agent-skills.json');

  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'agentSkillGate.manageSkills';
  context.subscriptions.push(statusBarItem);

  // 1. Bilinen CLI dizinlerini tara (Claude, Gemini, Antigravity)
  function scanDiscoveredCapabilities(): CapabilityItem[] {
    const home = os.homedir();
    const targets = [
      { name: 'claude', base: path.join(home, '.claude') },
      { name: 'gemini', base: path.join(home, '.gemini') },
      { name: 'antigravity', base: path.join(home, '.antigravity') }
    ];

    const builtIns: Record<string, string[]> = {
      claude: ['help', 'init', 'config', 'login', 'logout', 'doctor', 'bug', 'compact', 'cost', 'clear'],
      gemini: ['help', 'config', 'settings', 'update', 'undo', 'status', 'auth', 'version', 'workspace'],
      antigravity: ['init', 'help', 'status', 'config', 'rules']
    };

    const results: CapabilityItem[] = [];

    for (const target of targets) {
      const subDirs = ['commands', 'hooks', 'rules'];
      for (const sub of subDirs) {
        const targetDir = path.join(target.base, sub);
        if (!fs.existsSync(targetDir)) continue;

        try {
          const files = fs.readdirSync(targetDir);
          for (const file of files) {
            if (file.startsWith('.') && !file.includes('.asg-disabled')) continue;
            if (file.endsWith('.lock')) continue;

            const isCurrentlyDisabled = file.endsWith('.asg-disabled');
            const cleanFileName = isCurrentlyDisabled ? file.replace(/\.asg-disabled$/, '') : file;
            const canonicalPath = path.join(targetDir, cleanFileName);
            const baseName = path.parse(cleanFileName).name;

            if (builtIns[target.name]?.includes(baseName.toLowerCase())) continue;

            results.push({
              id: `${target.name}::${sub}::${baseName}`,
              label: `${baseName} (${target.name})`,
              description: `[${target.name.toUpperCase()} / ${sub}]`,
              canonicalPath
            });
          }
        } catch {}
      }
    }

    return results;
  }

  // 2. Diskteki fiziksel isimleri senkronize et
  function syncFilesOnDisk(capabilities: CapabilityItem[], activeIds: string[]) {
    for (const cap of capabilities) {
      const shouldBeActive = activeIds.includes(cap.id);
      const disabledPath = `${cap.canonicalPath}.asg-disabled`;

      if (shouldBeActive) {
        if (fs.existsSync(disabledPath)) {
          try { fs.renameSync(disabledPath, cap.canonicalPath); } catch {}
        }
      } else {
        if (fs.existsSync(cap.canonicalPath)) {
          try { fs.renameSync(cap.canonicalPath, disabledPath); } catch {}
        }
      }
    }
  }

  // 3. Status Bar Rozetini Güncelle
  function updateStatusBar() {
    let activeIds: string[] = [];
    if (fs.existsSync(configPath)) {
      try {
        const raw = fs.readFileSync(configPath, 'utf-8');
        const data: SkillConfig = JSON.parse(raw);
        activeIds = data.activeSkillIds || [];
      } catch {}
    }

    statusBarItem.text = `$(circuit-board) Skills: ${activeIds.length} Aktif`;
    statusBarItem.tooltip = `Agent Skill Gate: ${activeIds.length} adet 3rd-party yetenek devrede. Tıklayarak yönetin.`;
    statusBarItem.show();
  }

  // 4. QuickPick Yönetim Menüsü
const manageSkillsCommand = vscode.commands.registerCommand('agentSkillGate.manageSkills', async () => {
    const capabilities = scanDiscoveredCapabilities();
    if (capabilities.length === 0) {
      vscode.window.showInformationMessage('Sistemde yönetilebilir 3rd-party CLI yeteneği bulunamadı.');
      return;
    }

    // 1. Önce Mod Seçimi Göster
    const profileChoice = await vscode.window.showQuickPick([
      { label: '⚡ Hızlı Geliştirme (Fast Prototyping)', description: 'Guard ve denetim hook\'ları kapalı.', detail: 'prototyping' },
      { label: '🛡️ Güvenlik ve Denetim (Full Guard & Audit)', description: 'Bütün 3rd-party güvenlik/hook araçları devrede.', detail: 'audit' },
      { label: '🧹 Yalın Mod (Clean Slate)', description: 'Bütün 3rd-party araçları kapatır, sıfır gürültü.', detail: 'clean' },
      { label: '⚙️ Özel Yapılandırma (Manuel)', description: 'Yetenekleri tek tek el ile seçin.', detail: 'custom' }
    ], {
      placeHolder: 'Çalışma modunu belirleyin:'
    });

    if (!profileChoice) return;

    let newActiveIds: string[] = [];

    if (profileChoice.detail === 'clean') {
      newActiveIds = [];
    } else if (profileChoice.detail === 'audit') {
      newActiveIds = capabilities.map(c => c.id);
    } else if (profileChoice.detail === 'prototyping') {
      newActiveIds = capabilities
        .filter(c => {
          const lower = c.canonicalPath.toLowerCase();
          return !lower.includes('guard') && !lower.includes('scanner') && !lower.includes('audit') && !lower.includes('check');
        })
        .map(c => c.id);
    } else {
      // Custom / Manuel seçim
      let currentActiveIds: string[] = [];
      if (fs.existsSync(configPath)) {
        try {
          const raw = fs.readFileSync(configPath, 'utf-8');
          currentActiveIds = JSON.parse(raw).activeSkillIds || [];
        } catch {}
      }

      const selected = await vscode.window.showQuickPick(
        capabilities.map(cap => ({
          label: cap.label,
          description: cap.description,
          picked: currentActiveIds.includes(cap.id),
          detail: cap.id
        })),
        { canPickMany: true, placeHolder: 'Yetenekleri tek tek belirleyin:' }
      );

      if (selected === undefined) return;
      newActiveIds = selected.map(s => s.detail!);
    }

    // Config ve Disk Senkronizasyonu
    const updatedConfig: SkillConfig = {
      version: "1.0.0",
      activeSkillIds: newActiveIds,
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(configPath, JSON.stringify(updatedConfig, null, 2), 'utf-8');

    syncFilesOnDisk(capabilities, newActiveIds);
    updateStatusBar();

    vscode.window.showInformationMessage(`Agent Skill Gate: ${profileChoice.label} uygulandı (${newActiveIds.length} aktif).`);
  });

  context.subscriptions.push(manageSkillsCommand);

  // Dosya dışarıdan (terminal TUI üzerinden) değişirse status bar'ı otomatik tazele
  const watcher = vscode.workspace.createFileSystemWatcher(configPath);
  watcher.onDidChange(() => updateStatusBar());
  watcher.onDidCreate(() => updateStatusBar());
  context.subscriptions.push(watcher);

  updateStatusBar();
}

export function deactivate() {}