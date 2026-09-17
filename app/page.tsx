import {
  CatalogPage,
  type CatalogPageSearchParams,
} from "@/app/_catalog-prototype/catalog-page"
import { getAlbumDetail } from "@/lib/wordpress"
import type { Metadata } from "next"

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
  const url = `/?album=${encodeURIComponent(album.slug)}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title,
      description,
      url,
      images: [{ url: album.imageUrl, alt: album.imageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [album.imageUrl],
    },
  }
}

export default function Page(props: {
  searchParams: Promise<CatalogPageSearchParams>
}) {
  return <CatalogPage initialMode="albums" searchParams={props.searchParams} />
}
