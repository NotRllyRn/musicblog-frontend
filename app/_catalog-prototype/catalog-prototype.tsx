"use client"

import { Heading } from "@astryxdesign/core/Heading"
import { Text } from "@astryxdesign/core/Text"
import { AnimatePresence, LayoutGroup } from "motion/react"
import { useCallback, useEffect, useRef, useState } from "react"

import { AlbumDetailOverlay } from "./album-detail"
import { CatalogLoading } from "./catalog-loading"
import { CatalogSearch } from "./catalog-search"
import { RecordField } from "./record-field"
import { ThemeToggle } from "./theme-toggle"
import { useAlbumSearch } from "./use-album-search"
import type { AlbumDetail, AlbumPage, AlbumPost, DeckCount } from "./types"

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
  const search = useAlbumSearch()
  const [opened, setOpened] = useState<{
    album: AlbumPost
    detail: AlbumDetail | null
    detailRequest: Promise<AlbumDetail>
    invoker: HTMLElement
  } | null>(null)
  const [detailVisible, setDetailVisible] = useState(false)
  const detailVisibleRef = useRef(false)
  const deckCount = useDeckCount()
  const loadedCount = useRef(initialPage.albums.length)
  const nextPage = useRef(initialPage.page + 1)
  const isLoading = useRef(false)
  const detailCache = useRef(new Map<number, AlbumDetail>())
  const detailRequests = useRef(new Map<number, Promise<AlbumDetail>>())
  const requestAlbumDetail = useCallback((album: AlbumPost) => {
    const cached = detailRequests.current.get(album.id)
    if (cached) return cached

    const request = fetch(`/api/albums/${album.id}`).then((response) => {
      if (!response.ok) throw new Error("Album detail could not load")
      return response.json() as Promise<AlbumDetail>
    })
    detailRequests.current.set(album.id, request)
    void request
      .then((detail) => detailCache.current.set(album.id, detail))
      .catch(() => detailRequests.current.delete(album.id))
    return request
  }, [])
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

  const interruptDetailExit = () => {
    document
      .querySelector<HTMLElement>(".album-detail-overlay[data-closing]")
      ?.setAttribute("data-interrupted", "")
  }

  const openAlbum = (album: AlbumPost, invoker: HTMLElement) => {
    const closingOverlay = document.querySelector<HTMLElement>(
      ".album-detail-overlay[data-closing]"
    )
    if (opened?.album.id === album.id) {
      closingOverlay?.removeAttribute("data-closing")
      closingOverlay?.removeAttribute("data-interrupted")
      closingOverlay?.focus()
    }
    detailVisibleRef.current = true
    setOpened({
      album,
      detail: detailCache.current.get(album.id) ?? null,
      detailRequest: requestAlbumDetail(album),
      invoker,
    })
    setDetailVisible(true)
  }

  return (
    <>
      <LayoutGroup id="album-detail">
        <main className="variant-shell">
          <header className="catalog-header" inert={opened ? true : undefined}>
            <Heading level={1} color="inherit">
              Tim&apos;s Music Blog
            </Heading>
            <Text type="supporting" color="inherit">
              {initialPage.total} records · hinged by hand
            </Text>
          </header>
          <CatalogSearch
            activeFilterCount={search.activeFilterCount}
            error={search.error}
            facets={search.facets}
            facetsError={search.facetsError}
            filters={search.filters}
            isDisabled={opened !== null}
            isLoadingFacets={search.isLoadingFacets}
            isSearching={search.isSearching}
            onChange={search.setQuery}
            onClearFilters={search.clearFilters}
            onFilterChange={search.setFilters}
            onLoadFacets={search.loadFacets}
            query={search.query}
            resultCount={search.result?.total ?? null}
          />
          <RecordField
            albums={albums}
            deckCount={deckCount}
            detailVisible={detailVisible || search.isTransitioning}
            isHidden={search.result !== null}
            openedAlbumId={opened?.album.id ?? null}
            key={`archive:${deckCount}`}
            onExitInteraction={interruptDetailExit}
            onNeedMore={loadMore}
            onOpenAlbum={openAlbum}
            onPrefetchAlbum={(album) => void requestAlbumDetail(album)}
            searchQuery={null}
            searchTransitioning={search.isTransitioning}
            total={initialPage.total}
          />
          {search.result && (
            <RecordField
              albums={search.result.albums}
              deckCount={deckCount}
              detailVisible={detailVisible || search.isTransitioning}
              openedAlbumId={opened?.album.id ?? null}
              key={`search:${search.result.criteria}:${deckCount}`}
              onExitInteraction={interruptDetailExit}
              onNeedMore={search.loadMore}
              onOpenAlbum={openAlbum}
              onPrefetchAlbum={(album) => void requestAlbumDetail(album)}
              searchQuery={search.result.query || "Filtered catalog"}
              searchTransitioning={search.isTransitioning}
              total={search.result.total}
            />
          )}
          <AnimatePresence
            onExitComplete={() => {
              if (detailVisibleRef.current) return
              const invoker = opened?.invoker
              setOpened(null)
              requestAnimationFrame(() =>
                requestAnimationFrame(() => invoker?.focus())
              )
            }}
          >
            {opened && detailVisible && (
              <AlbumDetailOverlay
                album={opened.album}
                detailRequest={opened.detailRequest}
                initialDetail={opened.detail}
                key={opened.album.id}
                onClose={() => {
                  detailVisibleRef.current = false
                  setDetailVisible(false)
                }}
              />
            )}
          </AnimatePresence>
        </main>
      </LayoutGroup>
      <ThemeToggle />
    </>
  )
}
