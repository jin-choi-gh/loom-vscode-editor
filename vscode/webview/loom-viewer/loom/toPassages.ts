import type { Block, Passage } from "../types"
import { DISPLAY, LINE, PARAGRAPH, PROSE_PASSAGE, STANZA, VERSE_PASSAGE } from "./display"
import type { LoomUnit, LoomTextualComplex } from "./types"
import { SchemaTree, schemaOfKind, shortId, textOf } from "./textualComplex"

/** The passages of a loom textual complex, as its display schema has them, in order, each block's
 * text cut from the substrate by its span. Throws for a passage of a form it does not know, rather
 * than leaving it out. */
export function toPassages(textualComplex: LoomTextualComplex): Passage[] {
  const tree = new SchemaTree(schemaOfKind(textualComplex, DISPLAY).schema)
  const children = (unit: LoomUnit, rank: string) =>
    tree.children(unit).filter((child) => child.rank === rank)

  const block = (unit: LoomUnit, passageId: string): Block => ({
    id: unit.id,
    label: shortId(passageId, unit.id),
    text: textOf(textualComplex, unit),
    indexInSubstrate: unit.start[0],
  })

  const passage = (unit: LoomUnit): Passage => {
    const { id } = unit
    switch (unit.rank) {
      case VERSE_PASSAGE:
        return {
          id,
          form: "verse",
          stanzas: children(unit, STANZA).map((stanza) => ({
            lines: children(stanza, LINE).map((line) => ({
              ...block(line, id),
              indent: Number(line.value ?? 0) || 0,
            })),
          })),
        }
      case PROSE_PASSAGE:
        return {
          id,
          form: "prose",
          paragraphs: children(unit, PARAGRAPH).map((paragraph) => block(paragraph, id)),
        }
      default:
        throw new Error(`${textualComplex.name}: the viewer cannot draw a ${unit.rank}`)
    }
  }

  return tree.roots().map(passage)
}
