"use client"

import { RecordDeck } from "./record-deck"
import type { AlbumPost, DeckCount } from "./types"

interface RecordFieldProps {
  albums: AlbumPost[]
  deckCount: DeckCount
  onNeedMore: () => void
}

export function RecordField({
  albums,
  deckCount,
  onNeedMore,
}: RecordFieldProps) {
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
          onNeedMore={onNeedMore}
        />
      ))}
    </section>
  )
}
