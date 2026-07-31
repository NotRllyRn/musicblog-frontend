import { CatalogBrowser } from "@/app/_catalog-prototype/catalog-prototype"
import { getAlbumPage } from "@/lib/wordpress"

export default async function Page() {
  const initialPage = await getAlbumPage().catch(() => ({
    albums: [],
    page: 1,
    total: 0,
    totalPages: 1,
  }))

  return <CatalogBrowser initialPage={initialPage} />
}
