import type { LoomBlock, LoomSchema, LoomSpan, LoomUnit, LoomTextualComplex } from "./types"

// What loom's models do (loom/src/models), done on the JSON: the substrate's text, and the trees of
// the schemata. Nothing here knows any particular kind of schema.

// Each textual complex's blocks, worked out once: they are asked for block by block
const flatBlocks = new WeakMap<LoomTextualComplex, LoomBlock[]>()

/** Every passage's blocks, in order, as loom's Substrate.blocks gives them: what positions count. */
export function blocksOf(textualComplex: LoomTextualComplex): LoomBlock[] {
  const known = flatBlocks.get(textualComplex)
  if (known !== undefined) return known
  const blocks = textualComplex.passages.flatMap((passage) => passage.blocks)
  flatBlocks.set(textualComplex, blocks)
  return blocks
}

/** A block's id without its passage's, as it is shown beside the block: l1 for bird.l1. An id that
 * does not begin with its passage's is left as it is. */
export function shortId(passageId: string, blockId: string): string {
  const name = `${passageId}.`
  return blockId.startsWith(name) ? blockId.slice(name.length) : blockId
}

/** The text a span covers, as loom's Substrate.text_of gives it: across blocks, each block's part,
 * joined by line breaks. Offsets count code points, as Python's do, not UTF-16 units. */
export function textOf(textualComplex: LoomTextualComplex, span: LoomSpan): string {
  const [startBlock, startOffset] = span.start
  const [endBlock, endOffset] = span.end
  const block = (index: number) => codePoints(blockAt(textualComplex, index).text)
  if (startBlock === endBlock) {
    return block(startBlock).slice(startOffset, endOffset).join("")
  }
  const first = block(startBlock).slice(startOffset).join("")
  const middle = blocksOf(textualComplex)
    .slice(startBlock + 1, endBlock)
    .map(({ text }) => text)
  const last = block(endBlock).slice(0, endOffset).join("")
  return [first, ...middle, last].join("\n")
}

/** The one schema of a kind in the textual complex, with its name: loom names schemata by kind and qualifier. */
export function schemaOfKind(
  textualComplex: LoomTextualComplex,
  kind: string,
): { name: string; schema: LoomSchema } {
  const found = Object.entries(textualComplex.schemata).filter(([, schema]) => schema.kind === kind)
  if (found.length === 0) {
    throw new Error(`${textualComplex.name}: no ${kind} schema`)
  }
  if (found.length > 1) {
    const names = found.map(([name]) => name).join(", ")
    throw new Error(`${textualComplex.name}: several ${kind} schemata: ${names}`)
  }
  const [name, schema] = found[0]
  return { name, schema }
}

/** A schema's tree, as loom's Schema gives it: its roots, and each unit's children, in reading order. */
export class SchemaTree {
  private readonly byParent = new Map<string | null, LoomUnit[]>()

  constructor(schema: LoomSchema) {
    for (const unit of schema.units) {
      const siblings = this.byParent.get(unit.parent)
      if (siblings === undefined) this.byParent.set(unit.parent, [unit])
      else siblings.push(unit)
    }
  }

  roots(): LoomUnit[] {
    return this.byParent.get(null) ?? []
  }

  children(unit: LoomUnit): LoomUnit[] {
    return this.byParent.get(unit.id) ?? []
  }
}

function blockAt(textualComplex: LoomTextualComplex, index: number): LoomBlock {
  const block = blocksOf(textualComplex)[index]
  if (block === undefined) {
    throw new Error(`${textualComplex.name}: no block at index ${index}`)
  }
  return block
}

/** A block's length as loom counts it, in code points. */
export function blockLength(textualComplex: LoomTextualComplex, index: number): number {
  return codePoints(blockAt(textualComplex, index).text).length
}

/** A text's characters as loom counts them: code points, not UTF-16 units, so that loom's offsets
 * index this array directly. */
export function codePoints(text: string): string[] {
  return Array.from(text)
}
