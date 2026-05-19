# Sigil Conformance Tests

Language-agnostic test suite for Sigil parser implementations. Any conformant parser must produce output matching these cases.

## Structure

```
conformance/
  valid/         # Documents that must parse successfully
  invalid/       # Documents that must fail (parse error or validation error)
  run.js         # Test runner (requires Node.js 18+)
```

Each test case is a directory containing:

- `input.sgl` — the Sigil document to parse
- `expected.json` — the expected output or failure descriptor

### Valid cases

`expected.json` contains the full parse result: `{ header, blocks }`. A conformant implementation must produce a structurally identical result (including `line` numbers and all optional fields when present).

### Invalid cases

`expected.json` contains a failure descriptor:

```json
{
  "shouldFail": true,
  "mode": "strict | validate",
  "errorType": "SigilParseError | SigilValidationError",
  "description": "human-readable explanation"
}
```

- `mode: "strict"` — the document must fail when parsed in strict mode
- `mode: "validate"` — the document parses successfully but fails validation

A conformant implementation must either throw / return an error, or exit non-zero via CLI, for all invalid cases.

## Running against the reference implementation

```bash
node run.js
```

## Running against a custom implementation

Your CLI must support:

```
cli parse [--mode strict|lenient] [--pretty] <file>   # prints JSON to stdout
cli validate <file>                                    # exits 0 if valid, 1 if not
```

```bash
node run.js --parser path/to/your/cli.js
```

## Test cases

| # | Name | What it tests |
|---|------|---------------|
| valid/01 | minimal-header | `%% doctype` with no metadata or body |
| valid/02 | full-header | All header fields: name, version, description, input, output |
| valid/03 | facts | `* fact` blocks |
| valid/04 | warn-levels | `! note`, `! warn`, `!! critical` |
| valid/05 | section-with-children | `#` sections containing child blocks |
| valid/06 | counters | `/ counter`, `/ tradeoff`, `/ exception` |
| valid/07 | triggers-and-skips | `@ trigger` and `@ skip` blocks |
| valid/08 | annotations | Built-in and `x-` custom annotation keys |
| valid/09 | references | All six `->` relationship types |
| valid/10 | conditionals | `$ if` / `$ else if` / `$ else` chain |
| valid/11 | context-nodes | `^ context` attached to warn, fact, counter |
| valid/12 | examples | `~ example` blocks |
| valid/13 | steps | `$ step` blocks with and without children |
| valid/14 | define | `> term: definition` blocks |
| valid/15 | uncertainty | `?` blocks with and without annotations |
| invalid/01 | missing-header | Document without a `%%` line |
| invalid/02 | invalid-doctype | Unknown doctype (`notebook`) |
| invalid/03 | bad-version | Semver format violation (`1.0` instead of `1.0.0`) |
| invalid/04 | invalid-confidence | `confidence: very-high` (not in closed enum) |
| invalid/05 | nested-section | `#` inside another `#` |
