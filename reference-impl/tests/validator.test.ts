import { describe, it, expect } from 'vitest';
import { validate } from '../src/validator';
import type { SigilDocument, SectionNode, IfNode, WarnNode, CounterNode, FactNode, ReferenceNode } from '../src/types';

function makeDoc(overrides: Partial<SigilDocument> = {}): SigilDocument {
  return {
    header: { doctype: 'reference' },
    blocks: [],
    ...overrides,
  };
}

describe('validate — header', () => {
  it('accepts all valid doctypes', () => {
    const doctypes = [
      'skill', 'prompt', 'plan', 'memory', 'reference', 'spec',
      'guide', 'policy', 'schema', 'eval', 'changelog', 'config', 'sigil',
    ] as const;
    for (const doctype of doctypes) {
      const result = validate(makeDoc({ header: { doctype } }));
      expect(result.valid, `expected ${doctype} to be valid`).toBe(true);
    }
  });

  it('rejects an unknown doctype', () => {
    const result = validate(makeDoc({ header: { doctype: 'unknown' as never } }));
    expect(result.valid).toBe(false);
    expect(result.errors[0].rule).toBe('header.doctype');
  });

  it('accepts a valid semver version', () => {
    const result = validate(makeDoc({ header: { doctype: 'skill', version: '1.2.3' } }));
    expect(result.valid).toBe(true);
  });

  it('rejects a bare major.minor version', () => {
    const result = validate(makeDoc({ header: { doctype: 'skill', version: '1.0' } }));
    expect(result.valid).toBe(false);
    expect(result.errors[0].rule).toBe('header.version');
  });

  it('rejects a non-semver version string', () => {
    const result = validate(makeDoc({ header: { doctype: 'skill', version: 'v1.0.0' } }));
    expect(result.valid).toBe(false);
    expect(result.errors[0].rule).toBe('header.version');
  });
});

describe('validate — sections', () => {
  it('accepts a top-level section', () => {
    const section: SectionNode = { type: 'section', content: 'Intro', children: [], line: 5 };
    const result = validate(makeDoc({ blocks: [section] }));
    expect(result.valid).toBe(true);
  });

  it('rejects a section nested inside another section', () => {
    const inner: SectionNode = { type: 'section', content: 'Sub', children: [], line: 6 };
    const outer: SectionNode = { type: 'section', content: 'Outer', children: [inner], line: 5 };
    const result = validate(makeDoc({ blocks: [outer] }));
    expect(result.valid).toBe(false);
    expect(result.errors[0].rule).toBe('section.no-nesting');
  });
});

describe('validate — if nesting', () => {
  it('accepts a top-level $ if', () => {
    const ifBlock: IfNode = { type: 'if', condition: 'x', children: [], line: 5 };
    const result = validate(makeDoc({ blocks: [ifBlock] }));
    expect(result.valid).toBe(true);
  });

  it('rejects a $ if nested inside another $ if', () => {
    const inner: IfNode = { type: 'if', condition: 'y', children: [], line: 6 };
    const outer: IfNode = { type: 'if', condition: 'x', children: [inner], line: 5 };
    const result = validate(makeDoc({ blocks: [outer] }));
    expect(result.valid).toBe(false);
    expect(result.errors[0].rule).toBe('if.no-nesting');
  });
});

describe('validate — warn labels', () => {
  it('accepts valid warn labels', () => {
    for (const label of ['note', 'warn', 'critical'] as const) {
      const block: WarnNode = { type: 'warn', label, content: 'text', line: 1 };
      const result = validate(makeDoc({ blocks: [block] }));
      expect(result.valid, `expected label "${label}" to be valid`).toBe(true);
    }
  });

  it('rejects an invalid warn label', () => {
    const block: WarnNode = { type: 'warn', label: 'alert' as never, content: 'text', line: 1 };
    const result = validate(makeDoc({ blocks: [block] }));
    expect(result.valid).toBe(false);
    expect(result.errors[0].rule).toBe('warn.label');
  });
});

describe('validate — counter labels', () => {
  it('accepts valid counter labels', () => {
    for (const label of ['counter', 'tradeoff', 'exception'] as const) {
      const block: CounterNode = { type: 'counter', label, content: 'text', line: 1 };
      const result = validate(makeDoc({ blocks: [block] }));
      expect(result.valid, `expected label "${label}" to be valid`).toBe(true);
    }
  });

  it('rejects an invalid counter label', () => {
    const block: CounterNode = { type: 'counter', label: 'bad' as never, content: 'text', line: 1 };
    const result = validate(makeDoc({ blocks: [block] }));
    expect(result.valid).toBe(false);
    expect(result.errors[0].rule).toBe('counter.label');
  });
});

describe('validate — annotations', () => {
  it('accepts valid confidence values', () => {
    for (const confidence of ['high', 'medium', 'low'] as const) {
      const block: FactNode = { type: 'fact', content: 'x', annotations: { confidence }, line: 1 };
      const result = validate(makeDoc({ blocks: [block] }));
      expect(result.valid).toBe(true);
    }
  });

  it('rejects an invalid confidence value', () => {
    const block: FactNode = {
      type: 'fact',
      content: 'x',
      annotations: { confidence: 'very-high' as never },
      line: 1,
    };
    const result = validate(makeDoc({ blocks: [block] }));
    expect(result.valid).toBe(false);
    expect(result.errors[0].rule).toBe('annotation.confidence');
  });

  it('rejects an invalid status value', () => {
    const block: FactNode = {
      type: 'fact',
      content: 'x',
      annotations: { status: 'active' as never },
      line: 1,
    };
    const result = validate(makeDoc({ blocks: [block] }));
    expect(result.valid).toBe(false);
    expect(result.errors[0].rule).toBe('annotation.status');
  });

  it('rejects a malformed asof value', () => {
    const block: FactNode = {
      type: 'fact',
      content: 'x',
      annotations: { asof: '2024' },
      line: 1,
    };
    const result = validate(makeDoc({ blocks: [block] }));
    expect(result.valid).toBe(false);
    expect(result.errors[0].rule).toBe('annotation.asof');
  });

  it('accepts a valid asof value', () => {
    const block: FactNode = {
      type: 'fact',
      content: 'x',
      annotations: { asof: '2024-11' },
      line: 1,
    };
    const result = validate(makeDoc({ blocks: [block] }));
    expect(result.valid).toBe(true);
  });

  it('rejects an unknown annotation key without x- prefix', () => {
    const block: FactNode = {
      type: 'fact',
      content: 'x',
      annotations: { 'custom-key': 'val' },
      line: 1,
    };
    const result = validate(makeDoc({ blocks: [block] }));
    expect(result.valid).toBe(false);
    expect(result.errors[0].rule).toBe('annotation.unknown-key');
  });

  it('accepts a custom annotation key with x- prefix', () => {
    const block: FactNode = {
      type: 'fact',
      content: 'x',
      annotations: { 'x-author': 'varun' },
      line: 1,
    };
    const result = validate(makeDoc({ blocks: [block] }));
    expect(result.valid).toBe(true);
  });
});

describe('validate — references', () => {
  it('accepts valid built-in relationship types', () => {
    const types = ['depends-on', 'see-also', 'contradicts', 'source', 'supersedes', 'implements'];
    for (const relationship of types) {
      const ref: ReferenceNode = { type: 'reference', relationship, target: 'some-doc.sgl', line: 1 };
      const block: FactNode = { type: 'fact', content: 'x', references: [ref], line: 1 };
      const result = validate(makeDoc({ blocks: [block] }));
      expect(result.valid, `expected "${relationship}" to be valid`).toBe(true);
    }
  });

  it('rejects an unknown relationship type without x- prefix', () => {
    const ref: ReferenceNode = {
      type: 'reference',
      relationship: 'linked-by',
      target: 'doc.sgl',
      line: 1,
    };
    const block: FactNode = { type: 'fact', content: 'x', references: [ref], line: 1 };
    const result = validate(makeDoc({ blocks: [block] }));
    expect(result.valid).toBe(false);
    expect(result.errors[0].rule).toBe('reference.unknown-type');
  });

  it('accepts a custom relationship type with x- prefix', () => {
    const ref: ReferenceNode = {
      type: 'reference',
      relationship: 'x-blocks',
      target: 'deploy-step',
      line: 1,
    };
    const block: FactNode = { type: 'fact', content: 'x', references: [ref], line: 1 };
    const result = validate(makeDoc({ blocks: [block] }));
    expect(result.valid).toBe(true);
  });

  it('rejects a reference with no target', () => {
    const ref: ReferenceNode = { type: 'reference', relationship: 'see-also', target: '', line: 1 };
    const block: FactNode = { type: 'fact', content: 'x', references: [ref], line: 1 };
    const result = validate(makeDoc({ blocks: [block] }));
    expect(result.valid).toBe(false);
    expect(result.errors[0].rule).toBe('reference.target-required');
  });
});
