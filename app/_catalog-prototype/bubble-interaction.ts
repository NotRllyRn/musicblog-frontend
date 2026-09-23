export const MIN_BUBBLE_ZOOM = 0.55
export const MAX_BUBBLE_ZOOM = 1.8

export function clampBubbleZoom(zoom: number) {
  return Math.min(MAX_BUBBLE_ZOOM, Math.max(MIN_BUBBLE_ZOOM, zoom))
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
  const zoom = clampBubbleZoom(
    (startZoom * distance) / Math.max(1, startDistance)
  )
  return {
    cameraX: clientX - left - width / 2 - anchorX * zoom,
    cameraY: clientY - top - height / 2 - anchorY * zoom,
    zoom,
  }
}

export function bubbleTapAction(
  activeId: number | string | null,
  tappedId: number | string | null
) {
  if (tappedId === null) return "clear"
  return tappedId === activeId ? "select" : "preview"
}
