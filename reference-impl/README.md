# sigil-lang

Parser, validator, serializer, and converter for the [Sigil](https://github.com/elementnl/sigil) document format (`.sgl`).

Sigil is a semantic document format for LLM-native content. Every block has an explicit type — facts, warnings, steps, examples, conditionals — drawn from a fixed vocabulary.

## Install

```bash
npm install sigil-lang
```

## API

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

// lenient — best-effort, useful for LLM-generated output
const { document, warnings } = parse(input, { mode: 'lenient' });
```

Markdown conversion:

```typescript
import { fromMarkdown, toMarkdown } from 'sigil-lang';

const doc = fromMarkdown(markdownString);   // best-effort
const md  = toMarkdown(doc);
```

## CLI

```bash
npm install -g sigil-lang
```

```bash
sigil parse skill.sgl --pretty          # parse to JSON AST
sigil validate skill.sgl                # check spec compliance
sigil serialize skill.sgl               # roundtrip check
sigil convert skill.sgl --to markdown   # convert to markdown
sigil convert README.md --to sigil      # convert from markdown
sigil validate skill.sgl --mode lenient # lenient mode
```

## Links

- [Spec](https://github.com/elementnl/sigil/blob/main/SPEC.md) — full language definition
- [Examples](https://github.com/elementnl/sigil/blob/main/EXAMPLES.md) — annotated walkthroughs
- [Conformance tests](https://github.com/elementnl/sigil/tree/main/tests/conformance) — test suite for alternative implementations
- [Changelog](https://github.com/elementnl/sigil/blob/main/CHANGELOG.md)

## License

MIT
