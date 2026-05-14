# Changelog

All notable changes to the Sigil spec will be documented here. Follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and [Semantic Versioning](https://semver.org/).

---

## [0.1.0] — 2026-05-14

Initial spec release.

### Added
- Document header (`%%`) with 13 doctypes, semver versioning, and queryable metadata fields
- Block type vocabulary — 18 block types across 11 sigils
- Three warning severity levels: `! note`, `! warn`, `!! critical`
- Conditional blocks: `$ if`, `$ else if`, `$ else` (one level of nesting)
- Inline annotations: `{confidence:}`, `{asof:}`, `{status:}`, `{source:}`, `{lang:}` and `x-` custom keys
- Typed references (`->`) with 6 relationship types and `x-` custom types
- Indentation rules: 2-space strict, with strict and lenient parser modes
- Two annotated example documents in `examples/`
