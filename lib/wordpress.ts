import "server-only"

import sanitizeHtml from "sanitize-html"

import type {
  AlbumDetail,
  AlbumPage,
  AlbumPost,
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
  disc_number?: number | string
  track_number?: number | string
  duration_ms?: number | string
  explicit?: boolean
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
  date: string
  link: string
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
  artists: string
  genres: string
  index: number
  text: string
  title: string
}

interface CatalogIndex {
  builtAt: number
  documents: SearchDocument[]
  pages: WordPressPost[][]
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
  url.searchParams.set("_fields", "id,date,link,title,acf,_links,_embedded")

  const response = await fetch(url, {
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

async function requestPost(id: number) {
  const url = URL.parse(`${apiRoot()}/posts/${id}`)

  if (!url) throw new Error("WordPress API URL is invalid")

  url.searchParams.set("_embed", "wp:featuredmedia,wp:term")
  url.searchParams.set(
    "_fields",
    "id,date,link,status,password,title,content,acf,_links,_embedded"
  )

  const response = await fetch(url, {
    headers: requestHeaders(),
    next: {
      revalidate: 3600,
      tags: ["wordpress-albums", `wordpress-album-${id}`],
    },
    signal: AbortSignal.timeout(15_000),
  })

  if (response.status === 404) return null
  if (!response.ok) throw new Error(`WordPress returned ${response.status}`)

  return (await response.json()) as WordPressPost
}

function termsFor({
  post,
  taxonomy,
}: {
  post: WordPressPost
  taxonomy: string
}) {
  const names: string[] = []

  for (const term of post._embedded?.["wp:term"]?.flat() ?? [])
    if (term.taxonomy === taxonomy) names.push(decodeEntities(term.name))

  return names
}

function toAlbum(post: WordPressPost): AlbumPost | null {
  const media = post._embedded?.["wp:featuredmedia"]?.[0]
  if (!media?.source_url) return null

  const title = decodeEntities(post.title.rendered)
  const artist =
    termsFor({ post, taxonomy: "artist" })[0] ??
    termsFor({ post, taxonomy: "post_tag" })[0] ??
    "Unknown artist"

  return {
    id: post.id,
    title,
    artist,
    genre: termsFor({ post, taxonomy: "genre" })[0] ?? "Album",
    year: post.date.slice(0, 4),
    href: post.link,
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

function searchable(value: string) {
  return normalizeAlbumQuery(value).toLowerCase()
}

function toSearchDocument(post: WordPressPost, index: number) {
  const album = toAlbum(post)
  if (!album) return null

  const artistTerms = termsFor({ post, taxonomy: "artist" })
  const artists = artistTerms.length
    ? artistTerms
    : termsFor({ post, taxonomy: "post_tag" }).slice(0, 1)
  const genres = termsFor({ post, taxonomy: "genre" })
  const title = searchable(album.title)
  const normalizedArtists = searchable(artists.join(" "))
  const normalizedGenres = searchable(genres.join(" "))

  return {
    album,
    artists: normalizedArtists,
    genres: normalizedGenres,
    index,
    text: `${title} ${normalizedArtists} ${normalizedGenres}`,
    title,
  } satisfies SearchDocument
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

  const documents = pages.flat().flatMap((post, index) => {
    const document = toSearchDocument(post, index)
    return document ? [document] : []
  })

  return {
    builtAt: Date.now(),
    documents,
    pages,
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
  void getCatalogIndex().catch(() => undefined)
}

function searchScore(document: SearchDocument, query: string) {
  const tokens = query.split(" ")
  if (!tokens.every((token) => document.text.includes(token))) return -1
  if (document.title === query) return 6
  if (document.artists === query || document.genres === query) return 5
  if (document.title.startsWith(query)) return 4
  if (document.title.includes(query)) return 3
  if (document.artists.includes(query)) return 2
  if (document.genres.includes(query)) return 1
  return 0
}

function optionalNumber(value: unknown) {
  if (value === "" || value === null || value === undefined) return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function compactDate(value: unknown) {
  const date = optionalString(value)
  return date && /^\d{8}$/.test(date)
    ? `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6)}`
    : null
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
    discNumber: optionalNumber(track.disc_number) ?? 1,
    trackNumber: optionalNumber(track.track_number) ?? 0,
    durationMs: optionalNumber(track.duration_ms),
    explicit: Boolean(track.explicit),
    spotifyId: spotifyId && /^[\da-z]+$/i.test(spotifyId) ? spotifyId : null,
  }
}

export async function getAlbumPage(page = 1): Promise<AlbumPage> {
  const index = catalogCache.readyCatalogIndex
  const indexedPosts = index?.pages[page - 1]
  if (index && indexedPosts) {
    if (!catalogIndexIsFresh(index)) warmAlbumCatalog()
    return {
      albums: toAlbums(indexedPosts),
      page,
      total: index.total,
      totalPages: index.totalPages,
    }
  }

  const response = await getCatalogPage(page)
  if (page === 1) warmAlbumCatalog()

  return {
    albums: toAlbums(response.posts),
    page,
    total: response.total,
    totalPages: response.totalPages,
  }
}

export function normalizeAlbumQuery(value: string) {
  return value.normalize("NFKC").replace(/\s+/gu, " ").trim()
}

export async function getAlbumSearchPage(
  rawQuery: string,
  page = 1
): Promise<AlbumSearchPage> {
  const query = searchable(rawQuery)
  const index = await getCatalogIndex()
  const matches = index.documents
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
  }
}

export async function getAlbumDetail(id: number): Promise<AlbumDetail | null> {
  if (!Number.isInteger(id) || id < 1) return null

  const post = await requestPost(id)
  if (
    !post ||
    post.status !== "publish" ||
    Boolean(post.password) ||
    post.content?.protected
  )
    return null

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
    genres: termsFor({ post, taxonomy: "genre" }),
    releaseTypes: termsFor({ post, taxonomy: "release_type" }),
    notes: optionalString(acf.music_notes),
    tracks: (acf.music_tracks ?? []).flatMap((track) => {
      const normalized = toTrack(track)
      return normalized ? [normalized] : []
    }),
    durationMs: optionalNumber(acf.music_length_ms),
    averageTrackMs: optionalNumber(acf.music_avg_track_ms),
    explicit: Boolean(acf.music_explicit),
    totalTracks: optionalNumber(acf.music_total_tracks),
    listenCount: optionalNumber(acf.listen_count),
    spotifyUrl: trustedExternalUrl(acf.spotify_album_url, "open.spotify.com"),
    lastfmUrl: trustedExternalUrl(acf.lastfm_url, "www.last.fm"),
  }
}
