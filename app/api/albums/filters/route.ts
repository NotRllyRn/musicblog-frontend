import { getAlbumFilterFacets } from "@/lib/wordpress"

export async function GET() {
  try {
    return Response.json(await getAlbumFilterFacets(), {
      headers: { "Cache-Control": "private, no-store" },
    })
  } catch {
    return Response.json({ error: "Filters could not load" }, { status: 502 })
  }
}
