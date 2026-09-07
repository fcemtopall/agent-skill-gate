# Agent Skill Gate

> Dynamic capability orchestrator, token guard, and in-flight plugin manager for AI coding agents (Claude Code, Gemini CLI, Cursor, Antigravity, etc.).

---

## The Problem

Modern AI coding agents become bloated over time. Every new plugin, workflow suite (such as `get-shit-done` or `everything-claude-code`), custom prompt collection, and lifecycle hook gets dumped globally into system directories (`~/.claude`, `~/.gemini`, `~/.antigravity`).

This architecture creates three critical issues:
1. **Context Window Pollution:** Dozens of inactive slash-commands, instructions, and rule manifests get injected into every model turn, burning thousands of unnecessary tokens.
2. **Unwanted Hook Triggers:** Heavy background audit scripts, linters, and security scanners fire automatically even during rapid prototyping sessions.
3. **Workspace Isolation Void:** Tool configurations remain global and untracked across different projects, branches, and domains.

---

## Architecture Overview

`agent-skill-gate` operates as an orchestration and virtualization proxy between your active workspace and installed AI CLI agents.

```
                  +-----------------------------------+
                  |        AI Coding Agents           |
                  | (Claude Code, Gemini, Cursor etc) |
                  +-----------------+-----------------+
                                    |
                         (Reads hooks & commands)
                                    v
     +-------------------------------------------------------------+
     |                    System Dirs / Vault                      |
     |         (~/.claude, ~/.gemini, ~/.antigravity)              |
     |                                                             |
     |  [Built-in Core Tools]          [3rd-Party Plugins / Hooks] |
     |  Protected & Unmodified         Active:   hook-name.sh      |
     |                                 Disabled: hook-name.sh.asg-disabled
     +-------------------------------------------------------------+
                                    ^
                                    | (Non-destructive toggle)
                  +-----------------+-----------------+
                  |         agent-skill-gate          |
                  |   Harvester & Symlink Manager     |
                  +-----------------+-----------------+
                                    |
          +-------------------------+-------------------------+
          |                                                   |
          v                                                   v
+-------------------+                               +-------------------+
|   Terminal TUI    | <====== Sync State ======>    |  VS Code Status   |
|   (Interactive)   |      .agent-skills.json       |     Bar Item      |
+-------------------+                               +-------------------+
```

### Core Components

- **Harvester Engine:** Discovers tools, prompt manifests, lifecycle hooks, and automation scripts across `~/.claude`, `~/.gemini`, and `~/.antigravity`.
- **Core Guard (Built-in Protection):** Identifies built-in commands natively bundled by the CLI vendor (such as `init`, `help`, `config`, `doctor`) and keeps them protected and permanently active.
- **Non-Destructive Symlink/Rename Isolation:** Inactive capabilities are safely masked with `.asg-disabled` suffixes. Original files, configs, and repos are never purged or altered.
- **Dual-Surface State Sync:** Toggle state changes via the interactive CLI prompt or the VS Code Status Bar; the state file (`.agent-skills.json`) stays strictly synchronized.
- **Git Guard:** Inspects the repository and guarantees `.agent-skills.json` is appended to `.gitignore`, preserving clean commit trees across collaborative teams.
- **MCP Dynamic Proxy (`--serve`):** Mounts a standards-compliant Model Context Protocol server, forwarding only currently enabled capabilities directly to MCP clients like Cursor.

---

## Installation

### Prerequisites

- Node.js 18.0.0 or higher
- npm, pnpm, or yarn

### Global Setup

```bash
# Clone the repository
git clone https://github.com/fcemtopall/agent-skill-gate.git
cd agent-skill-gate

# Install dependencies and build
npm install
npm run build

# Link binary globally
npm link
```

Verify the binary is available:

```bash
agent-skill-gate --help
```

---

## Quick Start & Presets

Run the orchestrator inside any active project:

```bash
agent-skill-gate
```

You will be presented with preset profiles suited for common engineering workflows:

| Preset | Description | Target Use Case |
| :--- | :--- | :--- |
| **⚡ Fast Prototyping** | Suppresses heavy audit, scanning, and guard hooks. | Rapid iteration, MVP scaffolding, minimum token usage. |
| **🛡️ Full Guard & Audit** | Enables all test verifiers, commit guards, and static analyzers. | Pre-release audits, security-sensitive code, production PRs. |
| **🧹 Clean Slate** | Disables all 3rd-party capabilities; retains only vendor built-ins. | Zero gürültü, deterministic debugging, clean baseline testing. |
| **📁 Custom Profiles** | User-defined bundles saved globally in `~/.agent-skill-gate/profiles.json`. | Domain-specific presets (e.g. Fullstack, DevOps, Refactor). |
| **⚙️ Manual Selection** | Granular multiselect checkbox list of all discovered capabilities. | Ad-hoc workspace configurations. |

---

## VS Code & Cursor Integration

### 1. VS Code Extension

Package and install the bundled status bar controller:

```bash
cd vscode-extension
npm install
npm run build
npx @vscode/vsce package --no-dependencies
```

Open VS Code, press `Cmd+Shift+P` (or `Ctrl+Shift+P`), select **Extensions: Install from VSIX...**, and choose the generated `.vsix` file.

The status bar displays:
```text
$(circuit-board) Skills: 3 Active
```
Clicking this indicator opens a QuickPick menu matching the CLI presets and profiles.

### 2. Cursor MCP Setup

Add `agent-skill-gate` as an MCP server in `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "agent-skill-gate": {
      "command": "agent-skill-gate",
      "args": ["--serve"]
    }
  }
}
```

### 3. Claude Code CLI Setup

Register `agent-skill-gate` in Claude Code:

```bash
claude mcp add agent-skill-gate -- agent-skill-gate --serve
```

---

## CLI Reference

```text
Usage: agent-skill-gate [options]

Options:
  (default)       Launch interactive Terminal UI (TUI) for preset/skill management
  --serve         Run the Model Context Protocol (MCP) dynamic gateway daemon
  --reset         Emergency Restore: unmasks all .asg-disabled files system-wide
  -h, --help      Display command line reference
```

---

## Disaster Recovery / Emergency Restore

If you uninstall the tool or need to immediately restore every capability file across all CLI directories back to its unmodified state:

```bash
agent-skill-gate --reset
```

Output:
```text
✓ All 3rd-party CLI capabilities restored to original state.
```

---

## Security & Workspace Hygiene

- **Automatic Ignore:** On first execution within any directory, `agent-skill-gate` detects `.git` and appends `.agent-skills.json` to `.gitignore`.
- **Local State Scope:** Active toggles remain scoped to individual projects without leaking machine-specific paths into collaborative repos.
- **Fail-Safe Renaming:** Renaming operations check file existence on canonical paths before modifying, preventing broken references or duplicate extensions.

---

## Development

```bash
# Clone and enter repo
git clone https://github.com/fcemtopall/agent-skill-gate.git
cd agent-skill-gate

# Install packages
npm install

# Run TypeScript compiler in watch mode
npm run dev

# Run build pipeline
npm run build
```

---

## License

MIT License. See [LICENSE](LICENSE) for full legal text.