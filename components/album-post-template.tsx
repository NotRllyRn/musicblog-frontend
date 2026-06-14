"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { RiArrowLeftLine } from "@remixicon/react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchAlbumBySlug } from "@/lib/albums"
import type { Album } from "@/types/album"

type AlbumPostTemplateProps = {
  slug: string
}

export function AlbumPostTemplate({ slug }: AlbumPostTemplateProps) {
  const [album, setAlbum] = useState<Album | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function loadAlbum() {
      setLoading(true)
      const nextAlbum = await fetchAlbumBySlug(slug)

      if (active) {
        setAlbum(nextAlbum)
        setLoading(false)
      }
    }

    loadAlbum()

    return () => {
      active = false
    }
  }, [slug])

  if (loading) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8">
        <Skeleton className="h-8 w-36" />
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Skeleton className="aspect-square rounded-3xl" />
          <div className="flex flex-col gap-4">
            <Skeleton className="h-12 w-4/5" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </main>
    )
  }

  if (!album) {
    return (
      <main className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col items-start justify-center gap-4 px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-sm font-medium tracking-[0.28em] text-cyan-200/80 uppercase">
          Missing signal
        </p>
        <h1 className="font-heading text-4xl font-semibold">Album not found</h1>
        <p className="text-muted-foreground">
          This route is ready for a WordPress-backed lookup, but the mock album
          data does not include this slug yet.
        </p>
        <Button asChild>
          <Link href="/albums">Back to albums</Link>
        </Button>
      </main>
    )
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-12 sm:px-6 lg:px-8">
      <Button variant="ghost" asChild className="w-fit">
        <Link href="/albums">
          <RiArrowLeftLine data-icon="inline-start" aria-hidden="true" />
          Albums
        </Link>
      </Button>
      <article className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
        <div className="relative aspect-square overflow-hidden rounded-3xl border border-white/10 bg-card shadow-[0_30px_120px_rgba(37,99,235,0.18)]">
          <Image
            src={album.coverUrl}
            alt={`${album.title} album cover by ${album.artist}`}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 45vw"
            className="object-cover"
          />
        </div>
        <div className="flex flex-col gap-6">
          <div>
            <p className="text-sm font-medium tracking-[0.28em] text-cyan-200/80 uppercase">
              Album Post
            </p>
            <h1 className="mt-3 font-heading text-4xl font-semibold tracking-tight text-foreground sm:text-6xl">
              {album.title}
            </h1>
            <p className="mt-3 text-xl text-muted-foreground">{album.artist}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {typeof album.rating === "number" && (
              <Badge variant="secondary">
                Rating {album.rating.toFixed(1)} / 5
              </Badge>
            )}
            {album.listenDate && (
              <Badge variant="outline">
                Listened{" "}
                {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
                  new Date(album.listenDate)
                )}
              </Badge>
            )}
            {album.tags.map((tag) => (
              <Badge key={tag} variant="ghost">
                {tag}
              </Badge>
            ))}
          </div>
          <Separator />
          <p className="text-lg leading-8 text-muted-foreground">
            {album.excerpt}
          </p>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <p className="text-base leading-8 text-foreground/90">
              {album.content}
            </p>
          </div>
        </div>
      </article>
    </main>
  )
}
