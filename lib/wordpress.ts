import "server-only"

import sanitizeHtml from "sanitize-html"

import { normalizeAlbumSearchText } from "@/app/_catalog-prototype/search-filters"
import type {
  AlbumDetail,
  AlbumFilterFacets,
  AlbumPage,
  AlbumPost,
  AlbumSearchFilters,
  AlbumSearchPage,
  AlbumTrack,
} from "@/app/_catalog-prototype/types"

interface WordPressTerm {
  name: string
  taxonomy: string
}

interface WordPressMedia {
  alt_text?: string
  source_url?: string
}

interface WordPressTrack {
  title?: string
  highlight?: boolean
  spotify_id?: string
}

interface WordPressAcf {
  music_rating?: number | string
  music_release_date?: string
  music_favorite?: boolean
  music_listened_at?: string
  music_notes?: string
  music_tracks?: WordPressTrack[]
  music_length_ms?: number | string
  music_avg_track_ms?: number | string
  music_explicit?: boolean
  music_total_tracks?: number | string
  listen_count?: number | string
  spotify_album_url?: string
  lastfm_url?: string
}

interface WordPressPost {
  id: number
  slug: string
  status?: string
  password?: string
  title: { rendered: string }
  content?: { rendered?: string; protected?: boolean }
  acf?: WordPressAcf
  _embedded?: {
    "wp:featuredmedia"?: WordPressMedia[]
    "wp:term"?: WordPressTerm[][]
  }
}

interface SearchDocument {
  album: AlbumPost
  artistKeys: string[]
  artistLabels: string[]
  artists: string
  explicit: boolean
  genreKeys: string[]
  genreLabels: string[]
  genres: string
  index: number
  listenedAt: string | null
  rating: number | null
  releaseDate: string | null
  releaseTypeKeys: string[]
  releaseTypeLabels: string[]
  title: string
  unreleased: boolean
  words: string[]
}

interface CatalogIndex {
  builtAt: number
  details: Map<string, AlbumDetail>
  documents: SearchDocument[]
  facets: AlbumFilterFacets
  pages: AlbumPost[][]
  total: number
  totalPages: number
}

interface CatalogCacheState {
  pendingCatalogIndex: Promise<CatalogIndex> | null
  pendingPages: Map<number, Promise<Awaited<ReturnType<typeof requestPage>>>>
  readyCatalogIndex: CatalogIndex | null
}

const CATALOG_REVALIDATE_SECONDS = 3600
const SEARCH_PAGE_SIZE = 50
const WARMUP_CONCURRENCY = 3

const entityMap: Record<string, string> = {
  amp: "&",
  apos: "'",
  hellip: "…",
  nbsp: " ",
  quot: '"',
}

function decodeEntities(value: string) {
  return value
    .replace(/&#x([\da-f]+);/gi, (_entity, hexadecimal: string) =>
      String.fromCodePoint(Number.parseInt(hexadecimal, 16))
    )
    .replace(/&#(\d+);/g, (_numericEntity, decimal: string) =>
      String.fromCodePoint(Number(decimal))
    )
    .replace(
      /&([a-z]+);/gi,
      (entity, name: string) => entityMap[name] ?? entity
    )
}

function apiRoot() {
  const base = process.env.WORDPRESS_BASE_URL?.replace(/\/$/, "")

  if (!base) throw new Error("WORDPRESS_BASE_URL is missing")

  return base.includes("/wp-json/wp/v2") ? base : `${base}/wp-json/wp/v2`
}

function requestHeaders() {
  const username = process.env.WORDPRESS_USERNAME
  const password = process.env.WORDPRESS_APP_PASSWORD

  if (!username || !password)
    throw new Error("WordPress credentials are missing")

  return {
    Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
  }
}

async function requestPage(page: number) {
  const url = URL.parse(`${apiRoot()}/posts`)

  if (!url) throw new Error("WordPress API URL is invalid")

  url.searchParams.set("page", String(page))
  url.searchParams.set("per_page", "100")
  url.searchParams.set("_embed", "wp:featuredmedia,wp:term")
  url.searchParams.set(
    "_fields",
    "id,slug,status,password,title,content,acf,_links,_embedded"
  )

  const response = await fetch(url, {
    cache: "force-cache",
    headers: requestHeaders(),
    next: {
      revalidate: CATALOG_REVALIDATE_SECONDS,
      tags: ["wordpress-albums"],
    },
    signal: AbortSignal.timeout(30_000),
  })

  if (!response.ok) throw new Error(`WordPress returned ${response.status}`)

  return {
    posts: (await response.json()) as WordPressPost[],
    total: Number(response.headers.get("x-wp-total") ?? 0),
    totalPages: Number(response.headers.get("x-wp-totalpages") ?? 1),
  }
}

function termsFor(post: WordPressPost, taxonomy: string) {
  return (post._embedded?.["wp:term"]?.flat() ?? []).flatMap((term) =>
    term.taxonomy === taxonomy ? [decodeEntities(term.name)] : []
  )
}

function isPublicPost(post: WordPressPost) {
  return (
    (post.status === undefined || post.status === "publish") &&
    !post.password &&
    !post.content?.protected
  )
}

function toAlbum(post: WordPressPost): AlbumPost | null {
  if (!isPublicPost(post)) return null
  const media = post._embedded?.["wp:featuredmedia"]?.[0]
  if (!media?.source_url) return null

  const title = decodeEntities(post.title.rendered)
  const artist =
    termsFor(post, "artist")[0] ??
    termsFor(post, "post_tag")[0] ??
    "Unknown artist"

  return {
    id: post.id,
    slug: post.slug,
    title,
    artist,
    imageUrl: media.source_url,
    imageAlt: media.alt_text || `${title} album art`,
  }
}

function toAlbums(posts: WordPressPost[]): AlbumPost[] {
  return posts.flatMap((post) => {
    const album = toAlbum(post)
    return album ? [album] : []
  })
}

const catalogGlobal = globalThis as typeof globalThis & {
  musicblogCatalogCache?: CatalogCacheState
}
const catalogCache = (catalogGlobal.musicblogCatalogCache ??= {
  pendingCatalogIndex: null,
  pendingPages: new Map(),
  readyCatalogIndex: null,
})

function getCatalogPage(page: number) {
  const pending = catalogCache.pendingPages.get(page)
  if (pending) return pending

  const request = requestPage(page).finally(() =>
    catalogCache.pendingPages.delete(page)
  )
  catalogCache.pendingPages.set(page, request)
  return request
}

const searchable = normalizeAlbumSearchText

function uniqueTerms(values: string[]) {
  return [
    ...new Map(values.map((value) => [searchable(value), value])).values(),
  ]
}

function booleanValue(value: unknown) {
  return value === true || value === 1 || value === "1" || value === "true"
}

function toSearchDocument(post: WordPressPost, index: number) {
  const album = toAlbum(post)
  if (!album) return null

  const artistTerms = termsFor(post, "artist")
  const artistLabels = uniqueTerms(
    artistTerms.length ? artistTerms : termsFor(post, "post_tag").slice(0, 1)
  )
  const genreLabels = uniqueTerms(termsFor(post, "genre"))
  const releaseTypeLabels = uniqueTerms(termsFor(post, "release_type"))
  const artistKeys = artistLabels.map(searchable)
  const genreKeys = genreLabels.map(searchable)
  const releaseTypeKeys = releaseTypeLabels.map(searchable)
  const title = searchable(album.title)
  const artists = artistKeys.join(" ")
  const genres = genreKeys.join(" ")
  const text = `${title} ${artists} ${genres}`
  const acf = post.acf ?? {}
  const releaseDate = compactDate(acf.music_release_date)
  const listenedAt = compactDate(acf.music_listened_at)
  const rawRating = optionalNumber(acf.music_rating)
  const rating = rawRating === null ? null : Math.round(rawRating)

  return {
    album,
    artistKeys,
    artistLabels,
    artists,
    explicit: booleanValue(acf.music_explicit),
    genreKeys,
    genreLabels,
    genres,
    index,
    listenedAt,
    rating,
    releaseDate,
    releaseTypeKeys,
    releaseTypeLabels,
    title,
    unreleased: Boolean(releaseDate && listenedAt && releaseDate > listenedAt),
    words: [
      ...new Set([
        ...text.split(" "),
        title.replaceAll(" ", ""),
        artists.replaceAll(" ", ""),
        genres.replaceAll(" ", ""),
      ]),
    ],
  } satisfies SearchDocument
}

function facetLabels(
  documents: SearchDocument[],
  key: "artistLabels" | "genreLabels" | "releaseTypeLabels"
) {
  return uniqueTerms(documents.flatMap((document) => document[key])).sort(
    (left, right) =>
      left.localeCompare(right, undefined, { sensitivity: "base" })
  )
}

function dateBounds(
  documents: SearchDocument[],
  key: "listenedAt" | "releaseDate"
) {
  const dates = documents
    .flatMap((document) => (document[key] ? [document[key]] : []))
    .sort()
  return { start: dates[0] ?? null, end: dates.at(-1) ?? null }
}

function catalogFacets(documents: SearchDocument[], version: number) {
  const ratings = documents
    .flatMap(({ rating }) => (rating === null ? [] : [rating]))
    .sort((left, right) => left - right)

  return {
    artists: facetLabels(documents, "artistLabels"),
    genres: facetLabels(documents, "genreLabels"),
    listenedDate: dateBounds(documents, "listenedAt"),
    rating: ratings.length
      ? { min: ratings[0], max: ratings.at(-1) ?? ratings[0] }
      : null,
    releaseDate: dateBounds(documents, "releaseDate"),
    releaseTypes: facetLabels(documents, "releaseTypeLabels"),
    unreleasedCount: documents.filter(({ unreleased }) => unreleased).length,
    version,
  } satisfies AlbumFilterFacets
}

async function buildCatalogIndex(): Promise<CatalogIndex> {
  const first = await getCatalogPage(1)
  const pages = [first.posts]

  for (let start = 2; start <= first.totalPages; start += WARMUP_CONCURRENCY) {
    const end = Math.min(first.totalPages, start + WARMUP_CONCURRENCY - 1)
    const batch = await Promise.all(
      Array.from({ length: end - start + 1 }, (_, index) =>
        getCatalogPage(start + index)
      )
    )
    pages.push(...batch.map(({ posts }) => posts))
  }

  const posts = pages.flat()
  const documents = posts.flatMap((post, index) => {
    const document = toSearchDocument(post, index)
    return document ? [document] : []
  })
  const details = new Map<string, AlbumDetail>()
  for (const post of posts) {
    const detail = toAlbumDetail(post)
    if (!detail) continue
    details.set(`id:${detail.id}`, detail)
    details.set(`slug:${detail.slug}`, detail)
  }

  const builtAt = Date.now()
  return {
    builtAt,
    details,
    documents,
    facets: catalogFacets(documents, builtAt),
    pages: pages.map(toAlbums),
    total: first.total,
    totalPages: first.totalPages,
  }
}

function catalogIndexIsFresh(index: CatalogIndex) {
  return Date.now() - index.builtAt < CATALOG_REVALIDATE_SECONDS * 1000
}

function refreshCatalogIndex() {
  if (catalogCache.pendingCatalogIndex) return catalogCache.pendingCatalogIndex

  const request = buildCatalogIndex()
    .then((index) => {
      catalogCache.readyCatalogIndex = index
      return index
    })
    .finally(() => {
      if (catalogCache.pendingCatalogIndex === request)
        catalogCache.pendingCatalogIndex = null
    })
  catalogCache.pendingCatalogIndex = request
  return request
}

function getCatalogIndex() {
  const ready = catalogCache.readyCatalogIndex
  if (!ready) return refreshCatalogIndex()
  if (!catalogIndexIsFresh(ready))
    void refreshCatalogIndex().catch(() => undefined)
  return Promise.resolve(ready)
}

export function warmAlbumCatalog() {
  return getCatalogIndex()
}

function editDistanceWithin(left: string, right: string, limit: number) {
  if (Math.abs(left.length - right.length) > limit) return limit + 1
  if (left.length === right.length) {
    const mismatch = [...left].flatMap((character, index) =>
      character === right[index] ? [] : [index]
    )
    if (
      mismatch.length === 2 &&
      left[mismatch[0]] === right[mismatch[1]] &&
      left[mismatch[1]] === right[mismatch[0]]
    )
      return 1
  }

  let previous = Array.from({ length: right.length + 1 }, (_, index) => index)
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex]
    let rowMinimum = leftIndex
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const value = Math.min(
        (current[rightIndex - 1] ?? 0) + 1,
        (previous[rightIndex] ?? 0) + 1,
        (previous[rightIndex - 1] ?? 0) +
          Number(left[leftIndex - 1] !== right[rightIndex - 1])
      )
      current.push(value)
      rowMinimum = Math.min(rowMinimum, value)
    }
    if (rowMinimum > limit) return limit + 1
    previous = current
  }
  return previous.at(-1) ?? limit + 1
}

function fuzzyTokenDistance(token: string, words: string[]) {
  const limit = token.length < 4 ? 0 : token.length < 7 ? 1 : 2
  let best = limit + 1
  for (const word of words) {
    if (word.includes(token)) return 0
    const distance = editDistanceWithin(token, word, limit)
    best = Math.min(best, distance - (token[0] === word[0] ? 0.25 : 0))
    if (best === 0) return 0
  }
  return best
}

function searchScore(document: SearchDocument, query: string) {
  if (!query) return 0
  if (document.title === query) return 1000
  if (document.artists === query || document.genres === query) return 950
  if (document.title.startsWith(query)) return 900
  if (document.title.includes(query)) return 850
  if (document.artists.includes(query)) return 800
  if (document.genres.includes(query)) return 750

  let distance = 0
  for (const token of query.split(" ")) {
    const tokenDistance = fuzzyTokenDistance(token, document.words)
    if (tokenDistance > (token.length < 4 ? 0 : token.length < 7 ? 1 : 2))
      return -1
    distance += tokenDistance
  }
  return 500 - distance
}

function includesSelected(keys: string[], selected: string[]) {
  return selected.length === 0 || selected.some((value) => keys.includes(value))
}

function withinDateRange(
  value: string | null,
  { start, end }: AlbumSearchFilters["releaseDate"]
) {
  if (!start && !end) return true
  return Boolean(value && (!start || value >= start) && (!end || value <= end))
}

function normalizeFiltersForMatching(
  filters: AlbumSearchFilters
): AlbumSearchFilters {
  return {
    ...filters,
    artists: filters.artists.map(searchable),
    genres: filters.genres.map(searchable),
    releaseTypes: filters.releaseTypes.map(searchable),
  }
}

function matchesFilters(document: SearchDocument, filters: AlbumSearchFilters) {
  if (
    !includesSelected(document.artistKeys, filters.artists) ||
    !includesSelected(document.genreKeys, filters.genres) ||
    !includesSelected(document.releaseTypeKeys, filters.releaseTypes) ||
    (filters.unreleased && !document.unreleased) ||
    (filters.explicit === "explicit" && !document.explicit) ||
    (filters.explicit === "clean" && document.explicit) ||
    !withinDateRange(document.releaseDate, filters.releaseDate) ||
    !withinDateRange(document.listenedAt, filters.listenedDate)
  )
    return false

  if (filters.rating === null || filters.ratingOperator === null) return true
  if (document.rating === null) return false
  if (filters.ratingOperator === "eq") return document.rating === filters.rating
  if (filters.ratingOperator === "gte") return document.rating >= filters.rating
  return document.rating <= filters.rating
}

function optionalNumber(value: unknown) {
  if (value === "" || value === null || value === undefined) return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function isCalendarDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const [, year, month, day] = match
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  return date.toISOString().slice(0, 10) === value
}

function compactDate(value: unknown) {
  const raw = optionalString(value)
  if (!raw) return null

  const compact = /^(\d{4})(\d{2})(\d{2})$/.exec(raw)
  const european = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw)
  const date = compact
    ? `${compact[1]}-${compact[2]}-${compact[3]}`
    : european
      ? `${european[3]}-${european[2]}-${european[1]}`
      : raw
  return isCalendarDate(date) ? date : null
}

function trustedExternalUrl(value: unknown, allowedHostname: string) {
  const raw = optionalString(value)
  if (!raw) return null

  try {
    const url = new URL(raw)
    return url.protocol === "https:" && url.hostname === allowedHostname
      ? url.toString()
      : null
  } catch {
    return null
  }
}

function sanitizePostContent(value: string) {
  return sanitizeHtml(value, {
    allowedTags: [
      "p",
      "h2",
      "h3",
      "h4",
      "ul",
      "ol",
      "li",
      "blockquote",
      "strong",
      "em",
      "b",
      "i",
      "a",
      "br",
      "hr",
      "figure",
      "figcaption",
      "img",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "width", "height", "loading"],
    },
    allowedSchemes: ["https", "mailto"],
  })
}

function toTrack(track: WordPressTrack): AlbumTrack | null {
  const title = optionalString(track.title)
  if (!title) return null

  const spotifyId = optionalString(track.spotify_id)

  return {
    title: decodeEntities(title),
    highlight: Boolean(track.highlight),
    spotifyId: spotifyId && /^[\da-z]+$/i.test(spotifyId) ? spotifyId : null,
  }
}

export async function getAlbumPage(page = 1): Promise<AlbumPage> {
  const index = catalogCache.readyCatalogIndex
  const indexedAlbums = index?.pages[page - 1]
  if (index && indexedAlbums) {
    if (!catalogIndexIsFresh(index))
      void warmAlbumCatalog().catch(() => undefined)
    return {
      albums: indexedAlbums,
      page,
      total: index.total,
      totalPages: index.totalPages,
    }
  }

  const response = await getCatalogPage(page)
  if (page === 1) void warmAlbumCatalog().catch(() => undefined)

  return {
    albums: toAlbums(response.posts),
    page,
    total: response.total,
    totalPages: response.totalPages,
  }
}

export async function getAlbumFilterFacets() {
  return (await getCatalogIndex()).facets
}

export async function getAlbumSearchPage(
  rawQuery: string,
  filters: AlbumSearchFilters,
  page = 1
): Promise<AlbumSearchPage> {
  const query = searchable(rawQuery)
  const normalizedFilters = normalizeFiltersForMatching(filters)
  const index = await getCatalogIndex()
  const matches = index.documents
    .filter((document) => matchesFilters(document, normalizedFilters))
    .map((document) => ({ document, score: searchScore(document, query) }))
    .filter(({ score }) => score >= 0)
    .sort(
      (left, right) =>
        right.score - left.score || left.document.index - right.document.index
    )
  const offset = (page - 1) * SEARCH_PAGE_SIZE

  return {
    albums: matches
      .slice(offset, offset + SEARCH_PAGE_SIZE)
      .map(({ document }) => document.album),
    page,
    query,
    total: matches.length,
    totalPages: Math.ceil(matches.length / SEARCH_PAGE_SIZE),
    version: index.builtAt,
  }
}

function toAlbumDetail(post: WordPressPost): AlbumDetail | null {
  const album = toAlbum(post)
  if (!album) return null

  const acf = post.acf ?? {}
  const rating = optionalNumber(acf.music_rating)

  return {
    ...album,
    contentHtml: sanitizePostContent(post.content?.rendered ?? ""),
    releaseDate: compactDate(acf.music_release_date),
    listenedAt: compactDate(acf.music_listened_at),
    rating: rating === null ? null : Math.round(rating),
    favorite: Boolean(acf.music_favorite),
    genres: termsFor(post, "genre"),
    releaseTypes: termsFor(post, "release_type"),
    notes: optionalString(acf.music_notes),
    tracks: (acf.music_tracks ?? []).flatMap((track) => {
      const normalized = toTrack(track)
      return normalized ? [normalized] : []
    }),
    durationMs: optionalNumber(acf.music_length_ms),
    averageTrackMs: optionalNumber(acf.music_avg_track_ms),
    explicit: booleanValue(acf.music_explicit),
    totalTracks: optionalNumber(acf.music_total_tracks),
    listenCount: optionalNumber(acf.listen_count),
    spotifyUrl: trustedExternalUrl(acf.spotify_album_url, "open.spotify.com"),
    lastfmUrl: trustedExternalUrl(acf.lastfm_url, "www.last.fm"),
  }
}

export async function getAlbumDetail(
  identifier: number | string
): Promise<AlbumDetail | null> {
  if (
    (typeof identifier === "number" &&
      (!Number.isInteger(identifier) || identifier < 1)) ||
    (typeof identifier === "string" && !identifier)
  )
    return null

  const index = catalogCache.readyCatalogIndex ?? (await refreshCatalogIndex())
  const type = typeof identifier === "number" ? "id" : "slug"
  return index.details.get(`${type}:${identifier}`) ?? null
}
