"use client"

import { Heading } from "@astryxdesign/core/Heading"
import { useCallback, useState } from "react"

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
  const [endState, setEndState] = useState<{
    deckCount: DeckCount
    decks: Record<number, boolean>
  }>({ deckCount, decks: {} })
  const stacks = Array.from({ length: deckCount }, () => [] as AlbumPost[])
  albums.forEach((album, index) => stacks[index % stacks.length].push(album))
  const activeSelection = selection?.deckCount === deckCount ? selection : null
  const allDecksEnded =
    endState.deckCount === deckCount &&
    stacks.every((_, index) => endState.decks[index])
  const onEndChange = useCallback(
    (index: number, ended: boolean) =>
      setEndState((current) => {
        const decks = current.deckCount === deckCount ? current.decks : {}
        return decks[index] === ended
          ? current
          : { deckCount, decks: { ...decks, [index]: ended } }
      }),
    [deckCount]
  )

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
          onEndChange={onEndChange}
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
      <aside
        className="catalog-easter-egg"
        aria-hidden={!allDecksEnded}
        data-visible={allDecksEnded || undefined}
      >
        <Heading level={2} type="display-1" color="inherit" justify="center">
          Easter egg
        </Heading>
      </aside>
    </section>
  )
}
