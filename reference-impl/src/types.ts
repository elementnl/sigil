export type Doctype =
  | 'skill'
  | 'prompt'
  | 'plan'
  | 'memory'
  | 'reference'
  | 'spec'
  | 'guide'
  | 'policy'
  | 'schema'
  | 'eval'
  | 'changelog'
  | 'config'
  | 'sigil';

export type WarnLabel = 'note' | 'warn' | 'critical';
export type CounterLabel = 'counter' | 'tradeoff' | 'exception';
export type ConfidenceValue = 'high' | 'medium' | 'low';
export type StatusValue = 'draft' | 'stable' | 'deprecated' | 'experimental';
export type ParseMode = 'strict' | 'lenient';

export interface Annotations {
  confidence?: ConfidenceValue;
  asof?: string;
  source?: string;
  status?: StatusValue;
  lang?: string;
  [key: string]: string | undefined;
}

export interface DocumentHeader {
  doctype: Doctype;
  name?: string;
  version?: string;
  description?: string;
  input?: string[];
  output?: string[];
}

export interface BaseNode {
  line: number;
}

export interface ContextNode extends BaseNode {
  type: 'context';
  content: string;
}

export interface ReferenceNode extends BaseNode {
  type: 'reference';
  relationship: string;
  target: string;
}

export interface SectionNode extends BaseNode {
  type: 'section';
  content: string;
  children: Block[];
  context?: ContextNode;
  references?: ReferenceNode[];
}

export interface TriggerNode extends BaseNode {
  type: 'trigger';
  content: string;
  annotations?: Annotations;
}

export interface SkipNode extends BaseNode {
  type: 'skip';
  content: string;
  annotations?: Annotations;
}

export interface DefineNode extends BaseNode {
  type: 'define';
  term: string;
  content: string;
  context?: ContextNode;
  references?: ReferenceNode[];
  annotations?: Annotations;
}

export interface WarnNode extends BaseNode {
  type: 'warn';
  label: WarnLabel;
  content: string;
  context?: ContextNode;
  references?: ReferenceNode[];
  annotations?: Annotations;
}

export interface UncertaintyNode extends BaseNode {
  type: 'uncertainty';
  content: string;
  context?: ContextNode;
  references?: ReferenceNode[];
  annotations?: Annotations;
}

export interface ExampleNode extends BaseNode {
  type: 'example';
  label?: string;
  content: string;
  context?: ContextNode;
  references?: ReferenceNode[];
  annotations?: Annotations;
}

export interface StepNode extends BaseNode {
  type: 'step';
  content: string;
  children: Block[];
  context?: ContextNode;
  references?: ReferenceNode[];
  annotations?: Annotations;
}

export interface IfNode extends BaseNode {
  type: 'if';
  condition: string;
  children: Block[];
  context?: ContextNode;
  references?: ReferenceNode[];
  annotations?: Annotations;
}

export interface ElseIfNode extends BaseNode {
  type: 'elseif';
  condition: string;
  children: Block[];
  context?: ContextNode;
  references?: ReferenceNode[];
  annotations?: Annotations;
}

export interface ElseNode extends BaseNode {
  type: 'else';
  children: Block[];
  context?: ContextNode;
  references?: ReferenceNode[];
  annotations?: Annotations;
}

export interface FactNode extends BaseNode {
  type: 'fact';
  content: string;
  context?: ContextNode;
  references?: ReferenceNode[];
  annotations?: Annotations;
}

export interface CounterNode extends BaseNode {
  type: 'counter';
  label: CounterLabel;
  content: string;
  context?: ContextNode;
  references?: ReferenceNode[];
  annotations?: Annotations;
}

export type Block =
  | SectionNode
  | TriggerNode
  | SkipNode
  | DefineNode
  | WarnNode
  | UncertaintyNode
  | ExampleNode
  | StepNode
  | IfNode
  | ElseIfNode
  | ElseNode
  | FactNode
  | CounterNode;

export interface SigilDocument {
  header: DocumentHeader;
  blocks: Block[];
}

export interface ParseWarning {
  line: number;
  message: string;
}

export interface ParseResult {
  document: SigilDocument;
  warnings: ParseWarning[];
}

export interface ValidationError {
  line?: number;
  message: string;
  rule: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface SerializeOptions {
  indentSize?: number;
}

export interface ParseOptions {
  mode?: ParseMode;
}
