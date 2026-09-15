import { getAlbumDetail } from "@/lib/wordpress"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const album = await getAlbumDetail(slug)

    if (!album)
      return Response.json({ error: "Album not found" }, { status: 404 })

    return Response.json(album, {
      headers: { "Cache-Control": "public, max-age=3600" },
    })
  } catch {
    return Response.json({ error: "Album could not load" }, { status: 502 })
  }
}
