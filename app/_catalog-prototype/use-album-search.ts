"use client"

import { useReducedMotion } from "motion/react"
import { flushSync } from "react-dom"
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"

import type { AlbumSearchPage } from "./types"

const DEBOUNCE_MS = 280
const MAX_CACHED_PAGES = 40
const MIN_QUERY_LENGTH = 2

const normalizeQuery = (value: string) =>
  value.normalize("NFKC").replace(/\s+/gu, " ").trim().toLowerCase()

const requestSearchPage = async (
  query: string,
  page: number,
  signal: AbortSignal
) => {
  const parameters = new URLSearchParams({ q: query, page: String(page) })
  const response = await fetch(`/api/albums/search?${parameters}`, { signal })
  if (!response.ok) throw new Error("Search could not load")
  return response.json() as Promise<AlbumSearchPage>
}

function useResultTransition(
  setResult: Dispatch<SetStateAction<AlbumSearchPage | null>>
) {
  const [isTransitioning, setIsTransitioning] = useState(false)
  const transition = useRef<ViewTransition>(null)
  const reduceMotion = Boolean(useReducedMotion())

  const commitResult = useCallback(
    (next: AlbumSearchPage | null) => {
      transition.current?.skipTransition()
      if (reduceMotion || !document.startViewTransition) {
        flushSync(() => setResult(next))
        return
      }

      document.documentElement.classList.add("catalog-search-transition")
      const nextTransition = document.startViewTransition(() =>
        flushSync(() => {
          setIsTransitioning(true)
          setResult(next)
        })
      )
      transition.current = nextTransition
      const finish = () => {
        if (transition.current !== nextTransition) return
        transition.current = null
        document.documentElement.classList.remove("catalog-search-transition")
        setIsTransitioning(false)
      }
      void nextTransition.finished.then(finish, finish)
    },
    [reduceMotion, setResult]
  )

  useEffect(
    () => () => {
      const activeTransition = transition.current
      transition.current = null
      activeTransition?.skipTransition()
      document.documentElement.classList.remove("catalog-search-transition")
    },
    []
  )

  return { commitResult, isTransitioning }
}

export function useAlbumSearch() {
  const [query, setRawQuery] = useState("")
  const [result, setResult] = useState<AlbumSearchPage | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState(false)
  const cache = useRef(new Map<string, AlbumSearchPage>())
  const latestRequest = useRef(0)
  const loadingMore = useRef<string | null>(null)
  const { commitResult, isTransitioning } = useResultTransition(setResult)

  const remember = useCallback((key: string, page: AlbumSearchPage) => {
    cache.current.set(key, page)
    if (cache.current.size > MAX_CACHED_PAGES)
      cache.current.delete(cache.current.keys().next().value ?? "")
  }, [])

  const setQuery = useCallback(
    (next: string) => {
      const isSearchable = normalizeQuery(next).length >= MIN_QUERY_LENGTH
      latestRequest.current += 1
      setRawQuery(next)
      setError(false)
      setIsSearching(isSearchable)
      if (isSearchable) return

      if (result) commitResult(null)
    },
    [commitResult, result]
  )

  useEffect(() => {
    const normalized = normalizeQuery(query)
    if (normalized.length < MIN_QUERY_LENGTH) return

    const request = latestRequest.current
    const cached = cache.current.get(`${normalized}:1`)
    const controller = new AbortController()

    const timer = window.setTimeout(() => {
      if (cached) {
        if (request === latestRequest.current) {
          commitResult(cached)
          setIsSearching(false)
        }
        return
      }

      void requestSearchPage(normalized, 1, controller.signal)
        .then((page) => {
          remember(`${normalized}:1`, page)
          if (request === latestRequest.current) commitResult(page)
        })
        .catch((reason: unknown) => {
          if (reason instanceof Error && reason.name === "AbortError") return
          if (request === latestRequest.current) setError(true)
        })
        .finally(() => {
          if (request === latestRequest.current) setIsSearching(false)
        })
    }, DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [commitResult, query, remember])

  const loadMore = useCallback(async () => {
    if (
      !result ||
      loadingMore.current === result.query ||
      isSearching ||
      result.page >= result.totalPages
    )
      return

    const request = latestRequest.current
    const nextPage = result.page + 1
    const key = `${result.query}:${nextPage}`
    const controller = new AbortController()
    loadingMore.current = result.query
    setIsSearching(true)

    try {
      const page =
        cache.current.get(key) ??
        (await requestSearchPage(result.query, nextPage, controller.signal))
      remember(key, page)
      if (request !== latestRequest.current || result.query !== page.query)
        return

      const albums = new Map(result.albums.map((album) => [album.id, album]))
      for (const album of page.albums) albums.set(album.id, album)
      setResult({ ...page, albums: [...albums.values()] })
    } catch (reason) {
      if (
        request === latestRequest.current &&
        !(reason instanceof Error && reason.name === "AbortError")
      )
        setError(true)
    } finally {
      if (loadingMore.current === result.query) loadingMore.current = null
      if (request === latestRequest.current) setIsSearching(false)
    }
  }, [isSearching, remember, result])

  useEffect(
    () => () => {
      latestRequest.current += 1
    },
    []
  )

  return {
    error,
    isSearching,
    isTransitioning,
    loadMore,
    query,
    result,
    setQuery,
  }
}
