export const DOCTYPES = [
  'skill',
  'prompt',
  'plan',
  'memory',
  'reference',
  'spec',
  'guide',
  'policy',
  'schema',
  'eval',
  'changelog',
  'config',
  'sigil',
] as const;

export const WARN_LABELS = ['note', 'warn', 'critical'] as const;

export const COUNTER_LABELS = ['counter', 'tradeoff', 'exception'] as const;

export const CONFIDENCE_VALUES = ['high', 'medium', 'low'] as const;

export const STATUS_VALUES = ['draft', 'stable', 'deprecated', 'experimental'] as const;

export const ANNOTATION_KEYS = ['confidence', 'asof', 'source', 'status', 'lang'] as const;

export const RELATIONSHIP_TYPES = [
  'depends-on',
  'see-also',
  'contradicts',
  'source',
  'supersedes',
  'implements',
] as const;

export const CUSTOM_KEY_PREFIX = 'x-';

export const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;

export const ASOF_PATTERN = /^\d{4}-\d{2}$/;

export const INDENT_SIZE = 2;
