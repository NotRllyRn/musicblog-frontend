"use client"

import {
  useCallback,
  useDeferredValue,
  useMemo,
  useState,
  useTransition,
} from "react"
import { useSearchParams } from "next/navigation"

import { AlbumGrid } from "@/components/album-grid"
import { InfiniteScroll } from "@/components/infinite-scroll"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { searchAlbums } from "@/lib/albums"
import type { Album } from "@/types/album"

const PAGE_SIZE = 12

type AlbumExplorerProps = {
  albums: Album[]
}

export function AlbumExplorer({ albums }: AlbumExplorerProps) {
  const searchParams = useSearchParams()
  const query = searchParams.get("q") ?? ""
  const deferredQuery = useDeferredValue(query)
  const [pagination, setPagination] = useState({
    query: "",
    visibleCount: PAGE_SIZE,
  })
  const [isPending, startTransition] = useTransition()

  const filteredAlbums = useMemo(
    () => searchAlbums(deferredQuery, albums),
    [albums, deferredQuery]
  )
  const visibleCount =
    pagination.query === deferredQuery ? pagination.visibleCount : PAGE_SIZE
  const visibleAlbums = filteredAlbums.slice(0, visibleCount)
  const hasMore = visibleCount < filteredAlbums.length

  const loadMore = useCallback(() => {
    if (!hasMore || isPending) {
      return
    }

    startTransition(() => {
      setPagination({
        query: deferredQuery,
        visibleCount: visibleCount + PAGE_SIZE,
      })
    })
  }, [deferredQuery, hasMore, isPending, visibleCount])

  if (filteredAlbums.length === 0) {
    return (
      <Empty className="min-h-[40vh] rounded-3xl border border-white/10 bg-white/5">
        <EmptyHeader>
          <EmptyTitle>No albums found</EmptyTitle>
          <EmptyDescription>
            Try searching by title, artist, tag, rating, or blog post text.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <section aria-label="Album posts" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium tracking-[0.28em] text-cyan-200/80 uppercase">
            Album Log
          </p>
          <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Recent listens in orbit
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Showing {visibleAlbums.length} of {filteredAlbums.length} album
          {filteredAlbums.length === 1 ? "" : "s"}
          {deferredQuery ? ` for “${deferredQuery}”` : ""}
        </p>
      </div>
      <AlbumGrid albums={visibleAlbums} />
      <InfiniteScroll
        hasMore={hasMore}
        isLoading={isPending}
        onLoadMore={loadMore}
      />
    </section>
  )
}
