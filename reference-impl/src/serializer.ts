import type { SigilDocument, Block, ContextNode, ReferenceNode, Annotations, SerializeOptions } from "./types";
import { SigilSerializationError } from "./errors";

const DEFAULT_INDENT = 2;

export function serialize(doc: SigilDocument, options: SerializeOptions = {}): string {
    const indent = options.indentSize ?? DEFAULT_INDENT;
    const lines: string[] = [];

    lines.push(`%% ${doc.header.doctype}`);
    if (doc.header.name !== undefined) lines.push(`name: ${doc.header.name}`);
    if (doc.header.version !== undefined) lines.push(`version: ${doc.header.version}`);
    if (doc.header.description !== undefined) lines.push(`description: ${doc.header.description}`);
    if (doc.header.input?.length) lines.push(`input: [${doc.header.input.join(', ')}]`);
    if (doc.header.output?.length) lines.push(`output: [${doc.header.output.join(', ')}]`);

    if (doc.blocks.length > 0) lines.push('');

    for (const block of doc.blocks) {
        lines.push(...serializeBlock(block, 0, indent));
    }

    return lines.join('\n') + '\n';

}

function serializeBlock(block: Block, depth: number, indentSize: number): string[] {
    const pad = ' '.repeat(depth * indentSize);

    switch (block.type) {
        case 'section': {
            const lines = [`${pad}# ${block.content}`];
            if (block.context) lines.push(...serializeContext(block.context, depth + 1, indentSize));
            for (const child of block.children) lines.push(...serializeBlock(child, depth + 1, indentSize));
            if (block.references?.length) lines.push(...serializeRefs(block.references, depth + 1, indentSize));
            return lines;
        }

        case 'trigger':
            return [`${pad}@ trigger: ${block.content}${serializeAnnotations(block.annotations)}`];

        case 'skip':
            return [`${pad}@ skip: ${block.content}${serializeAnnotations(block.annotations)}`];

        case 'define': {
            const [firstLine, ...restLines] = block.content ? block.content.split('\n') : [''];
            const childPad = ' '.repeat((depth + 1) * indentSize);
            const head = `${pad}> ${block.term}${block.content ? ': ' + firstLine : ''}${serializeAnnotations(block.annotations)}`;
            const lines = [head, ...restLines.map((l) => `${childPad}${l}`)];
            if (block.context) lines.push(...serializeContext(block.context, depth + 1, indentSize));
            if (block.references?.length) lines.push(...serializeRefs(block.references, depth + 1, indentSize));
            return lines;
        }

        case 'warn': {
            const sigil = block.label === 'critical' ? '!!' : '!';
            const [firstLine, ...restLines] = block.content.split('\n');
            const childPad = ' '.repeat((depth + 1) * indentSize);
            const head = `${pad}${sigil} ${block.label}: ${firstLine}${serializeAnnotations(block.annotations)}`;
            const lines = [head, ...restLines.map((l) => `${childPad}${l}`)];
            if (block.context) lines.push(...serializeContext(block.context, depth + 1, indentSize));
            if (block.references?.length) lines.push(...serializeRefs(block.references, depth + 1, indentSize));
            return lines;
        }

        case 'uncertainty': {
            const [firstLine, ...restLines] = block.content.split('\n');
            const childPad = ' '.repeat((depth + 1) * indentSize);
            const head = `${pad}? ${firstLine}${serializeAnnotations(block.annotations)}`;
            const lines = [head, ...restLines.map((l) => `${childPad}${l}`)];
            if (block.context) lines.push(...serializeContext(block.context, depth + 1, indentSize));
            if (block.references?.length) lines.push(...serializeRefs(block.references, depth + 1, indentSize));
            return lines;
        }

        case 'example': {
            const label = block.label ? ` ${block.label}` : '';
            const head = `${pad}~${label}${serializeAnnotations(block.annotations)}`;
            const lines = [head];
            if (block.content) {
                for (const cl of block.content.split('\n')) {
                    lines.push(`${pad}${' '.repeat(indentSize)}${cl}`);
                }
            }
            if (block.context) lines.push(...serializeContext(block.context, depth + 1, indentSize));
            if (block.references?.length) lines.push(...serializeRefs(block.references, depth + 1, indentSize));
            return lines;
        }

        case 'step': {
            const [firstLine, ...restLines] = block.content ? block.content.split('\n') : [''];
            const childPad = ' '.repeat((depth + 1) * indentSize);
            const head = block.content
                ? `${pad}$ step: ${firstLine}${serializeAnnotations(block.annotations)}`
                : `${pad}$ step${serializeAnnotations(block.annotations)}`;
            const lines = [head, ...restLines.map((l) => `${childPad}${l}`)];
            if (block.context) lines.push(...serializeContext(block.context, depth + 1, indentSize));
            for (const child of block.children) lines.push(...serializeBlock(child, depth + 1, indentSize));
            if (block.references?.length) lines.push(...serializeRefs(block.references, depth + 1, indentSize));
            return lines;
        }

        case 'if': {
            const head = `${pad}$ if: ${block.condition}${serializeAnnotations(block.annotations)}`;
            const lines = [head];
            if (block.context) lines.push(...serializeContext(block.context, depth + 1, indentSize));
            for (const child of block.children) lines.push(...serializeBlock(child, depth + 1, indentSize));
            if (block.references?.length) lines.push(...serializeRefs(block.references, depth + 1, indentSize));
            return lines;
        }

        case 'elseif': {
            const head = `${pad}$ else if: ${block.condition}${serializeAnnotations(block.annotations)}`;
            const lines = [head];
            if (block.context) lines.push(...serializeContext(block.context, depth + 1, indentSize));
            for (const child of block.children) lines.push(...serializeBlock(child, depth + 1, indentSize));
            if (block.references?.length) lines.push(...serializeRefs(block.references, depth + 1, indentSize));
            return lines;
        }

        case 'else': {
            const head = `${pad}$ else:${serializeAnnotations(block.annotations)}`;
            const lines = [head];
            if (block.context) lines.push(...serializeContext(block.context, depth + 1, indentSize));
            for (const child of block.children) lines.push(...serializeBlock(child, depth + 1, indentSize));
            if (block.references?.length) lines.push(...serializeRefs(block.references, depth + 1, indentSize));
            return lines;
        }

        case 'fact': {
            const [firstLine, ...restLines] = block.content.split('\n');
            const childPad = ' '.repeat((depth + 1) * indentSize);
            const head = `${pad}* fact: ${firstLine}${serializeAnnotations(block.annotations)}`;
            const lines = [head, ...restLines.map((l) => `${childPad}${l}`)];
            if (block.context) lines.push(...serializeContext(block.context, depth + 1, indentSize));
            if (block.references?.length) lines.push(...serializeRefs(block.references, depth + 1, indentSize));
            return lines;
        }

        case 'counter': {
            const [firstLine, ...restLines] = block.content.split('\n');
            const childPad = ' '.repeat((depth + 1) * indentSize);
            const head = `${pad}/ ${block.label}: ${firstLine}${serializeAnnotations(block.annotations)}`;
            const lines = [head, ...restLines.map((l) => `${childPad}${l}`)];
            if (block.context) lines.push(...serializeContext(block.context, depth + 1, indentSize));
            if (block.references?.length) lines.push(...serializeRefs(block.references, depth + 1, indentSize));
            return lines;
        }

        default: {
            const exhaustive: never = block;
            throw new SigilSerializationError(
                `Unknown block type: ${(exhaustive as { type: string }).type}`,
            );
        }
    }
}

function serializeContext(ctx: ContextNode, depth: number, indentSize: number): string[] {
    const pad = ' '.repeat(depth * indentSize);
    const continuationPad = ' '.repeat((depth + 1) * indentSize);
    return ctx.content.split('\n').map((line, i) =>
        i === 0 ? `${pad}^ context: ${line}` : `${continuationPad}${line}`,
    );
}

function serializeRefs(refs: ReferenceNode[], depth: number, indentSize: number): string[] {
    const pad = ' '.repeat(depth * indentSize);
    return refs.map((ref) => `${pad}-> ${ref.relationship}: ${ref.target}`);
}

function serializeAnnotations(annotations: Annotations | undefined): string {
    if (!annotations) return '';
    const entries = Object.entries(annotations).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return '';
    const pairs = entries.map(([k, v]) => `${k}: ${v}`).join(', ');
    return ` {${pairs}}`;
}