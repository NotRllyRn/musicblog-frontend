import { parseAlbumSearchParameters } from "@/lib/album-search-parameters"
import { getAlbumSearchPage } from "@/lib/wordpress"

export async function GET(request: Request) {
  const url = URL.parse(request.url)
  if (!url) return Response.json({ error: "Invalid search" }, { status: 400 })

  let search
  try {
    search = parseAlbumSearchParameters(url.searchParams)
  } catch {
    return Response.json({ error: "Invalid search" }, { status: 400 })
  }

  try {
    return Response.json(
      await getAlbumSearchPage(search.query, search.filters, search.page),
      { headers: { "Cache-Control": "private, no-store" } }
    )
  } catch {
    return Response.json({ error: "Search could not load" }, { status: 502 })
  }
}
