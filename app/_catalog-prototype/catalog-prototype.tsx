"use client"

import { Button } from "@astryxdesign/core/Button"
import { Heading } from "@astryxdesign/core/Heading"
import { Text } from "@astryxdesign/core/Text"
import { AnimatePresence, LayoutGroup } from "motion/react"
import dynamic from "next/dynamic"
import { getImageProps } from "next/image"
import {
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"

import { AlbumDetailOverlay } from "./album-detail"
import { CatalogLoading } from "./catalog-loading"
import { CatalogSearch } from "./catalog-search"
import { RecordField } from "./record-field"
import { ThemeToggle } from "./theme-toggle"
import { useAlbumSearch } from "./use-album-search"
import {
  ALBUM_SEARCH_PARAMETER_NAMES,
  albumSearchParameters,
  createEmptyAlbumFilters,
} from "./search-filters"
import type {
  AlbumDetail,
  AlbumPage,
  AlbumPost,
  AlbumSearchFilters,
  ArtistProfile,
  CatalogMode,
  DeckCount,
} from "./types"

interface CatalogBrowserProps {
  initialAlbum: AlbumDetail | null
  initialFilters: AlbumSearchFilters
  initialPage: AlbumPage
  initialQuery: string
}

const ARTWORK_SIZES =
  "(max-width: 47.99rem) 34vw, (max-width: 69.99rem) 21vw, 14vw"
const ARTWORK_PRELOAD_CONCURRENCY = 3
let artistCatalogRequest: Promise<ArtistProfile[]> | null = null

const ArtistField = dynamic(
  () => import("./artist-field").then(({ ArtistField }) => ArtistField),
  { ssr: false }
)

function requestArtistCatalog() {
  if (artistCatalogRequest) return artistCatalogRequest
  artistCatalogRequest = fetch("/api/artists")
    .then((response) => {
      if (!response.ok) throw new Error("Artists could not load")
      return response.json() as Promise<ArtistProfile[]>
    })
    .catch((error: unknown) => {
      artistCatalogRequest = null
      throw error
    })
  return artistCatalogRequest
}

function useArtworkPreloader(albums: AlbumPost[], enabled: boolean) {
  const active = useRef(0)
  const queued = useRef(new Set<string>())
  const queue = useRef<AlbumPost[]>([])

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    for (const album of albums)
      if (!queued.current.has(album.imageUrl)) {
        queued.current.add(album.imageUrl)
        queue.current.push(album)
      }

    const pump = () => {
      if (cancelled) return
      while (
        active.current < ARTWORK_PRELOAD_CONCURRENCY &&
        queue.current.length
      ) {
        const album = queue.current.shift()
        if (!album) return
        const { props } = getImageProps({
          alt: "",
          fill: true,
          sizes: ARTWORK_SIZES,
          src: album.imageUrl,
        })
        const image = new window.Image()
        const finished = () => {
          active.current -= 1
          queueMicrotask(pump)
        }
        active.current += 1
        image.onload = finished
        image.onerror = finished
        image.sizes = props.sizes ?? ""
        image.srcset = props.srcSet ?? ""
        image.src = props.src
      }
    }

    const idle = window.requestIdleCallback?.(pump, { timeout: 1_000 })
    const timer = idle === undefined ? window.setTimeout(pump, 500) : undefined
    return () => {
      cancelled = true
      if (idle !== undefined) window.cancelIdleCallback(idle)
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [albums, enabled])
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

export function CatalogBrowser({
  initialAlbum,
  initialFilters,
  initialPage,
  initialQuery,
}: CatalogBrowserProps) {
  const [albums, setAlbums] = useState(initialPage.albums)
  const [catalogMode, setCatalogMode] = useState<CatalogMode>("albums")
  useArtworkPreloader(albums, catalogMode === "albums")
  const [artists, setArtists] = useState<ArtistProfile[] | null>(null)
  const [artistsMounted, setArtistsMounted] = useState(false)
  const [artistsLoading, setArtistsLoading] = useState(false)
  const [artistsError, setArtistsError] = useState(false)
  const search = useAlbumSearch(initialQuery, initialFilters)
  const [selectionEpoch, setSelectionEpoch] = useState(0)
  const [opened, setOpened] = useState<{
    album: AlbumPost
    detail: AlbumDetail | null
    detailRequest: Promise<AlbumDetail>
    invoker: HTMLElement | null
  } | null>(() =>
    initialAlbum
      ? {
          album: initialAlbum,
          detail: initialAlbum,
          detailRequest: Promise.resolve(initialAlbum),
          invoker: null,
        }
      : null
  )
  const [detailVisible, setDetailVisible] = useState(Boolean(initialAlbum))
  const detailVisibleRef = useRef(Boolean(initialAlbum))
  const deckCount = useDeckCount()
  const loadedCount = useRef(initialPage.albums.length)
  const nextPage = useRef(initialPage.page + 1)
  const isLoading = useRef(false)
  const detailCache = useRef(
    new Map(initialAlbum ? [[initialAlbum.id, initialAlbum]] : [])
  )
  const detailRequests = useRef(new Map<number, Promise<AlbumDetail>>())
  const requestAlbumDetail = useCallback((album: AlbumPost) => {
    const cached = detailRequests.current.get(album.id)
    if (cached) return cached

    const request = fetch(`/api/albums/${encodeURIComponent(album.slug)}`).then(
      (response) => {
        if (!response.ok) throw new Error("Album detail could not load")
        return response.json() as Promise<AlbumDetail>
      }
    )
    detailRequests.current.set(album.id, request)
    void request
      .then((detail) => detailCache.current.set(album.id, detail))
      .catch(() => detailRequests.current.delete(album.id))
    return request
  }, [])
  const loadArtists = useCallback(() => {
    if (artists) return Promise.resolve(artists)
    setArtistsError(false)
    setArtistsLoading(true)
    return requestArtistCatalog()
      .then((profiles) => {
        setArtists(profiles)
        return profiles
      })
      .catch((error: unknown) => {
        setArtistsError(true)
        throw error
      })
      .finally(() => setArtistsLoading(false))
  }, [artists])

  useEffect(() => {
    if (artists) return
    const prefetch = () => void loadArtists().catch(() => undefined)
    const idle = window.requestIdleCallback?.(prefetch, { timeout: 2_500 })
    const timer = idle === undefined ? window.setTimeout(prefetch, 1_500) : null
    return () => {
      if (idle !== undefined) window.cancelIdleCallback(idle)
      if (timer !== null) window.clearTimeout(timer)
    }
  }, [artists, loadArtists])

  useEffect(() => {
    const reload = () => window.location.reload()
    window.addEventListener("popstate", reload)
    return () => window.removeEventListener("popstate", reload)
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

  useEffect(() => {
    if (catalogMode !== "albums" || albums.length >= initialPage.total) return
    const timer = window.setTimeout(() => void loadMore(albums.length), 750)
    return () => window.clearTimeout(timer)
  }, [albums.length, catalogMode, initialPage.total, loadMore])

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
    const url = new URL(window.location.href)
    url.searchParams.set("album", album.slug)
    window.history.pushState(null, "", url)
  }

  const searchUrl = (query: string, filters: AlbumSearchFilters) => {
    const url = new URL(window.location.href)
    for (const name of ALBUM_SEARCH_PARAMETER_NAMES)
      url.searchParams.delete(name)
    for (const [name, value] of albumSearchParameters(query, filters))
      if (name !== "q") url.searchParams.append(name, value)
    if (query) url.searchParams.set("q", query)
    return url
  }

  const setSearchQuery = (query: string) => {
    search.setQuery(query)
    window.history.replaceState(null, "", searchUrl(query, search.filters))
  }

  const setSearchFilters = (next: SetStateAction<AlbumSearchFilters>) => {
    const filters = typeof next === "function" ? next(search.filters) : next
    search.setFilters(filters)
    window.history.replaceState(null, "", searchUrl(search.query, filters))
  }

  const searchArtist = (artist: string) => {
    const filters = { ...createEmptyAlbumFilters(), artists: [artist] }
    detailVisibleRef.current = false
    setDetailVisible(false)
    search.setQuery("")
    search.setFilters(filters)
    const url = searchUrl("", filters)
    url.searchParams.delete("album")
    window.history.pushState(null, "", url)
  }

  const toggleCatalogMode = () => {
    if (catalogMode === "artists") {
      setCatalogMode("albums")
      return
    }
    setArtistsMounted(true)
    setCatalogMode("artists")
    void loadArtists().catch(() => undefined)
  }

  return (
    <>
      <LayoutGroup id="album-detail">
        <main className="variant-shell" data-catalog-mode={catalogMode}>
          <header className="catalog-header" inert={opened ? true : undefined}>
            <Heading level={1} color="inherit">
              Tim&apos;s Music Blog
            </Heading>
            <Text type="supporting" color="inherit">
              {catalogMode === "albums"
                ? `${initialPage.total} records · hinged by hand`
                : `${artists?.length ?? "…"} artists · from the archive`}
            </Text>
          </header>
          <aside
            className="catalog-mode-toggle"
            inert={Boolean(opened) || undefined}
          >
            <Button
              label={catalogMode === "albums" ? "Artists" : "Albums"}
              onClick={toggleCatalogMode}
              onFocus={() => void loadArtists().catch(() => undefined)}
              onPointerEnter={() => void loadArtists().catch(() => undefined)}
              size="sm"
              variant="secondary"
            />
          </aside>
          <section
            aria-hidden={catalogMode !== "albums"}
            className="catalog-mode-panel catalog-album-panel"
            data-active={catalogMode === "albums" || undefined}
            inert={catalogMode !== "albums" || opened ? true : undefined}
          >
            <CatalogSearch
              activeFilterCount={search.activeFilterCount}
              error={search.error}
              facets={search.facets}
              facetsError={search.facetsError}
              filters={search.filters}
              isDisabled={opened !== null}
              isLoadingFacets={search.isLoadingFacets}
              isSearching={search.isSearching}
              onChange={setSearchQuery}
              onClearFilters={() => setSearchFilters(createEmptyAlbumFilters())}
              onFilterChange={setSearchFilters}
              onInteract={() => setSelectionEpoch((current) => current + 1)}
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
              selectionEpoch={selectionEpoch}
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
                selectionEpoch={selectionEpoch}
                total={search.result.total}
              />
            )}
          </section>
          <section
            aria-hidden={catalogMode !== "artists"}
            className="catalog-mode-panel catalog-artist-panel"
            data-active={catalogMode === "artists" || undefined}
            inert={catalogMode !== "artists" || opened ? true : undefined}
          >
            {artistsMounted && (
              <ArtistField
                artists={artists}
                hasError={artistsError}
                isLoading={artistsLoading}
                onRetry={() => void loadArtists().catch(() => undefined)}
              />
            )}
          </section>
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
                  const url = new URL(window.location.href)
                  url.searchParams.delete("album")
                  window.history.replaceState(null, "", url)
                }}
                onSearchArtist={searchArtist}
              />
            )}
          </AnimatePresence>
        </main>
      </LayoutGroup>
      <ThemeToggle />
    </>
  )
}
