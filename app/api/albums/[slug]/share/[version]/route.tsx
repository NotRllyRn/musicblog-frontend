/* eslint-disable @next/next/no-img-element -- ImageResponse renders HTML into a PNG. */
import { getAlbumArtwork } from "@/lib/wordpress"
import { ImageResponse } from "next/og"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; version: string }> }
) {
  const artwork = await getAlbumArtwork((await params).slug).catch(() => null)
  if (!artwork) return new Response(null, { status: 404 })

  const source = Uint8Array.from(artwork.body).buffer
  return new ImageResponse(
    <section style={{ display: "flex", width: "100%", height: "100%" }}>
      <img
        alt=""
        // @ts-expect-error ImageResponse supports ArrayBuffer image sources.
        src={source}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </section>,
    {
      width: 1200,
      height: 1200,
      headers: { "Cache-Control": "public, max-age=31536000, immutable" },
    }
  )
}
