import { getArtistCatalog } from "@/lib/wordpress"

export async function GET() {
  try {
    return Response.json(await getArtistCatalog(), {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
      },
    })
  } catch {
    return Response.json({ error: "Artists could not load" }, { status: 502 })
  }
}
