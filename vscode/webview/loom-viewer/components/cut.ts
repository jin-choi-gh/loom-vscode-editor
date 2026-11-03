import { codePoints } from "../loom/textualComplex"

/** A stretch of one line, by offsets in code points as loom counts them: from start, up to end. */
export interface LineRange {
  start: number
  end: number
}

/** A piece of a line that no range starts or ends inside, with the ranges covering it. */
export interface Piece<R extends LineRange> {
  text: string
  ranges: R[]
}

/** A line cut wherever a range starts or ends: its pieces in order, which together are the whole
 * line, each with the ranges covering it. Every range's edges are cuts, so a range either contains
 * a piece or misses it; none starts or ends inside one. */
export function cut<R extends LineRange>(text: string, ranges: R[]): Piece<R>[] {
  const characters = codePoints(text)
  const edges = new Set([0, characters.length])
  for (const range of ranges) {
    edges.add(range.start)
    edges.add(range.end)
  }
  const cuts = [...edges].sort((a, b) => a - b)
  return cuts.slice(0, -1).map((start, i) => {
    const end = cuts[i + 1]
    return {
      text: characters.slice(start, end).join(""),
      ranges: ranges.filter((range) => range.start <= start && end <= range.end),
    }
  })
}
