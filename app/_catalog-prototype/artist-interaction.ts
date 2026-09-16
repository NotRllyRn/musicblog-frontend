export const MIN_ARTIST_ZOOM = 0.55
export const MAX_ARTIST_ZOOM = 1.8

export function clampArtistZoom(zoom: number) {
  return Math.min(MAX_ARTIST_ZOOM, Math.max(MIN_ARTIST_ZOOM, zoom))
}

interface PinchCameraOptions {
  anchorX: number
  anchorY: number
  clientX: number
  clientY: number
  distance: number
  height: number
  left: number
  startDistance: number
  startZoom: number
  top: number
  width: number
}

export function pinchCamera({
  anchorX,
  anchorY,
  clientX,
  clientY,
  distance,
  height,
  left,
  startDistance,
  startZoom,
  top,
  width,
}: PinchCameraOptions) {
  const zoom = clampArtistZoom(
    (startZoom * distance) / Math.max(1, startDistance)
  )
  return {
    cameraX: clientX - left - width / 2 - anchorX * zoom,
    cameraY: clientY - top - height / 2 - anchorY * zoom,
    zoom,
  }
}

export function artistTapAction(
  activeId: number | null,
  tappedId: number | null
) {
  if (tappedId === null) return "clear"
  return tappedId === activeId ? "select" : "preview"
}
