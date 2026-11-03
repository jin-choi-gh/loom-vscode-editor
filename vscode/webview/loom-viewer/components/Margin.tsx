import type { ReactNode } from "react"

/** The spread layout's margin beside the text: a place to put things, which knows nothing of notes. */
export function Margin({ children }: { children: ReactNode }) {
  return <aside className="margin">{children}</aside>
}
