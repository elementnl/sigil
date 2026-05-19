#!/user/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { parse, validate, serialize, fromMarkdown, toMarkdown } from './index'
import type { ParseMode } from './types'

const args = process.argv.slice(2);
const command = args[0];

function getFlag(flag: string, fallback?: string): string | undefined {
    const idx = args.indexOf(flag);
    if (idx === -1) return fallback;
    return args[idx + 1];
}

function hasFlag(flag: string): boolean {
    return args.includes(flag);
}

function readFile(filePath: string): string {
    const resolved = path.resolve(filePath);
    if (!fs.existsSync(resolved)) {
        console.error(`error: file not found: ${filePath}`);
        process.exit(1);
    }
    return fs.readFileSync(resolved, 'utf-8');
}

function printHelp(): void {
    console.log(`
Usage: sigil <command> [options] <file>

Commands:
  parse <file>       Parse a .sgl file and print the AST as JSON
  validate <file>    Validate a .sgl file and report errors
  serialize <file>   Parse and re-serialize a .sgl file (roundtrip check)
  convert <file>     Convert between .sgl and markdown

Options:
  --mode <strict|lenient>    Parser mode (default: strict)
  --to <markdown|sigil>      Target format for convert command
  --pretty                   Pretty-print JSON output (parse only)

Examples:
  sigil parse skill.sgl --pretty
  sigil validate skill.sgl --mode lenient
  sigil convert skill.sgl --to markdown
  sigil convert README.md --to sigil
  `.trim());
}

if (!command || command === '--help' || command === '-h') {
    printHelp();
    process.exit(0);
}

const file = args.filter((a) => !a.startsWith('--') && a !== command).at(-1);
const mode = (getFlag('--mode', 'strict') as ParseMode);
const pretty = hasFlag('--pretty');

if (!file) {
    console.error('error: no file specified');
    process.exit(1)
}

switch (command) {
    case 'parse': {
        const { document, warnings } = parse(readFile(file), { mode });
        for (const w of warnings) {
            process.stderr.write(`warning (line ${w.line}): ${w.message}\n`);
        }
        console.log(JSON.stringify(document, null, pretty ? 2 : undefined));
        break;
    }

    case 'validate': {
        const { document, warnings } = parse(readFile(file), { mode });
        for (const w of warnings) {
            process.stderr.write(`parse warning (line ${w.line}): ${w.message}\n`);
        }
        const result = validate(document);
        if (result.valid) {
            console.log('valid');
        } else {
            for (const err of result.errors) {
                const loc = err.line !== undefined ? ` (line ${err.line})` : '';
                process.stderr.write(`error${loc}: ${err.message}\n`);
            }
            process.exit(1);
        }
        break;
    }

    case 'serialize': {
        const { document } = parse(readFile(file), { mode });
        process.stdout.write(serialize(document));
        break;
    }

    case 'convert': {
        const to = getFlag('--to');
        if (!to || (to !== 'markdown' && to !== 'sigil')) {
            console.error('error: --to markdown  or  --to sigil  required');
            process.exit(1);
        }
        if (to === 'markdown') {
            const { document } = parse(readFile(file), { mode });
            process.stdout.write(toMarkdown(document));
        } else {
            process.stdout.write(serialize(fromMarkdown(readFile(file))));
        }
        break;
    }

    default:
        console.error(`error: unknown command "${command}"`);
        printHelp();
        process.exit(1);
}
