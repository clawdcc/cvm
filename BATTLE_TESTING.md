# CVM Battle Testing Plan

**Created:** November 15, 2025
**Status:** Ready to execute
**Testing approach:** Inline vitest (inspired by ccusage project)

---

## Testing Setup

### ✅ Inline Vitest Pattern Implemented

Following the ccusage project's testing approach:

1. **Tests live in source files** - No separate test files
2. **Guard with `if (import.meta.vitest != null)`** - Tests only run during `npm test`
3. **vitest.config.ts with `includeSource`** - Enables inline testing
4. **12 unit tests** - Testing core functionality

### Test Coverage

```bash
npm test
```

**Current Results:** ✅ 12/12 tests passing

**Tests:**
- `isInstalled()` - Version detection
- `getCurrentVersion()` - Active version detection (including broken symlinks)
- `ensureDirectories()` - Directory creation
- `getLatestVersion()` - npm registry queries
- `uninstall()` - Safe version removal (blocks active version)

---

## Battle Testing Checklist

### Phase 1: Core Functionality ✅

- [x] Unit tests pass (12/12)
- [ ] Install latest version
- [ ] Install specific version
- [ ] Switch between versions
- [ ] List installed versions
- [ ] Uninstall version

### Phase 2: Edge Cases

#### Version Management
- [ ] Install non-existent version (should fail gracefully)
- [ ] Install already installed version (should skip)
- [ ] Uninstall current version (should block)
- [ ] Uninstall non-existent version (should fail gracefully)

#### Version Switching
- [ ] Switch to non-existent version (should fail)
- [ ] Switch between multiple versions (3+)
- [ ] Verify `cvm current` accuracy after each switch

#### CLI Launcher (`cvm claude`)
- [ ] `cvm claude --version` shows correct version
- [ ] `cvm claude --help` works
- [ ] `cvm claude @file.txt "explain"` works
- [ ] `cvm claude --cvm-version=X.X.X` one-off version testing
- [ ] Verify system `claude` remains untouched

### Phase 3: Stress Testing

#### Old Versions (0.2.x)
- [ ] Install 0.2.9 (earliest available)
- [ ] Verify it runs: `cvm use 0.2.9 && cvm claude --version`
- [ ] Uninstall: `cvm uninstall 0.2.9`

#### Middle Versions (1.0.x)
- [ ] Install 1.0.0
- [ ] Switch between 1.0.0 and 2.0.x
- [ ] Verify no symlink conflicts

#### Multiple Versions Installed
- [ ] Install 3+ versions simultaneously
- [ ] Rapid switching between them
- [ ] List shows all correctly

### Phase 4: Real-World Usage

#### Daily Workflow Simulation
- [ ] Install 2.0.37 and 2.0.42
- [ ] Use 2.0.37 for project A
- [ ] Switch to 2.0.42 for project B
- [ ] Switch back to 2.0.37
- [ ] Run `cvm claude` multiple times to verify consistency

#### Error Recovery
- [ ] Kill `npm install` mid-process (Ctrl+C)
- [ ] Verify partial install cleaned up
- [ ] Reinstall same version (should succeed)

#### Storage Testing
- [ ] Verify storage structure:
  ```
  ~/.cvm/
  ├── versions/
  │   ├── 2.0.37/
  │   │   ├── raw/              # Tarball present
  │   │   ├── extracted/        # Package.json exists
  │   │   └── installed/        # node_modules exists
  │   └── 2.0.42/
  ├── current -> versions/2.0.42
  └── bin/
      └── claude -> ../current/installed/node_modules/.bin/claude
  ```

### Phase 5: Integration Testing

#### PATH Integration
- [ ] Add `~/.cvm/bin` to PATH
- [ ] Verify `which claude` shows `~/.cvm/bin/claude` (if using PATH)
- [ ] Verify system claude unaffected: `~/.claude/local/claude --version`

#### Auto-Update Detection (Future)
- [ ] Manually poll for new versions: `cvm list-remote`
- [ ] Compare with `npm view @anthropic-ai/claude-code version`

---

## Test Execution Plan

### Day 1: Core Functionality (30 minutes)

```bash
# Phase 1 & 2: Core + Edge Cases
cvm install 2.0.37
cvm use 2.0.37
cvm current
cvm claude --version
cvm list

cvm install 2.0.42
cvm use 2.0.42
cvm current
cvm claude --version

cvm use 2.0.37
cvm current

# Try to uninstall active version (should fail)
cvm uninstall 2.0.37

# Switch and uninstall
cvm use 2.0.42
cvm uninstall 2.0.37
```

### Day 2: Stress Testing (1 hour)

```bash
# Install old versions
cvm install 0.2.9
cvm install 1.0.0
cvm install 2.0.30

# Rapid switching
for version in 0.2.9 1.0.0 2.0.30 2.0.42; do
  cvm use $version
  cvm claude --version
  cvm current
done

# One-off version testing
cvm claude --cvm-version=2.0.37 --version
cvm current  # Should still be 2.0.42
```

### Day 3: Real-World Simulation (2 hours)

```bash
# Simulate daily workflow
cd ~/project-a
cvm use 2.0.37
cvm claude @requirements.txt "implement this feature"

cd ~/project-b
cvm use 2.0.42
cvm claude @bug-report.md "debug this issue"

# Back to project-a
cd ~/project-a
cvm current  # Verify still 2.0.37? Or switched globally?
```

### Day 4: Error Recovery (30 minutes)

```bash
# Install and kill mid-process
cvm install 1.5.0
# Press Ctrl+C during download or npm install

# Verify cleanup
ls ~/.cvm/versions/1.5.0  # Should not exist or be incomplete

# Reinstall
cvm install 1.5.0  # Should succeed
```

---

## Success Criteria

### Must Pass
- ✅ All unit tests pass (12/12)
- [ ] Install/uninstall cycle works
- [ ] Version switching is instant
- [ ] System claude remains untouched
- [ ] `cvm claude` launcher works correctly
- [ ] No orphaned files after uninstall

### Should Pass
- [ ] Old versions (0.2.x, 1.0.x) work
- [ ] Rapid switching (10+ times) works
- [ ] Error recovery cleans up properly
- [ ] Storage structure matches design

### Nice to Have
- [ ] Multiple projects use different versions simultaneously
- [ ] `--cvm-version` flag for one-off testing

---

## Known Issues / Edge Cases

### Storage Location
- **Current:** Uses `~/.cvm/` (separate from system `~/.claude/`)
- **System Claude:** Lives in `~/.claude/local/`
- **Conflict risk:** None (completely separate)

### Symlinks
- **Current symlink:** `~/.cvm/current` points to active version
- **Bin symlink:** `~/.cvm/bin/claude` points to `../current/installed/node_modules/.bin/claude`
- **Risk:** Broken symlinks if version deleted while active (we block this)

### npm Registry
- **249 versions available** (0.2.9 → 2.0.42)
- **Fetch method:** `npm pack @anthropic-ai/claude-code@X.X.X`
- **Rate limiting:** npm registry allows frequent polling

---

## Post-Testing Checklist

After battle testing passes:

- [ ] Document any bugs found and fixed
- [ ] Update README with battle test results
- [ ] Add `.gitignore`
- [ ] Add LICENSE (MIT)
- [ ] Tag version `0.1.0`
- [ ] Prepare for open source release
- [ ] Begin plugin system design

---

## Testing Log Template

Use this for each testing session:

```
**Date:** YYYY-MM-DD
**Phase:** [1-5]
**Tester:** [Name]
**Duration:** [Time]

### Tests Run
- [ ] Test 1
- [ ] Test 2

### Bugs Found
1. Description
   - Severity: [Low/Medium/High/Critical]
   - Steps to reproduce:
   - Expected behavior:
   - Actual behavior:

### Notes
- Any observations
- Performance notes
- Suggestions
```

---

**Status:** Ready for battle testing
**Next Step:** Execute Day 1 tests (30 minutes)
**Confidence Level:** High (12/12 unit tests passing)
