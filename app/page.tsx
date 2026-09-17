import {
  CatalogPage,
  type CatalogPageSearchParams,
} from "@/app/_catalog-prototype/catalog-page"
import {
  albumShareImagePath,
  albumSharePath,
} from "@/app/_catalog-prototype/album-share"
import { getAlbumDetail } from "@/lib/wordpress"
import type { Metadata } from "next"
import { headers } from "next/headers"

async function siteUrl() {
  if (process.env.SITE_URL) return new URL(process.env.SITE_URL)

  const requestHeaders = await headers()
  const host = (
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host")
  )
    ?.split(",")[0]
    .trim()
  const protocol = (requestHeaders.get("x-forwarded-proto") ?? "https")
    .split(",")[0]
    .trim()
  return new URL(`${protocol}://${host ?? "music.callita.day"}`)
}

export async function generateMetadata(props: {
  searchParams: Promise<CatalogPageSearchParams>
}): Promise<Metadata> {
  const value = (await props.searchParams).album
  const slug = Array.isArray(value) ? value[0] : value
  if (!slug) return {}

  const album = await getAlbumDetail(slug).catch(() => null)
  if (!album) return {}

  const title = `${album.title} — ${album.artist}`
  const description = `Read Tim's review of ${album.title} by ${album.artist}.`
  const origin = await siteUrl()
  const url = new URL(albumSharePath(album), origin)
  const image = new URL(albumShareImagePath(album), origin)

  return {
    title,
    description,
    alternates: {
      canonical: new URL(`/?album=${encodeURIComponent(album.slug)}`, origin),
    },
    openGraph: {
      type: "article",
      title,
      description,
      url,
      siteName: "Tim's Music Blog",
      images: [
        {
          url: image,
          width: 1200,
          height: 1200,
          type: "image/png",
          alt: album.imageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: image, alt: album.imageAlt }],
    },
  }
}

export default function Page(props: {
  searchParams: Promise<CatalogPageSearchParams>
}) {
  return <CatalogPage initialMode="albums" searchParams={props.searchParams} />
}
