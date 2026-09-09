# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.1] - 2026-09-09

### Added
- **Branch State Memory (`branchStates`):** Added persistent snapshot tracking per Git branch inside `.agent-skills.json`. Every capability toggle or profile assignment is remembered when switching branches.
- **Hierarchical Snapshot Restoration:** Automatic fallback chain prioritizing existing branch snapshots, then pattern-matched profile rules, and finally inheriting the current clean state.
- **Atomic Git Directory Watcher:** Replaced direct file watching of `.git/HEAD` with parent `.git` directory inspection to handle atomic file renames (`.git/HEAD.lock`) and inode invalidation on macOS and Linux without dropping file descriptors.
- **Automated `.gitignore` Protection:** `GitGuard` automatically registers `.agent-skills.json` into `.gitignore` upon execution to prevent checkout index locks and dirty working tree collisions.

### Changed
- **Cross-Process State Invalidation:** `StateManager` now reloads state from disk synchronously on demand, eliminating cache divergence between background watchers and interactive TUI sessions.
- **Profile Matching Refinement:** Wildcard pattern resolution for branch names (e.g., `feat/*`, `hotfix/*`) directly initialises and writes individual branch snapshots on first visit.

### Fixed
- Fixed race conditions where switching branches with 0 active capabilities would overwrite previously stored branch snapshots with empty arrays.
- Fixed file descriptor loss on macOS caused by Git checkout atomic lock replacements.

---

## [1.0.0] - 2026-09-08

### Added
- Initial release of Agent Skill Gate CLI.
- Harvester module supporting dynamic discovery for Claude Code, Cursor, Windsurf, Roo, and Gemini CLI.
- Symlink virtualization engine with atomic switch and recovery rollback (`--reset` / `--panic`).
- Clack-powered interactive terminal UI for capability and profile management.
- Zero-cost profile archetypes: Minimalist, Fast Prototyping, Full Guard & Audit, and Backend Deep-Dive.