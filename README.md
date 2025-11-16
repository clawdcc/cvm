# CVM - Claude Version Manager

**nvm for Claude Code** - Manage multiple Claude Code versions with ease.

## Features

- ✅ Install multiple Claude Code versions side-by-side
- ✅ Switch between versions instantly
- ✅ Simple commands (inspired by nvm)
- ✅ 249 versions available (0.2.x → 2.0.x)
- ✅ **Plugin system** with lifecycle hooks
- ✅ **TypeScript** with full type safety
- ✅ Built-in analyzer plugin
- 🍎 **macOS only** (requires symlinks)

## Requirements

- **macOS** (tested on macOS Sonoma 14.x+)
- **Node.js** >= 14.0.0
- **npm** >= 6.0.0

> ⚠️ **macOS only:** CVM uses symlinks for version management. Linux support may work but is untested. Windows is not supported.

## Installation

```bash
# Clone and link
git clone <repo-url> cvm
cd cvm
npm install
npm run build  # Build TypeScript
npm link

# Add to PATH (add to ~/.bashrc or ~/.zshrc)
export PATH="$HOME/.cvm/bin:$PATH"
```

## Quick Start

```bash
# Install latest version
cvm install latest

# Install specific version
cvm install 2.0.37

# Switch to a version
cvm use 2.0.37

# Run Claude with CVM-managed version
cvm claude --version              # Uses current version (2.0.37)
cvm claude @file.txt "explain"    # Run normally

# Use a specific version without switching
cvm claude --cvm-version=2.0.42 --version

# List installed versions
cvm list

# Show current version
cvm current

# See all available versions
cvm list-remote
```

## Commands

| Command | Description |
|---------|-------------|
| `cvm install <version>` | Install a specific version |
| `cvm install latest` | Install the latest version |
| `cvm use <version>` | Switch to a version |
| `cvm claude [...]` | Run Claude with current version |
| `cvm claude --cvm-version=X.X.X [...]` | Run with specific version |
| `cvm list` | List installed versions |
| `cvm list-remote` | Show all available versions |
| `cvm current` | Show active version |
| `cvm uninstall <version>` | Remove a version |
| `cvm which` | Show path to claude binary |
| `cvm plugins` | List loaded plugins |

## Storage

All versions are stored in `~/.cvm/`:

```
~/.cvm/
├── versions/
│   ├── 2.0.37/
│   │   ├── raw/              # Original tarball
│   │   ├── extracted/        # Unpacked source
│   │   └── installed/        # npm installed
│   └── 2.0.42/
│       └── ...
├── plugins/                   # Custom plugins
│   └── benchmark.js          # Example: startup benchmark plugin
├── benchmarks.json            # Performance benchmarks
├── current -> versions/2.0.42  # Active version symlink
└── bin/
    └── claude -> ../current/installed/node_modules/.bin/claude
```

## Examples

### System Claude vs CVM

```bash
# Your system Claude (untouched)
claude --version                    # Uses ~/.claude/local/claude

# CVM-managed Claude
cvm claude --version                # Uses CVM version (e.g., 2.0.37)
```

### Test with older version
```bash
cvm install 1.0.0
cvm use 1.0.0
cvm claude --version               # Shows 1.0.0
```

### One-off version test (no switching)
```bash
cvm current                        # Shows 2.0.37

# Test with 2.0.42 without switching
cvm claude --cvm-version=2.0.42 @file.txt "explain this"

cvm current                        # Still shows 2.0.37
```

### Quick switch for testing
```bash
cvm use 2.0.37
cvm claude --help                  # Uses 2.0.37

cvm use 2.0.42
cvm claude --help                  # Uses 2.0.42
```

### Clean up old versions
```bash
cvm list
cvm uninstall 1.0.0
```

## Version History

**Total available:** 249 versions

- **0.2.x:** 91 versions
- **1.0.x:** 134 versions
- **2.0.x:** 24 versions (current)

## Plugin System

CVM includes a powerful plugin system with lifecycle hooks:

### Example: Benchmark Plugin

The included benchmark plugin measures Claude Code startup performance across versions:

```bash
# Install the benchmark plugin
cp dist/plugins/benchmark.js ~/.cvm/plugins/

# Benchmark a version
cvm benchmark 2.0.42

# Compare two versions
cvm benchmark compare 2.0.37 2.0.42

# View history
cvm benchmark history
```

**Output:**
```
⏱️  Benchmarking Claude Code 2.0.42...
   Cold start: 245ms
   Warm start: 123ms (avg of 3 runs)
✅ Benchmark complete!
```

### Plugin Lifecycle Hooks

Plugins can hook into:
- `beforeInstall` / `afterInstall` - Version installation
- `beforeSwitch` / `afterSwitch` - Version switching
- `beforeUninstall` / `afterUninstall` - Version removal
- `commands` - Add custom CLI commands (like `cvm benchmark`)

## Development

```bash
# Build TypeScript
npm run build

# Watch mode
npm run dev

# Type checking
npm run typecheck

# Run tests
npm test

# Run locally
node dist/cvm.js install latest
```

## Roadmap

- [x] TypeScript migration
- [x] Plugin system for analysis
- [x] Analyzer plugin
- [ ] Auto-update detection
- [ ] Diff between versions
- [ ] Breaking change detection
- [ ] Plugin marketplace

## License

MIT
