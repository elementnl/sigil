# Sigil Examples

Annotated examples showing the format in action. Each example is a complete, valid `.sgl` document with commentary explaining the decisions.

For the full language definition see [SPEC.md](SPEC.md).

---

## Example 1: Skill file

The flagship use case. A skill file tells an LLM what a tool does, when to use it, how to use it, and what to avoid. Compare this to the markdown version — the same information, but every block now has an explicit semantic type.

```
%% skill
name: webapp-testing
version: 1.0.0
description: Tests local web applications using Playwright
input: [url, port]
output: [test-results]
```

The `%%` header is queryable without reading the body. A routing system can filter on `doctype`, `name`, or `input` before loading any content. `version` follows semver — LLM-generated documents can maintain version history.

```
@ trigger: user asks to test a web application
@ trigger: user mentions Playwright
@ skip: user is testing a CLI tool
@ skip: user is on a system without a browser
```

`@ trigger` and `@ skip` are the routing layer. Multiple triggers mean OR — any one activates the skill. Multiple skips mean OR — any one blocks it. Plain English, no structured syntax required. An LLM routing between skills reads these directly without parsing prose section headers.

```
# Overview

  * fact: use native Python Playwright scripts for all web testing
    ^ context: Playwright is the most reliable option for dynamic apps —
      it waits for JS execution unlike simpler HTTP-based tools

  * fact: helper scripts live in scripts/ — always run with --help before reading source
    ^ context: scripts can be large and pollute the context window —
      treat them as black boxes and invoke directly
```

`* fact` states what is true. `^ context` is a child block — it travels with the fact it explains. If this document is chunked for RAG retrieval, the context stays attached to the fact it annotates. In markdown, the rationale is a separate sentence that can be separated from the rule it explains.

```
# Decision Tree

  $ if: app is static HTML
    $ step: read the HTML file directly to identify selectors
    $ step: write Playwright script using discovered selectors
  $ else:
    $ if: server is not already running
      $ step: run python scripts/with_server.py --help
      $ step: start the server using the helper script
    $ else:
      $ step: navigate and wait for networkidle
      $ step: inspect DOM to identify selectors
      $ step: execute actions with discovered selectors
```

`$ if / $ else` makes conditional logic machine-readable. In the original markdown document this was an ASCII decision tree — visually clear but unparseable. Here the branching structure is explicit. Steps are ordered — sequence matters. One level of nesting: `$ if` inside `$ step` is valid, `$ if` inside `$ if` is not.

````
# Writing Scripts

  ! warn: always wait for networkidle before inspecting the DOM
    ^ context: JS hasn't finished loading — selectors will not resolve correctly

  ! note: always close the browser when done
  ! note: use descriptive selectors — prefer text=, role=, or IDs over CSS paths

  ~ example: basic script
    ```python
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto('http://localhost:5173')
        page.wait_for_load_state('networkidle')
        browser.close()
    ```

  / counter: wrong approach — acting before networkidle
    ```python
    page.goto('http://localhost:5173')
    page.locator('button').click()       # too early — JS still loading
    page.wait_for_load_state('networkidle')
    ```
    ^ context: the locator executes before JS has finished —
      the selector will not resolve and the action will silently fail
````

Three warning levels in action: `! warn` for a real correctness risk, `! note` for soft guidelines. `~ example` is always a positive example of correct usage. `/ counter` is always a negative example — what not to do. They're separate block types because they answer different questions: `~` says "here's how it works," `/` says "here's what breaks."

---

## Example 2: System prompt

A system prompt for a coding assistant. In production these are plain prose or markdown — semantic types have to be inferred. Here every constraint, rule, and behavioral default is declared.

```
%% prompt
name: coding-assistant
version: 1.0.0
description: General-purpose coding assistant
```

```
@ trigger: user is working on a software engineering task
@ skip: user explicitly asks for a non-Anthropic model
```

```
# Behavior

  * fact: default model is claude-opus-4-7 {asof: 2026-04, confidence: high}
    ^ context: always use the most capable model — downgrading is the user's decision

  ! note: match response length to task complexity
  ! note: do not summarize what you just did unless asked

  !! critical: never expose secrets, API keys, or credentials in code or logs
    ^ context: secrets in version history are permanent even after deletion —
      a credential pushed once is exposed even if the commit is later removed

  ! warn: do not modify tests to make them pass — fix the code instead
    ^ context: a passing test suite with modified tests provides false confidence
```

`!! critical` vs `! warn` vs `! note` — three severity levels, each unambiguous. In Claude Code's actual system prompt, four different ad hoc conventions are used to signal severity: "IMPORTANT:", "MUST", "should", and ALL-CAPS. Here severity is declared, not inferred.

The `{asof: 2026-04}` annotation on the model fact flags it as time-sensitive. A retrieval system can surface stale facts for review. Without this, a document retrieved months later has no signal about which facts might be outdated.

```
# Code Standards

  * fact: prefer editing existing files over creating new ones
  * fact: do not add comments unless the WHY is non-obvious
  * fact: do not add error handling for scenarios that cannot happen

  / tradeoff: verbosity vs. brevity in responses
    More detail helps with complex tasks but adds noise for simple ones.
    The right level depends on task complexity — match accordingly.

  / exception: error handling is appropriate at system boundaries
    ^ context: user input and external APIs can produce unexpected values —
      validate there, not in internal code paths
```

`/ tradeoff` captures genuine two-sided tensions with no clear winner — common in engineering guidelines but impossible to express in markdown without prose. `/ exception` carves out a specific case where the parent rule doesn't apply, keeping the rule clean while acknowledging the real-world nuance.

```
# Security

  !! critical: never assist with credential harvesting or mass exploitation
  ! warn: flag potential security vulnerabilities in code you review
  ! warn: never introduce code that logs or exposes PII

  -> see-also: https://owasp.org/www-project-top-ten
```

`->` typed references replace bare links. "See also" is the relationship type — a consuming system knows this is supplementary reading, not a dependency. Other relationship types (`depends-on`, `contradicts`, `supersedes`) carry different semantic weight.

---

## Example 3: Reference document (RAG chunk)

A knowledge base document about prompt caching. This is the RAG use case — each chunk retrieved carries its semantic type, provenance, and confidence level. The model reading a retrieved chunk knows immediately what kind of content it is.

```
%% reference
name: prompt-caching-guide
version: 2.1.0
description: How prompt caching works and how to use it effectively
```

```
# How Prompt Caching Works

  > cache breakpoint: a marker placed in a prompt that tells the API where
    to cache the prefix up to that point

  * fact: caching uses prefix matching — any change before a breakpoint
    invalidates everything after it {confidence: high, asof: 2026-04}

  * fact: minimum cacheable prefix is 1024 tokens {confidence: high, asof: 2026-04}
    ^ context: shorter prefixes silently won't cache — no error is thrown

  * fact: maximum 4 cache breakpoints per request {confidence: high, asof: 2026-04}

  ? whether ephemeral cache TTL will be extended beyond 5 minutes {confidence: low}
```

`> define` gives terms explicit definitions that travel with the document. In markdown, definitions are either inline prose (hard to extract) or a dedicated glossary section (separated from the content that uses the term). Here the definition lives at the point of use.

`?` marks genuine uncertainty. An LLM reading this document treats `?` blocks with lower confidence than `* fact` blocks — it knows not to assert the uncertain content as established fact.

````
# Common Mistakes

  ! warn: putting volatile content before the last cache breakpoint
    ^ context: a timestamp or per-request ID anywhere in the cached prefix
      invalidates the entire cache on every request

  ! warn: verifying cache hits by checking for errors — there are none
    ^ context: cache misses are silent — verify with usage.cache_read_input_tokens

  / counter: incorrect breakpoint placement
    ```python
    # WRONG — timestamp invalidates cache on every request
    system_prompt = f"Current time: {datetime.now()}\n\n{stable_instructions}"
    ```

  ~ example: correct breakpoint placement
    ```python
    # RIGHT — stable content first, volatile content after the breakpoint
    messages = [
        {"role": "user", "content": [
            {"type": "text", "text": stable_reference_doc,
             "cache_control": {"type": "ephemeral"}},   # breakpoint here
            {"type": "text", "text": user_question}     # volatile, after breakpoint
        ]}
    ]
    ```

  -> source: https://docs.anthropic.com/prompt-caching
  -> see-also: token-counting-guide.sgl
````

In a RAG pipeline, each retrieved chunk from this document carries its block type. A chunk containing `! warn` tells the model "this is a hazard." A chunk containing `* fact` tells it "this is established." A chunk containing `?` tells it "treat this with uncertainty." Without Sigil, every chunk is just text — the model has to infer what kind of content it is from the words alone.

---

## Key patterns to remember

**Context travels with its parent:**
```
! warn: the thing to avoid
  ^ context: why you should avoid it
```
If this chunk is retrieved in isolation, the reason is still attached.

**Severity is declared, not inferred:**
```
! note: soft guideline
! warn: real risk
!! critical: hard constraint — do not violate
```

**Conditionals are explicit, not prose:**
```
$ if: condition in plain English
  $ step: what to do
$ else:
  $ step: fallback
```

**Provenance on time-sensitive facts:**
```
* fact: the model supports 1M token context {asof: 2026-04, confidence: high}
```

**Bad examples belong in `/`, not `~`:**
```
~ example: the right way      ← always positive
/ counter: the wrong way      ← always negative
```
