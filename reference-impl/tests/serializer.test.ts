// Requires src/serializer.ts — see the implementation written in chat.
import { describe, it, expect } from 'vitest';
import { serialize } from '../src/serializer';
import type {
  SigilDocument,
  SectionNode,
  WarnNode,
  FactNode,
  TriggerNode,
  SkipNode,
  DefineNode,
  UncertaintyNode,
  ExampleNode,
  StepNode,
  IfNode,
  ElseNode,
  CounterNode,
  ContextNode,
  ReferenceNode,
} from '../src/types';

function makeDoc(blocks: SigilDocument['blocks'] = [], headerOverrides = {}): SigilDocument {
  return {
    header: { doctype: 'reference', ...headerOverrides },
    blocks,
  };
}

describe('serialize — header', () => {
  it('writes the %% line with doctype', () => {
    const out = serialize(makeDoc());
    expect(out).toMatch(/^%% reference/);
  });

  it('includes name and version when present', () => {
    const out = serialize(makeDoc([], { name: 'my-skill', version: '1.0.0' }));
    expect(out).toContain('name: my-skill');
    expect(out).toContain('version: 1.0.0');
  });

  it('writes input and output arrays', () => {
    const out = serialize(makeDoc([], { input: ['url', 'port'], output: ['results'] }));
    expect(out).toContain('input: [url, port]');
    expect(out).toContain('output: [results]');
  });

  it('separates header from body with a blank line', () => {
    const fact: FactNode = { type: 'fact', content: 'x', line: 1 };
    const out = serialize(makeDoc([fact]));
    expect(out).toMatch(/%% reference\n\n/);
  });
});

describe('serialize — block types', () => {
  it('serializes a section', () => {
    const section: SectionNode = { type: 'section', content: 'Overview', children: [], line: 1 };
    const out = serialize(makeDoc([section]));
    expect(out).toContain('# Overview');
  });

  it('serializes a trigger', () => {
    const trigger: TriggerNode = { type: 'trigger', content: 'user asks', line: 1 };
    const out = serialize(makeDoc([trigger]));
    expect(out).toContain('@ trigger: user asks');
  });

  it('serializes a skip', () => {
    const skip: SkipNode = { type: 'skip', content: 'not applicable', line: 1 };
    const out = serialize(makeDoc([skip]));
    expect(out).toContain('@ skip: not applicable');
  });

  it('serializes a define block', () => {
    const define: DefineNode = { type: 'define', term: 'tokenization', content: 'splitting text', line: 1 };
    const out = serialize(makeDoc([define]));
    expect(out).toContain('> tokenization: splitting text');
  });

  it('serializes a warn note', () => {
    const warn: WarnNode = { type: 'warn', label: 'note', content: 'always close', line: 1 };
    const out = serialize(makeDoc([warn]));
    expect(out).toContain('! note: always close');
  });

  it('serializes a warn warn', () => {
    const warn: WarnNode = { type: 'warn', label: 'warn', content: 'context truncates', line: 1 };
    const out = serialize(makeDoc([warn]));
    expect(out).toContain('! warn: context truncates');
  });

  it('serializes a warn critical with !!', () => {
    const warn: WarnNode = { type: 'warn', label: 'critical', content: 'never commit secrets', line: 1 };
    const out = serialize(makeDoc([warn]));
    expect(out).toContain('!! critical: never commit secrets');
  });

  it('serializes an uncertainty block', () => {
    const q: UncertaintyNode = { type: 'uncertainty', content: 'behavior may differ', line: 1 };
    const out = serialize(makeDoc([q]));
    expect(out).toContain('? behavior may differ');
  });

  it('serializes an example block', () => {
    const ex: ExampleNode = { type: 'example', label: 'basic script', content: 'page.goto(url)', line: 1 };
    const out = serialize(makeDoc([ex]));
    expect(out).toContain('~ basic script');
  });

  it('serializes a step block', () => {
    const step: StepNode = { type: 'step', content: 'validate input', children: [], line: 1 };
    const out = serialize(makeDoc([step]));
    expect(out).toContain('$ step: validate input');
  });

  it('serializes an if block', () => {
    const ifBlock: IfNode = { type: 'if', condition: 'python files found', children: [], line: 1 };
    const out = serialize(makeDoc([ifBlock]));
    expect(out).toContain('$ if: python files found');
  });

  it('serializes an else block', () => {
    const elseBlock: ElseNode = { type: 'else', children: [], line: 1 };
    const out = serialize(makeDoc([elseBlock]));
    expect(out).toContain('$ else:');
  });

  it('serializes a fact block', () => {
    const fact: FactNode = { type: 'fact', content: 'the sky is blue', line: 1 };
    const out = serialize(makeDoc([fact]));
    expect(out).toContain('* fact: the sky is blue');
  });

  it('serializes counter labels', () => {
    for (const label of ['counter', 'tradeoff', 'exception'] as const) {
      const block: CounterNode = { type: 'counter', label, content: 'example', line: 1 };
      const out = serialize(makeDoc([block]));
      expect(out).toContain(`/ ${label}: example`);
    }
  });
});

describe('serialize — context and references', () => {
  it('indents a context block under its parent', () => {
    const context: ContextNode = { type: 'context', content: 'because git history is immutable', line: 2 };
    const warn: WarnNode = {
      type: 'warn',
      label: 'critical',
      content: 'never commit secrets',
      context,
      line: 1,
    };
    const out = serialize(makeDoc([warn]));
    expect(out).toContain('!! critical: never commit secrets');
    expect(out).toMatch(/\n {2}\^ context: because git history is immutable/);
  });

  it('serializes references with -> prefix', () => {
    const ref: ReferenceNode = { type: 'reference', relationship: 'see-also', target: 'other.sgl', line: 2 };
    const fact: FactNode = { type: 'fact', content: 'x', references: [ref], line: 1 };
    const out = serialize(makeDoc([fact]));
    expect(out).toContain('-> see-also: other.sgl');
  });
});

describe('serialize — annotations', () => {
  it('appends annotations in curly braces', () => {
    const fact: FactNode = {
      type: 'fact',
      content: 'the context window is 200k',
      annotations: { confidence: 'high', asof: '2024-11' },
      line: 1,
    };
    const out = serialize(makeDoc([fact]));
    expect(out).toContain('{');
    expect(out).toContain('confidence: high');
    expect(out).toContain('asof: 2024-11');
  });
});

describe('serialize — indentation', () => {
  it('indents children of a section by 2 spaces', () => {
    const fact: FactNode = { type: 'fact', content: 'nested', line: 2 };
    const section: SectionNode = { type: 'section', content: 'Overview', children: [fact], line: 1 };
    const out = serialize(makeDoc([section]));
    expect(out).toMatch(/\n {2}\* fact: nested/);
  });

  it('respects a custom indentSize option', () => {
    const fact: FactNode = { type: 'fact', content: 'nested', line: 2 };
    const section: SectionNode = { type: 'section', content: 'Sec', children: [fact], line: 1 };
    const out = serialize(makeDoc([section]), { indentSize: 4 });
    expect(out).toMatch(/\n {4}\* fact: nested/);
  });
});
