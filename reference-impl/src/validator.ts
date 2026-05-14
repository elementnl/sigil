import type {
  SigilDocument,
  Block,
  SectionNode,
  StepNode,
  IfNode,
  ElseIfNode,
  ElseNode,
  WarnNode,
  CounterNode,
  ReferenceNode,
  Annotations,
  ValidationError,
  ValidationResult,
} from './types';
import {
  DOCTYPES,
  WARN_LABELS,
  COUNTER_LABELS,
  CONFIDENCE_VALUES,
  STATUS_VALUES,
  ANNOTATION_KEYS,
  RELATIONSHIP_TYPES,
  CUSTOM_KEY_PREFIX,
  SEMVER_PATTERN,
  ASOF_PATTERN,
} from './constants';

interface ValidationContext {
  insideSection: boolean;
  insideIf: boolean;
}

export function validate(doc: SigilDocument): ValidationResult {
  const errors: ValidationError[] = [];
  validateHeader(doc, errors);
  for (const block of doc.blocks) {
    validateBlock(block, errors, { insideSection: false, insideIf: false });
  }
  return { valid: errors.length === 0, errors };
}

function validateHeader(doc: SigilDocument, errors: ValidationError[]): void {
  const { header } = doc;

  if (!(DOCTYPES as readonly string[]).includes(header.doctype)) {
    errors.push({
      message: `Unknown doctype: "${header.doctype}". Must be one of: ${DOCTYPES.join(', ')}`,
      rule: 'header.doctype',
    });
  }

  if (header.version !== undefined && !SEMVER_PATTERN.test(header.version)) {
    errors.push({
      message: `Invalid version: "${header.version}". Must follow semver format (x.y.z)`,
      rule: 'header.version',
    });
  }
}

function validateBlock(block: Block, errors: ValidationError[], ctx: ValidationContext): void {
  switch (block.type) {
    case 'section':
      validateSection(block, errors, ctx);
      break;
    case 'warn':
      validateWarn(block, errors);
      break;
    case 'counter':
      validateCounter(block, errors);
      break;
    case 'if':
      validateIf(block, errors, ctx);
      break;
    case 'elseif':
      validateElseIf(block, errors, ctx);
      break;
    case 'else':
      validateElse(block, errors, ctx);
      break;
    case 'step':
      validateStep(block, errors, ctx);
      break;
    case 'fact':
      validateAnnotations(block.annotations, block.line, errors);
      validateReferences(block.references, errors);
      break;
    case 'define':
      validateAnnotations(block.annotations, block.line, errors);
      validateReferences(block.references, errors);
      break;
    case 'uncertainty':
      validateAnnotations(block.annotations, block.line, errors);
      validateReferences(block.references, errors);
      break;
    case 'example':
      validateAnnotations(block.annotations, block.line, errors);
      validateReferences(block.references, errors);
      break;
    case 'trigger':
      validateAnnotations(block.annotations, block.line, errors);
      break;
    case 'skip':
      validateAnnotations(block.annotations, block.line, errors);
      break;
  }
}

function validateSection(node: SectionNode, errors: ValidationError[], ctx: ValidationContext): void {
  if (ctx.insideSection) {
    errors.push({
      line: node.line,
      message: 'Sections cannot nest inside other sections',
      rule: 'section.no-nesting',
    });
  }
  const childCtx: ValidationContext = { ...ctx, insideSection: true };
  for (const child of node.children) {
    validateBlock(child, errors, childCtx);
  }
  validateReferences(node.references, errors);
}

function validateWarn(node: WarnNode, errors: ValidationError[]): void {
  if (!(WARN_LABELS as readonly string[]).includes(node.label)) {
    errors.push({
      line: node.line,
      message: `Invalid warn label: "${node.label}". Must be one of: ${WARN_LABELS.join(', ')}`,
      rule: 'warn.label',
    });
  }
  validateAnnotations(node.annotations, node.line, errors);
  validateReferences(node.references, errors);
}

function validateCounter(node: CounterNode, errors: ValidationError[]): void {
  if (!(COUNTER_LABELS as readonly string[]).includes(node.label)) {
    errors.push({
      line: node.line,
      message: `Invalid counter label: "${node.label}". Must be one of: ${COUNTER_LABELS.join(', ')}`,
      rule: 'counter.label',
    });
  }
  validateAnnotations(node.annotations, node.line, errors);
  validateReferences(node.references, errors);
}

function validateIf(node: IfNode, errors: ValidationError[], ctx: ValidationContext): void {
  if (ctx.insideIf) {
    errors.push({
      line: node.line,
      message: '$ if cannot nest inside another $ if (one level deep only)',
      rule: 'if.no-nesting',
    });
  }
  const childCtx: ValidationContext = { ...ctx, insideIf: true };
  for (const child of node.children) {
    validateBlock(child, errors, childCtx);
  }
  validateAnnotations(node.annotations, node.line, errors);
  validateReferences(node.references, errors);
}

function validateElseIf(node: ElseIfNode, errors: ValidationError[], ctx: ValidationContext): void {
  if (ctx.insideIf) {
    errors.push({
      line: node.line,
      message: '$ else if cannot nest inside another $ if (one level deep only)',
      rule: 'if.no-nesting',
    });
  }
  const childCtx: ValidationContext = { ...ctx, insideIf: true };
  for (const child of node.children) {
    validateBlock(child, errors, childCtx);
  }
  validateAnnotations(node.annotations, node.line, errors);
  validateReferences(node.references, errors);
}

function validateElse(node: ElseNode, errors: ValidationError[], ctx: ValidationContext): void {
  const childCtx: ValidationContext = { ...ctx, insideIf: true };
  for (const child of node.children) {
    validateBlock(child, errors, childCtx);
  }
  validateAnnotations(node.annotations, node.line, errors);
  validateReferences(node.references, errors);
}

function validateStep(node: StepNode, errors: ValidationError[], ctx: ValidationContext): void {
  for (const child of node.children) {
    validateBlock(child, errors, ctx);
  }
  validateAnnotations(node.annotations, node.line, errors);
  validateReferences(node.references, errors);
}

function validateAnnotations(
  annotations: Annotations | undefined,
  line: number,
  errors: ValidationError[],
): void {
  if (annotations === undefined) return;

  for (const [key, value] of Object.entries(annotations)) {
    if (value === undefined) continue;

    if (!(ANNOTATION_KEYS as readonly string[]).includes(key) && !key.startsWith(CUSTOM_KEY_PREFIX)) {
      errors.push({
        line,
        message: `Unknown annotation key: "${key}". Built-in keys: ${ANNOTATION_KEYS.join(', ')}. Custom keys must use the "${CUSTOM_KEY_PREFIX}" prefix.`,
        rule: 'annotation.unknown-key',
      });
    }

    if (key === 'confidence' && !(CONFIDENCE_VALUES as readonly string[]).includes(value)) {
      errors.push({
        line,
        message: `Invalid confidence value: "${value}". Must be one of: ${CONFIDENCE_VALUES.join(', ')}`,
        rule: 'annotation.confidence',
      });
    }

    if (key === 'status' && !(STATUS_VALUES as readonly string[]).includes(value)) {
      errors.push({
        line,
        message: `Invalid status value: "${value}". Must be one of: ${STATUS_VALUES.join(', ')}`,
        rule: 'annotation.status',
      });
    }

    if (key === 'asof' && !ASOF_PATTERN.test(value)) {
      errors.push({
        line,
        message: `Invalid asof format: "${value}". Must be YYYY-MM.`,
        rule: 'annotation.asof',
      });
    }
  }
}

function validateReferences(
  references: ReferenceNode[] | undefined,
  errors: ValidationError[],
): void {
  if (references === undefined) return;

  for (const ref of references) {
    if (!ref.relationship) {
      errors.push({
        line: ref.line,
        message: 'Reference relationship type is required',
        rule: 'reference.relationship-required',
      });
      continue;
    }

    if (
      !(RELATIONSHIP_TYPES as readonly string[]).includes(ref.relationship) &&
      !ref.relationship.startsWith(CUSTOM_KEY_PREFIX)
    ) {
      errors.push({
        line: ref.line,
        message: `Unknown relationship type: "${ref.relationship}". Built-in types: ${RELATIONSHIP_TYPES.join(', ')}. Custom types must use the "${CUSTOM_KEY_PREFIX}" prefix.`,
        rule: 'reference.unknown-type',
      });
    }

    if (!ref.target) {
      errors.push({
        line: ref.line,
        message: 'Reference target is required',
        rule: 'reference.target-required',
      });
    }
  }
}
