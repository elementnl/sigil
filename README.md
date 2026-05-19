<div align="center">

# Sigil

**A semantic document format for LLM-native content.**

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.2.0-blue.svg)](CHANGELOG.md)
[![npm](https://img.shields.io/badge/npm-sigil--lang-red.svg)](https://www.npmjs.com/package/sigil-lang)

[Spec](SPEC.md) · [Examples](EXAMPLES.md) · [Changelog](CHANGELOG.md)

</div>

---

Sigil is a document format designed for LLM consumption and generation. Every block has an explicit semantic type — facts, warnings, steps, examples, conditionals — drawn from a fixed vocabulary. Where markdown requires a reader to infer meaning from formatting, Sigil declares it.

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

## Using Sigil with LLMs

No install required. Include the spec in your system prompt and tell the model to write `.sgl` files. Current models can generate valid Sigil from the spec alone.

For a concise prompt-ready version of the format, see [SPEC.md](SPEC.md).

## CLI

```bash
npm install -g sigil-lang
```

```bash
sigil parse skill.sgl --pretty       # parse to JSON AST
sigil validate skill.sgl             # check spec compliance
sigil serialize skill.sgl            # roundtrip (parse + re-serialize)
sigil convert skill.sgl --to markdown  # convert to markdown
sigil convert README.md --to sigil   # convert from markdown
```

## API

```bash
npm install sigil-lang
```

```typescript
import { parse, validate, serialize } from 'sigil-lang';
import { readFileSync } from 'fs';

const { document, warnings } = parse(readFileSync('skill.sgl', 'utf-8'));

document.header.doctype   // 'skill'
document.blocks           // Block[]

// filter by semantic type
const facts    = document.blocks.filter(b => b.type === 'fact');
const triggers = document.blocks.filter(b => b.type === 'trigger');
const steps    = document.blocks.filter(b => b.type === 'step');

// validate against the spec
const { valid, errors } = validate(document);

// re-serialize to .sgl
const output = serialize(document);
```

Parser modes:

```typescript
// strict (default) — throws on any spec violation
const { document } = parse(input, { mode: 'strict' });

// lenient — best-effort parsing for LLM-generated output
const { document, warnings } = parse(input, { mode: 'lenient' });
```

## Repo

```
SPEC.md              — canonical language definition
EXAMPLES.md          — annotated examples
examples/            — reference documents in Sigil format
tests/conformance/   — input/output pairs all parsers must pass
rfcs/                — proposals for language changes
reference-impl/      — TypeScript parser, validator, serializer, converter
```

## Status

Spec is in active draft (`v0.1.0`). Reference implementation is published as [`sigil-lang`](https://www.npmjs.com/package/sigil-lang) on npm (`v0.2.0`).

## License

MIT
