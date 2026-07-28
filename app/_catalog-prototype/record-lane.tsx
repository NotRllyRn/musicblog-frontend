"use client"

import { type KeyboardEvent, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Text } from "@astryxdesign/core/Text"

import type { AlbumPost, VariantKey } from "./types"

interface RecordLaneProps {
  albums: AlbumPost[]
  index: number
  variant: VariantKey
}

export function RecordLane({ albums, index, variant }: RecordLaneProps) {
  const label = String.fromCharCode(65 + index)
  const [activeIndex, setActiveIndex] = useState(0)
  const items = useRef<(HTMLLIElement | null)[]>([])

  const moveTo = (nextIndex: number) => {
    const next = Math.max(0, Math.min(albums.length - 1, nextIndex))
    setActiveIndex(next)
    items.current[next]?.scrollIntoView({ block: "center" })
  }

  const onKeyDown = (event: KeyboardEvent<HTMLOListElement>) => {
    const moves: Partial<Record<string, number>> = {
      ArrowDown: activeIndex + 1,
      ArrowUp: activeIndex - 1,
      End: albums.length - 1,
      Home: 0,
    }

    if (event.key in moves) {
      event.preventDefault()
      moveTo(moves[event.key] ?? activeIndex)
    }

    const activeAlbum = albums[activeIndex]
    if (event.key === "Enter" && activeAlbum) {
      window.location.assign(activeAlbum.href)
    }
  }

  return (
    <section className="catalog-lane" aria-label={`Record lane ${label}`}>
      <header className="lane-label">
        <Text type="code" color="inherit">
          {variant === "D" ? `CH ${index + 1}` : `BIN ${label}`}
        </Text>
        <Text type="supporting" color="inherit" hasTabularNumbers>
          {albums.length}
        </Text>
      </header>

      <ol
        className="record-list"
        tabIndex={0}
        aria-keyshortcuts="ArrowUp ArrowDown Home End Enter"
        aria-label={`Browse lane ${label}. Use up and down arrows, then Enter to open.`}
        onKeyDown={onKeyDown}
      >
        {albums.map((album, albumIndex) => (
          <li
            className="record-item"
            data-active={albumIndex === activeIndex || undefined}
            key={album.id}
            ref={(item) => {
              items.current[albumIndex] = item
            }}
          >
            <Link className="album-sleeve" href={album.href} tabIndex={-1}>
              <figure className="album-figure">
                <Image
                  className="album-art"
                  src={album.imageUrl}
                  alt={album.imageAlt}
                  fill
                  sizes="(min-width: 960px) 20vw, 240px"
                  unoptimized
                />
                <figcaption className="album-caption">
                  <Text type="label" color="inherit" maxLines={1}>
                    {album.title}
                  </Text>
                  <Text type="supporting" color="inherit" maxLines={1}>
                    {album.artist}
                  </Text>
                  <Text type="code" color="inherit" hasTabularNumbers>
                    {album.year}
                  </Text>
                </figcaption>
              </figure>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  )
}
