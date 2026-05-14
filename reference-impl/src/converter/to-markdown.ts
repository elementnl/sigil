import type { SigilDocument, Block, ContextNode, ReferenceNode } from '../types';
import { SigilSerializationError } from '../errors';

export function toMarkdown(doc: SigilDocument): string {
  const lines: string[] = [];

  const { header } = doc;
  lines.push(`# ${header.doctype}`);
  if (header.name) lines.push(`**Name:** ${header.name}`);
  if (header.version) lines.push(`**Version:** ${header.version}`);
  if (header.description) lines.push(`**Description:** ${header.description}`);
  if (header.input?.length) lines.push(`**Input:** ${header.input.join(', ')}`);
  if (header.output?.length) lines.push(`**Output:** ${header.output.join(', ')}`);
  lines.push('');

  for (const block of doc.blocks) {
    lines.push(...blockToMarkdown(block, 0));
  }

  return lines.join('\n').trimEnd() + '\n';
}

function blockToMarkdown(block: Block, depth: number): string[] {
  const pad = '  '.repeat(depth);

  switch (block.type) {
    case 'section': {
      return [
        `${'#'.repeat(depth + 2)} ${block.content}`,
        '',
        ...block.children.flatMap((child) => blockToMarkdown(child, 0)),
        ...refsToMarkdown(block.references, ''),
      ];
    }

    case 'trigger': {
      return [`${pad}> **Trigger:** ${block.content}`, ''];
    }

    case 'skip': {
      return [`${pad}> **Skip:** ${block.content}`, ''];
    }

    case 'define': {
      const lines = [`${pad}**${block.term}:** ${block.content}`];
      lines.push(...contextToMarkdown(block.context, pad));
      lines.push(...refsToMarkdown(block.references, pad));
      lines.push('');
      return lines;
    }

    case 'warn': {
      const label =
        block.label === 'critical' ? 'Critical' : block.label === 'warn' ? 'Warning' : 'Note';
      const lines = [`${pad}> **${label}:** ${block.content}`];
      lines.push(...contextToMarkdown(block.context, pad));
      lines.push(...refsToMarkdown(block.references, pad));
      lines.push('');
      return lines;
    }

    case 'uncertainty': {
      const lines = [`${pad}*Uncertain:* ${block.content}`];
      lines.push(...contextToMarkdown(block.context, pad));
      lines.push(...refsToMarkdown(block.references, pad));
      lines.push('');
      return lines;
    }

    case 'example': {
      const labelSuffix = block.label ? ` — ${block.label}` : '';
      const lines = [`${pad}**Example${labelSuffix}:**`, block.content];
      lines.push(...contextToMarkdown(block.context, pad));
      lines.push(...refsToMarkdown(block.references, pad));
      lines.push('');
      return lines;
    }

    case 'step': {
      const desc = block.content ? ` ${block.content}` : '';
      const lines = [`${pad}1.${desc}`];
      for (const child of block.children) {
        lines.push(...blockToMarkdown(child, depth + 1));
      }
      lines.push(...contextToMarkdown(block.context, pad));
      lines.push(...refsToMarkdown(block.references, pad));
      lines.push('');
      return lines;
    }

    case 'if': {
      const lines = [`${pad}*If ${block.condition}:*`];
      for (const child of block.children) {
        lines.push(...blockToMarkdown(child, depth + 1));
      }
      lines.push(...refsToMarkdown(block.references, pad));
      return lines;
    }

    case 'elseif': {
      const lines = [`${pad}*Else if ${block.condition}:*`];
      for (const child of block.children) {
        lines.push(...blockToMarkdown(child, depth + 1));
      }
      lines.push(...refsToMarkdown(block.references, pad));
      return lines;
    }

    case 'else': {
      const lines = [`${pad}*Otherwise:*`];
      for (const child of block.children) {
        lines.push(...blockToMarkdown(child, depth + 1));
      }
      lines.push(...refsToMarkdown(block.references, pad));
      lines.push('');
      return lines;
    }

    case 'fact': {
      const lines = [`${pad}- ${block.content}`];
      lines.push(...contextToMarkdown(block.context, pad));
      lines.push(...refsToMarkdown(block.references, pad));
      lines.push('');
      return lines;
    }

    case 'counter': {
      const label =
        block.label === 'tradeoff'
          ? 'Tradeoff'
          : block.label === 'exception'
            ? 'Exception'
            : 'Counter';
      const lines = [`${pad}> **${label}:** ${block.content}`];
      lines.push(...contextToMarkdown(block.context, pad));
      lines.push(...refsToMarkdown(block.references, pad));
      lines.push('');
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

function contextToMarkdown(context: ContextNode | undefined, pad: string): string[] {
  if (!context) return [];
  return [`${pad}> *${context.content}*`];
}

function refsToMarkdown(references: ReferenceNode[] | undefined, pad: string): string[] {
  if (!references || references.length === 0) return [];
  return references.map((ref) => `${pad}→ **${ref.relationship}:** ${ref.target}`);
}
