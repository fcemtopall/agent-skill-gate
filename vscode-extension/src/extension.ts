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

  function updateStatusBar() {
    let activeIds: string[] = [];
    if (fs.existsSync(configPath)) {
      try {
        const raw = fs.readFileSync(configPath, 'utf-8');
        const data: SkillConfig = JSON.parse(raw);
        activeIds = data.activeSkillIds || [];
      } catch {}
    }

    statusBarItem.text = `$(circuit-board) Skills: ${activeIds.length} Active`;
    statusBarItem.tooltip = `Agent Skill Gate: ${activeIds.length} capabilities enabled. Click to toggle.`;
    statusBarItem.show();
  }

  const manageSkillsCommand = vscode.commands.registerCommand('agentSkillGate.manageSkills', async () => {
    const capabilities = scanDiscoveredCapabilities();
    if (capabilities.length === 0) {
      vscode.window.showInformationMessage('No manageable 3rd-party CLI capabilities found.');
      return;
    }

    const home = os.homedir();
    const profilesPath = path.join(home, '.agent-skill-gate', 'profiles.json');
    let userProfiles: Array<{ id: string; name: string; description: string; skillIds: string[] }> = [];
    if (fs.existsSync(profilesPath)) {
      try {
        userProfiles = JSON.parse(fs.readFileSync(profilesPath, 'utf-8'));
      } catch {}
    }

    const quickPickOptions: vscode.QuickPickItem[] = [
      { label: '⚡ Fast Prototyping', description: 'Disables heavy audit/guard hooks.', detail: 'builtin:prototyping' },
      { label: '🛡️ Full Guard & Audit', description: 'Enables all safety and review hooks.', detail: 'builtin:audit' },
      { label: '🧹 Clean Slate', description: 'Zero 3rd-party overhead.', detail: 'builtin:clean' },
      ...userProfiles.map(u => ({
        label: `📁 ${u.name}`,
        description: u.description,
        detail: `custom:${u.id}`
      })),
      { label: '⚙️ Manual Selection', description: 'Toggle capabilities individually.', detail: 'manual' }
    ];

    const profileChoice = await vscode.window.showQuickPick(quickPickOptions, {
      placeHolder: 'Select active profile or custom preset:'
    });

    if (!profileChoice || !profileChoice.detail) return;

    let newActiveIds: string[] = [];

    if (profileChoice.detail.startsWith('custom:')) {
      const pId = profileChoice.detail.replace('custom:', '');
      const selectedProfile = userProfiles.find(u => u.id === pId);
      newActiveIds = selectedProfile ? selectedProfile.skillIds : [];
    } else if (profileChoice.detail === 'builtin:clean') {
      newActiveIds = [];
    } else if (profileChoice.detail === 'builtin:audit') {
      newActiveIds = capabilities.map(c => c.id);
    } else if (profileChoice.detail === 'builtin:prototyping') {
      newActiveIds = capabilities
        .filter(c => {
          const lower = c.canonicalPath.toLowerCase();
          return !lower.includes('guard') && !lower.includes('scanner') && !lower.includes('audit') && !lower.includes('check');
        })
        .map(c => c.id);
    } else {
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
        { canPickMany: true, placeHolder: 'Toggle capabilities:' }
      );

      if (selected === undefined) return;
      newActiveIds = selected.map(s => s.detail!);
    }

    const updatedConfig: SkillConfig = {
      version: "1.0.0",
      activeSkillIds: newActiveIds,
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(configPath, JSON.stringify(updatedConfig, null, 2), 'utf-8');

    syncFilesOnDisk(capabilities, newActiveIds);
    updateStatusBar();

    vscode.window.showInformationMessage(`Agent Skill Gate: ${profileChoice.label} applied (${newActiveIds.length} active).`);
  });

  context.subscriptions.push(manageSkillsCommand);

  const watcher = vscode.workspace.createFileSystemWatcher(configPath);
  watcher.onDidChange(() => updateStatusBar());
  watcher.onDidCreate(() => updateStatusBar());
  context.subscriptions.push(watcher);

  updateStatusBar();
}

export function deactivate() {}