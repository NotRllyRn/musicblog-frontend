import { CatalogPrototype } from "@/app/_catalog-prototype/catalog-prototype"
import type { VariantKey } from "@/app/_catalog-prototype/types"
import { getAlbumPosts } from "@/lib/wordpress"

const variantKeys = new Set<VariantKey>(["A", "B", "C", "D", "E"])

export default async function Page({ searchParams }: PageProps<"/">) {
  const requested = (await searchParams).variant
  const initialVariant =
    typeof requested === "string" && variantKeys.has(requested as VariantKey)
      ? (requested as VariantKey)
      : "A"
  const albums = await getAlbumPosts().catch(() => [])

  return <CatalogPrototype albums={albums} initialVariant={initialVariant} />
}
