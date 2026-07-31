import { getAlbumPage } from "@/lib/wordpress"

export async function GET(request: Request) {
  try {
    const requestedPage = Number(new URL(request.url).searchParams.get("page"))
    const page =
      Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1

    return Response.json(await getAlbumPage(page), {
      headers: { "Cache-Control": "public, max-age=3600" },
    })
  } catch {
    return Response.json({ error: "Albums could not load" }, { status: 502 })
  }
}
