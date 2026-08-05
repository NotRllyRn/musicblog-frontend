export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return

  const { warmAlbumCatalog } = await import("./lib/wordpress")
  warmAlbumCatalog()
}
