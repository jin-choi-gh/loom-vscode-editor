// The JSON loom writes for one textual complex: loom/src/exports/textual_complex_json.py, format_version 2.

/** [index of the block, counted through every passage's, character offset within that block] */
export type LoomPosition = [block: number, offset: number]

export interface LoomSpan {
  start: LoomPosition
  end: LoomPosition
}

export interface LoomBlock {
  id: string
  text: string
}

export interface LoomPassage {
  id: string
  blocks: LoomBlock[]
}

export interface LoomUnit extends LoomSpan {
  id: string
  rank: string
  value: string | null
  parent: string | null
}

export interface LoomSchema {
  kind: string
  units: LoomUnit[]
}

export interface LoomAtom extends LoomSpan {
  text: string
  innermost: Record<string, string> // schema name → unit id
}

export interface LoomAnnotation {
  targets: LoomSpan[]
  tags?: string[] // absent in files written before tags
  body: string
}

export interface LoomMetadata {
  title: string | null
  author: string | null
  notes?: { tags: string[] } // absent in files written before tags
}

export interface LoomTextualComplex {
  format: "loom-textual-complex"
  format_version: 2
  name: string | null
  metadata: LoomMetadata
  passages: LoomPassage[]
  schemata: Record<string, LoomSchema>
  atoms: LoomAtom[]
  annotations: Record<string, LoomAnnotation[]>
}
