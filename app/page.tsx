import { Suspense } from "react"

import { CatalogLoading } from "@/app/_catalog-prototype/catalog-loading"
import { CatalogBrowser } from "@/app/_catalog-prototype/catalog-prototype"
import { createEmptyAlbumFilters } from "@/app/_catalog-prototype/search-filters"
import { parseAlbumSearchParameters } from "@/lib/album-search-parameters"
import { getAlbumDetail, getAlbumPage } from "@/lib/wordpress"

type PageSearchParams = Record<string, string | string[] | undefined>

interface PageProps {
  searchParams: Promise<PageSearchParams>
}

function toUrlSearchParams(values: PageSearchParams) {
  const parameters = new URLSearchParams()
  for (const [name, value] of Object.entries(values))
    for (const item of typeof value === "string" ? [value] : (value ?? []))
      parameters.append(name, item)
  return parameters
}

async function AlbumCatalog({ searchParams }: PageProps) {
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
      initialPage={initialPage}
      initialQuery={initialQuery}
    />
  )
}

export default function Page({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<CatalogLoading />}>
      <AlbumCatalog searchParams={searchParams} />
    </Suspense>
  )
}
