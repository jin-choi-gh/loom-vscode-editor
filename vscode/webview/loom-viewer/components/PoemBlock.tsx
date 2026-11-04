import type { CSSProperties } from "react"
import { Fragment, useEffect, useRef } from "react"
import { cut } from "./cut"
import type { Line, NoteRange, Poem } from "../types"

/** The poem, stanza by stanza, every fifth line numbered. The selected note's words are marked, and
 * scrolled into view if they are out of view; with no note selected, each line is drawn as it is. */
export function PoemBlock({
  poem,
  rangesOn,
  selectedNote,
}: {
  poem: Poem
  rangesOn: (indexInSubstrate: number) => NoteRange[]
  selectedNote: string | null
}) {
  // The selected note's ranges on a line: none on lines it doesn't touch, or when nothing is selected
  const selectedRanges = (line: Line) =>
    rangesOn(line.indexInSubstrate).filter((range) => range.noteId === selectedNote)

  const poemRef = useRef<HTMLDivElement>(null)

  // After a note is selected, bring its first marked words into view if they are out of view
  useEffect(() => {
    if (selectedNote === null) return
    const first = poemRef.current?.querySelector("mark")
    if (!first) return // a whole-poem note marks nothing
    const page = getComputedStyle(document.documentElement)
    const visibleTop = parseFloat(page.scrollPaddingTop) || 0
    const visibleBottom = window.innerHeight - (parseFloat(page.scrollPaddingBottom) || 0)
    const { top, bottom } = first.getBoundingClientRect()
    if (top >= visibleTop && bottom <= visibleBottom) return // already in view
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    first.scrollIntoView({ block: "start", behavior: reduceMotion ? "auto" : "smooth" })
  }, [selectedNote])

  return (
    <div className="poem" ref={poemRef}>
      {poem.stanzas.map((stanza, i) => (
        <div className="stanza" key={i}>
          {stanza.lines.map((line) => (
            <div
              key={line.id}
              className="line"
              data-line-id={line.id}
              style={{ "--indent": line.indent } as CSSProperties}
            >
              {/* {line.number % 5 === 0 && ( */}
              <span className="line-number" aria-hidden="true">
                l{line.number}
              </span>
              {/* )} */}
              <span className="line-text">
                {cut(line.text, selectedRanges(line)).map((piece, j) =>
                  piece.ranges.length > 0 ? (
                    <mark key={j}>{piece.text}</mark>
                  ) : (
                    <Fragment key={j}>{piece.text}</Fragment>
                  ),
                )}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
