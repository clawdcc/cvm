# Quick Battle Test (30 minutes)

If you don't have 2 hours, here's the essential tests to run:

---

## Setup (2 minutes)

```bash
cd /Users/timapple/Documents/Github/cvm
npm test  # Verify 12/12 passing
rm -rf ~/.cvm  # Clean slate
npm link  # Link CVM globally
```

---

## Core Tests (20 minutes)

### 1. Install & Use (5 min)
```bash
cvm install latest
cvm use 2.0.42  # or whatever latest is
cvm current
cvm claude --version
```

**Expected:** All commands work, version shown correctly

---

### 2. Multiple Versions (5 min)
```bash
cvm install 2.0.37
cvm list  # Should show both
cvm use 2.0.37
cvm current  # Shows 2.0.37
cvm use 2.0.42
cvm current  # Shows 2.0.42
```

**Expected:** Instant switching, no errors

---

### 3. One-Off Version Test (3 min)
```bash
cvm current  # Shows 2.0.42
cvm claude --cvm-version=2.0.37 --version  # Uses 2.0.37 temporarily
cvm current  # Still shows 2.0.42
```

**Expected:** One-off works, doesn't change current

---

### 4. Safety Checks (3 min)
```bash
cvm current  # Shows 2.0.42
cvm uninstall 2.0.42  # Should BLOCK this
cvm use 2.0.37
cvm uninstall 2.0.42  # Should work now
```

**Expected:** Can't uninstall active version

---

### 5. Real Usage (4 min)
```bash
echo "console.log('test');" > /tmp/test.js
cvm claude @/tmp/test.js "explain this"
```

**Expected:** Claude responds normally

---

## Verification (3 minutes)

```bash
# Check storage
ls -la ~/.cvm/versions/
ls -la ~/.cvm/current
ls -la ~/.cvm/bin/claude

# Verify system untouched
~/.claude/local/claude --version

# Clean up
cvm list
cvm uninstall 2.0.37  # If you want to remove
```

---

## Pass/Fail Checklist

- [ ] Install works
- [ ] Switching works
- [ ] `cvm claude` works
- [ ] One-off `--cvm-version` works
- [ ] Can't uninstall active version
- [ ] Real file test works
- [ ] System Claude untouched

**If all checked:** ✅ Ready for v0.1.0

**If any fail:** See [BATTLE_TEST_EXECUTION.md](BATTLE_TEST_EXECUTION.md) for detailed debugging

---

## Quick Notes Template

```
Date: [today]
Time: [30 min]
Result: PASS / FAIL

Issues found:
- [None] or [List issues]

Ready for release: YES / NO
```

---

**Next:** If this passes, do the full [BATTLE_TEST_EXECUTION.md](BATTLE_TEST_EXECUTION.md) or go straight to v0.1.0 release!
