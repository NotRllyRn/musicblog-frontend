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

export default function Page() {
  return (
    <main className="relative mx-auto flex w-full max-w-[1800px] flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_32px_120px_rgba(37,99,235,0.14)] sm:p-10">
        <div className="pointer-events-none absolute -top-24 right-8 size-64 rounded-full bg-cyan-300/[0.12] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-8 size-72 rounded-full bg-blue-500/[0.15] blur-3xl" />
        <div className="relative max-w-3xl">
          <p className="text-sm font-medium tracking-[0.28em] text-cyan-200/80 uppercase">
            Music Log / Dark Mode First
          </p>
          <h1 className="mt-4 font-heading text-4xl font-semibold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            Track albums like constellations.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            A fast, responsive album journal for covers, ratings, listening
            notes, and future WordPress-powered music posts.
          </p>
        </div>
      </section>
      <Suspense fallback={<AlbumExplorerFallback />}>
        <AlbumExplorer albums={getAlbums()} />
      </Suspense>
    </main>
  )
}
