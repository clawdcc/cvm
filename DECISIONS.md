# CVM Design Decisions

**Date:** November 15, 2025
**Version:** 0.1.0

---

## 1. Stay with JavaScript (No TypeScript for MVP) ✅

### Decision
**Keep JavaScript for v0.1.0, add TypeScript in v0.2.0 when building plugin system.**

### Rationale

**Against TypeScript now:**
- ✅ MVP is working (12/12 tests passing)
- ✅ Simple codebase (600 LOC)
- ✅ No type-related bugs found
- ⏱️ Rewrite would delay battle testing & release
- 🎯 Goal: Ship working product, not perfect architecture

**For TypeScript later:**
- Plugin system will benefit from type safety
- Better autocomplete for plugin developers
- Easier to maintain as codebase grows > 2000 LOC

### When to Revisit
- **v0.2.0** - When building plugin system
- **2000+ LOC** - When codebase grows significantly
- **Multiple contributors** - When onboarding new developers

### Impact
- **Time saved:** 2-3 hours (no rewrite needed)
- **Technical debt:** Low (easy to migrate later)
- **User impact:** None (works the same)

---

## 2. macOS Only (No Linux/Windows Support) ✅

### Decision
**Target macOS exclusively. Linux may work but is untested. Windows is not supported.**

### Rationale

**Why macOS only:**
- ✅ **You use macOS** - Test what you actually use
- ✅ **Can't test Linux** - No Linux machine available
- ✅ **Symlinks work great on macOS** - No compatibility issues
- ✅ **Claude Code demographic** - Likely macOS developers
- ⏱️ **Faster iteration** - No cross-platform testing overhead
- 🎯 **Better to do one platform well** than three poorly

**Against cross-platform:**
- ❌ Can't test on Linux (don't have machine)
- ❌ Windows symlinks are problematic
- ❌ Additional complexity for MVP
- ❌ Slower CI/CD (multi-OS testing)

### Changes Made

1. **README.md** - Added macOS requirement + warning
2. **package.json** - Added `"os": ["darwin"]`
3. **CI/CD** - macOS-only testing (removed Ubuntu)
4. **CLAUDE.md** - Updated platform requirements
5. **STATUS.md** - Clarified as known limitation

### npm Enforcement
```json
"os": ["darwin"]
```
This prevents installation on non-macOS systems with clear error:
```
npm ERR! notsup Unsupported platform for @yourorg/cvm@0.1.0
npm ERR! notsup Valid OS: darwin
npm ERR! notsup Actual OS: linux
```

### When to Revisit
- **If users request Linux support** - Consider if demand exists
- **If you get a Linux machine** - Can test properly
- **Never for Windows** - Symlink issues too problematic

### Impact
- **Supported users:** macOS developers (primary audience)
- **Unsupported users:** Linux/Windows (can fork if needed)
- **CI/CD speed:** Faster (macOS only)
- **Maintenance:** Simpler (one platform)

---

## 3. Inline Vitest Testing (Following ccusage) ✅

### Decision
**Use inline vitest pattern with tests co-located in source files.**

### Rationale

**Why inline tests:**
- ✅ Following proven pattern from ccusage (33 files)
- ✅ Tests next to code = better maintenance
- ✅ No imports needed (tests have direct access)
- ✅ Zero production overhead (stripped in builds)
- ✅ Self-documenting (tests show usage)

**Against separate test files:**
- ❌ Context switching between files
- ❌ Import overhead
- ❌ Tests can get forgotten/stale

### Implementation
```javascript
// lib/version-manager.js
class VersionManager {
  isInstalled(version) { /* ... */ }
}

module.exports = VersionManager;

// Inline tests at bottom
if (import.meta.vitest != null) {
  describe('isInstalled', () => {
    it('should return false for non-existent version', () => {
      expect(vm.isInstalled('99.99.99')).toBe(false);
    });
  });
}
```

### Results
- ✅ 12 tests passing
- ✅ Tests caught broken symlink bug
- ✅ Easy to maintain

### Impact
- **Developer experience:** Better (tests right there)
- **File length:** +130 LOC in version-manager.js
- **Maintenance:** Easier (can't forget to update tests)

---

## 4. `cvm claude` Launcher (Not Replacing System Claude) ✅

### Decision
**Use `cvm claude` syntax instead of replacing system `claude` binary.**

### User Request
> "i would like that we maybe keep some extra syntax instead of replacing the root ~claude link"

### Rationale

**Why `cvm claude`:**
- ✅ User explicitly requested "extra syntax"
- ✅ System installation untouched (`~/.claude/local/claude`)
- ✅ Clear separation: system vs CVM
- ✅ No PATH conflicts
- ✅ Easy to understand what's happening

**Against replacing system claude:**
- ❌ User didn't want this approach
- ❌ Could break existing setup
- ❌ Harder to revert

### Implementation
- `cvm claude @file.txt "explain"` - Uses CVM version
- `claude @file.txt "explain"` - Uses system version (untouched)
- `cvm claude --cvm-version=2.0.42 --help` - One-off version test

### Storage
```
System: ~/.claude/local/claude          (untouched)
CVM:    ~/.cvm/bin/claude               (managed by CVM)
        ~/.cvm/current -> versions/X.X.X
```

### Impact
- **User workflow:** `cvm claude` instead of just `claude`
- **System safety:** 100% safe (never touches system)
- **Clarity:** Very clear what version you're using

---

## 5. No Monorepo (Simple Structure) ✅

### Decision
**Single package, not a monorepo like ccusage.**

### Rationale

**Why simple structure:**
- ✅ CVM is one package (core + CLI)
- ✅ No shared libraries needed (yet)
- ✅ Easier to understand
- ✅ Simpler tooling (npm, not pnpm)
- ✅ Faster CI/CD

**When monorepo makes sense:**
- Plugin system as separate package
- Multiple CLIs (core, analyzer, etc.)
- Shared libraries between packages

### Current Structure
```
cvm/
├── bin/           # CLI entry point
├── lib/           # Core logic
└── .github/       # CI/CD
```

### Future (v0.2.0+)
```
cvm/              # Monorepo root
├── packages/
│   ├── cvm/      # Core (open source)
│   └── analyzer/ # Plugin (proprietary)
```

### Impact
- **Simplicity:** High (easy to navigate)
- **Build time:** Fast (no monorepo overhead)
- **Future migration:** Easy (can convert to monorepo later)

---

## 6. npm (Not pnpm) ✅

### Decision
**Use npm for package management, not pnpm.**

### Rationale

**Why npm:**
- ✅ Simpler for single package
- ✅ Widely available (comes with Node.js)
- ✅ No extra tooling needed
- ✅ Faster for contributors (no pnpm install)

**Why ccusage uses pnpm:**
- Monorepo with workspaces
- Multiple packages
- Shared dependencies

**CVM doesn't need this:**
- Single package
- No workspaces
- Simple dependency tree

### Impact
- **Setup time:** Faster (no pnpm setup)
- **CI/CD:** Simpler (npm ci)
- **Contributors:** Lower barrier to entry

---

## 7. No Auto-Update Detection (Manual for MVP) ✅

### Decision
**Manual version checking for MVP, auto-update in v0.2.0.**

### Rationale

**For MVP:**
- ✅ `cvm list-remote` works (manual check)
- ✅ Simpler implementation
- ✅ Focuses on core functionality

**For v0.2.0:**
- [ ] Poll npm registry periodically
- [ ] Watch `~/.claude/local/` for system updates
- [ ] Notify user of breaking changes
- [ ] Auto-install on request

### Current Workaround
```bash
cvm list-remote    # See all 249 versions
npm view @anthropic-ai/claude-code version  # Latest
```

### Impact
- **User experience:** Manual (acceptable for MVP)
- **Complexity:** Low (simpler codebase)
- **Future:** Easy to add polling later

---

## Summary Table

| Decision | Choice | Rationale | Impact |
|----------|--------|-----------|--------|
| **Language** | JavaScript | MVP speed > type safety | Fast release |
| **Platform** | macOS only | Test what you use | Quality over quantity |
| **Testing** | Inline vitest | Following ccusage | Better maintenance |
| **Launcher** | `cvm claude` | User request | System safety |
| **Structure** | Single package | Simple > complex | Easy to understand |
| **Package manager** | npm | No monorepo needed | Lower barrier |
| **Auto-update** | Manual (MVP) | Focus on core | Simpler for now |

---

## Future Decisions (v0.2.0+)

### Likely Changes
1. **Add TypeScript** - For plugin system type safety
2. **Add auto-update** - Poll npm registry
3. **Monorepo structure** - When adding analyzer plugin
4. **ESLint/Prettier** - Code quality tooling

### Unlikely Changes
1. **Windows support** - Symlink issues too problematic
2. **Replace system claude** - User explicitly didn't want this
3. **Switch to pnpm** - npm works fine for single package

---

**Philosophy:** Ship a working, focused product for macOS users. Do one platform well. Add complexity only when needed.

**Status:** All decisions aligned with "battle test → ship → iterate" approach.
