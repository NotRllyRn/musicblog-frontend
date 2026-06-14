"use client"

import { useEffect, useRef } from "react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

type InfiniteScrollProps = {
  hasMore: boolean
  isLoading: boolean
  onLoadMore: () => void
}

export function InfiniteScroll({
  hasMore,
  isLoading,
  onLoadMore,
}: InfiniteScrollProps) {
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!hasMore || isLoading) {
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          onLoadMore()
        }
      },
      { rootMargin: "600px" }
    )

    const sentinel = sentinelRef.current

    if (sentinel) {
      observer.observe(sentinel)
    }

    return () => observer.disconnect()
  }, [hasMore, isLoading, onLoadMore])

  if (!hasMore) {
    return null
  }

  return (
    <div ref={sentinelRef} className="flex flex-col items-center gap-4 py-8">
      {isLoading && (
        <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton
              key={index}
              className="aspect-square rounded-2xl bg-white/[0.08]"
            />
          ))}
        </div>
      )}
      <Button variant="outline" onClick={onLoadMore} disabled={isLoading}>
        {isLoading ? "Loading..." : "Load more albums"}
      </Button>
    </div>
  )
}
