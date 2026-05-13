# Sigil

A semantic document format purpose-built for LLM consumption. Unlike markdown, which has no native type system, every block in a Sigil document carries an explicit semantic type — warnings, steps, triggers, facts, definitions — drawn from a fixed vocabulary. The result is structured content that's unambiguous to parse, queryable without heuristics, and self-describing when retrieved out of context.

**File extension:** `.sgl` | **Status:** Spec draft

---

## The problem

Markdown was designed for humans to read. In LLM contexts it falls short:

- No semantic block types — a paragraph is just a paragraph
- No native metadata or provenance
- No way to express conditionality in procedural content
- Chunks lose context when split for retrieval

Authors compensate with ALL-CAPS, ❌/✅ emojis, ad hoc XML tags, and `**bold**` rules — all of which an LLM has to infer meaning from rather than read directly.

## The solution

Sigil replaces inferred semantics with declared ones:

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

Every block type has one meaning. No inference required.

## Quick reference

| Sigil | Meaning |
|---|---|
| `%%` | Document header |
| `#` | Section |
| `@ trigger` / `@ skip` | Activation conditions |
| `> term` | Definition |
| `! note` / `! warn` / `!! critical` | Warnings by severity |
| `?` | Uncertainty |
| `~ example` | Concrete example |
| `$ step` / `$ if` / `$ else` | Procedural steps and conditionals |
| `^ context` | Rationale (child block) |
| `* fact` | Asserted truth |
| `/ counter` / `/ tradeoff` / `/ exception` | Counterarguments |
| `->` | Typed reference |

## Repo structure

```
SPEC.md              — canonical language definition
CHANGELOG.md         — versioned changes
examples/            — reference documents in Sigil format
tests/conformance/   — input/output pairs all parsers must pass
rfcs/                — proposals for language changes
reference-impl/      — parser, validator, serializer, converter (TypeScript)
```

## Status

The spec is in active draft. The reference implementation has not been started.

See [SPEC.md](SPEC.md) for the full language definition.
