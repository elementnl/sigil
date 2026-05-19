# Changelog

All notable changes to the Sigil spec will be documented here. Follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and [Semantic Versioning](https://semver.org/).

---

## [0.3.0] — 2026-05-19

### Fixed
- Code fence tracking — lines inside ` ``` ` fences (including `# comments`) are no longer misclassified as Sigil block sigils
- Content indentation — multi-line block content now preserves relative indentation through parse and serialize
- Example labels — `~ example: label` correctly roundtrips; the `example:` prefix was previously stripped during parsing
- Serializer: `/ counter`, `! warn`, `* fact`, `?`, `$ step` blocks with multi-line content now indent continuation lines correctly
- Serializer: `^ context` continuation lines now indent one level deeper than the sigil line

### Added
- Conformance test suite (`tests/conformance/`) — 20 cases covering every block type, all annotation keys, all reference relationship types, and key error conditions
- `make conform` target — builds the reference impl and runs the full conformance suite
- `sigil-lang` published to npm

### Changed
- README updated with install instructions, CLI reference, and API quickstart

---

## [0.2.0] — 2026-05-14

### Added
- Reference implementation (`reference-impl/`) published as the `sigil-lang` npm package
- `parse(input, options)` — tokenizer + AST builder with strict and lenient modes
- `validate(doc)` — full spec rule enforcement: doctypes, warn/counter labels, annotation value constraints, reference relationship types
- `serialize(doc, options)` — AST to `.sgl` text, roundtrip-safe with configurable indent size
- `fromMarkdown(md)` / `toMarkdown(doc)` — best-effort converters between Sigil and Markdown
- Typed error classes: `SigilParseError`, `SigilValidationError`, `SigilSerializationError`
- Formal PEG grammar (`grammar.peggy`) for annotation and reference sub-expressions
- 79 tests across parser, validator, serializer, and converter modules
- TypeScript 5.9, ESLint 10, Prettier 3.8, Vitest 4 toolchain

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
