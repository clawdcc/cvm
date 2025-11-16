# Changelog

All notable changes to CVM (Claude Version Manager) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-11-16

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
- **Plugin system** with lifecycle hooks (beforeInstall, afterInstall, beforeSwitch, afterSwitch, etc.)
- **Benchmark plugin** for measuring Claude Code startup performance
- **TypeScript migration** with full type safety

### Fixed
- CommonJS/ESM module compatibility with Node.js 23+
- Inline test guards for CommonJS compatibility

### Documentation
- Comprehensive README with examples
- CLAUDE.md for AI assistants
- Battle testing complete (all 249 versions tested)
- Quick test guide
- Decision log for design choices

### Technical
- **TypeScript** implementation with strict mode
- **tsup** for bundling and builds
- Commander.js for CLI
- Vitest for testing (inline pattern - 14 tests passing)
- CI/CD with GitHub Actions
- macOS-only (by design)

### Battle Testing (Completed Nov 16, 2025)
- ✅ All 249 available versions installed and benchmarked
- ✅ Performance reports generated (3-run averages)
- ✅ Real-world daily usage validated
- ✅ Edge cases tested (uninstall protection, error handling)
- ✅ Plugin system extensively tested
- ✅ 14 unit tests passing

[0.1.0]: https://github.com/yourorg/cvm/releases/tag/v0.1.0
