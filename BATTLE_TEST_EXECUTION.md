# CVM Battle Test Execution Plan

**Date:** November 15, 2025
**Duration:** ~2 hours
**Goal:** Verify CVM works in real-world usage before v0.1.0 release

---

## Pre-Test Setup

### 1. Verify Current State
```bash
cd /Users/timapple/Documents/Github/cvm
npm test  # Should show 12/12 passing
```

### 2. Clean Slate
```bash
# Remove any existing CVM installation
rm -rf ~/.cvm

# Verify system Claude still works
~/.claude/local/claude --version
```

### 3. Link CVM
```bash
npm link
which cvm  # Should show /usr/local/bin/cvm or similar
```

---

## Test Session 1: Basic Functionality (15 minutes)

### Test 1.1: Install Latest Version
```bash
cvm install latest
# Expected: Downloads, extracts, installs successfully
# Check: ~/.cvm/versions/2.0.42/ exists (or whatever latest is)
```

**Pass criteria:**
- ✅ No errors during download
- ✅ Directory created: `~/.cvm/versions/<version>/`
- ✅ Three subdirs exist: `raw/`, `extracted/`, `installed/`
- ✅ Success message shown

**If fails:**
- Check error message
- Verify npm registry accessible
- Check disk space

---

### Test 1.2: Use Installed Version
```bash
cvm use 2.0.42  # or whatever latest is
cvm current
# Expected: Shows 2.0.42
```

**Pass criteria:**
- ✅ Symlink created: `~/.cvm/current`
- ✅ `cvm current` shows correct version
- ✅ No errors

---

### Test 1.3: Run Claude with CVM
```bash
cvm claude --version
# Expected: Shows Claude Code version (should match 2.0.42)
```

**Pass criteria:**
- ✅ Command runs without error
- ✅ Version matches what `cvm current` shows
- ✅ System claude untouched: `~/.claude/local/claude --version` still works

---

### Test 1.4: List Installed Versions
```bash
cvm list
# Expected: Shows 2.0.42 with → marker
```

**Pass criteria:**
- ✅ Version listed
- ✅ Current version marked with →
- ✅ Clean output

---

### Test 1.5: Install Specific Version
```bash
cvm install 2.0.37
# Expected: Downloads and installs 2.0.37
```

**Pass criteria:**
- ✅ Downloads successfully
- ✅ Both versions now exist in `~/.cvm/versions/`
- ✅ Current version unchanged (still 2.0.42)

---

### Test 1.6: Switch Between Versions
```bash
cvm use 2.0.37
cvm current
# Expected: Shows 2.0.37

cvm claude --version
# Expected: Shows 2.0.37

cvm use 2.0.42
cvm current
# Expected: Shows 2.0.42
```

**Pass criteria:**
- ✅ Switch is instant (< 1 second)
- ✅ `cvm current` updates correctly
- ✅ `cvm claude --version` shows correct version
- ✅ No errors

---

## Test Session 2: Edge Cases (20 minutes)

### Test 2.1: Install Already Installed Version
```bash
cvm install 2.0.42
# Expected: "Version 2.0.42 already installed" message
```

**Pass criteria:**
- ✅ Skips reinstall
- ✅ No errors
- ✅ Doesn't re-download

---

### Test 2.2: Use Non-Existent Version
```bash
cvm use 99.99.99
# Expected: Error message
```

**Pass criteria:**
- ✅ Clear error: "Version 99.99.99 not installed"
- ✅ Suggests: "Run: cvm install 99.99.99"
- ✅ Current version unchanged

---

### Test 2.3: Install Non-Existent Version
```bash
cvm install 99.99.99
# Expected: npm error (package not found)
```

**Pass criteria:**
- ✅ Fails gracefully
- ✅ No partial installation left behind
- ✅ `~/.cvm/versions/99.99.99/` doesn't exist

---

### Test 2.4: Uninstall Non-Current Version
```bash
cvm current  # Should show 2.0.42
cvm uninstall 2.0.37
# Expected: Success
```

**Pass criteria:**
- ✅ Version removed
- ✅ Directory deleted: `~/.cvm/versions/2.0.37/` gone
- ✅ Current version unchanged
- ✅ No errors

---

### Test 2.5: Try to Uninstall Current Version
```bash
cvm current  # Should show 2.0.42
cvm uninstall 2.0.42
# Expected: Error blocking this
```

**Pass criteria:**
- ✅ Error: "Cannot uninstall currently active version"
- ✅ Suggests switching first
- ✅ Version NOT removed

---

### Test 2.6: Uninstall Non-Existent Version
```bash
cvm uninstall 99.99.99
# Expected: Error
```

**Pass criteria:**
- ✅ Clear error message
- ✅ No crashes

---

## Test Session 3: One-Off Version Testing (10 minutes)

### Test 3.1: Reinstall Another Version
```bash
cvm install 2.0.37
cvm use 2.0.42
cvm current
# Expected: Shows 2.0.42
```

---

### Test 3.2: One-Off Version Flag
```bash
cvm claude --cvm-version=2.0.37 --version
# Expected: Shows 2.0.37 (temporarily)

cvm current
# Expected: Still shows 2.0.42 (unchanged)
```

**Pass criteria:**
- ✅ Uses 2.0.37 for that one command
- ✅ Doesn't change current version
- ✅ Next `cvm claude` command uses 2.0.42 again

---

### Test 3.3: One-Off with Non-Installed Version
```bash
cvm claude --cvm-version=1.0.0 --version
# Expected: Error (version not installed)
```

**Pass criteria:**
- ✅ Clear error message
- ✅ Suggests installing version first

---

## Test Session 4: Real-World Workflow (30 minutes)

### Test 4.1: Test with Actual File
```bash
# Create a test file
echo "console.log('Hello World');" > /tmp/test.js

# Use CVM version
cvm claude @/tmp/test.js "explain this code"
```

**Pass criteria:**
- ✅ Claude responds correctly
- ✅ Uses CVM-managed version
- ✅ Works like normal claude

---

### Test 4.2: Install Old Version (0.2.x)
```bash
cvm install 0.2.9
cvm use 0.2.9
cvm claude --version
# Expected: Shows 0.2.9
```

**Pass criteria:**
- ✅ Old version installs successfully
- ✅ Can switch to it
- ✅ Works (or shows expected compatibility issues)

**Note:** Old versions might not work with current API - that's OK, just verify CVM handles it

---

### Test 4.3: Install Middle Version (1.0.x)
```bash
cvm install 1.0.0
cvm list
# Expected: Shows 0.2.9, 1.0.0, 2.0.37, 2.0.42
```

**Pass criteria:**
- ✅ Multiple versions coexist
- ✅ All listed correctly
- ✅ Can switch between any of them

---

### Test 4.4: Rapid Version Switching
```bash
for version in 0.2.9 1.0.0 2.0.37 2.0.42; do
  echo "Switching to $version"
  cvm use $version
  cvm current
  cvm claude --version
done
```

**Pass criteria:**
- ✅ All switches work
- ✅ No symlink errors
- ✅ Each version reports correctly

---

### Test 4.5: Clean Up Old Versions
```bash
cvm use 2.0.42
cvm uninstall 0.2.9
cvm uninstall 1.0.0
cvm uninstall 2.0.37
cvm list
# Expected: Only 2.0.42 remains
```

**Pass criteria:**
- ✅ All uninstalls succeed
- ✅ Only current version remains
- ✅ No orphaned files

---

## Test Session 5: Error Recovery (15 minutes)

### Test 5.1: Kill Install Mid-Process
```bash
cvm install 1.5.0 &
PID=$!
sleep 2
kill $PID

# Check cleanup
ls ~/.cvm/versions/
# Expected: 1.5.0 directory might exist but incomplete
```

**Pass criteria:**
- ✅ No crash
- ✅ Can reinstall: `cvm install 1.5.0` works

---

### Test 5.2: Corrupt Symlink Recovery
```bash
# Manually break symlink
rm ~/.cvm/current
ln -s /nonexistent/path ~/.cvm/current

cvm current
# Expected: Shows version name or null gracefully

cvm use 2.0.42
# Expected: Fixes symlink
```

**Pass criteria:**
- ✅ Doesn't crash with broken symlink
- ✅ `cvm use` fixes it

---

### Test 5.3: Missing Binary
```bash
# Corrupt installation
rm ~/.cvm/versions/2.0.42/installed/node_modules/.bin/claude

cvm claude --version
# Expected: Error message
```

**Pass criteria:**
- ✅ Clear error message
- ✅ Doesn't crash
- ✅ Can fix by reinstalling

---

## Test Session 6: Storage Verification (10 minutes)

### Test 6.1: Directory Structure
```bash
tree -L 3 ~/.cvm/
# Or manually check:
ls -la ~/.cvm/
ls -la ~/.cvm/versions/2.0.42/
```

**Expected structure:**
```
~/.cvm/
├── versions/
│   └── 2.0.42/
│       ├── raw/              # Contains .tgz file
│       ├── extracted/        # Contains package.json, cli.js, etc.
│       └── installed/        # Contains node_modules/
├── current -> versions/2.0.42
└── bin/
    └── claude -> ../current/installed/node_modules/.bin/claude
```

**Pass criteria:**
- ✅ All directories exist
- ✅ Symlinks point to correct locations
- ✅ Tarball saved in raw/
- ✅ node_modules in installed/

---

### Test 6.2: Disk Space Check
```bash
du -sh ~/.cvm/
du -sh ~/.cvm/versions/*
```

**Pass criteria:**
- ✅ Reasonable size (~100-200MB per version)
- ✅ No unexpectedly large files

---

## Test Session 7: System Integration (10 minutes)

### Test 7.1: PATH Verification
```bash
echo $PATH
# Should include ~/.cvm/bin if you added it

which claude
# Should show system claude (if using PATH) or nothing

which cvm
# Should show /usr/local/bin/cvm (from npm link)
```

---

### Test 7.2: System Claude Untouched
```bash
~/.claude/local/claude --version
# Expected: Shows system version (unchanged throughout)
```

**Pass criteria:**
- ✅ System Claude still works
- ✅ Version unchanged from start of testing

---

### Test 7.3: Concurrent Usage
```bash
# In Terminal 1:
cvm use 2.0.42
cvm claude --version

# In Terminal 2:
cvm use 2.0.37
cvm claude --version
```

**Note:** Both terminals share the same `current` symlink, so last switch wins

**Pass criteria:**
- ✅ Understand this is global, not per-terminal
- ✅ Document this behavior

---

## Final Verification

### Cleanup Test
```bash
# Remove everything
rm -rf ~/.cvm/

# Reinstall from scratch
cvm install latest
cvm use 2.0.42
cvm claude --version
```

**Pass criteria:**
- ✅ Clean reinstall works
- ✅ No leftover state issues

---

## Test Results Template

Copy this for your test session:

```markdown
# CVM Battle Test Results

**Date:** YYYY-MM-DD
**Tester:** [Your Name]
**macOS Version:** [e.g., Sonoma 14.5]
**Node Version:** [e.g., 20.10.0]
**Duration:** [e.g., 1.5 hours]

## Session 1: Basic Functionality
- [ ] 1.1 Install latest - PASS/FAIL
- [ ] 1.2 Use version - PASS/FAIL
- [ ] 1.3 Run Claude - PASS/FAIL
- [ ] 1.4 List versions - PASS/FAIL
- [ ] 1.5 Install specific - PASS/FAIL
- [ ] 1.6 Switch versions - PASS/FAIL

## Session 2: Edge Cases
- [ ] 2.1 Already installed - PASS/FAIL
- [ ] 2.2 Non-existent use - PASS/FAIL
- [ ] 2.3 Non-existent install - PASS/FAIL
- [ ] 2.4 Uninstall non-current - PASS/FAIL
- [ ] 2.5 Uninstall current (blocked) - PASS/FAIL
- [ ] 2.6 Uninstall non-existent - PASS/FAIL

## Session 3: One-Off Testing
- [ ] 3.1 Reinstall version - PASS/FAIL
- [ ] 3.2 --cvm-version flag - PASS/FAIL
- [ ] 3.3 One-off non-installed - PASS/FAIL

## Session 4: Real-World
- [ ] 4.1 Actual file test - PASS/FAIL
- [ ] 4.2 Old version (0.2.x) - PASS/FAIL
- [ ] 4.3 Middle version (1.0.x) - PASS/FAIL
- [ ] 4.4 Rapid switching - PASS/FAIL
- [ ] 4.5 Cleanup - PASS/FAIL

## Session 5: Error Recovery
- [ ] 5.1 Kill install - PASS/FAIL
- [ ] 5.2 Broken symlink - PASS/FAIL
- [ ] 5.3 Missing binary - PASS/FAIL

## Session 6: Storage
- [ ] 6.1 Directory structure - PASS/FAIL
- [ ] 6.2 Disk space - PASS/FAIL

## Session 7: Integration
- [ ] 7.1 PATH verification - PASS/FAIL
- [ ] 7.2 System Claude - PASS/FAIL
- [ ] 7.3 Concurrent usage - PASS/FAIL

## Bugs Found
1. [Description]
   - Severity: Low/Medium/High/Critical
   - Steps to reproduce:
   - Expected:
   - Actual:
   - Fix needed:

## Performance Notes
- Install speed: [e.g., ~30 seconds for 2.0.42]
- Switch speed: [e.g., instant]
- Disk usage: [e.g., ~150MB per version]

## Recommendations
- [ ] Ready for v0.1.0 release
- [ ] Needs fixes before release
- [ ] Add tests for: [specific areas]

## Overall Assessment
[Your thoughts on production-readiness]
```

---

## Success Criteria

### Must Pass (Blockers)
- ✅ All Session 1 tests (basic functionality)
- ✅ All Session 2 tests (edge cases)
- ✅ Session 3.2 (--cvm-version flag)
- ✅ Session 7.2 (system Claude untouched)

### Should Pass
- ✅ Most of Session 4 (real-world usage)
- ✅ Session 6 (storage verification)

### Nice to Have
- ✅ Session 5 (error recovery)
- ✅ Old versions work (0.2.x, 1.0.x)

### Known Issues Acceptable
- Old versions might not work with current API (that's OK)
- Windows/Linux not supported (documented)

---

## After Testing

### If All Tests Pass
1. Update STATUS.md with test results
2. Tag version: `git tag v0.1.0`
3. Prepare for open source release

### If Bugs Found
1. Document in GitHub Issues
2. Fix critical bugs
3. Re-run failed tests
4. Update version to 0.1.1 if fixes needed

---

**Estimated Time:** 2 hours
**Best Practice:** Take notes during testing - they'll help with documentation

Ready to start? Pick a session and go! 🚀
