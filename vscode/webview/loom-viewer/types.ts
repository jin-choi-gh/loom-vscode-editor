// What the reader draws, made from a loom textual complex by loom/toPoem.ts and loom/toNotes.ts.

export interface Line {
  id: string // the display schema's line unit
  text: string // cut from the substrate by the unit's span
  indexInSubstrate: number // the line's place in the substrate, from 0, as loom's positions count
  number: number // the line's number, from 1, as printed beside it
  indent: number // the indent depth, from 0
}

export interface Stanza {
  lines: Line[]
}

export interface Poem {
  title: string
  author: string
  year?: number
  stanzas: Stanza[]
}

/** One target's part of a lemma: the poem's own words, or a citation such as "lines 1–4". */
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

/** A stretch of one line that one note covers: a loom span clipped to that line, by offsets in code
 * points. The range does not name its line: it is one of the ranges rangesOn gives for that line. */
export interface NoteRange {
  start: number
  end: number
  noteId: string
}

export interface NoteIndex {
  notes: Note[] // every note, in file order
  tags: string[] // the tags declared in meta.toml, in its order
  rangesOn(indexInSubstrate: number): NoteRange[] // the ranges on one line
}
