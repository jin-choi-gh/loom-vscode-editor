// What the reader draws, made from a loom textual complex by loom/toMetadata.ts, loom/toPassages.ts
// and loom/toNotes.ts.

/** A line of verse or a paragraph of prose: one block of loom's substrate. */
export interface Block {
  id: string // the block's id, unique in the text: bird.l1
  label: string // the id as it is shown beside the block, without its passage's: l1
  text: string // cut from the substrate by the unit's span
  indexInSubstrate: number // the block's place in the substrate, from 0, as loom's positions count
}

export interface Line extends Block {
  indent: number // the indent depth, from 0
}

export interface Stanza {
  lines: Line[]
}

/** A run of text in one form. */
export type Passage = { id: string } & (
  { form: "verse"; stanzas: Stanza[] } | { form: "prose"; paragraphs: Block[] }
)

/** What the title block says. */
export interface Metadata {
  title: string
  author: string
  year?: number
}

/** One target's part of a lemma: the text's own words, or a citation such as "l1–l4". */
export interface LemmaPart {
  kind: "quote" | "citation"
  text: string
}

export interface Note {
  id: string
  lemma: LemmaPart[]
  paragraphs: string[]
  tags: string[]
}

/** A stretch of one block that one note covers: a loom span clipped to that block, by offsets in code
 * points. The range does not name its block: it is one of the ranges rangesOn gives for that block. */
export interface NoteRange {
  start: number
  end: number
  noteId: string
}

export interface NoteIndex {
  notes: Note[] // every note, in file order
  tags: string[] // the tags declared in meta.toml, in its order
  rangesOn(indexInSubstrate: number): NoteRange[] // the ranges on one block
}
