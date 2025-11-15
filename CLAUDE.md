# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the CVM (Claude Version Manager) codebase.

## Project Overview

CVM is an nvm-like version manager for Claude Code. It allows developers to:
- Install multiple Claude Code versions side-by-side
- Switch between versions instantly
- Test new versions without affecting system installation
- Use `cvm claude` launcher for CVM-managed versions
- Keep system `claude` installation untouched

**Platform:** macOS only (requires symlinks)
**Storage:** `~/.cvm/` (separate from `~/.claude/`)
**Versions available:** 249 versions (0.2.x → 2.0.x)
**Current status:** MVP complete, ready for battle testing

## Development Commands

**Testing:**
- `npm test` - Run vitest tests (inline tests in source files)
- `npm run test:watch` - Run tests in watch mode

**Usage:**
- `node bin/cvm.js install 2.0.37` - Install version locally
- `node bin/cvm.js use 2.0.37` - Switch to version
- `node bin/cvm.js list` - List installed versions
- `node bin/cvm.js current` - Show active version
- `node bin/cvm.js list-remote` - Show all 249 available versions
- `node bin/cvm.js claude --version` - Run Claude with active CVM version
- `node bin/cvm.js uninstall 2.0.37` - Remove version

**After npm link:**
- `cvm install latest` - Install latest Claude Code version
- `cvm use 2.0.37` - Switch to version
- `cvm claude @file.txt "explain"` - Run Claude with CVM version
- `cvm claude --cvm-version=2.0.42 --help` - One-off version test

## Architecture Overview

### Core Components

1. **VersionManager** (`lib/version-manager.js`)
   - Core logic for version management
   - Methods: `install()`, `use()`, `list()`, `uninstall()`, `getCurrentVersion()`
   - Storage structure management
   - Inline vitest tests at bottom of file

2. **CLI** (`bin/cvm.js`)
   - Commander.js-based CLI interface
   - Special handling for `cvm claude` launcher (bypasses Commander)
   - Extracts `--cvm-version` flag for one-off version selection

3. **Storage Structure:**
   ```
   ~/.cvm/
   ├── versions/
   │   ├── 2.0.37/
   │   │   ├── raw/              # Original tarball
   │   │   ├── extracted/        # Unpacked source
   │   │   └── installed/        # npm installed (node_modules)
   │   └── 2.0.42/
   ├── current -> versions/2.0.42  # Symlink to active version
   └── bin/
       └── claude -> ../current/installed/node_modules/.bin/claude
   ```

### Key Design Decisions

**Why not fork nvm?**
- Bash → JavaScript (better for npm ecosystem)
- Claude Code-specific features needed
- 80% code reuse from automated-analysis-pipeline.js

**Why `cvm claude` instead of replacing system `claude`?**
- User requested "extra syntax instead of replacing root ~claude link"
- Keeps system installation untouched (`~/.claude/local/claude`)
- Clear separation between system and CVM versions

**Why inline tests?**
- Following ccusage project pattern
- Tests co-located with code
- Zero production overhead (stripped in builds)

## Code Style and Conventions

**JavaScript (CommonJS):**
- Using CommonJS (`require`/`module.exports`) not ESM
- Node.js >= 14.0.0 required
- No TypeScript (keeping it simple for MVP)

**Testing Pattern:**
- **Inline vitest tests** - Tests live in source files
- Guard with `if (import.meta.vitest != null)`
- Use `describe`, `it`, `expect` from vitest globals
- Test directory isolation (use `os.tmpdir()` for test storage)

**Error Handling:**
- Throw meaningful errors with actionable messages
- Example: `Version ${version} not installed. Run: cvm install ${version}`
- Cleanup on failure (remove partial installations)

**Console Output:**
- Use emojis for visual feedback (📥 📦 🔧 ✅ ❌ 🔄 🗑️)
- Clear progress indicators
- Show next steps after operations

## Post-Code Change Workflow

After making any code changes, ALWAYS run:

```bash
npm test  # Run all inline tests (12 tests should pass)
```

If tests fail:
1. Fix the failing tests
2. Re-run `npm test`
3. Verify all 12 tests pass

## Git Commit Conventions

Follow Conventional Commits:

```
<type>: <subject>
```

**Type Prefixes:**
- `feat:` - New feature
- `fix:` - Bug fix
- `test:` - Adding or updating tests
- `refactor:` - Code refactoring
- `docs:` - Documentation changes
- `chore:` - Maintenance tasks

**Examples:**
```
feat: add --cvm-version flag for one-off version testing
fix: handle broken symlinks in getCurrentVersion()
test: add unit tests for version switching
docs: update README with battle testing results
chore: add vitest dependency
```

## Testing Guidelines

### Inline Vitest Pattern

Tests are written directly in source files:

```javascript
// Source code
class VersionManager {
  isInstalled(version) {
    return fs.existsSync(path.join(this.versionsDir, version));
  }
}

module.exports = VersionManager;

// Inline tests at bottom
if (import.meta.vitest != null) {
  const { describe, it, expect } = import.meta.vitest;

  describe('isInstalled', () => {
    it('should return false for non-existent version', () => {
      // Test implementation
    });
  });
}
```

### Test Isolation

- Use `os.tmpdir()` for test storage
- Clean up in `afterEach()` hooks
- Never touch real `~/.cvm/` during tests

### Current Test Coverage

- ✅ 12 unit tests passing
- Coverage: `isInstalled`, `getCurrentVersion`, `ensureDirectories`, `getLatestVersion`, `uninstall`
- Missing: Integration tests for full install → use → uninstall flow

## Known Edge Cases

### Version Detection
- `getCurrentVersion()` handles broken symlinks (returns basename of target)
- Returns `null` if no symlink exists

### Uninstall Protection
- **Blocks uninstalling active version** with clear error message
- Suggests switching to another version first

### npm Registry
- 249 versions available (verified working)
- Uses `npm pack` to download tarballs
- Handles non-existent versions gracefully

### Symlink Management
- Uses `fs.symlinkSync()` for version switching
- Updates both `~/.cvm/current` and `~/.cvm/bin/claude` symlinks
- No Windows support yet (symlinks required)

## Battle Testing Plan

See [BATTLE_TESTING.md](BATTLE_TESTING.md) for comprehensive testing checklist.

**Current Status:**
- ✅ Unit tests pass (12/12)
- ⏳ Integration tests pending
- ⏳ Real-world usage testing pending
- ⏳ Stress testing pending

## Future Work

### Phase 1: Open Source Core
- [ ] Battle test MVP
- [ ] Add `.gitignore`
- [ ] Add LICENSE (MIT)
- [ ] Tag version 0.1.0
- [ ] Publish to GitHub

### Phase 2: Plugin System
- [ ] Design plugin architecture
- [ ] Port analyzer from automated-analysis-pipeline.js
- [ ] Create private `cvm-analyzer` package

### Phase 3: Auto-Update Detection
- [ ] Poll npm registry for new versions
- [ ] Watch `~/.claude/local/` for system updates
- [ ] Notify user of breaking changes

## System Integration

### PATH Setup
```bash
# Add to ~/.bashrc or ~/.zshrc
export PATH="$HOME/.cvm/bin:$PATH"
```

### System Claude Remains Untouched
- System: `~/.claude/local/claude` (unchanged)
- CVM: `~/.cvm/bin/claude` (managed by CVM)
- User's existing alias/setup works as before

### Version Testing Workflow
```bash
# Switch globally
cvm use 2.0.37
cvm claude @file.txt "implement feature"

# One-off test (no switching)
cvm claude --cvm-version=2.0.42 @file.txt "test with new version"
cvm current  # Still shows 2.0.37
```

## Tips for Claude Code

- **Always run tests** after code changes: `npm test`
- **Use inline tests** following the vitest pattern from ccusage
- **Test in isolation** using `os.tmpdir()` for test storage
- **Clear error messages** with actionable next steps
- **Visual feedback** using emojis for better UX
- **Commit with conventional format** for clean history

## Important Reminders

- Do what has been asked; nothing more, nothing less
- NEVER create files unless absolutely necessary
- ALWAYS prefer editing existing files over creating new ones
- Run `npm test` after every change
- Keep tests inline with source code
- Use meaningful commit messages

## Related Projects

- **ccusage** - Inline vitest testing pattern inspiration
- **automated-analysis-pipeline.js** - 80% code reuse for CVM
- **nvm** - Conceptual inspiration (but not forked)

---

**Last Updated:** November 15, 2025
**Version:** 0.1.0
**Status:** MVP complete, battle testing in progress
