import assert from "node:assert/strict"
import test from "node:test"

import {
  buildArtistLayout,
  calculateHoverDisplacements,
} from "./artist-layout.ts"

const artists = (count) =>
  Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    slug: `artist-${index + 1}`,
    name: `Artist ${index + 1}`,
    imageUrl: null,
    imageAlt: "",
  }))

const layoutConfig = { columns: 4, diameter: 100, gap: 10 }
const displacementConfig = {
  activeScale: 1.45,
  diameter: 100,
  gap: 10,
  influenceRadiusMultiplier: 2.35,
  softPush: 10,
}

test("builds stable non-overlapping positions", () => {
  const first = buildArtistLayout(artists(12), layoutConfig)
  const second = buildArtistLayout(artists(12).reverse(), layoutConfig)
  assert.deepEqual(first, second)

  for (const [index, item] of first.items.entries())
    for (const other of first.items.slice(index + 1))
      assert.ok(Math.hypot(item.x - other.x, item.y - other.y) >= 110 - 1e-9)
})

test("appending a newer term preserves every prior position", () => {
  const before = buildArtistLayout(artists(8), layoutConfig)
  const after = buildArtistLayout(artists(9), layoutConfig)
  assert.deepEqual(after.items.slice(0, 8), before.items)
})

test("moves only influenced neighbors away from the active artist", () => {
  const layout = buildArtistLayout(artists(12), layoutConfig)
  const active = layout.items[0]
  const offsets = calculateHoverDisplacements(
    layout.items,
    active.artist.id,
    displacementConfig
  )
  assert.deepEqual(offsets.get(active.artist.id), { x: 0, y: 0 })

  const neighbor = layout.items[1]
  const push = offsets.get(neighbor.artist.id)
  assert.ok(
    push.x * (neighbor.x - active.x) + push.y * (neighbor.y - active.y) > 0
  )
  assert.deepEqual(offsets.get(layout.items.at(-1).artist.id), { x: 0, y: 0 })
})

test("clearing the active artist returns every offset to zero", () => {
  const layout = buildArtistLayout(artists(6), layoutConfig)
  const offsets = calculateHoverDisplacements(
    layout.items,
    null,
    displacementConfig
  )
  assert.ok([...offsets.values()].every(({ x, y }) => x === 0 && y === 0))
})

test("coincident centers never produce NaN", () => {
  const layout = buildArtistLayout(artists(2), layoutConfig).items
  layout[1] = { ...layout[1], x: layout[0].x, y: layout[0].y }
  const offset = calculateHoverDisplacements(
    layout,
    layout[0].artist.id,
    displacementConfig
  ).get(layout[1].artist.id)
  assert.ok(Number.isFinite(offset.x) && Number.isFinite(offset.y))
})
