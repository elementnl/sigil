// Requires src/parser.ts — see the implementation written in chat.
import { describe, it, expect } from 'vitest';
import { parse } from '../src/parser';
import type { SectionNode, WarnNode, FactNode, TriggerNode, SkipNode, ReferenceNode } from '../src/types';

const MINIMAL = `%% reference\n`;

const FULL = `\
%% skill
name: example
version: 1.0.0
description: does things

# Overview
  * fact: the default model is claude-opus-4-7
  ! warn: context window silently truncates

@ trigger: user asks about Sigil
@ skip: user is testing a CLI tool
`;

describe('parse — header', () => {
  it('parses a minimal document', () => {
    const { document } = parse(MINIMAL);
    expect(document.header.doctype).toBe('reference');
    expect(document.blocks).toHaveLength(0);
  });

  it('parses header metadata fields', () => {
    const { document } = parse(FULL);
    expect(document.header.name).toBe('example');
    expect(document.header.version).toBe('1.0.0');
    expect(document.header.description).toBe('does things');
  });

  it('parses input and output arrays', () => {
    const src = `%% skill\ninput: [url, port]\noutput: [results]\n`;
    const { document } = parse(src);
    expect(document.header.input).toEqual(['url', 'port']);
    expect(document.header.output).toEqual(['results']);
  });

  it('throws in strict mode when header is missing', () => {
    expect(() => parse('* fact: no header', { mode: 'strict' })).toThrow();
  });

  it('warns in lenient mode when header is missing', () => {
    const { warnings } = parse('* fact: no header', { mode: 'lenient' });
    expect(warnings.length).toBeGreaterThan(0);
  });
});

describe('parse — block types', () => {
  it('parses a section block', () => {
    const src = `%% reference\n\n# My Section\n`;
    const { document } = parse(src);
    expect(document.blocks[0].type).toBe('section');
    expect((document.blocks[0] as SectionNode).content).toBe('My Section');
  });

  it('parses a trigger block', () => {
    const src = `%% reference\n\n@ trigger: user asks a question\n`;
    const { document } = parse(src);
    expect(document.blocks[0].type).toBe('trigger');
    expect((document.blocks[0] as TriggerNode).content).toBe('user asks a question');
  });

  it('parses a skip block', () => {
    const src = `%% reference\n\n@ skip: user is not logged in\n`;
    const { document } = parse(src);
    expect(document.blocks[0].type).toBe('skip');
    expect((document.blocks[0] as SkipNode).content).toBe('user is not logged in');
  });

  it('parses all three warn levels', () => {
    const src = [
      '%% reference',
      '',
      '! note: soft guideline',
      '! warn: real risk',
      '!! critical: hard constraint',
    ].join('\n');
    const { document } = parse(src);
    const warns = document.blocks as WarnNode[];
    expect(warns[0].label).toBe('note');
    expect(warns[1].label).toBe('warn');
    expect(warns[2].label).toBe('critical');
  });

  it('parses a fact block', () => {
    const src = `%% reference\n\n* fact: the sky is blue\n`;
    const { document } = parse(src);
    expect(document.blocks[0].type).toBe('fact');
    expect((document.blocks[0] as FactNode).content).toBe('the sky is blue');
  });

  it('parses a top-level reference block', () => {
    const src = `%% reference\n\n-> see-also: other-doc.sgl\n`;
    const { document } = parse(src);
    const block = document.blocks[0] as unknown as ReferenceNode;
    expect(block.type).toBe('reference');
    expect(block.relationship).toBe('see-also');
    expect(block.target).toBe('other-doc.sgl');
  });
});

describe('parse — annotations', () => {
  it('parses inline annotations on a fact block', () => {
    const src = `%% reference\n\n* fact: the context window is 200k {confidence: high, asof: 2024-11}\n`;
    const { document } = parse(src);
    const fact = document.blocks[0] as FactNode;
    expect(fact.annotations?.confidence).toBe('high');
    expect(fact.annotations?.asof).toBe('2024-11');
  });
});

describe('parse — strict mode', () => {
  it('throws on an unknown doctype', () => {
    expect(() => parse('%% not-a-doctype\n', { mode: 'strict' })).toThrow();
  });

  it('throws on a tab-indented block', () => {
    const src = `%% reference\n\n# Section\n\t* fact: bad indent\n`;
    expect(() => parse(src, { mode: 'strict' })).toThrow();
  });
});

describe('parse — lenient mode', () => {
  it('warns on an unknown doctype but continues', () => {
    const { document, warnings } = parse('%% not-a-doctype\n', { mode: 'lenient' });
    expect(warnings.length).toBeGreaterThan(0);
    expect(document).toBeDefined();
  });
});
