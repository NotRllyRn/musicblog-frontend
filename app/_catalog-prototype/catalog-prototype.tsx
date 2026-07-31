"use client"

import { Heading } from "@astryxdesign/core/Heading"
import { Text } from "@astryxdesign/core/Text"
import { useCallback, useRef, useState } from "react"

import { RecordField } from "./record-field"
import { ThemeToggle } from "./theme-toggle"
import type { AlbumPage } from "./types"

interface CatalogBrowserProps {
  initialPage: AlbumPage
}

export function CatalogBrowser({ initialPage }: CatalogBrowserProps) {
  const [albums, setAlbums] = useState(initialPage.albums)
  const nextPage = useRef(initialPage.page + 1)
  const isLoading = useRef(false)
  const loadMore = useCallback(async () => {
    if (isLoading.current || nextPage.current > initialPage.totalPages) return

    isLoading.current = true
    try {
      const response = await fetch(`/api/albums?page=${nextPage.current}`)
      if (!response.ok) return
      const page = (await response.json()) as AlbumPage
      setAlbums((current) => [...current, ...page.albums])
      nextPage.current += 1
    } finally {
      isLoading.current = false
    }
  }, [initialPage.totalPages])

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

  return (
    <>
      <main className="variant-shell">
        <header className="catalog-header">
          <Heading level={1} color="inherit">
            After the Needle
          </Heading>
          <Text type="supporting" color="inherit">
            {initialPage.total} records · hinged by hand
          </Text>
        </header>
        <RecordField albums={albums} onNeedMore={loadMore} />
      </main>
      <ThemeToggle />
    </>
  )
}
