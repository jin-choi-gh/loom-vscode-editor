import type { Metadata } from "../types"
import type { LoomTextualComplex } from "./types"

/** A textual complex's title and author; its folder's name, if it has no title. */
export function toMetadata({ metadata, name }: LoomTextualComplex): Metadata {
  return { title: metadata.title ?? name ?? "Untitled", author: metadata.author ?? "" }
}
