# CodeRabbit Workflow for Open Source Projects

A comprehensive guide to integrating CodeRabbit AI code reviews into your open source development workflow.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Installation & Setup](#installation--setup)
4. [Workflow: Pre-Commit Reviews (CLI)](#workflow-pre-commit-reviews-cli)
5. [Workflow: Pull Request Reviews (GitHub App)](#workflow-pull-request-reviews-github-app)
6. [Configuration Best Practices](#configuration-best-practices)
7. [Free Tier for Open Source](#free-tier-for-open-source)
8. [Advanced Usage](#advanced-usage)

---

## Overview

CodeRabbit is an AI-powered code review platform that provides:

- **Context-aware analysis** with 40+ linters
- **Line-by-line feedback** with one-click fixes
- **Pre-commit reviews** via CLI tool
- **PR reviews** via GitHub App
- **Multiple AI models**: Claude, Codex, Gemini
- **Free Pro tier** for open source projects

### When to Use Each Tool

| Tool | Use Case | Best For |
|------|----------|----------|
| **CLI** | Pre-commit local reviews | Quick checks before committing, catching issues early |
| **GitHub App** | Automated PR reviews | Team collaboration, thorough review, CI/CD integration |
| **VSCode Extension** | Real-time feedback while coding | Active development, immediate feedback |

---

## Prerequisites

- Git repository (GitHub, GitLab, Azure DevOps, or Bitbucket)
- Node.js 14+ (for CLI tool)
- GitHub account with admin access to repository (for GitHub App)
- Open source project (for free Pro tier)

---

## Installation & Setup

### 1. Install CLI Tool

```bash
# Install CodeRabbit CLI globally
curl -fsSL https://cli.coderabbit.ai/install.sh | sh

# Verify installation
coderabbit --version

# Authenticate (opens browser for login)
coderabbit auth login
```

The CLI will be installed to `~/.coderabbit/bin/coderabbit` and added to your PATH.

### 2. Install GitHub App

1. Visit [CodeRabbit GitHub App](https://github.com/apps/coderabbitai)
2. Click **Install** or **Configure**
3. Select your organization or account
4. Choose repositories:
   - **All repositories** (recommended for orgs)
   - **Only select repositories** (for specific projects)
5. Grant permissions:
   - Read access to code
   - Write access to pull requests, issues, and checks
6. Complete installation

### 3. Enable Free Pro Tier

For open source projects:

1. Go to [CodeRabbit Dashboard](https://app.coderabbit.ai/)
2. Navigate to **Settings** → **Billing**
3. Verify your repository is public
4. Free Pro tier will be automatically applied
5. Features included:
   - Unlimited reviews
   - All AI models
   - Priority support
   - Advanced configuration

---

## Workflow: Pre-Commit Reviews (CLI)

Use the CLI for quick local reviews before committing code.

### Basic Usage

```bash
# Review all changes in working directory
coderabbit review

# Review specific files
coderabbit review src/file1.js src/file2.js

# Review with specific AI model
coderabbit review --model claude-3.5-sonnet

# Review and apply suggested fixes automatically
coderabbit review --auto-fix
```

### Recommended Pre-Commit Workflow

```bash
# 1. Make your changes
vim src/feature.js

# 2. Review changes with CodeRabbit
coderabbit review

# 3. Review suggestions and apply fixes
#    - CLI shows line-by-line feedback
#    - Press 'a' to apply fix, 's' to skip, 'q' to quit

# 4. Stage changes after fixes
git add src/feature.js

# 5. Commit
git commit -m "Add new feature"
```

### Integration with Git Hooks (Optional)

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash

echo "Running CodeRabbit pre-commit review..."

# Get staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(js|ts|py|go|java)$')

if [ -n "$STAGED_FILES" ]; then
    coderabbit review $STAGED_FILES --exit-code

    if [ $? -ne 0 ]; then
        echo "❌ CodeRabbit found issues. Fix them or use 'git commit --no-verify' to skip."
        exit 1
    fi
fi

echo "✅ CodeRabbit pre-commit review passed!"
```

Make executable:
```bash
chmod +x .git/hooks/pre-commit
```

---

## Workflow: Pull Request Reviews (GitHub App)

The GitHub App automatically reviews all pull requests.

### Automatic PR Review Flow

1. **Create Pull Request**
   ```bash
   git checkout -b feature/new-feature
   # Make changes
   git add .
   git commit -m "Add new feature"
   git push -u origin feature/new-feature
   # Create PR on GitHub
   ```

2. **CodeRabbit Auto-Review** (happens automatically)
   - CodeRabbit analyzes the PR within 30-60 seconds
   - Posts review comments on specific lines
   - Provides summary comment with:
     - Overview of changes
     - Potential issues
     - Security concerns
     - Performance suggestions
     - Best practice recommendations

3. **Review and Respond**
   - Review CodeRabbit's comments
   - Reply to comments to:
     - Ask for clarification: `@coderabbitai explain this suggestion`
     - Request changes: `@coderabbitai can you suggest a better approach?`
     - Generate code: `@coderabbitai generate a test for this function`
   - Apply suggested fixes directly from comment

4. **Update PR**
   ```bash
   # Make changes based on review
   git add .
   git commit -m "Address CodeRabbit feedback"
   git push
   ```

5. **Re-Review** (automatic on new commits)
   - CodeRabbit reviews new commits
   - Only comments on changed sections
   - Resolves previous comments if issues are fixed

### Interactive Commands

Use these commands in PR comments to interact with CodeRabbit:

```
@coderabbitai review          # Trigger manual review
@coderabbitai pause          # Pause reviews on this PR
@coderabbitai resume         # Resume reviews on this PR
@coderabbitai explain        # Get detailed explanation
@coderabbitai suggest        # Request alternative implementation
@coderabbitai generate tests # Generate test cases
@coderabbitai summary        # Get PR summary
```

---

## Configuration Best Practices

Create `.coderabbit.yaml` in repository root:

```yaml
# .coderabbit.yaml - CodeRabbit configuration

# Language settings
language: en-US

# Review settings
reviews:
  # Request changes vs comment
  auto_review: true
  request_changes_workflow: false  # Use comments instead of blocking

  # High-level summary
  high_level_summary: true

  # Poem in summary (fun touch for open source!)
  poem: true

  # Review full files or just changes
  review_status: "all"  # "all" | "added" | "modified"

# File filters
path_filters:
  # Include
  include:
    - "src/**"
    - "lib/**"
    - "test/**"
    - "*.md"

  # Exclude
  exclude:
    - "dist/**"
    - "build/**"
    - "node_modules/**"
    - "*.min.js"
    - "package-lock.json"

# AI model selection
chat:
  auto_reply: true

# Tone and style
tone_instructions: |
  - Be constructive and encouraging
  - Focus on important issues
  - Provide examples when suggesting changes
  - Consider this is an open source project
  - Acknowledge good code practices

# Custom prompts
knowledge_base:
  - "This project follows the Airbnb JavaScript style guide"
  - "We prioritize code readability over micro-optimizations"
  - "All public APIs must have JSDoc comments"
  - "Security is critical - flag any potential vulnerabilities"

# Performance
early_access: false
auto_title_placeholder: "CodeRabbit"

# Checks
check:
  enabled: true
```

### Minimal Configuration (Recommended Start)

```yaml
# .coderabbit.yaml - Minimal config

reviews:
  auto_review: true
  high_level_summary: true
  poem: false  # Disable for professional projects

path_filters:
  exclude:
    - "dist/**"
    - "node_modules/**"
    - "*.min.js"
```

---

## Free Tier for Open Source

### Eligibility

- Repository must be **public**
- Hosted on GitHub, GitLab, Azure DevOps, or Bitbucket
- Automatically detected and applied

### What's Included

| Feature | Free (Private) | Pro (Open Source) |
|---------|----------------|-------------------|
| Reviews per month | 30 | Unlimited |
| AI models | Codex only | All (Claude, Gemini, Codex) |
| File size limit | 100KB | 500KB |
| Context window | Standard | Large |
| Priority support | No | Yes |
| Custom configuration | Limited | Full |
| Advanced features | No | Yes |

### Verification

1. Visit [CodeRabbit Dashboard](https://app.coderabbit.ai/)
2. Select your repository
3. Check **Settings** → **Billing**
4. Should show: "Pro Plan (Open Source)"

---

## Advanced Usage

### VSCode Extension

1. Install from [VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=coderabbit.coderabbit)
2. Authenticate with your CodeRabbit account
3. Get real-time feedback as you code
4. Right-click on code → "CodeRabbit: Review Selection"

### CLI Advanced Options

```bash
# Review with specific model
coderabbit review --model claude-3.5-sonnet

# Review with custom config
coderabbit review --config .coderabbit-strict.yaml

# Review and output to file
coderabbit review --output review-results.json

# Review PR locally before pushing
git diff main...feature-branch | coderabbit review --diff

# Batch review multiple files with parallel processing
coderabbit review src/**/*.js --parallel 4
```

### CI/CD Integration

Add to `.github/workflows/coderabbit.yml`:

```yaml
name: CodeRabbit Review

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install CodeRabbit CLI
        run: curl -fsSL https://cli.coderabbit.ai/install.sh | sh

      - name: Review changes
        run: |
          coderabbit review --exit-code
        env:
          CODERABBIT_API_KEY: ${{ secrets.CODERABBIT_API_KEY }}
```

### Security Scanning Focus

Create `.coderabbit-security.yaml`:

```yaml
reviews:
  auto_review: true

tone_instructions: |
  - Prioritize security issues above all else
  - Flag any potential injection vulnerabilities
  - Review authentication and authorization logic carefully
  - Check for exposed secrets or credentials
  - Validate input sanitization
  - Review cryptographic implementations

knowledge_base:
  - "Follow OWASP Top 10 security guidelines"
  - "Flag any use of eval() or similar dynamic execution"
  - "Ensure all user input is validated and sanitized"
  - "Check for XSS, CSRF, and injection vulnerabilities"
```

Use for security-critical PRs:
```bash
coderabbit review --config .coderabbit-security.yaml
```

---

## Best Practices Summary

### For Individual Contributors

1. **Pre-commit**: Run CLI review before committing
2. **Small commits**: Easier for AI to review accurately
3. **Respond to feedback**: Engage with CodeRabbit suggestions
4. **Learn patterns**: Notice repeated suggestions to improve code

### For Maintainers

1. **Configure early**: Set up `.coderabbit.yaml` before first PR
2. **Trust but verify**: CodeRabbit is helpful but not infallible
3. **Customize tone**: Adjust for your project's culture
4. **Monitor quality**: Review CodeRabbit's accuracy over time
5. **Educate contributors**: Add CodeRabbit workflow to CONTRIBUTING.md

### For Teams

1. **Consistent config**: Share `.coderabbit.yaml` across projects
2. **CI integration**: Add CodeRabbit to CI/CD pipeline
3. **Clear expectations**: Document when to address CodeRabbit feedback
4. **Balance**: Don't let AI reviews replace human code review

---

## Troubleshooting

### CLI Issues

```bash
# Update CLI
curl -fsSL https://cli.coderabbit.ai/install.sh | sh

# Clear authentication
coderabbit auth logout
coderabbit auth login

# Verbose output for debugging
coderabbit review --verbose
```

### GitHub App Issues

- **No review posted**: Check repository permissions
- **Reviews too slow**: Verify free Pro tier is active
- **Missing comments**: Check `.coderabbit.yaml` path filters
- **Wrong model**: Specify in configuration

### Common Problems

| Problem | Solution |
|---------|----------|
| "Rate limit exceeded" | Wait or upgrade plan |
| "File too large" | Exclude large files in config |
| "Model unavailable" | Switch to different model |
| "No review generated" | Check file extensions in path_filters |

---

## Resources

- **Documentation**: https://docs.coderabbit.ai/
- **CLI Docs**: https://www.coderabbit.ai/cli
- **GitHub App**: https://github.com/apps/coderabbitai
- **Dashboard**: https://app.coderabbit.ai/
- **Support**: support@coderabbit.ai
- **Community**: https://github.com/coderabbitai/discussions

---

## Quick Reference Card

### Common Commands

```bash
# CLI
coderabbit review                    # Review all changes
coderabbit review --auto-fix        # Apply fixes automatically
coderabbit review file.js           # Review specific file
coderabbit auth login               # Authenticate

# PR Comments
@coderabbitai review                # Manual review
@coderabbitai explain               # Get explanation
@coderabbitai suggest               # Alternative approach
@coderabbitai generate tests        # Generate tests
```

### Setup Checklist

- [ ] Install CLI: `curl -fsSL https://cli.coderabbit.ai/install.sh | sh`
- [ ] Authenticate CLI: `coderabbit auth login`
- [ ] Install GitHub App: https://github.com/apps/coderabbitai
- [ ] Verify free Pro tier: Check dashboard billing
- [ ] Create `.coderabbit.yaml`: Basic configuration
- [ ] Test CLI: `coderabbit review`
- [ ] Test PR review: Create a test PR
- [ ] Document workflow: Add to CONTRIBUTING.md or CLAUDE.md

---

**Last Updated**: November 2024
**CodeRabbit Version**: Latest (auto-updates)
**Compatibility**: GitHub, GitLab, Azure DevOps, Bitbucket
