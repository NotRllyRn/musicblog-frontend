import assert from "node:assert/strict"
import test from "node:test"

import {
  artistTapAction,
  clampArtistZoom,
  pinchCamera,
} from "./artist-interaction.ts"

test("artist zoom stays within its bounds", () => {
  assert.equal(clampArtistZoom(0), 0.55)
  assert.equal(clampArtistZoom(3), 1.8)
})

test("pinch zoom keeps its midpoint anchored", () => {
  const result = pinchCamera({
    anchorX: 30,
    anchorY: -20,
    clientX: 240,
    clientY: 320,
    distance: 150,
    height: 600,
    left: 10,
    startDistance: 100,
    startZoom: 1,
    top: 20,
    width: 400,
  })

  assert.equal(result.zoom, 1.5)
  assert.equal(10 + 200 + result.cameraX + 30 * result.zoom, 240)
  assert.equal(20 + 300 + result.cameraY - 20 * result.zoom, 320)
})

test("touch taps preview, select, or clear an artist", () => {
  assert.equal(artistTapAction(null, 1), "preview")
  assert.equal(artistTapAction(1, 2), "preview")
  assert.equal(artistTapAction(1, 1), "select")
  assert.equal(artistTapAction(1, null), "clear")
})
