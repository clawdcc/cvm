# Changelog

All notable changes to CVM (Claude Version Manager) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-11-15

### Added
- Initial release of CVM (Claude Version Manager)
- Install multiple Claude Code versions side-by-side
- Switch between versions instantly with `cvm use`
- `cvm claude` launcher for CVM-managed versions
- `--cvm-version` flag for one-off version testing
- 249 versions available from npm (0.2.x → 2.0.x)
- Safety checks prevent uninstalling active version
- macOS support with symlink-based version management
- Commands: `install`, `use`, `list`, `list-remote`, `current`, `uninstall`, `which`, `claude`

### Fixed
- CommonJS/ESM module compatibility with Node.js 23+
- Inline test guards for CommonJS compatibility

### Documentation
- Comprehensive README with examples
- CLAUDE.md for AI assistants
- Battle testing documentation
- Quick test guide
- Decision log for design choices

### Technical
- CommonJS-based JavaScript implementation
- Commander.js for CLI
- Vitest for testing (inline pattern)
- CI/CD with GitHub Actions
- macOS-only (by design)

[0.1.0]: https://github.com/yourorg/cvm/releases/tag/v0.1.0
