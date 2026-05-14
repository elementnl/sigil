import * as peggy from 'peggy';
import type {
    SigilDocument,
    Block,
    DocumentHeader,
    Doctype,
    WarnLabel,
    CounterLabel,
    Annotations,
    ContextNode,
    ReferenceNode,
    SectionNode,
    TriggerNode,
    SkipNode,
    DefineNode,
    WarnNode,
    UncertaintyNode,
    ExampleNode,
    StepNode,
    IfNode,
    ElseIfNode,
    ElseNode,
    FactNode,
    CounterNode,
    ParseResult,
    ParseWarning,
    ParseOptions,
} from './types';
import { DOCTYPES, WARN_LABELS, COUNTER_LABELS, INDENT_SIZE } from './constants';
import { SigilParseError } from './errors';

const GRAMMAR_SOURCE = `
Annotations
  = "{" _ pairs:AnnotationPair|1.., _ "," _| _ "}"
  { return Object.fromEntries(pairs); }

AnnotationPair
  = key:AnnotationKey _ ":" _ value:AnnotationValue
  { return [key, value]; }

AnnotationKey
  = $([a-z] [a-z0-9_-]*)

AnnotationValue
  = v:$([^,}]*) { return v.trim(); }

ReferenceLine
  = "->" _ rel:RelationshipType _ ":" _ target:RestOfInput
  { return { relationship: rel, target: target }; }

RelationshipType
  = $([a-z] [a-z0-9_-]*)

RestOfInput
  = v:$(.*) { return v.trim(); }

_ = $(" "*)
`;

const subParser = peggy.generate(GRAMMAR_SOURCE, { allowedStartRules: ['Annotations', 'ReferenceLine'] });

type LineKind =
    | 'header'
    | 'meta'
    | 'section'
    | 'trigger'
    | 'skip'
    | 'warn'
    | 'context'
    | 'reference'
    | 'define'
    | 'uncertainty'
    | 'example'
    | 'step'
    | 'if'
    | 'elseif'
    | 'else'
    | 'fact'
    | 'counter'
    | 'content';

interface LineToken {
    kind: LineKind;
    indent: number;
    lineNum: number;
    raw: string;
    sigil?: string;
    label?: string;
    content: string;
    annotations?: Annotations;
}

// API

export function parse(input: string, options: ParseOptions = {}): ParseResult {
    const mode = options.mode ?? 'strict';
    const warnings: ParseWarning[] = [];
    const lines = input.split('\n');

    const tokens = tokenizeLines(lines, mode, warnings);
    const document = buildDocument(tokens, mode, warnings);

    return { document, warnings };
}

// Tokenizer

function tokenizeLines(
    lines: string[],
    mode: string,
    warnings: ParseWarning[],
): LineToken[] {
    const tokens: LineToken[] = [];

    for (let i = 0; i < lines.length; i++) {
        const raw = lines[i];
        const lineNum = i + 1;

        if (raw.trim() === '') continue;

        if (raw.match(/^\t/)) {
            if (mode === 'strict') throw new SigilParseError(lineNum, 'Tabs are not allowed; use spaces for indentation');
            warnings.push({ line: lineNum, message: 'Tabs are not allowed; use spaces for indentation' });
        }

        const indentMatch = raw.match(/^( *)/);
        const indentSpaces = indentMatch ? indentMatch[1].length : 0;

        if (indentSpaces % INDENT_SIZE !== 0) {
            if (mode === 'strict') {
                throw new SigilParseError(lineNum, `Indentation must be a multiple of ${INDENT_SIZE} spaces`);
            }
            warnings.push({ line: lineNum, message: `Indentation must be a multiple of ${INDENT_SIZE} spaces` });
        }

        const indent = Math.floor(indentSpaces / INDENT_SIZE);
        const trimmed = raw.slice(indentSpaces);

        const token = classifyLine(trimmed, indent, lineNum, mode, warnings);
        if (token) tokens.push(token);
    }

    return tokens;
}

function classifyLine(
    trimmed: string,
    indent: number,
    lineNum: number,
    mode: string,
    warnings: ParseWarning[],
): LineToken | null {
    // Document header
    if (trimmed.startsWith('%% ')) {
        return { kind: 'header', indent, lineNum, raw: trimmed, content: trimmed.slice(3).trim() };
    }

    // Metadata
    if (indent === 0 && trimmed.match(/^[a-z]+: /)) {
        return { kind: 'meta', indent, lineNum, raw: trimmed, content: trimmed };
    }

    // Reference
    if (trimmed.startsWith('-> ')) {
        try {
            const parsed = subParser.parse(trimmed, { startRule: 'ReferenceLine' }) as { relationship: string; target: string };
            return { kind: 'reference', indent, lineNum, raw: trimmed, content: trimmed, label: parsed.relationship, sigil: parsed.target };
        } catch {
            if (mode === 'strict') throw new SigilParseError(lineNum, `Invalid reference line: ${trimmed}`);
            warnings.push({ line: lineNum, message: `Could not parse reference: ${trimmed}` });
            return null;
        }
    }

    // Context
    if (trimmed.startsWith('^ context:') || trimmed.startsWith('^ context')) {
        const content = trimmed.startsWith('^ context:') ? trimmed.slice('^ context:'.length).trim() : trimmed.slice('^ context'.length).trim();
        return { kind: 'context', indent, lineNum, raw: trimmed, content };
    }

    // !! critical
    if (trimmed.startsWith('!! critical:') || trimmed.startsWith('!! critical')) {
        const { content, annotations } = extractContentAndAnnotations(
            trimmed.startsWith('!! critical:') ? trimmed.slice('!! critical:'.length).trim() : '',
        );
        return { kind: 'warn', indent, lineNum, raw: trimmed, sigil: '!!', label: 'critical', content, annotations };
    }

    // ! note / ! warn
    const warnMatch = trimmed.match(/^! (note|warn)(?::(.*))?$/);
    if (warnMatch) {
        const label = warnMatch[1] as WarnLabel;
        const { content, annotations } = extractContentAndAnnotations((warnMatch[2] ?? '').trim());
        return { kind: 'warn', indent, lineNum, raw: trimmed, sigil: '!', label, content, annotations };
    }

    // @ trigger / @ skip
    const atMatch = trimmed.match(/^@ (trigger|skip):(.*)$/);
    if (atMatch) {
        const kind = atMatch[1] === 'trigger' ? 'trigger' : 'skip';
        const { content, annotations } = extractContentAndAnnotations(atMatch[2].trim());
        return { kind, indent, lineNum, raw: trimmed, content, annotations };
    }

    // # section
    if (trimmed.startsWith('# ')) {
        return { kind: 'section', indent, lineNum, raw: trimmed, content: trimmed.slice(2).trim() };
    }

    // > define
    const defineMatch = trimmed.match(/^> ([^:]+)(?::(.*))?$/);
    if (defineMatch) {
        const { content, annotations } = extractContentAndAnnotations((defineMatch[2] ?? '').trim());
        return { kind: 'define', indent, lineNum, raw: trimmed, label: defineMatch[1].trim(), content, annotations };
    }

    // ? uncertainty
    if (trimmed.startsWith('? ') || trimmed === '?') {
        const { content, annotations } = extractContentAndAnnotations(trimmed.startsWith('? ') ? trimmed.slice(2) : '');
        return { kind: 'uncertainty', indent, lineNum, raw: trimmed, content, annotations };
    }

    // ~ example
    const exMatch = trimmed.match(/^~ example(?:: (.*))?$/) ?? trimmed.match(/^~ (.+)$/) ?? (trimmed === '~' ? ['~', undefined] : null);
    if (exMatch) {
        const labelStr = trimmed.startsWith('~ example:')
            ? trimmed.slice('~ example:'.length).trim()
            : trimmed.startsWith('~ ') ? trimmed.slice(2).trim() : undefined;
        return { kind: 'example', indent, lineNum, raw: trimmed, label: labelStr, content: '' };
    }

    // $ step / $ if / $ else if / $ else
    if (trimmed.startsWith('$ else if:') || trimmed.startsWith('$ else if ')) {
        const condition = trimmed.replace(/^\$ else if:?\s*/, '').trim();
        return { kind: 'elseif', indent, lineNum, raw: trimmed, content: condition };
    }
    if (trimmed === '$ else:' || trimmed === '$ else') {
        return { kind: 'else', indent, lineNum, raw: trimmed, content: '' };
    }
    const stepMatch = trimmed.match(/^\$ (step|if)(?::(.*))?$/);
    if (stepMatch) {
        const { content, annotations } = extractContentAndAnnotations((stepMatch[2] ?? '').trim());
        return { kind: stepMatch[1] as 'step' | 'if', indent, lineNum, raw: trimmed, content, annotations };
    }

    // * fact
    if (trimmed.startsWith('* fact:') || trimmed === '* fact') {
        const { content, annotations } = extractContentAndAnnotations(
            trimmed.startsWith('* fact:') ? trimmed.slice('* fact:'.length).trim() : '',
        );
        return { kind: 'fact', indent, lineNum, raw: trimmed, content, annotations };
    }

    // / counter / tradeoff / exception
    const counterMatch = trimmed.match(/^\/ (counter|tradeoff|exception)(?::(.*))?$/);
    if (counterMatch) {
        const label = counterMatch[1] as CounterLabel;
        const { content, annotations } = extractContentAndAnnotations((counterMatch[2] ?? '').trim());
        return { kind: 'counter', indent, lineNum, raw: trimmed, label, content, annotations };
    }

    // Continuation
    if (indent > 0) {
        return { kind: 'content', indent, lineNum, raw: trimmed, content: trimmed };
    }

    if (mode === 'strict') {
        throw new SigilParseError(lineNum, `Unrecognized line: ${trimmed}`);
    }
    warnings.push({ line: lineNum, message: `Unrecognized line skipped: ${trimmed}` });
    return null;
}

// Annotation

function extractContentAndAnnotations(text: string): { content: string; annotations?: Annotations } {
    const match = text.match(/^(.*?)\s*(\{[^}]+\})\s*$/);
    if (!match) return { content: text.trim() };

    try {
        const annotations = subParser.parse(match[2], { startRule: 'Annotations' }) as Annotations;
        return { content: match[1].trim(), annotations };
    } catch {
        return { content: text.trim() };
    }
}

// AST builder

function buildDocument(
    tokens: LineToken[],
    mode: string,
    warnings: ParseWarning[],
): SigilDocument {
    if (tokens.length === 0 || tokens[0].kind !== 'header') {
        if (mode === 'strict') throw new SigilParseError(1, 'Document must begin with a %% header');
        warnings.push({ line: 1, message: 'Document must begin with a %% header' });
        return { header: { doctype: 'reference' }, blocks: [] };
    }

    const doctype = tokens[0].content as Doctype;
    if (!(DOCTYPES as readonly string[]).includes(doctype)) {
        if (mode === 'strict') throw new SigilParseError(tokens[0].lineNum, `Unknown doctype: "${doctype}"`);
        warnings.push({ line: tokens[0].lineNum, message: `Unknown doctype: "${doctype}"` });
    }

    const header: DocumentHeader = { doctype };
    let i = 1;

    // Consume metadata fields
    while (i < tokens.length && tokens[i].kind === 'meta') {
        parseMetaField(tokens[i], header);
        i++;
    }

    const blocks = buildBlocks(tokens, i, 0);
    return { header, blocks };
}

function parseMetaField(token: LineToken, header: DocumentHeader): void {
    const m = token.content.match(/^([a-z]+): (.*)$/);
    if (!m) return;
    const [, key, val] = m;
    if (key === 'name') header.name = val.trim();
    else if (key === 'version') header.version = val.trim();
    else if (key === 'description') header.description = val.trim();
    else if (key === 'input') header.input = parseArray(val);
    else if (key === 'output') header.output = parseArray(val);
}

function parseArray(val: string): string[] {
    return val.replace(/^\[|\]$/g, '').split(',').map((s) => s.trim()).filter(Boolean);
}

function buildBlocks(tokens: LineToken[], start: number, expectedIndent: number): Block[] {
    const blocks: Block[] = [];
    let i = start;

    while (i < tokens.length) {
        const token = tokens[i];
        if (token.indent < expectedIndent) break;
        if (token.indent > expectedIndent) { i++; continue; } // orphaned content, skip

        const { block, consumed } = buildBlock(tokens, i, expectedIndent);
        if (block) blocks.push(block);
        i += consumed;
    }

    return blocks;
}

function buildBlock(
    tokens: LineToken[],
    index: number,
    expectedIndent: number,
): { block: Block | null; consumed: number } {
    const token = tokens[index];
    const childIndent = expectedIndent + 1;

    // Gather continuation content lines and child tokens
    let j = index + 1;
    const contentLines: string[] = token.content ? [token.content] : [];

    while (j < tokens.length && tokens[j].indent >= childIndent && tokens[j].kind === 'content') {
        contentLines.push(tokens[j].content);
        j++;
    }

    const fullContent = contentLines.join('\n');
    const childTokenStart = j;

    // Build block based on kind
    switch (token.kind) {
        case 'section': {
            const children = buildBlocks(tokens, childTokenStart, childIndent);
            const context = extractContext(children);
            const references = extractReferences(children);
            const node: SectionNode = {
                type: 'section',
                content: fullContent || token.content,
                children: children.filter((b) => (b as { type: string }).type !== 'context' && (b as { type: string }).type !== 'reference'),
                line: token.lineNum,
            };
            if (context) node.context = context;
            if (references.length) node.references = references;
            return { block: node, consumed: childrenEnd(tokens, index, childIndent) - index };
        }

        case 'trigger': {
            const node: TriggerNode = { type: 'trigger', content: fullContent, line: token.lineNum };
            if (token.annotations) node.annotations = token.annotations;
            return { block: node, consumed: j - index };
        }

        case 'skip': {
            const node: SkipNode = { type: 'skip', content: fullContent, line: token.lineNum };
            if (token.annotations) node.annotations = token.annotations;
            return { block: node, consumed: j - index };
        }

        case 'define': {
            const children = buildBlocks(tokens, childTokenStart, childIndent);
            const context = extractContext(children);
            const references = extractReferences(children);
            const node: DefineNode = {
                type: 'define',
                term: token.label ?? '',
                content: fullContent,
                line: token.lineNum,
            };
            if (context) node.context = context;
            if (references.length) node.references = references;
            if (token.annotations) node.annotations = token.annotations;
            return { block: node, consumed: childrenEnd(tokens, index, childIndent) - index };
        }

        case 'warn': {
            const children = buildBlocks(tokens, childTokenStart, childIndent);
            const context = extractContext(children);
            const references = extractReferences(children);
            const node: WarnNode = {
                type: 'warn',
                label: token.label as WarnLabel,
                content: fullContent,
                line: token.lineNum,
            };
            if (context) node.context = context;
            if (references.length) node.references = references;
            if (token.annotations) node.annotations = token.annotations;
            if (!WARN_LABELS.includes(node.label)) node.label = 'note';
            return { block: node, consumed: childrenEnd(tokens, index, childIndent) - index };
        }

        case 'uncertainty': {
            const children = buildBlocks(tokens, childTokenStart, childIndent);
            const context = extractContext(children);
            const references = extractReferences(children);
            const node: UncertaintyNode = { type: 'uncertainty', content: fullContent, line: token.lineNum };
            if (context) node.context = context;
            if (references.length) node.references = references;
            if (token.annotations) node.annotations = token.annotations;
            return { block: node, consumed: childrenEnd(tokens, index, childIndent) - index };
        }

        case 'example': {
            const children = buildBlocks(tokens, childTokenStart, childIndent);
            const context = extractContext(children);
            const references = extractReferences(children);
            const node: ExampleNode = {
                type: 'example',
                content: fullContent,
                line: token.lineNum,
            };
            if (token.label) node.label = token.label;
            if (context) node.context = context;
            if (references.length) node.references = references;
            if (token.annotations) node.annotations = token.annotations;
            return { block: node, consumed: childrenEnd(tokens, index, childIndent) - index };
        }

        case 'step': {
            const children = buildBlocks(tokens, childTokenStart, childIndent);
            const context = extractContext(children);
            const references = extractReferences(children);
            const node: StepNode = {
                type: 'step',
                content: fullContent,
                children: children.filter((b) => (b as { type: string }).type !== 'context' && (b as { type: string }).type !== 'reference'),
                line: token.lineNum,
            };
            if (context) node.context = context;
            if (references.length) node.references = references;
            if (token.annotations) node.annotations = token.annotations;
            return { block: node, consumed: childrenEnd(tokens, index, childIndent) - index };
        }

        case 'if': {
            const children = buildBlocks(tokens, childTokenStart, childIndent);
            const context = extractContext(children);
            const references = extractReferences(children);
            const node: IfNode = {
                type: 'if',
                condition: fullContent,
                children: children.filter((b) => (b as { type: string }).type !== 'context' && (b as { type: string }).type !== 'reference'),
                line: token.lineNum,
            };
            if (context) node.context = context;
            if (references.length) node.references = references;
            if (token.annotations) node.annotations = token.annotations;
            return { block: node, consumed: childrenEnd(tokens, index, childIndent) - index };
        }

        case 'elseif': {
            const children = buildBlocks(tokens, childTokenStart, childIndent);
            const context = extractContext(children);
            const references = extractReferences(children);
            const node: ElseIfNode = {
                type: 'elseif',
                condition: fullContent,
                children: children.filter((b) => (b as { type: string }).type !== 'context' && (b as { type: string }).type !== 'reference'),
                line: token.lineNum,
            };
            if (context) node.context = context;
            if (references.length) node.references = references;
            if (token.annotations) node.annotations = token.annotations;
            return { block: node, consumed: childrenEnd(tokens, index, childIndent) - index };
        }

        case 'else': {
            const children = buildBlocks(tokens, childTokenStart, childIndent);
            const context = extractContext(children);
            const references = extractReferences(children);
            const node: ElseNode = {
                type: 'else',
                children: children.filter((b) => (b as { type: string }).type !== 'context' && (b as { type: string }).type !== 'reference'),
                line: token.lineNum,
            };
            if (context) node.context = context;
            if (references.length) node.references = references;
            if (token.annotations) node.annotations = token.annotations;
            return { block: node, consumed: childrenEnd(tokens, index, childIndent) - index };
        }

        case 'fact': {
            const children = buildBlocks(tokens, childTokenStart, childIndent);
            const context = extractContext(children);
            const references = extractReferences(children);
            const node: FactNode = { type: 'fact', content: fullContent, line: token.lineNum };
            if (context) node.context = context;
            if (references.length) node.references = references;
            if (token.annotations) node.annotations = token.annotations;
            return { block: node, consumed: childrenEnd(tokens, index, childIndent) - index };
        }

        case 'counter': {
            const children = buildBlocks(tokens, childTokenStart, childIndent);
            const context = extractContext(children);
            const references = extractReferences(children);
            const label = token.label as CounterLabel;
            const node: CounterNode = {
                type: 'counter',
                label: COUNTER_LABELS.includes(label) ? label : 'counter',
                content: fullContent,
                line: token.lineNum,
            };
            if (context) node.context = context;
            if (references.length) node.references = references;
            if (token.annotations) node.annotations = token.annotations;
            return { block: node, consumed: childrenEnd(tokens, index, childIndent) - index };
        }

        case 'context': {
            const ctxNode: ContextNode = { type: 'context', content: fullContent, line: token.lineNum };
            return { block: ctxNode as unknown as Block, consumed: j - index };
        }

        case 'reference': {
            const refNode: ReferenceNode = {
                type: 'reference',
                relationship: token.label ?? '',
                target: token.sigil ?? '',
                line: token.lineNum,
            };
            return { block: refNode as unknown as Block, consumed: 1 };
        }

        default:
            return { block: null, consumed: 1 };
    }
}

// ── Helper utilities ──────────────────────────────────────────────────────────

function childrenEnd(tokens: LineToken[], start: number, childIndent: number): number {
    let i = start + 1;
    while (i < tokens.length && tokens[i].indent >= childIndent) i++;
    return i;
}

function extractContext(blocks: Block[]): ContextNode | undefined {
    return blocks.find((b) => (b as { type: string }).type === 'context') as ContextNode | undefined;
}

function extractReferences(blocks: Block[]): ReferenceNode[] {
    return blocks.filter((b) => (b as { type: string }).type === 'reference') as unknown as ReferenceNode[];
}
