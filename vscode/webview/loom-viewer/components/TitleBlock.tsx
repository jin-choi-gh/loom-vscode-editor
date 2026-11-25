import type { Metadata } from "../types"

export function TitleBlock({ metadata }: { metadata: Metadata }) {
  return (
    <header className="title-block">
      <h1 className="title">{metadata.title}</h1>
      <p className="poet">
        {metadata.author}
        {metadata.year !== undefined && ` · ${metadata.year}`}
      </p>
    </header>
  )
}
