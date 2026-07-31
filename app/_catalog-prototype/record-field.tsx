"use client"

import { useState } from "react"

import { RecordDeck } from "./record-deck"
import type { AlbumPost, DeckCount } from "./types"

interface RecordFieldProps {
  albums: AlbumPost[]
  deckCount: DeckCount
  onNeedMore: (loadedCount: number) => void
  total: number
}

export function RecordField({
  albums,
  deckCount,
  onNeedMore,
  total,
}: RecordFieldProps) {
  const [selection, setSelection] = useState<{
    deck: number
    deckCount: DeckCount
    visualIndex: number
  } | null>(null)
  const stacks = Array.from({ length: deckCount }, () => [] as AlbumPost[])
  albums.forEach((album, index) => stacks[index % stacks.length].push(album))
  const activeSelection = selection?.deckCount === deckCount ? selection : null

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
          key={index}
          onNeedMore={() => onNeedMore(albums.length)}
          onSelectionChange={(visualIndex) =>
            setSelection(
              visualIndex === null
                ? null
                : { deck: index, deckCount, visualIndex }
            )
          }
          selectionActive={activeSelection !== null}
          selectedVisualIndex={
            activeSelection?.deck === index ? activeSelection.visualIndex : null
          }
          totalRecords={Math.ceil((total - index) / deckCount)}
        />
      ))}
    </section>
  )
}
