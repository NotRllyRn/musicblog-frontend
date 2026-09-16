export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return

  const { getAlbumPage, warmAlbumArtwork } = await import("./lib/wordpress")
  await getAlbumPage(1)
  void warmAlbumArtwork().catch((error: unknown) =>
    console.error("Album artwork warmup failed", error)
  )
}
