import type { AlbumPost } from "./types"

export function albumArtworkVersion(album: AlbumPost) {
  return album.imageUrl.split("/").at(-1) ?? String(album.id)
}

export function albumSharePath(album: AlbumPost) {
  const parameters = new URLSearchParams({
    album: album.slug,
    v: albumArtworkVersion(album),
  })
  return `/?${parameters}`
}

export function albumShareImagePath(album: AlbumPost) {
  return `/api/albums/${encodeURIComponent(album.slug)}/share/${encodeURIComponent(albumArtworkVersion(album))}`
}
