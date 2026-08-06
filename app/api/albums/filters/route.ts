import { getAlbumFilterFacets } from "@/lib/wordpress"

export async function GET() {
  try {
    return Response.json(await getAlbumFilterFacets(), {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      },
    })
  } catch {
    return Response.json({ error: "Filters could not load" }, { status: 502 })
  }
}
