import type { LemmaPart, Note, NoteIndex, NoteRange } from "../types"
import { DISPLAY, PARAGRAPH } from "./display"
import type { LoomAnnotation, LoomSpan, LoomTextualComplex } from "./types"
import { blockLength, blocksOf, schemaOfKind, shortId, textOf } from "./textualComplex"

/** What a target covers: the whole text, whole blocks, or words starting or ending inside a block. */
type TargetKind = "text" | "blocks" | "words"

/** The reader's notes from a loom textual complex: every note of every set, in file order, with its
 * id (set and place in it, from 1: notes:7), its lemma and its paragraphs; and what each block's
 * notes cover. Ids last only as long as the loaded file, so they are never to be saved. */
export function toNotes(textualComplex: LoomTextualComplex): NoteIndex {
  const numbered = Object.entries(textualComplex.annotations).flatMap(([set, annotations]) =>
    annotations.map((annotation, i) => ({
      id: `${set}:${i + 1}`,
      annotation,
    })),
  )

  const notes: Note[] = numbered.map(({ id, annotation }) => ({
    id,
    lemma: lemmaOf(textualComplex, annotation.targets),
    paragraphs: paragraphsOf(annotation.body),
    tags: annotation.tags ?? [],
  }))

  const ranges = rangesByBlock(textualComplex, numbered)

  return {
    notes,
    tags: textualComplex.metadata.notes?.tags ?? [],
    rangesOn: (indexInSubstrate) => ranges[indexInSubstrate] ?? [],
  }
}

/** What a note is about: one part for each of its targets, in the editor's order. */
function lemmaOf(textualComplex: LoomTextualComplex, targets: LoomSpan[]): LemmaPart[] {
  return targets.map((target) => targetLemma(textualComplex, target))
}

/** One target's part of the lemma: a citation ("the whole text", or the ids of whole blocks), or a
 * quote of its words, with " / " between blocks and " / … / " for the blocks between a long
 * passage's first and last. */
function targetLemma(textualComplex: LoomTextualComplex, target: LoomSpan): LemmaPart {
  const [firstBlock] = target.start
  const [lastBlock] = target.end
  switch (kindOf(textualComplex, target)) {
    case "text":
      return { kind: "citation", text: "the whole text" }
    case "blocks":
      return { kind: "citation", text: citationOf(textualComplex, firstBlock, lastBlock) }
    case "words": {
      const pieces = textOf(textualComplex, target)
        .split("\n")
        .map((piece, i) => (isParagraph(textualComplex, firstBlock + i) ? shortened(piece) : piece))
      const text =
        pieces.length <= 2 ? pieces.join(" / ") : `${pieces[0]} / … / ${pieces[pieces.length - 1]}`
      return { kind: "quote", text }
    }
  }
}

/** Whole blocks, cited as notes name them. In a text of several passages: a whole passage by its id,
 * bird; blocks of one passage with its id once, bird.l1–l4; others in full, bird.l3–crow.l1. In a text
 * of one passage: l1, l1–l4. */
function citationOf(textualComplex: LoomTextualComplex, first: number, last: number): string {
  const { passages } = textualComplex
  const blocks = blocksOf(textualComplex)
  const passageOf = (index: number) => passages.find((p) => p.blocks.includes(blocks[index]))
  const [start, end] = [passageOf(first), passageOf(last)]
  const short = (index: number) => shortId(passageOf(index)?.id ?? "", blocks[index].id)

  const several = passages.length > 1
  if (first === last) return several ? blocks[first].id : short(first)
  if (start !== end) return `${blocks[first].id}–${blocks[last].id}`
  if (several && start?.blocks.length === last - first + 1) return start.id
  return `${several ? blocks[first].id : short(first)}–${short(last)}`
}

/** Whether a block is a paragraph of prose. */
function isParagraph(textualComplex: LoomTextualComplex, index: number): boolean {
  return schemaOfKind(textualComplex, DISPLAY).schema.units.some(
    (unit) => unit.rank === PARAGRAPH && unit.start[0] === index,
  )
}

/** A quote from a paragraph, cut to its first and last words when it is long. */
function shortened(text: string): string {
  const words = text.split(" ")
  if (words.length <= 12) return text
  return [...words.slice(0, 4), "…", ...words.slice(-4)].join(" ")
}

/** A target's kind. Loom's spans never start at a block's end nor end at a block's start, so a target
 * starting at offset 0 and ending at its last block's length covers whole blocks. */
function kindOf(textualComplex: LoomTextualComplex, target: LoomSpan): TargetKind {
  const [firstBlock, startOffset] = target.start
  const [lastBlock, endOffset] = target.end
  const wholeBlocks = startOffset === 0 && endOffset === blockLength(textualComplex, lastBlock)
  if (wholeBlocks && firstBlock === 0 && lastBlock === blocksOf(textualComplex).length - 1)
    return "text"
  return wholeBlocks ? "blocks" : "words"
}

/** A note's body as its paragraphs: split at blank lines, each paragraph's wrapped lines joined
 * into one. */
function paragraphsOf(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter((paragraph) => paragraph !== "")
}

/** What notes cover, block by block: each target cut at the breaks it crosses, in note order.
 * Whole-text targets are left out, so that selecting such a note marks nothing. */
function rangesByBlock(
  textualComplex: LoomTextualComplex,
  numbered: { id: string; annotation: LoomAnnotation }[],
): NoteRange[][] {
  const ranges: NoteRange[][] = blocksOf(textualComplex).map(() => [])
  for (const { id, annotation } of numbered) {
    for (const target of annotation.targets) {
      if (kindOf(textualComplex, target) === "text") continue
      const [firstBlock, startOffset] = target.start
      const [lastBlock, endOffset] = target.end
      for (let block = firstBlock; block <= lastBlock; block++) {
        ranges[block].push({
          start: block === firstBlock ? startOffset : 0,
          end: block === lastBlock ? endOffset : blockLength(textualComplex, block),
          noteId: id,
        })
      }
    }
  }
  return ranges
}
