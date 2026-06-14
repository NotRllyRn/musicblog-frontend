"use client"

import { MouseEvent, useState } from "react"
import Image from "next/image"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Album } from "@/types/album"

type AlbumCardProps = {
  album: Album
  priority?: boolean
}

export function AlbumCard({ album, priority = false }: AlbumCardProps) {
  const [revealed, setRevealed] = useState(false)

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    const prefersTouch = window.matchMedia("(hover: none)").matches

    if (prefersTouch && !revealed) {
      event.preventDefault()
      setRevealed(true)
    }
  }

  return (
    <Link
      href={`/albums/${album.slug}`}
      onClick={onClick}
      onBlur={() => setRevealed(false)}
      data-revealed={revealed}
      aria-label={`Read album post for ${album.title} by ${album.artist}`}
      className="group/card relative block aspect-square overflow-hidden rounded-2xl border border-white/10 bg-card shadow-[0_18px_60px_rgba(0,0,0,0.28)] transition duration-300 outline-none hover:-translate-y-1 hover:border-cyan-300/30 hover:shadow-[0_24px_80px_rgba(37,99,235,0.22)] focus-visible:ring-3 focus-visible:ring-cyan-300/40"
    >
      <Image
        src={album.coverUrl}
        alt={`${album.title} album cover by ${album.artist}`}
        fill
        priority={priority}
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1536px) 20vw, 16vw"
        className="object-cover transition duration-500 group-hover/card:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-slate-950/30 to-transparent opacity-50" />
      <div
        className={cn(
          "absolute inset-0 flex flex-col justify-end gap-3 bg-slate-950/30 p-4 opacity-0 backdrop-blur-[1px] transition duration-300 group-hover/card:opacity-100 group-focus-visible/card:opacity-100",
          revealed && "opacity-100"
        )}
      >
        <div className="translate-y-3 transition duration-300 group-hover/card:translate-y-0 group-focus-visible/card:translate-y-0">
          <h2 className="font-heading text-lg leading-tight font-semibold text-white drop-shadow-sm">
            {album.title}
          </h2>
          <p className="mt-1 text-sm font-medium text-cyan-100">
            {album.artist}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {typeof album.rating === "number" && (
            <Badge
              variant="secondary"
              className="bg-white/[0.12] text-white backdrop-blur"
            >
              {album.rating.toFixed(1)} / 5
            </Badge>
          )}
          {album.listenDate && (
            <Badge variant="outline" className="border-white/20 text-cyan-100">
              {new Intl.DateTimeFormat("en", {
                month: "short",
                day: "numeric",
              }).format(new Date(album.listenDate))}
            </Badge>
          )}
        </div>
      </div>
    </Link>
  )
}
