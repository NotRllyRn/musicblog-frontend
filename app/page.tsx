import { Suspense } from "react"

import { CatalogLoading } from "@/app/_catalog-prototype/catalog-loading"
import { CatalogBrowser } from "@/app/_catalog-prototype/catalog-prototype"
import { getAlbumPage } from "@/lib/wordpress"

async function AlbumCatalog() {
  const initialPage = await getAlbumPage().catch(() => ({
    albums: [],
    page: 1,
    total: 0,
    totalPages: 1,
  }))

  return <CatalogBrowser initialPage={initialPage} />
}

export default function Page() {
  return (
    <Suspense fallback={<CatalogLoading />}>
      <AlbumCatalog />
    </Suspense>
  )
}
