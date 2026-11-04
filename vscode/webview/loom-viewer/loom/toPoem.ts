import type { Line, Poem, Stanza } from "../types"
import { DISPLAY, LINE, POEM, STANZA } from "./display"
import type { LoomUnit, LoomTextualComplex } from "./types"
import { SchemaTree, schemaOfKind, textOf } from "./textualComplex"

/** The reader's Poem from a loom textual complex: the poems, stanzas and lines of its display
 * schema, each line's text cut from the substrate by its span, and the textual complex's
 * metadata. */
export function toPoem(textualComplex: LoomTextualComplex): Poem {
  const tree = new SchemaTree(schemaOfKind(textualComplex, DISPLAY).schema)
  const ranked = (units: LoomUnit[], rank: string) => units.filter((unit) => unit.rank === rank)

  const stanzas: Stanza[] = ranked(tree.roots(), POEM).flatMap((poem) =>
    ranked(tree.children(poem), STANZA).map((stanza) => ({
      lines: ranked(tree.children(stanza), LINE).map((line): Line => ({
        id: line.id,
        text: textOf(textualComplex, line),
        indexInSubstrate: line.start[0],
        number: line.start[0] + 1,
        indent: Number(line.value ?? 0) || 0,
      })),
    })),
  )

  return {
    title: textualComplex.metadata.title ?? textualComplex.name ?? "Untitled",
    author: textualComplex.metadata.author ?? "",
    stanzas,
  }
}
