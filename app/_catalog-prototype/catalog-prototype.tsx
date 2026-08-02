"use client"

import { Heading } from "@astryxdesign/core/Heading"
import { Text } from "@astryxdesign/core/Text"
import { useCallback, useEffect, useRef, useState } from "react"

import { CatalogLoading } from "./catalog-loading"
import { RecordField } from "./record-field"
import { ThemeToggle } from "./theme-toggle"
import type { AlbumPage, DeckCount } from "./types"

interface CatalogBrowserProps {
  initialPage: AlbumPage
}

function useDeckCount() {
  const [deckCount, setDeckCount] = useState<DeckCount | null>(null)

  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 47.99rem)")
    const medium = window.matchMedia("(max-width: 69.99rem)")
    const update = () =>
      setDeckCount(mobile.matches ? 3 : medium.matches ? 5 : 7)

    update()
    mobile.addEventListener("change", update)
    medium.addEventListener("change", update)
    return () => {
      mobile.removeEventListener("change", update)
      medium.removeEventListener("change", update)
    }
  }, [])

  return deckCount
}

export function CatalogBrowser({ initialPage }: CatalogBrowserProps) {
  const [albums, setAlbums] = useState(initialPage.albums)
  const deckCount = useDeckCount()
  const loadedCount = useRef(initialPage.albums.length)
  const nextPage = useRef(initialPage.page + 1)
  const isLoading = useRef(false)
  const loadMore = useCallback(
    async (knownCount: number) => {
      if (
        knownCount < loadedCount.current ||
        isLoading.current ||
        nextPage.current > initialPage.totalPages
      )
        return

      isLoading.current = true
      try {
        const response = await fetch(`/api/albums?page=${nextPage.current}`)
        if (!response.ok) return
        const page = (await response.json()) as AlbumPage
        loadedCount.current += page.albums.length
        setAlbums((current) => [...current, ...page.albums])
        nextPage.current += 1
      } finally {
        isLoading.current = false
      }
    },
    [initialPage.totalPages]
  )

  if (!albums.length) {
    return (
      <>
        <main className="catalog-empty">
          <Heading level={1}>The catalog could not load</Heading>
          <Text as="p" color="secondary">
            Check the WordPress connection, then refresh this page.
          </Text>
        </main>
        <ThemeToggle />
      </>
    )
  }

  if (deckCount === null) return <CatalogLoading />

  return (
    <>
      <main className="variant-shell">
        <header className="catalog-header">
          <Heading level={1} color="inherit">
            Tim&apos;s Music Blog
          </Heading>
          <Text type="supporting" color="inherit">
            {initialPage.total} records · hinged by hand
          </Text>
        </header>
        <RecordField
          albums={albums}
          deckCount={deckCount}
          onNeedMore={loadMore}
          total={initialPage.total}
        />
      </main>
      <ThemeToggle />
    </>
  )
}
