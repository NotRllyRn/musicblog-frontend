import { getAlbumSearchPage, normalizeAlbumQuery } from "@/lib/wordpress"

const MAX_QUERY_LENGTH = 80
const MIN_QUERY_LENGTH = 2

export async function GET(request: Request) {
  const url = URL.parse(request.url)
  if (!url) return Response.json({ error: "Invalid search" }, { status: 400 })

  const query = normalizeAlbumQuery(url.searchParams.get("q") ?? "")
  const requestedPage = Number(url.searchParams.get("page") ?? 1)

  if (
    query.length < MIN_QUERY_LENGTH ||
    query.length > MAX_QUERY_LENGTH ||
    !Number.isInteger(requestedPage) ||
    requestedPage < 1
  )
    return Response.json({ error: "Invalid search" }, { status: 400 })

  try {
    return Response.json(await getAlbumSearchPage(query, requestedPage), {
      headers: { "Cache-Control": "private, no-store" },
    })
  } catch {
    return Response.json({ error: "Search could not load" }, { status: 502 })
  }
}
