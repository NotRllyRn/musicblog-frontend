import { getAlbumDetail } from "@/lib/wordpress"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params
    const album = await getAlbumDetail(Number(rawId))

    if (!album)
      return Response.json({ error: "Album not found" }, { status: 404 })

    return Response.json(album, {
      headers: { "Cache-Control": "public, max-age=3600" },
    })
  } catch {
    return Response.json({ error: "Album could not load" }, { status: 502 })
  }
}
