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

import {
  albumSearchCriteriaKey,
  countActiveAlbumFilters,
  createEmptyAlbumFilters,
  MAX_SEARCH_QUERY_LENGTH,
} from "./search-filters"
import { startSearchTransition } from "./search-transition"
import type {
  AlbumFilterFacets,
  AlbumSearchFilters,
  AlbumSearchPage,
} from "./types"

const DEBOUNCE_MS = 280
const MAX_CACHED_PAGES = 40
const MAX_TRANSITION_RECORDS = 20

interface AlbumSearchResult extends AlbumSearchPage {
  criteria: string
}

async function requestSearchPage(
  criteria: string,
  page: number,
  signal: AbortSignal
) {
  const parameters = new URLSearchParams(criteria)
  if (page > 1) parameters.set("page", String(page))
  const response = await fetch(`/api/albums/search?${parameters}`, { signal })
  if (!response.ok) throw new Error("Search could not load")
  return {
    ...(await response.json()),
    criteria,
  } as AlbumSearchResult
}

function useResultTransition(
  setResult: Dispatch<SetStateAction<AlbumSearchResult | null>>
) {
  const [isTransitioning, setIsTransitioning] = useState(false)
  const transition = useRef<ReturnType<typeof startSearchTransition>>(null)
  const renderedRecordCount = useRef(0)
  const reduceMotion = Boolean(useReducedMotion())

  const commitResult = useCallback(
    (next: AlbumSearchResult | null) => {
      const nextRecordCount = next?.albums.length ?? 0
      const shouldReplaceImmediately =
        reduceMotion ||
        Math.max(renderedRecordCount.current, nextRecordCount) >
          MAX_TRANSITION_RECORDS
      renderedRecordCount.current = nextRecordCount
      if (shouldReplaceImmediately) {
        transition.current?.cancel()
        flushSync(() => {
          setIsTransitioning(false)
          setResult(next)
        })
        return
      }

      const nextTransition = startSearchTransition((animated) =>
        flushSync(() => {
          setIsTransitioning(animated)
          setResult(next)
        })
      )
      transition.current = nextTransition
      void nextTransition.finished.then(() => {
        if (transition.current !== nextTransition) return
        transition.current = null
        setIsTransitioning(false)
      })
    },
    [reduceMotion, setResult]
  )

  useEffect(
    () => () => {
      const activeTransition = transition.current
      transition.current = null
      activeTransition?.cancel()
    },
    []
  )

  return { commitResult, isTransitioning }
}

export function useAlbumSearch(
  initialQuery = "",
  initialFilters = createEmptyAlbumFilters()
) {
  const [query, setRawQuery] = useState(() =>
    initialQuery.slice(0, MAX_SEARCH_QUERY_LENGTH)
  )
  const [filters, setFilters] = useState(initialFilters)
  const [result, setResult] = useState<AlbumSearchResult | null>(null)
  const [facets, setFacets] = useState<AlbumFilterFacets | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingFacets, setIsLoadingFacets] = useState(false)
  const [error, setError] = useState(false)
  const [facetsError, setFacetsError] = useState(false)
  const cache = useRef(new Map<string, AlbumSearchResult>())
  const facetsRequest = useRef<Promise<AlbumFilterFacets> | null>(null)
  const latestRequest = useRef(0)
  const loadingMore = useRef<string | null>(null)
  const paginationRequest = useRef<AbortController>(null)
  const criteria = albumSearchCriteriaKey(query, filters)
  const activeFilterCount = countActiveAlbumFilters(filters)
  const criteriaRef = useRef(criteria)
  const filtersRef = useRef(filters)
  const queryRef = useRef(query)
  const { commitResult, isTransitioning } = useResultTransition(setResult)

  const remember = useCallback((key: string, page: AlbumSearchResult) => {
    cache.current.set(key, page)
    if (cache.current.size > MAX_CACHED_PAGES)
      cache.current.delete(cache.current.keys().next().value ?? "")
  }, [])

  const cancelPagination = useCallback(() => {
    paginationRequest.current?.abort()
    paginationRequest.current = null
    loadingMore.current = null
  }, [])

  const invalidateCriteria = useCallback(
    (nextCriteria: string) => {
      if (criteriaRef.current === nextCriteria) return
      criteriaRef.current = nextCriteria
      latestRequest.current += 1
      cancelPagination()
    },
    [cancelPagination]
  )

  const setQuery = useCallback(
    (next: string) => {
      const value = next.slice(0, MAX_SEARCH_QUERY_LENGTH)
      queryRef.current = value
      invalidateCriteria(albumSearchCriteriaKey(value, filtersRef.current))
      setRawQuery(value)
      setError(false)
    },
    [invalidateCriteria]
  )

  const updateFilters = useCallback(
    (next: SetStateAction<AlbumSearchFilters>) => {
      const value = typeof next === "function" ? next(filtersRef.current) : next
      filtersRef.current = value
      invalidateCriteria(albumSearchCriteriaKey(queryRef.current, value))
      setError(false)
      setFilters(value)
    },
    [invalidateCriteria]
  )

  const clearFilters = useCallback(
    () => updateFilters(createEmptyAlbumFilters()),
    [updateFilters]
  )

  const loadFacets = useCallback(() => {
    if (facets) return Promise.resolve(facets)
    if (facetsRequest.current) return facetsRequest.current

    setFacetsError(false)
    setIsLoadingFacets(true)
    const request = fetch("/api/albums/filters")
      .then((response) => {
        if (!response.ok) throw new Error("Filters could not load")
        return response.json() as Promise<AlbumFilterFacets>
      })
      .then((next) => {
        setFacets(next)
        return next
      })
      .catch((reason: unknown) => {
        setFacetsError(true)
        throw reason
      })
      .finally(() => {
        if (facetsRequest.current === request) facetsRequest.current = null
        setIsLoadingFacets(false)
      })
    facetsRequest.current = request
    return request
  }, [facets])

  useEffect(() => {
    const request = ++latestRequest.current
    cancelPagination()

    if (!criteria) {
      const clearTimer = window.setTimeout(() => {
        if (request !== latestRequest.current) return
        setIsSearching(false)
        commitResult(null)
      })
      return () => window.clearTimeout(clearTimer)
    }

    const key = `${criteria}:1`
    const cached = cache.current.get(key)
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setIsSearching(true)
      if (cached) {
        if (request === latestRequest.current) {
          commitResult(cached)
          setIsSearching(false)
        }
        return
      }

      void requestSearchPage(criteria, 1, controller.signal)
        .then((page) => {
          remember(key, page)
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
  }, [cancelPagination, commitResult, criteria, remember])

  const loadMore = useCallback(async () => {
    if (
      !result ||
      loadingMore.current === result.criteria ||
      isSearching ||
      result.page >= result.totalPages
    )
      return

    const request = latestRequest.current
    const nextPage = result.page + 1
    const key = `${result.criteria}:${nextPage}`
    const controller = new AbortController()
    paginationRequest.current = controller
    loadingMore.current = result.criteria
    setIsSearching(true)

    try {
      let page = cache.current.get(key)
      if (page && page.version !== result.version) {
        cache.current.delete(key)
        page = undefined
      }
      page ??= await requestSearchPage(
        result.criteria,
        nextPage,
        controller.signal
      )
      remember(key, page)
      if (
        request !== latestRequest.current ||
        result.criteria !== page.criteria
      )
        return

      if (page.version !== result.version) {
        const first = await requestSearchPage(
          result.criteria,
          1,
          controller.signal
        )
        remember(`${result.criteria}:1`, first)
        if (request === latestRequest.current) commitResult(first)
        return
      }

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
      if (paginationRequest.current === controller) {
        paginationRequest.current = null
        loadingMore.current = null
      }
      if (request === latestRequest.current) setIsSearching(false)
    }
  }, [commitResult, isSearching, remember, result])

  useEffect(
    () => () => {
      latestRequest.current += 1
      paginationRequest.current?.abort()
    },
    []
  )

  return {
    activeFilterCount,
    clearFilters,
    error,
    facets,
    facetsError,
    filters,
    isLoadingFacets,
    isSearching,
    isTransitioning,
    loadFacets,
    loadMore,
    query,
    result,
    setFilters: updateFilters,
    setQuery,
  }
}
