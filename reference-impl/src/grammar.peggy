// Sigil sub-expression grammar
// Handles annotation blocks and reference lines; document structure is in parser.ts

{{
  // Module-level initializer (no shared state needed)
}}

// ── Entry points ──────────────────────────────────────────────────────────────

Annotations
  = "{" _ pairs:AnnotationPair|1.., _ "," _| _ "}"
  { return Object.fromEntries(pairs); }

AnnotationPair
  = key:AnnotationKey _ ":" _ value:AnnotationValue
  { return [key, value]; }

AnnotationKey
  = $([a-z] [a-z0-9_-]*)

AnnotationValue
  = $([^,}]*)
  { return text().trim(); }

ReferenceLine
  = "->" _ rel:RelationshipType _ ":" _ target:RestOfInput
  { return { relationship: rel, target: target }; }

RelationshipType
  = $([a-z] [a-z0-9_-]*)

RestOfInput
  = $(.*)
  { return text().trim(); }

_ = $(" "*)