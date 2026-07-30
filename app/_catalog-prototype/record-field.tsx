"use client"

import { useMediaQuery } from "@astryxdesign/core"

import { RecordDeck } from "./record-deck"
import type { AlbumPost } from "./types"

interface RecordFieldProps {
  albums: AlbumPost[]
}

export function RecordField({ albums }: RecordFieldProps) {
  const isMobile = useMediaQuery("(max-width: 47.99rem)")
  const isMedium = useMediaQuery("(max-width: 69.99rem)")
  const deckCount = isMobile ? 3 : isMedium ? 5 : 7
  const stacks = Array.from({ length: deckCount }, () => [] as AlbumPost[])
  albums.forEach((album, index) => stacks[index % stacks.length].push(album))

  return (
    <section
      className="record-field"
      aria-label={`Scrollable album catalog in ${deckCount} groups`}
      data-deck-count={deckCount}
    >
      {stacks.map((records, index) => (
        <RecordDeck
          albums={records}
          index={index}
          key={`${deckCount}-${index}`}
        />
      ))}
    </section>
  )
}
