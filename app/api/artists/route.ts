import { getArtistCatalog } from "@/lib/wordpress"

export async function GET() {
  try {
    return Response.json(await getArtistCatalog(), {
      headers: { "Cache-Control": "private, no-store" },
    })
  } catch {
    return Response.json({ error: "Artists could not load" }, { status: 502 })
  }
}
