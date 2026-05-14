<div align="center">

# Sigil

**A semantic document format for LLM-native content.**

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](CHANGELOG.md)
[![Status](https://img.shields.io/badge/status-spec%20draft-yellow.svg)](SPEC.md)

[Spec](SPEC.md) · [Examples](EXAMPLES.md) · [Changelog](CHANGELOG.md)

</div>

---

Sigil gives every block in a document an explicit semantic type, drawn from a fixed vocabulary. Where markdown requires readers to infer meaning from formatting conventions, Sigil declares it.

Designed for machine-primary, human-inspectable content: RAG pipelines, agent memory, skill files, structured generation, and LLM-to-LLM communication.

## Example

```
%% skill
name: webapp-testing
version: 1.0.0

@ trigger: user asks to test a web application
@ skip: user is testing a CLI tool

# Setup
  ! warn: always wait for networkidle before inspecting the DOM
    ^ context: actions execute before JS has finished loading —
      selectors will not resolve correctly

  $ step: start the dev server
  $ step: navigate to the app
  $ step: wait for networkidle
  $ step: run assertions
```

## Block types

| Sigil | Meaning |
|---|---|
| `%%` | Document header |
| `#` | Section |
| `@ trigger` / `@ skip` | Activation conditions |
| `> term` | Definition |
| `! note` / `! warn` / `!! critical` | Warnings by severity |
| `?` | Uncertainty |
| `~` | Concrete example |
| `$ step` / `$ if` / `$ else` | Procedural steps and conditionals |
| `^ context` | Rationale (child block) |
| `* fact` | Asserted truth |
| `/ counter` / `/ tradeoff` / `/ exception` | Counterarguments |
| `->` | Typed reference |

## Repo

```
SPEC.md              — canonical language definition
EXAMPLES.md          — annotated examples
examples/            — reference documents in Sigil format
tests/conformance/   — input/output pairs all parsers must pass
rfcs/                — proposals for language changes
reference-impl/      — parser, validator, serializer, converter (TypeScript)
```

## Status

Spec is in active draft. The reference implementation has not been started. See [SPEC.md](SPEC.md) for the full language definition and [EXAMPLES.md](EXAMPLES.md) for annotated walkthroughs.

## License

MIT
