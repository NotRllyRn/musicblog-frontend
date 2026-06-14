import { Suspense } from "react"

import { AlbumExplorer } from "@/components/album-explorer"
import { Skeleton } from "@/components/ui/skeleton"
import { getAlbums } from "@/lib/albums"

function AlbumExplorerFallback() {
  return (
    <section className="flex flex-col gap-6" aria-label="Loading album posts">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-12 w-2/3" />
      </div>
      <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {Array.from({ length: 12 }).map((_, index) => (
          <Skeleton
            key={index}
            className="aspect-square rounded-2xl bg-white/[0.08]"
          />
        ))}
      </div>
    </section>
  )
}

export default function AlbumsPage() {
  return (
    <main className="mx-auto flex w-full max-w-[1800px] flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8">
      <Suspense fallback={<AlbumExplorerFallback />}>
        <AlbumExplorer albums={getAlbums()} />
      </Suspense>
    </main>
  )
}
