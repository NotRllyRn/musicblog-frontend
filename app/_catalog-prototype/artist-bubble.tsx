"use client"

import { Text } from "@astryxdesign/core/Text"
import Image from "next/image"
import { type CSSProperties, memo } from "react"

import type { ArtistProfile } from "./types"

interface ArtistBubbleProps {
  active: boolean
  artist: ArtistProfile
  diameter: number
  onActivate: (id: number) => void
  onDeactivate: (id: number) => void
  pushX: number
  pushY: number
  x: number
  y: number
}

type ArtistBubbleStyle = CSSProperties &
  Record<
    | "--artist-diameter"
    | "--artist-push-x"
    | "--artist-push-y"
    | "--artist-x"
    | "--artist-y",
    string
  >

function initials(name: string) {
  const words = name
    .trim()
    .split(/\s+/u)
    .map((word) => word.match(/[\p{Letter}\p{Number}]/gu)?.join("") ?? "")
    .filter(Boolean)
  return (
    words.length > 1
      ? `${words[0][0]}${words.at(-1)?.[0] ?? ""}`
      : (words[0]?.slice(0, 2) ?? "?")
  ).toLocaleUpperCase()
}

export const ArtistBubble = memo(function ArtistBubble({
  active,
  artist,
  diameter,
  onActivate,
  onDeactivate,
  pushX,
  pushY,
  x,
  y,
}: ArtistBubbleProps) {
  const style: ArtistBubbleStyle = {
    "--artist-diameter": `${diameter}px`,
    "--artist-push-x": `${pushX}px`,
    "--artist-push-y": `${pushY}px`,
    "--artist-x": `${x - diameter / 2}px`,
    "--artist-y": `${y - diameter / 2}px`,
  }

  return (
    <article
      className="artist-slot"
      data-active={active || undefined}
      style={style}
    >
      <figure className="artist-push">
        <button
          aria-label={artist.name}
          className="artist-face"
          onBlur={() => onDeactivate(artist.id)}
          onClick={() => onActivate(artist.id)}
          onFocus={() => onActivate(artist.id)}
          onPointerEnter={() => onActivate(artist.id)}
          onPointerLeave={(event) => {
            if (!event.currentTarget.contains(document.activeElement))
              onDeactivate(artist.id)
          }}
          type="button"
        >
          <Text
            as="span"
            className="artist-initials"
            color="inherit"
            weight="bold"
          >
            {initials(artist.name)}
          </Text>
          {artist.imageUrl && (
            <Image
              alt=""
              className="artist-portrait"
              draggable={false}
              fill
              loading="lazy"
              onError={(event) =>
                event.currentTarget
                  .closest(".artist-face")
                  ?.setAttribute("data-image-failed", "true")
              }
              sizes="(max-width: 47.99rem) 82px, 112px"
              src={artist.imageUrl}
            />
          )}
          <Text
            aria-hidden="true"
            as="span"
            className="artist-name"
            color="inherit"
            maxLines={2}
            type="label"
          >
            {artist.name}
          </Text>
        </button>
      </figure>
    </article>
  )
})
