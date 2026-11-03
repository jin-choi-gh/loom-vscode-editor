import type { LemmaPart, Note, NoteIndex, NoteRange } from "../types"
import type { LoomAnnotation, LoomSpan, LoomTextualComplex } from "./types"
import { lineLength, textOf } from "./textualComplex"

/** What a target covers: the whole poem, whole lines, or a passage starting or ending inside a line. */
type TargetKind = "poem" | "lines" | "passage"

/** The reader's notes from a loom textual complex: every note of every set, in file order, with its
 * id (set and place in it, from 1: notes:7), its lemma and its paragraphs; and what each line's
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
  }))

  const ranges = rangesByLine(textualComplex, numbered)

  return {
    notes,
    rangesOn: (indexInSubstrate) => ranges[indexInSubstrate] ?? [],
  }
}

/** What a note is about: one part for each of its targets, in the editor's order. */
function lemmaOf(textualComplex: LoomTextualComplex, targets: LoomSpan[]): LemmaPart[] {
  return targets.map((target) => targetLemma(textualComplex, target))
}

/** One target's part of the lemma: a citation ("the whole poem", or its line numbers for whole
 * lines), or a quote of its words, with " / " at line breaks and " / … / " for the lines between a
 * long passage's first and last. */
function targetLemma(textualComplex: LoomTextualComplex, target: LoomSpan): LemmaPart {
  const first = target.start[0] + 1
  const last = target.end[0] + 1
  switch (kindOf(textualComplex, target)) {
    case "poem":
      return { kind: "citation", text: "the whole poem" }
    case "lines":
      return {
        kind: "citation",
        text: first === last ? `line ${first}` : `lines ${first}–${last}`,
      }
    case "passage": {
      const lines = textOf(textualComplex, target).split("\n")
      const text =
        lines.length <= 2 ? lines.join(" / ") : `${lines[0]} / … / ${lines[lines.length - 1]}`
      return { kind: "quote", text }
    }
  }
}

/** A target's kind. Loom's spans never start at a line's end nor end at a line's start, so a target
 * starting at offset 0 and ending at its last line's length covers whole lines. */
function kindOf(textualComplex: LoomTextualComplex, target: LoomSpan): TargetKind {
  const [startLine, startOffset] = target.start
  const [endLine, endOffset] = target.end
  const wholeLines = startOffset === 0 && endOffset === lineLength(textualComplex, endLine)
  if (wholeLines && startLine === 0 && endLine === textualComplex.lines.length - 1) return "poem"
  return wholeLines ? "lines" : "passage"
}

/** A note's body as its paragraphs: split at blank lines, each paragraph's wrapped lines joined
 * into one, as the notes grammar reads them (loom/NOTES_GRAMMAR.md, 3.4). */
function paragraphsOf(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter((paragraph) => paragraph !== "")
}

/** What notes cover, line by line: each target cut at the line breaks it crosses, in note order.
 * Whole-poem targets are left out, so that selecting such a note marks nothing. */
function rangesByLine(
  textualComplex: LoomTextualComplex,
  numbered: { id: string; annotation: LoomAnnotation }[],
): NoteRange[][] {
  const ranges: NoteRange[][] = textualComplex.lines.map(() => [])
  for (const { id, annotation } of numbered) {
    for (const target of annotation.targets) {
      if (kindOf(textualComplex, target) === "poem") continue
      const [startLine, startOffset] = target.start
      const [endLine, endOffset] = target.end
      for (let line = startLine; line <= endLine; line++) {
        ranges[line].push({
          start: line === startLine ? startOffset : 0,
          end: line === endLine ? endOffset : lineLength(textualComplex, line),
          noteId: id,
        })
      }
    }
  }
  return ranges
}
