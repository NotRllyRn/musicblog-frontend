import { Suspense } from "react"

import { parseAlbumSearchParameters } from "@/lib/album-search-parameters"
import { getAlbumDetail, getAlbumPage } from "@/lib/wordpress"

import { CatalogLoading } from "./catalog-loading"
import { CatalogBrowser } from "./catalog-prototype"
import { createEmptyAlbumFilters } from "./search-filters"
import type { CatalogMode } from "./types"

export type CatalogPageSearchParams = Record<
  string,
  string | string[] | undefined
>

interface CatalogPageProps {
  initialMode: CatalogMode
  searchParams: Promise<CatalogPageSearchParams>
}

function toUrlSearchParams(values: CatalogPageSearchParams) {
  const parameters = new URLSearchParams()
  for (const [name, value] of Object.entries(values))
    for (const item of typeof value === "string" ? [value] : (value ?? []))
      parameters.append(name, item)
  return parameters
}

async function AlbumCatalog({ initialMode, searchParams }: CatalogPageProps) {
  const parameters = toUrlSearchParams(await searchParams)
  const slug = parameters.get("album") ?? ""
  const initialQuery = parameters.get("q") ?? ""
  parameters.delete("q")
  let initialFilters = createEmptyAlbumFilters()
  try {
    initialFilters = parseAlbumSearchParameters(parameters).filters
  } catch {}
  const [initialPage, initialAlbum] = await Promise.all([
    getAlbumPage().catch(() => ({
      albums: [],
      page: 1,
      total: 0,
      totalPages: 1,
    })),
    slug ? getAlbumDetail(slug).catch(() => null) : null,
  ])

  return (
    <CatalogBrowser
      initialAlbum={initialAlbum}
      initialFilters={initialFilters}
      initialMode={initialMode}
      initialPage={initialPage}
      initialQuery={initialQuery}
    />
  )
}

export function CatalogPage(props: CatalogPageProps) {
  return (
    <Suspense fallback={<CatalogLoading />}>
      <AlbumCatalog {...props} />
    </Suspense>
  )
}
