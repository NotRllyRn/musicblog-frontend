import { CatalogBrowser } from "@/app/_catalog-prototype/catalog-prototype"
import { getAlbumPosts } from "@/lib/wordpress"

export default async function Page() {
  const albums = await getAlbumPosts().catch(() => [])

  return <CatalogBrowser albums={albums} />
}
