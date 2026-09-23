import "server-only"

import { createHash, randomUUID } from "node:crypto"
import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import path from "node:path"

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
  ArtistProfile,
  GenreProfile,
} from "@/app/_catalog-prototype/types"

interface WordPressTerm {
  acf?: { image?: number | WordPressArtistImage }
  id: number
  name: string
  slug: string
  taxonomy: string
}

interface WordPressMedia {
  id?: number
  alt_text?: string
  media_details?: {
    sizes?: Record<string, { source_url?: string }>
  }
  source_url?: string
}

interface WordPressArtistImage {
  alt?: string
  id?: number
  sizes?: Record<string, string>
  url?: string
}

interface WordPressArtistTerm {
  acf?: { image?: number | WordPressArtistImage }
  id: number
  name: string
  slug: string
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
  artists: ArtistProfile[]
  builtAt: number
  details: Map<string, AlbumDetail>
  documents: SearchDocument[]
  facets: AlbumFilterFacets
  pages: AlbumPost[][]
  posts: WordPressPost[]
  reconciledAt: number
  total: number
  totalPages: number
}

interface CatalogCacheState {
  pendingCatalogIndex: Promise<CatalogIndex> | null
  pendingCatalogMutation: Promise<CatalogMutationResult> | null
  pendingPages: Map<number, Promise<Awaited<ReturnType<typeof requestPage>>>>
  readyCatalogIndex: CatalogIndex | null
}

interface ArtistCacheState {
  builtAt: number
  pending: Promise<ArtistProfile[]> | null
  ready: ArtistProfile[] | null
}

export type CatalogMutationEvent = "published" | "updated" | "deleted"

export interface CatalogMutationResult {
  albumId: number
  changed: boolean
  event: CatalogMutationEvent
  version: number
}

const CATALOG_REVALIDATE_SECONDS = 86_400
const WORDPRESS_PAGE_SIZE = 100
const WORDPRESS_ARTIST_PAGE_SIZE = 100
const SEARCH_PAGE_SIZE = 50
const WARMUP_CONCURRENCY = 3
const ARTIST_WARMUP_CONCURRENCY = 6
const ARTWORK_WARMUP_CONCURRENCY = 2
const artworkCacheDirectory = path.join(
  process.cwd(),
  ".next/cache/album-artwork"
)
const pendingArtwork = new Map<string, Promise<Uint8Array>>()
const artworkGlobal = globalThis as typeof globalThis & {
  musicblogArtworkUrls?: Map<string, string>
}
const artworkUrlsBySlug = (artworkGlobal.musicblogArtworkUrls ??= new Map())

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
  url.searchParams.set("per_page", String(WORDPRESS_PAGE_SIZE))
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

async function requestPost(identifier: number | string, fresh = false) {
  const byId = typeof identifier === "number"
  const url = URL.parse(`${apiRoot()}/posts${byId ? `/${identifier}` : ""}`)

  if (!url) throw new Error("WordPress API URL is invalid")

  if (typeof identifier === "string") url.searchParams.set("slug", identifier)
  url.searchParams.set("_embed", "wp:featuredmedia,wp:term")
  url.searchParams.set(
    "_fields",
    "id,slug,status,password,title,content,acf,_links,_embedded"
  )

  const response = await fetch(url, {
    cache: fresh ? "no-store" : undefined,
    headers: requestHeaders(),
    next: fresh
      ? undefined
      : {
          revalidate: CATALOG_REVALIDATE_SECONDS,
          tags: ["wordpress-albums", `wordpress-album-${identifier}`],
        },
    signal: AbortSignal.timeout(15_000),
  })

  if (response.status === 404) return null
  if (!response.ok) throw new Error(`WordPress returned ${response.status}`)

  const result = (await response.json()) as WordPressPost | WordPressPost[]
  return Array.isArray(result) ? (result[0] ?? null) : result
}

async function requestArtistPage(page: number) {
  const url = URL.parse(`${apiRoot()}/artist`)
  if (!url) throw new Error("WordPress API URL is invalid")

  url.searchParams.set("page", String(page))
  url.searchParams.set("per_page", String(WORDPRESS_ARTIST_PAGE_SIZE))
  url.searchParams.set("hide_empty", "true")
  url.searchParams.set("acf_format", "standard")
  url.searchParams.set("_fields", "id,slug,name,acf")

  const response = await fetch(url, {
    cache: "force-cache",
    headers: requestHeaders(),
    next: {
      revalidate: CATALOG_REVALIDATE_SECONDS,
      tags: ["wordpress-artists"],
    },
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) throw new Error(`WordPress returned ${response.status}`)

  return {
    terms: (await response.json()) as WordPressArtistTerm[],
    totalPages: Number(response.headers.get("x-wp-totalpages") ?? 1),
  }
}

async function requestArtistTerms() {
  const first = await requestArtistPage(1)
  const remaining = await Promise.all(
    Array.from({ length: first.totalPages - 1 }, (_, index) =>
      requestArtistPage(index + 2)
    )
  )
  return [first.terms, ...remaining.map(({ terms }) => terms)].flat()
}

async function requestArtistMedia(ids: number[]) {
  const media = new Map<number, WordPressMedia>()
  const batches = Array.from(
    { length: Math.ceil(ids.length / WORDPRESS_ARTIST_PAGE_SIZE) },
    (_, index) =>
      ids.slice(
        index * WORDPRESS_ARTIST_PAGE_SIZE,
        (index + 1) * WORDPRESS_ARTIST_PAGE_SIZE
      )
  )
  for (
    let start = 0;
    start < batches.length;
    start += ARTIST_WARMUP_CONCURRENCY
  ) {
    const responses = await Promise.all(
      batches
        .slice(start, start + ARTIST_WARMUP_CONCURRENCY)
        .map(async (batch) => {
          const url = URL.parse(`${apiRoot()}/media`)
          if (!url) throw new Error("WordPress API URL is invalid")

          url.searchParams.set("include", batch.join(","))
          url.searchParams.set("orderby", "include")
          url.searchParams.set("per_page", String(batch.length))
          url.searchParams.set(
            "_fields",
            "id,alt_text,source_url,media_details.sizes"
          )
          const response = await fetch(url, {
            cache: "force-cache",
            headers: requestHeaders(),
            next: {
              revalidate: CATALOG_REVALIDATE_SECONDS,
              tags: ["wordpress-artists"],
            },
            signal: AbortSignal.timeout(30_000),
          })
          if (!response.ok)
            throw new Error(`WordPress returned ${response.status}`)
          return (await response.json()) as WordPressMedia[]
        })
    )
    for (const item of responses.flat()) if (item.id) media.set(item.id, item)
  }
  return media
}

function trustedArtistImageUrl(value: unknown) {
  if (typeof value !== "string") return null
  try {
    const image = new URL(value)
    const wordpress = new URL(process.env.WORDPRESS_BASE_URL ?? "")
    return image.origin === wordpress.origin &&
      image.pathname.startsWith("/wp-content/uploads/")
      ? image.toString()
      : null
  } catch {
    return null
  }
}

async function artistProfiles(
  posts: WordPressPost[],
  termsRequest?: Promise<WordPressArtistTerm[]>
) {
  const usedIds = new Set(
    posts.flatMap((post) =>
      (post._embedded?.["wp:term"]?.flat() ?? []).flatMap((term) =>
        term.taxonomy === "artist" ? [term.id] : []
      )
    )
  )
  if (!usedIds.size) return []

  const embeddedTerms = new Map<number, WordPressArtistTerm>()
  for (const post of posts)
    for (const term of post._embedded?.["wp:term"]?.flat() ?? [])
      if (term.taxonomy === "artist") embeddedTerms.set(term.id, term)

  const requestedTerms = await (termsRequest ?? requestArtistTerms()).catch(
    () => []
  )
  const terms = (
    requestedTerms.length ? requestedTerms : [...embeddedTerms.values()]
  )
    .filter(({ id }) => usedIds.has(id))
    .sort((left, right) => left.id - right.id)
  return profilesForArtistTerms(terms)
}

async function profilesForArtistTerms(terms: WordPressArtistTerm[]) {
  const mediaIds = [
    ...new Set(
      terms.flatMap(({ acf }) =>
        typeof acf?.image === "number" ? [acf.image] : []
      )
    ),
  ]
  const media = await requestArtistMedia(mediaIds).catch(
    () => new Map<number, WordPressMedia>()
  )

  return terms.map((term) => {
    const image = term.acf?.image
    const attachment = typeof image === "number" ? media.get(image) : null
    const imageUrl = trustedArtistImageUrl(
      typeof image === "object"
        ? (image.sizes?.medium ?? image.sizes?.thumbnail ?? image.url)
        : (attachment?.media_details?.sizes?.medium?.source_url ??
            attachment?.media_details?.sizes?.thumbnail?.source_url ??
            attachment?.source_url)
    )
    return {
      id: term.id,
      slug: term.slug,
      name: decodeEntities(term.name),
      imageUrl,
      imageAlt:
        (typeof image === "object" ? image.alt : attachment?.alt_text) ||
        decodeEntities(term.name),
    }
  }) satisfies ArtistProfile[]
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
  artworkUrlsBySlug.set(post.slug, media.source_url)

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
    imageUrl: `/api/albums/${encodeURIComponent(post.slug)}/artwork/${createHash("sha256").update(media.source_url).digest("hex").slice(0, 12)}`,
    imageAlt: media.alt_text || `${title} album art`,
  }
}

function featuredImageUrl(post: WordPressPost) {
  return post._embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? null
}

function artworkFile(url: string) {
  return path.join(
    artworkCacheDirectory,
    createHash("sha256").update(url).digest("hex")
  )
}

function artworkContentType(url: string) {
  const extension = path.extname(new URL(url).pathname).toLowerCase()
  if (extension === ".png") return "image/png"
  if (extension === ".gif") return "image/gif"
  if (extension === ".webp") return "image/webp"
  if (extension === ".avif") return "image/avif"
  return "image/jpeg"
}

function cacheArtwork(url: string) {
  const pending = pendingArtwork.get(url)
  if (pending) return pending

  const file = artworkFile(url)
  const request = readFile(file).catch(async () => {
    const source = new URL(url)
    const wordpress = new URL(process.env.WORDPRESS_BASE_URL ?? "")
    if (
      source.origin !== wordpress.origin ||
      !source.pathname.startsWith("/wp-content/uploads/")
    )
      throw new Error("Album artwork URL is not trusted")

    const response = await fetch(source, {
      signal: AbortSignal.timeout(30_000),
    })
    if (!response.ok) throw new Error(`Artwork returned ${response.status}`)
    const body = new Uint8Array(await response.arrayBuffer())
    const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`
    await mkdir(artworkCacheDirectory, { recursive: true })
    await writeFile(temporary, body)
    await rename(temporary, file)
    return body
  })
  pendingArtwork.set(url, request)
  void request.finally(() => pendingArtwork.delete(url)).catch(() => undefined)
  return request
}

async function warmArtworkPosts(posts: WordPressPost[]) {
  const urls = posts.flatMap((post) => {
    const url = featuredImageUrl(post)
    return url ? [url] : []
  })
  for (let index = 0; index < urls.length; index += ARTWORK_WARMUP_CONCURRENCY)
    await Promise.all(
      urls
        .slice(index, index + ARTWORK_WARMUP_CONCURRENCY)
        .map((url) => cacheArtwork(url).catch(() => undefined))
    )
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
  pendingCatalogMutation: null,
  pendingPages: new Map(),
  readyCatalogIndex: null,
})
const artistGlobal = globalThis as typeof globalThis & {
  musicblogArtistCache?: ArtistCacheState
}
const artistCache = (artistGlobal.musicblogArtistCache ??= {
  builtAt: 0,
  pending: null,
  ready: null,
})

function getStandaloneArtistCatalog() {
  if (
    artistCache.ready &&
    Date.now() - artistCache.builtAt < CATALOG_REVALIDATE_SECONDS * 1_000
  )
    return Promise.resolve(artistCache.ready)
  if (artistCache.pending) return artistCache.pending

  const request = requestArtistTerms()
    .then(profilesForArtistTerms)
    .then((artists) => {
      artistCache.builtAt = Date.now()
      artistCache.ready = artists
      return artists
    })
    .finally(() => {
      if (artistCache.pending === request) artistCache.pending = null
    })
  artistCache.pending = request
  return request
}

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

function genreProfiles(documents: SearchDocument[]) {
  const profiles = new Map<string, GenreProfile>()
  for (const document of documents)
    for (const [index, name] of document.genreLabels.entries()) {
      const id = document.genreKeys[index]
      const current = profiles.get(id)
      if (current) current.count += 1
      else profiles.set(id, { count: 1, id, name })
    }
  return [...profiles.values()].sort((left, right) =>
    left.name.localeCompare(right.name, undefined, { sensitivity: "base" })
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
    genreProfiles: genreProfiles(documents),
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

function catalogFromPosts(
  posts: WordPressPost[],
  reconciledAt: number,
  artists: ArtistProfile[],
  version = Date.now()
): CatalogIndex {
  const postPages = Array.from(
    { length: Math.max(1, Math.ceil(posts.length / WORDPRESS_PAGE_SIZE)) },
    (_, index) =>
      posts.slice(
        index * WORDPRESS_PAGE_SIZE,
        (index + 1) * WORDPRESS_PAGE_SIZE
      )
  )
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

  return {
    artists,
    builtAt: version,
    details,
    documents,
    facets: catalogFacets(documents, version),
    pages: postPages.map(toAlbums),
    posts,
    reconciledAt,
    total: posts.length,
    totalPages: Math.max(1, postPages.length),
  }
}

async function buildCatalogIndex(): Promise<CatalogIndex> {
  const first = await getCatalogPage(1)
  const artistCatalog = getStandaloneArtistCatalog()
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
  const builtAt = Date.now()
  const artists = await artistCatalog.catch(() =>
    artistProfiles(posts, Promise.resolve([]))
  )
  return {
    ...catalogFromPosts(posts, builtAt, artists, builtAt),
    total: first.total,
    totalPages: first.totalPages,
  }
}

function catalogIndexIsFresh(index: CatalogIndex) {
  return Date.now() - index.reconciledAt < CATALOG_REVALIDATE_SECONDS * 1000
}

function refreshCatalogIndex() {
  if (catalogCache.pendingCatalogIndex) return catalogCache.pendingCatalogIndex

  const request = buildCatalogIndex()
    .then((index) => {
      catalogCache.readyCatalogIndex = index
      artistCache.builtAt = index.builtAt
      artistCache.ready = index.artists
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

export async function warmAlbumArtwork() {
  const first = await getCatalogPage(1)
  await warmArtworkPosts(first.posts)
  const index = await getCatalogIndex()
  await warmArtworkPosts(index.posts.slice(WORDPRESS_PAGE_SIZE))
}

export async function getAlbumArtwork(slug: string) {
  let url: string | null | undefined = artworkUrlsBySlug.get(slug)
  if (!url) {
    const index = await getCatalogIndex()
    const post = index.posts.find((candidate) => candidate.slug === slug)
    url = post ? featuredImageUrl(post) : null
  }
  if (!url) return null
  return { body: await cacheArtwork(url), contentType: artworkContentType(url) }
}

async function applyCatalogMutation(
  event: CatalogMutationEvent,
  albumId: number
): Promise<CatalogMutationResult> {
  await getCatalogIndex()
  if (catalogCache.pendingCatalogIndex) await catalogCache.pendingCatalogIndex

  const index = catalogCache.readyCatalogIndex
  if (!index) throw new Error("Album catalog is unavailable")

  const posts = [...index.posts]
  const existingIndex = posts.findIndex(({ id }) => id === albumId)
  const post = event === "deleted" ? null : await requestPost(albumId, true)

  if (post && isPublicPost(post)) {
    if (existingIndex === -1) posts.unshift(post)
    else posts[existingIndex] = post
  } else if (existingIndex !== -1) posts.splice(existingIndex, 1)

  const changed = Boolean(post && isPublicPost(post)) || existingIndex !== -1
  const version = Math.max(Date.now(), index.builtAt + Number(changed))
  if (changed)
    catalogCache.readyCatalogIndex = catalogFromPosts(
      posts,
      index.reconciledAt,
      await artistProfiles(posts),
      version
    )

  return { albumId, changed, event, version }
}

export function mutateAlbumCatalog(
  event: CatalogMutationEvent,
  albumId: number
): Promise<CatalogMutationResult> {
  const previous = catalogCache.pendingCatalogMutation?.catch(() => undefined)
  const mutation = (previous ?? Promise.resolve()).then(() =>
    applyCatalogMutation(event, albumId)
  )
  catalogCache.pendingCatalogMutation = mutation
  void mutation
    .finally(() => {
      if (catalogCache.pendingCatalogMutation === mutation)
        catalogCache.pendingCatalogMutation = null
    })
    .catch(() => undefined)
  return mutation
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

export async function getArtistCatalog() {
  const index = catalogCache.readyCatalogIndex
  return index && catalogIndexIsFresh(index)
    ? index.artists
    : getStandaloneArtistCatalog()
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
