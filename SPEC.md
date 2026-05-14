# Sigil Language Specification

**Version:** 0.1.0
**Status:** Draft
**File extension:** `.sgl`

---

## Overview

Sigil is a document format designed for LLM consumption, generation, and interchange. It is machine-primary and human-readable. It is not a replacement for markdown in human-first contexts — its target is machine-primary, human-inspectable content: RAG pipelines, agent memory, skill files, structured generation, and LLM-to-LLM communication.

---

## 1. Document Header

Every Sigil document must begin with a `%%` header on the first line. The header declares the document type and metadata. It is queryable without reading the document body.

### Syntax

```
%% <doctype>
name: <string>
version: <major.minor.patch>
description: <string>
input: [<type>, ...]
output: [<type>, ...]
```

### Doctypes

The doctype is a closed vocabulary. The following values are valid:

| Doctype     | Meaning                                              |
|-------------|------------------------------------------------------|
| `skill`     | Procedural instructions for an LLM tool              |
| `prompt`    | System prompt or instruction set                     |
| `plan`      | Phased project or engineering plan                   |
| `memory`    | Agent memory store                                   |
| `reference` | Knowledge base document or RAG chunk                 |
| `spec`      | Formal specification                                 |
| `guide`     | How-to document or tutorial                          |
| `policy`    | Rules and constraints (security, compliance, style)  |
| `schema`    | Data shape or type definition                        |
| `eval`      | Evaluation set, benchmark, or test cases             |
| `changelog` | Versioned history of changes                         |
| `config`    | Configuration instructions for a tool or system      |
| `sigil`     | A Sigil spec or meta-document about the format itself|

Unknown doctypes are a spec violation.

### Metadata fields

| Field         | Type              | Required for                        | Notes                              |
|---------------|-------------------|-------------------------------------|------------------------------------|
| `name`        | string            | `skill`, `plan`, `spec`, `eval`     | Optional for all other doctypes    |
| `version`     | semver (x.y.z)    | `skill`, `plan`, `spec`, `eval`     | Optional for all other doctypes    |
| `description` | string            | Never required                      | Recommended for all doctypes       |
| `input`       | array of strings  | Never required                      | Meaningful on `skill` and `prompt` |
| `output`      | array of strings  | Never required                      | Meaningful on `skill` and `prompt` |

### Rules

- `%%` must appear on the first line of the document. A document without a `%%` header is invalid.
- The doctype must be one of the values in the closed vocabulary above.
- Metadata fields follow the `%%` line, one per line, in `key: value` format.
- No blank line between the `%%` line and its metadata fields.
- The header ends at the first blank line.
- `version` must follow semver format (`major.minor.patch`). A bare `1.0` is invalid.

### Example

```
%% skill
name: webapp-testing
version: 1.0.0
description: Tests local web applications using Playwright
input: [url, port]
output: [test-results]
```

---

## 2. Block Types

Sigil has a fixed, closed vocabulary of block types. Every block begins with a sigil character on a new line. Scope is defined by indentation — a block ends when indentation returns to the previous level. There are no closing tags or fences.

### Block vocabulary

| Sigil | Labels | Meaning |
|---|---|---|
| `#` | none | Section |
| `@ trigger` | none | Activation condition |
| `@ skip` | none | Exclusion condition |
| `> term` | none | Definition |
| `! note` | `note` | Soft guideline |
| `! warn` | `warn` | Real risk |
| `!! critical` | `critical` | Hard constraint |
| `?` | none | Uncertainty or open question |
| `~` | optional label | Concrete example |
| `$ step` | optional label | Procedural step |
| `$ if` | none | Condition |
| `$ else if` | none | Chained condition |
| `$ else` | none | Fallback |
| `^ context` | none | Rationale (child only, never top-level) |
| `* fact` | `fact` | Asserted truth |
| `/ counter` | `counter` | Counterargument or negative example |
| `/ tradeoff` | `tradeoff` | Two-sided tension |
| `/ exception` | `exception` | Exception to a rule |

Unknown sigils and unknown labels are spec violations.

---

### `#` — Section

Structural division of a document.

**Rules:**
- One level only — `#` is valid, `##` and deeper are spec violations
- `#` is a container — blocks indented under it belong to it
- Sections cannot nest inside other sections
- A section ends when indentation returns to the top level

```
# Getting Started
  ^ context: this section assumes familiarity with tokenization
  * fact: the default model is claude-opus-4-7
  ! warn: exceeding the context window silently truncates input
```

---

### `@` — Trigger and Skip

Declares when a document, section, or step should activate or be excluded.

**Rules:**
- `@ trigger` — condition under which the parent context should activate
- `@ skip` — condition under which it should not activate, even if a trigger matches
- Multiple `@ trigger` lines mean OR — any one activates
- Multiple `@ skip` lines mean OR — any one blocks activation
- Content is plain English — not code or structured syntax
- Can appear anywhere: top level, inside `#` sections, inside `$ step` blocks
- When inside a `$ step`, applies to that step specifically

```
@ trigger: user asks to test a web application
@ trigger: user mentions Playwright
@ skip: project is not a web application
@ skip: user is testing a CLI tool
```

---

### `>` — Define

A term and its meaning.

**Rules:**
- Inline form for short definitions: `> term: definition`
- Block form for longer definitions: term on the sigil line, definition indented below
- `^ context` can nest inside for rationale

```
> tokenization: the process of splitting text into discrete units for model input

> context window
  The maximum number of tokens a model can process in a single request.
  Includes both input and output tokens.
  ^ context: exceeding this limit causes silent truncation on some models
```

---

### `!` and `!!` — Warn levels

Three severity levels for hazards, constraints, and guidelines. Labels are required — a bare `!` or `!!` with no label is a spec violation.

**Labels (closed):** `note`, `warn`, `critical`

**Rules:**
- `! note` — soft guideline, good practice
- `! warn` — real risk, pay attention
- `!! critical` — hard constraint; correctness or security failure if violated
- Inline and block forms both supported
- `^ context` can nest inside

```
! note: always close the browser when done

! warn: exceeding the context window silently truncates input on some models

!! critical: never commit secrets to the repository
  ^ context: git history is immutable — a secret pushed once is exposed
    even if the commit is later removed
```

---

### `?` — Uncertainty

Marks content the author is uncertain about, or that has low confidence regardless of authorship.

**Rules:**
- No label required or supported
- Inline and block forms both supported
- Often paired with inline confidence annotations
- Distinct from `! note` — `! note` is a confident guideline, `?` is uncertain content

```
? this behavior may differ across model versions

? the context window is 200k tokens {confidence: low, asof: 2024-11}

?
  Streaming responses may behave differently on older models.
  Observed on Claude Sonnet 4.6 but not verified on Haiku.
```

---

### `~` — Example

A concrete instance, code sample, or usage demonstration. Always a positive example of correct usage. Negative examples belong in `/ counter`.

**Rules:**
- Optional label: `~ example: label` or bare `~`
- Inline and block forms supported
- Code blocks can appear inside
- `^ context` can nest inside

````
~ example: basic Playwright script
  ```python
  page.goto('http://localhost:5173')
  page.wait_for_load_state('networkidle')
  ```

~ single server setup
  ```bash
  python scripts/with_server.py --server "npm run dev" --port 5173
  ```
````

---

### `$` — Step and Conditionals

Procedural blocks for ordered steps and conditional logic.

**Rules:**
- `$ step` — an ordered procedural step, optional label
- Steps are ordered top to bottom — sequence matters
- `$ if` — a condition, content is plain English
- `$ else if` — chained condition, must follow `$ if` or `$ else if`
- `$ else` — fallback, must follow `$ if` or `$ else if`
- `$ if / $ else` valid at the top level and inside `$ step` blocks
- `$ if` cannot nest inside another `$ if` (one level deep only)
- Any block type can appear inside a `$ step` or `$ if`

```
$ step: validate input
  ! warn: input must be a string, not a buffer
  ~ example: valid input
    "Hello world"

$ step: detect language
  $ if: python files found
    $ step: read python docs
  $ else if: typescript files found
    $ step: read typescript docs
  $ else:
    $ step: ask user which language they are using

$ if: file imports openai
  ! warn: this skill is for Anthropic SDK only
  @ skip: proceed no further
```

---

### `^` — Context

Rationale or background required to understand the parent block.

**Rules:**
- Always a child block — never appears at the top level alone
- Can nest inside any block type
- One `^ context` per parent block — combine multiple reasons into one block
- Plain prose only — no nested blocks inside `^`

```
! warn: never commit secrets to the repository
  ^ context: git history is immutable — a secret pushed once is exposed
    even if the commit is later removed

* fact: the default model is claude-opus-4-7
  ^ context: always use the most capable model unless the user
    explicitly requests otherwise — downgrading is the user's decision
```

---

### `*` — Fact

An asserted truth. Rules, defaults, capabilities, model IDs — anything the author believes to be true. Label `fact` is required.

**Rules:**
- Label `fact` required — bare `*` is a spec violation
- Inline and block forms supported
- Optional inline annotations for confidence and provenance: `{confidence: high, asof: 2024-11}`
- `^ context` can nest inside

```
* fact: the default model is claude-opus-4-7

* fact: Managed Agents is not available on Bedrock {asof: 2026-04, confidence: high}

* fact
  The context window is 1M tokens on Opus 4.7.
  This includes both input and output tokens.
  ^ context: hitting this limit causes silent truncation —
    always monitor token usage in long-running sessions
```

---

### `/` — Counter

Counterarguments, negative examples, tradeoffs, and exceptions. Three labels, closed set.

**Labels (closed):** `counter`, `tradeoff`, `exception`

**Rules:**
- Label required — bare `/` is a spec violation
- `/ counter` — something that doesn't work, or a negative example
- `/ tradeoff` — a genuine two-sided tension with no clear winner
- `/ exception` — a case where the parent rule does not apply
- Inline and block forms supported
- Code blocks can appear inside for negative code examples
- `^ context` can nest inside

````
/ counter: don't use codebase_search for exact text matches
  ^ context: grep is faster and more precise for known strings

/ tradeoff: comprehensive API coverage vs. workflow tools
  More coverage gives agents flexibility but increases cognitive load.
  Workflow tools are convenient but only for specific tasks.

/ exception: budget_tokens is still valid on Opus 4.6 during migration
  ^ context: deprecated but functional as a transitional escape hatch —
    do not use for new code

/ counter: wrong approach — inspecting DOM before networkidle
  ```python
  page.locator('button').click()
  page.wait_for_load_state('networkidle')
  ```
  ^ context: actions execute before JS has finished loading —
    selectors will not resolve correctly
````

---

## 3. Indentation Rules

Sigil uses indentation to define scope. A block's children are everything indented one level deeper than it. There are no closing tags or fences — indentation is the only structural mechanism.

### Rules

- **Spaces only.** Tabs are a spec violation.
- **2 spaces per indent level.** Indentation must be a multiple of 2. Any other indentation is a spec violation.
- A block ends when indentation returns to the parent's level.
- Blank lines are permitted inside a block and do not end it — only indentation level determines scope.
- A block with no indented content below it is a leaf node.

### Example

```
! warn: exceeding the context window silently truncates input
  ^ context: this affects all models — there is no error thrown,
    content is simply cut off

* fact: the default model is claude-opus-4-7
```

Here `^ context` belongs to `! warn` because it is indented one level under it. `* fact` is at the top level — a sibling, not a child.

### Nesting example

```
# Authentication
  * fact: all requests require an API key
    ^ context: keys are scoped per environment — dev and prod keys are separate
  $ step: validate the API key
    $ if: key is missing
      !! critical: reject the request immediately
    $ else:
      $ step: proceed with the request
```

### Parser modes

Implementations must support two parser modes:

| Mode | Behavior on violation |
|---|---|
| **Strict** | Stop parsing, report the violation with a line number. The document is invalid. |
| **Lenient** | Emit a warning with a line number, continue parsing with best-effort interpretation. |

Strict mode is intended for authoring and validation tools. Lenient mode is intended for parsing LLM-generated output where best-effort extraction is preferable to failure.

---

## 4. Inline Annotations

Inline annotations attach metadata directly to a line of content. They appear at the end of any block sigil line or any line of prose, enclosed in curly braces.

### Syntax

```
{key: value, key: value, ...}
```

### Examples

```
* fact: the context window is 200k tokens {confidence: high, asof: 2024-11}
? this may change in future versions {confidence: low}
! warn: budget_tokens is deprecated {asof: 2026-04}
* fact: see the migration guide for details {source: https://docs.anthropic.com}
```

### Built-in keys

Built-in keys are a closed vocabulary. Unknown keys must use the `x-` prefix.

| Key | Valid values | Meaning |
|---|---|---|
| `confidence` | `high`, `medium`, `low` | How confident the author is in this content |
| `asof` | `YYYY-MM` | When this content was last known to be true |
| `source` | any string | Where this content comes from — URL, document name, or person |
| `status` | `draft`, `stable`, `deprecated`, `experimental` | Lifecycle state of this content |
| `lang` | any valid BCP-47 code (`en`, `fr`, `zh`) | Language of the content |

### Value constraints

| Key | Value type |
|---|---|
| `confidence` | Closed enum — `high`, `medium`, `low`. Any other value is a spec violation. |
| `status` | Closed enum — `draft`, `stable`, `deprecated`, `experimental`. Any other value is a spec violation. |
| `asof` | Format-constrained string — `YYYY-MM`. Any other format is a spec violation. |
| `source` | Open string — any value is valid. |
| `lang` | Open string — any BCP-47 language code is valid. |

### Custom keys

Custom keys must be prefixed with `x-`. Any value is valid for custom keys. Tools are not required to understand or validate custom keys.

```
* fact: this rule was reviewed by the security team {x-author: varun, x-reviewed: true}
```

### Rules

- Annotations appear at the end of the line, after content
- Multiple key-value pairs are comma-separated within a single `{}`
- Annotations are valid on any block sigil line and on any prose line
- Annotations are not valid inside `^ context` blocks
- Using a built-in key name without the `x-` prefix but with an invalid value is a spec violation

---

## 5. Typed References

Typed references declare a relationship between a block and another document, section, or resource. The relationship type is explicit — not inferred from context.

### Syntax

```
-> <relationship>: <target>
```

### Examples

```
-> depends-on: #authentication
-> see-also: chunking-strategies.sgl
-> contradicts: #assumption-2
-> source: https://docs.anthropic.com/prompt-caching
-> supersedes: v1-system-prompt.sgl
-> implements: api-design-spec.sgl
```

### Relationship types

Relationship types are a closed vocabulary. Unknown types must use the `x-` prefix.

| Type | Meaning |
|---|---|
| `depends-on` | This block requires the referenced content to be understood first |
| `see-also` | Related content worth reading |
| `contradicts` | This block conflicts with the referenced content |
| `source` | Where this content originally came from |
| `supersedes` | This block replaces the referenced content |
| `implements` | This block is a concrete implementation of the referenced spec or plan |

### Custom relationship types

Custom relationship types must be prefixed with `x-`. Tools are not required to understand or validate custom relationship types.

```
-> x-reviewed-by: varun
-> x-blocks: deploy-step
```

### Target format

Targets are strings. They can point to anything — Sigil documents, markdown files, URLs, section anchors, or arbitrary identifiers. The spec does not restrict target format.

| Target form | Example |
|---|---|
| Section anchor | `#section-name` |
| Sigil document | `chunking-strategies.sgl` |
| Any file | `README.md` |
| URL | `https://docs.anthropic.com` |
| Arbitrary identifier | `assumption-2` |

### Rules

- `->` can appear anywhere — top level, inside any block type
- Multiple `->` lines are valid on the same block
- Relationship type is required — a bare `->` with no type is a spec violation
- Target is required — a `->` with no target is a spec violation
- Using a built-in relationship type name without the `x-` prefix for a non-standard relationship is a spec violation

---
