#!/usr/bin/env node
// Conformance test runner for Sigil parser implementations.
//
// Usage:
//   node run.js                          # use bundled reference impl
//   node run.js --parser path/to/cli.js  # use a custom parser CLI
//
// A parser CLI must accept:
//   cli parse [--mode strict|lenient] [--pretty] <file>   → prints JSON to stdout
//   cli validate <file>                                    → exits 0 if valid, 1 if not

import { execSync } from 'child_process';
import { readdirSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const parserIdx = args.indexOf('--parser');
const PARSER =
  parserIdx >= 0
    ? args[parserIdx + 1]
    : join(__dirname, '../../reference-impl/dist/cli.js');

let passed = 0;
let failed = 0;
const failures = [];

function run(cmd) {
  try {
    const out = execSync(`node "${PARSER}" ${cmd}`, { encoding: 'utf8', stdio: 'pipe' });
    return { ok: true, output: out };
  } catch (err) {
    return { ok: false, output: (err.stdout ?? '') + (err.stderr ?? '') };
  }
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function runValidSuite() {
  const dir = join(__dirname, 'valid');
  const cases = readdirSync(dir).sort();

  for (const name of cases) {
    const inputPath = join(dir, name, 'input.sgl');
    const expectedPath = join(dir, name, 'expected.json');
    if (!existsSync(inputPath) || !existsSync(expectedPath)) continue;

    const expected = JSON.parse(readFileSync(expectedPath, 'utf8'));
    const result = run(`parse --pretty "${inputPath}"`);

    if (!result.ok) {
      failed++;
      failures.push(`valid/${name}: parse failed unexpectedly\n  ${result.output.trim()}`);
      continue;
    }

    let actual;
    try {
      actual = JSON.parse(result.output);
    } catch {
      failed++;
      failures.push(`valid/${name}: output is not valid JSON`);
      continue;
    }

    if (deepEqual(actual, expected)) {
      passed++;
    } else {
      failed++;
      failures.push(
        `valid/${name}: AST mismatch\n  expected: ${JSON.stringify(expected).slice(0, 200)}\n  actual:   ${JSON.stringify(actual).slice(0, 200)}`,
      );
    }
  }
}

function runInvalidSuite() {
  const dir = join(__dirname, 'invalid');
  const cases = readdirSync(dir).sort();

  for (const name of cases) {
    const inputPath = join(dir, name, 'input.sgl');
    const expectedPath = join(dir, name, 'expected.json');
    if (!existsSync(inputPath) || !existsSync(expectedPath)) continue;

    const meta = JSON.parse(readFileSync(expectedPath, 'utf8'));

    // Determine which command to run based on mode
    const cmd =
      meta.mode === 'strict'
        ? `parse --mode strict "${inputPath}"`
        : `validate "${inputPath}"`;

    const result = run(cmd);

    if (!result.ok) {
      passed++;
    } else {
      failed++;
      failures.push(
        `invalid/${name}: expected failure but parser succeeded\n  description: ${meta.description}`,
      );
    }
  }
}

runValidSuite();
runInvalidSuite();

const total = passed + failed;
console.log(`\nConformance results: ${passed}/${total} passed`);

if (failures.length > 0) {
  console.log('\nFailures:');
  for (const f of failures) {
    console.log(`  ✗ ${f}`);
  }
  process.exit(1);
} else {
  console.log('All conformance tests passed.');
}
