import { describe, it, expect } from 'vitest';
import { fromMarkdown, toMarkdown } from '../src/converter';
import type { SigilDocument, WarnNode, FactNode, SectionNode, ExampleNode, StepNode } from '../src/types';

describe('fromMarkdown', () => {
  it('produces a document with doctype reference', () => {
    const doc = fromMarkdown('# Hello');
    expect(doc.header.doctype).toBe('reference');
  });

  it('maps a markdown heading to a section block', () => {
    const doc = fromMarkdown('# My Section');
    expect(doc.blocks).toHaveLength(1);
    expect(doc.blocks[0].type).toBe('section');
    expect((doc.blocks[0] as SectionNode).content).toBe('My Section');
  });

  it('maps a blockquote to a warn note block', () => {
    const doc = fromMarkdown('> some advice here');
    expect(doc.blocks[0].type).toBe('warn');
    expect((doc.blocks[0] as WarnNode).label).toBe('note');
    expect((doc.blocks[0] as WarnNode).content).toBe('some advice here');
  });

  it('maps a fenced code block to an example block', () => {
    const md = ['```python', 'print("hello")', '```'].join('\n');
    const doc = fromMarkdown(md);
    expect(doc.blocks[0].type).toBe('example');
    expect((doc.blocks[0] as ExampleNode).content).toContain('print("hello")');
  });

  it('maps a numbered list item to a step block', () => {
    const doc = fromMarkdown('1. install dependencies');
    expect(doc.blocks[0].type).toBe('step');
    expect((doc.blocks[0] as StepNode).content).toBe('install dependencies');
  });

  it('maps a bullet list item to a fact block', () => {
    const doc = fromMarkdown('- some fact');
    expect(doc.blocks[0].type).toBe('fact');
    expect((doc.blocks[0] as FactNode).content).toBe('some fact');
  });

  it('maps a plain paragraph to a fact block', () => {
    const doc = fromMarkdown('just some text');
    expect(doc.blocks[0].type).toBe('fact');
    expect((doc.blocks[0] as FactNode).content).toBe('just some text');
  });

  it('skips blank lines', () => {
    const doc = fromMarkdown('\n\n# Title\n\n- item\n');
    expect(doc.blocks).toHaveLength(2);
  });

  it('assigns correct line numbers', () => {
    const doc = fromMarkdown('# Title\n- item');
    expect(doc.blocks[0].line).toBe(1);
    expect(doc.blocks[1].line).toBe(2);
  });
});

describe('toMarkdown', () => {
  it('renders the doctype as a top-level heading', () => {
    const doc: SigilDocument = { header: { doctype: 'skill' }, blocks: [] };
    const md = toMarkdown(doc);
    expect(md).toContain('# skill');
  });

  it('includes name, version, and description when present', () => {
    const doc: SigilDocument = {
      header: { doctype: 'skill', name: 'my-skill', version: '1.0.0', description: 'does things' },
      blocks: [],
    };
    const md = toMarkdown(doc);
    expect(md).toContain('**Name:** my-skill');
    expect(md).toContain('**Version:** 1.0.0');
    expect(md).toContain('**Description:** does things');
  });

  it('renders a section as a heading', () => {
    const section: SectionNode = { type: 'section', content: 'Overview', children: [], line: 1 };
    const doc: SigilDocument = { header: { doctype: 'reference' }, blocks: [section] };
    const md = toMarkdown(doc);
    expect(md).toContain('## Overview');
  });

  it('renders a fact as a bullet point', () => {
    const fact: FactNode = { type: 'fact', content: 'the sky is blue', line: 1 };
    const doc: SigilDocument = { header: { doctype: 'reference' }, blocks: [fact] };
    const md = toMarkdown(doc);
    expect(md).toContain('- the sky is blue');
  });

  it('renders a warn note as a blockquote', () => {
    const warn: WarnNode = { type: 'warn', label: 'note', content: 'close the browser', line: 1 };
    const doc: SigilDocument = { header: { doctype: 'reference' }, blocks: [warn] };
    const md = toMarkdown(doc);
    expect(md).toContain('> **Note:** close the browser');
  });

  it('renders a warn critical with the Critical label', () => {
    const warn: WarnNode = {
      type: 'warn',
      label: 'critical',
      content: 'never commit secrets',
      line: 1,
    };
    const doc: SigilDocument = { header: { doctype: 'reference' }, blocks: [warn] };
    const md = toMarkdown(doc);
    expect(md).toContain('> **Critical:** never commit secrets');
  });

  it('renders input and output when present', () => {
    const doc: SigilDocument = {
      header: { doctype: 'skill', input: ['url', 'port'], output: ['results'] },
      blocks: [],
    };
    const md = toMarkdown(doc);
    expect(md).toContain('**Input:** url, port');
    expect(md).toContain('**Output:** results');
  });

  it('produces a string ending with a newline', () => {
    const doc: SigilDocument = { header: { doctype: 'reference' }, blocks: [] };
    const md = toMarkdown(doc);
    expect(md.endsWith('\n')).toBe(true);
  });
});
