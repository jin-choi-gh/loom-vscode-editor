import type { LoomTextualComplex } from "./types"

/** Parsed JSON checked to be a loom textual complex this reader understands. `origin` names it in errors. */
export function parseTextualComplex(data: unknown, origin: string): LoomTextualComplex {
  if (!isObject(data) || data.format !== "loom-textual-complex") {
    throw new Error(`${origin}: not a loom textual complex`)
  }
  if (data.format_version !== 1) {
    throw new Error(
      `${origin}: format version ${String(data.format_version)}, but this reader reads version 1`,
    )
  }
  return data as unknown as LoomTextualComplex
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
