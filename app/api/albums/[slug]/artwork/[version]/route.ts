import { getAlbumArtwork } from "@/lib/wordpress"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; version: string }> }
) {
  try {
    const artwork = await getAlbumArtwork((await params).slug)
    if (!artwork) return new Response(null, { status: 404 })

    const body = artwork.body.buffer.slice(
      artwork.body.byteOffset,
      artwork.body.byteOffset + artwork.body.byteLength
    ) as ArrayBuffer
    return new Response(body, {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Type": artwork.contentType,
      },
    })
  } catch {
    return new Response(null, { status: 502 })
  }
}
