import "server-only"

import type { AlbumPage, AlbumPost } from "@/app/_catalog-prototype/types"

interface WordPressTerm {
  name: string
  taxonomy: string
}

interface WordPressMedia {
  alt_text?: string
  media_details?: {
    sizes?: { medium?: { source_url?: string } }
  }
  source_url?: string
}

interface WordPressPost {
  id: number
  date: string
  link: string
  title: { rendered: string }
  _embedded?: {
    "wp:featuredmedia"?: WordPressMedia[]
    "wp:term"?: WordPressTerm[][]
  }
}

const entityMap: Record<string, string> = {
  amp: "&",
  apos: "'",
  hellip: "…",
  nbsp: " ",
  quot: '"',
}

function decodeEntities(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number(code))
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
  url.searchParams.set("_fields", "id,date,link,title,_links,_embedded")

  const response = await fetch(url, {
    headers: requestHeaders(),
    next: { revalidate: 3600, tags: ["wordpress-albums"] },
    signal: AbortSignal.timeout(15_000),
  })

  if (!response.ok) throw new Error(`WordPress returned ${response.status}`)

  return {
    posts: (await response.json()) as WordPressPost[],
    total: Number(response.headers.get("x-wp-total") ?? 0),
    totalPages: Number(response.headers.get("x-wp-totalpages") ?? 1),
  }
}

function toAlbums(posts: WordPressPost[]): AlbumPost[] {
  return posts.flatMap((post) => {
    const media = post._embedded?.["wp:featuredmedia"]?.[0]
    const terms = post._embedded?.["wp:term"]?.flat() ?? []

    const imageUrl =
      media?.media_details?.sizes?.medium?.source_url ?? media?.source_url
    if (!imageUrl) return []

    const title = decodeEntities(post.title.rendered)
    const artist =
      terms.find(({ taxonomy }) => taxonomy === "artist")?.name ??
      terms.find(({ taxonomy }) => taxonomy === "post_tag")?.name ??
      "Unknown artist"

    return [
      {
        id: post.id,
        title,
        artist: decodeEntities(artist),
        genre: decodeEntities(
          terms.find(({ taxonomy }) => taxonomy === "genre")?.name ?? "Album"
        ),
        year: post.date.slice(0, 4),
        href: post.link,
        imageUrl,
        imageAlt: media?.alt_text || `${title} album art`,
      },
    ]
  })
}

export async function getAlbumPage(page = 1): Promise<AlbumPage> {
  const response = await requestPage(page)

  return {
    albums: toAlbums(response.posts),
    page,
    total: response.total,
    totalPages: response.totalPages,
  }
}
