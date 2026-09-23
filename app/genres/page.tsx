import {
  CatalogPage,
  type CatalogPageSearchParams,
} from "@/app/_catalog-prototype/catalog-page"

export default function Page(props: {
  searchParams: Promise<CatalogPageSearchParams>
}) {
  return <CatalogPage initialMode="genres" searchParams={props.searchParams} />
}
