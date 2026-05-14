import type { SigilDocument, Block, SectionNode, WarnNode, ExampleNode, FactNode, StepNode } from '../types';

export function fromMarkdown(markdown: string): SigilDocument {
  const lines = markdown.split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const lineNum = i + 1;

    if (line.trim() === '') {
      i++;
      continue;
    }

    const headingMatch = /^#{1,6}\s+(.+)$/.exec(line);
    if (headingMatch) {
      const section: SectionNode = {
        type: 'section',
        content: headingMatch[1].trim(),
        children: [],
        line: lineNum,
      };
      blocks.push(section);
      i++;
      continue;
    }

    if (line.startsWith('```')) {
      const startLine = lineNum;
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      const example: ExampleNode = {
        type: 'example',
        content: ['```' + lang, ...codeLines, '```'].join('\n'),
        line: startLine,
      };
      blocks.push(example);
      continue;
    }

    if (line.startsWith('> ')) {
      const content = line.slice(2).trim();
      const note: WarnNode = {
        type: 'warn',
        label: 'note',
        content,
        line: lineNum,
      };
      blocks.push(note);
      i++;
      continue;
    }

    const numberedMatch = /^\d+\.\s+(.+)$/.exec(line);
    if (numberedMatch) {
      const step: StepNode = {
        type: 'step',
        content: numberedMatch[1].trim(),
        children: [],
        line: lineNum,
      };
      blocks.push(step);
      i++;
      continue;
    }

    const listMatch = /^[-*+]\s+(.+)$/.exec(line);
    if (listMatch) {
      const fact: FactNode = {
        type: 'fact',
        content: listMatch[1].trim(),
        line: lineNum,
      };
      blocks.push(fact);
      i++;
      continue;
    }

    const fact: FactNode = {
      type: 'fact',
      content: line.trim(),
      line: lineNum,
    };
    blocks.push(fact);
    i++;
  }

  return {
    header: { doctype: 'reference' },
    blocks,
  };
}
