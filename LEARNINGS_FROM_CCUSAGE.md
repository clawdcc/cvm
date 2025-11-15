# Learnings from ccusage Project

**Analyzed:** November 15, 2025
**Source:** `/Users/timapple/cc_usage_hourly/ccusage`
**Applied to:** CVM (Claude Version Manager)

---

## 1. Inline Vitest Testing Pattern ✅

### What ccusage Does

- **33 files** with inline tests
- Tests live at bottom of source files
- Guarded with `if (import.meta.vitest != null)`
- Vitest config: `includeSource: ['src/**/*.{js,ts}']`
- Globals enabled: `describe`, `it`, `expect` available without imports

### Example from ccusage

```typescript
// packages/internal/src/pricing.ts
export function calculateTieredCost(tokens, basePrice, tieredPrice) {
  // Implementation...
}

// Inline tests at bottom
if (import.meta.vitest != null) {
  describe('calculateTieredCost', () => {
    it('should calculate cost with tiered pricing', () => {
      const cost = calculateTieredCost(300_000, 3e-6, 6e-6);
      expect(cost).toBeCloseTo((200_000 * 3e-6) + (100_000 * 6e-6));
    });
  });
}
```

### Applied to CVM ✅

- Created `vitest.config.ts` with `includeSource`
- Added inline tests to `lib/version-manager.js`
- 12 unit tests passing
- Tests isolated using `os.tmpdir()`

**Files:**
- [vitest.config.ts](vitest.config.ts)
- [lib/version-manager.js](lib/version-manager.js) (tests at bottom)

---

## 2. CI/CD Pipeline Structure ✅

### What ccusage Does

**CI Pipeline** (`.github/workflows/ci.yaml`):
- Separate jobs for: `lint-check`, `test`, `spell-check`, `schema-check`
- Uses pnpm for monorepo management
- Pinned action versions with commit hashes (security)
- Creates test directories before running tests

**Release Pipeline** (`.github/workflows/release.yaml`):
- Triggered on git tags
- Runs on `ubuntu-latest`
- Uses `--provenance` flag for npm publish
- Generates changelog with `changelogithub`

### Applied to CVM ✅

**CI Pipeline** ([.github/workflows/ci.yml](.github/workflows/ci.yml)):
- Matrix testing: Multiple Node versions (18, 20, 22)
- Matrix testing: Multiple OS (Ubuntu, macOS)
- Runs inline tests: `npm test`
- Integration test: Basic CVM commands

**Release Pipeline** ([.github/workflows/release.yml](.github/workflows/release.yml)):
- Triggered on `v*` tags
- Runs tests before publish
- Uses `--provenance` for npm publish
- Auto-generates GitHub releases

**Differences from ccusage:**
- CVM uses npm (not pnpm) - simpler for single package
- No spell-check/schema-check (not needed for CVM)
- Added multi-OS testing (important for symlinks)

---

## 3. Documentation Structure (CLAUDE.md) ✅

### What ccusage Does

Comprehensive `CLAUDE.md` with sections:
- **Monorepo structure** - Navigation to sub-packages
- **Development commands** - Testing, building, running
- **Architecture overview** - Data flow, key components
- **Code style notes** - Conventions, error handling patterns
- **Git commit conventions** - Conventional commits format
- **Testing guidelines** - Inline vitest pattern
- **Tips for Claude Code** - MCP tools, important reminders

### Applied to CVM ✅

Created comprehensive [CLAUDE.md](CLAUDE.md) with:
- **Project overview** - What CVM does, storage structure
- **Development commands** - Testing, usage examples
- **Architecture overview** - Core components, design decisions
- **Code style** - JavaScript/CommonJS conventions
- **Testing pattern** - Inline vitest with examples
- **Git conventions** - Conventional commits
- **Battle testing plan** - Link to detailed checklist
- **Future work** - Roadmap with phases

**Key additions unique to CVM:**
- Storage structure diagram
- System integration notes (PATH setup)
- Version testing workflow
- Known edge cases

---

## 4. Code Organization Patterns

### What ccusage Does

**Monorepo Structure:**
```
ccusage/
├── apps/           # Bundled applications
│   ├── ccusage/
│   ├── mcp/
│   └── codex/
├── packages/       # Shared libraries
│   ├── terminal/
│   └── internal/
└── docs/          # VitePress documentation
```

**File Naming:**
- Internal files: `_types.ts`, `_utils.ts`, `_consts.ts` (underscore prefix)
- Public API: Regular names without underscore
- Tests: Inline in source files (not separate `*.test.ts`)

**Export Rules:**
- Only export what's actually used by other modules
- Internal constants stay non-exported
- Minimize public API surface

### Applied to CVM

**Simple Structure** (not a monorepo):
```
cvm/
├── bin/           # CLI entry point
│   └── cvm.js
├── lib/           # Core logic
│   └── version-manager.js
├── .github/       # CI/CD workflows
└── docs/          # Documentation (README, CLAUDE.md, etc.)
```

**Why simpler?**
- CVM is a single package, not a monorepo
- Core + CLI is all we need for MVP
- Plugin system will be separate package later

---

## 5. Error Handling Patterns

### What ccusage Does

**Functional Error Handling:**
- Uses `@praha/byethrow` Result type
- Pattern: `Result.try()` for operations that may throw
- Type guards: `Result.isFailure()`, `Result.isSuccess()`
- Early returns instead of ternary operators

**Example:**
```typescript
return Result.pipe(
  Result.try({ try: fetch(url), catch: error => new Error(...) }),
  Result.andThen(response => ...),
  Result.map(data => ...),
  Result.orElse(error => fallback())
);
```

### NOT Applied to CVM (Intentionally)

**CVM uses traditional error handling:**
- `try/catch` blocks
- `throw new Error()` with actionable messages
- Simpler for JavaScript/CommonJS codebase

**Why different?**
- CVM is JavaScript, ccusage is TypeScript
- Functional error handling adds complexity for MVP
- Traditional errors are fine for CLI tool
- Can migrate to Result type later if needed

---

## 6. Testing Strategy

### What ccusage Does

**Test Types:**
1. **Unit tests** - Inline with source (vitest)
2. **Integration tests** - Uses `fs-fixture` for file mocking
3. **CI tests** - Creates directories before running

**Test Isolation:**
- Creates fixture directories for tests
- Cleans up in `afterEach()` hooks
- Never touches real user directories

**Example:**
```typescript
beforeEach(() => {
  testDir = path.join(os.tmpdir(), `test-${Date.now()}`);
  // Create test fixture
});

afterEach(() => {
  fs.rmSync(testDir, { recursive: true });
});
```

### Applied to CVM ✅

**Current Tests:**
- 12 unit tests inline in `lib/version-manager.js`
- Uses `os.tmpdir()` for isolation
- Cleans up in `afterEach()` hooks
- Never touches `~/.cvm/` during tests

**Missing (planned):**
- Integration tests for install → use → uninstall flow
- Real npm registry tests (currently mocked)
- CLI behavior tests

---

## 7. Release Workflow

### What ccusage Does

**Release Process:**
1. Tag version: `git tag v1.2.3`
2. Push tag: `git push --tags`
3. GitHub Actions automatically:
   - Runs tests
   - Publishes to npm with provenance
   - Creates GitHub release with changelog

**Changelog:**
- Uses `changelogithub` for auto-generated changelogs
- Conventional commits enable automatic categorization

### Applied to CVM ✅

**Release Pipeline Ready:**
- [.github/workflows/release.yml](.github/workflows/release.yml) created
- Tests before publish
- npm provenance enabled
- Auto-generated GitHub releases

**Not yet done:**
- No tags created (waiting for battle testing)
- No npm publish (waiting for open source)
- No changelog (will auto-generate on first release)

**When ready:**
```bash
npm version patch  # 0.1.0 → 0.1.1
git push --follow-tags
# GitHub Actions handles the rest
```

---

## 8. What We Learned But Didn't Apply

### Monorepo Tools (pnpm)
- **ccusage uses:** pnpm workspaces for monorepo
- **CVM doesn't need:** Single package project

### TypeScript
- **ccusage uses:** TypeScript with strict mode
- **CVM uses:** JavaScript (simpler for MVP)
- **Future:** May migrate to TypeScript for plugin system

### Bundling (tsdown)
- **ccusage uses:** tsdown for bundled CLI
- **CVM doesn't need:** Direct Node.js execution is fine

### Documentation Site (VitePress)
- **ccusage has:** Full documentation website
- **CVM has:** README + CLAUDE.md (enough for now)

### Spell Checking (typos)
- **ccusage uses:** crate-ci/typos for spell checking
- **CVM doesn't have:** Not critical for MVP

### Schema Validation
- **ccusage has:** JSON schema generation/validation
- **CVM doesn't need:** No config files yet

---

## Summary: What We Actually Applied

✅ **Applied:**
1. Inline vitest testing pattern
2. CI/CD pipeline structure (adapted for npm)
3. CLAUDE.md documentation format
4. Test isolation patterns
5. Release workflow with provenance
6. Conventional commits
7. `.gitignore` best practices

❌ **Not Applied (Intentionally):**
1. Monorepo structure (not needed)
2. pnpm (npm is simpler)
3. TypeScript (JavaScript for MVP)
4. Bundling (direct execution)
5. Functional error handling (too complex for MVP)
6. Documentation site (README is enough)

⏳ **Future Considerations:**
1. TypeScript for plugin system
2. ESLint/Prettier for code style
3. Integration tests
4. Documentation site when we add more features

---

## Impact on CVM

### Before Learning from ccusage
- No tests
- No CI/CD
- No CLAUDE.md
- No `.gitignore`
- No release workflow

### After Learning from ccusage ✅
- 12 inline tests passing
- CI/CD with multi-OS testing
- Comprehensive CLAUDE.md
- Professional `.gitignore`
- Release workflow ready
- Battle testing plan

**Time saved:** ~4 hours (didn't reinvent the wheel)
**Quality improved:** Professional-grade project structure
**Confidence increased:** Ready for open source release

---

**Date:** November 15, 2025
**Status:** Successfully applied learnings to CVM
**Next:** Battle testing → Open source release
