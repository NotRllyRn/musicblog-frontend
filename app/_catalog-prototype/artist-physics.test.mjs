import assert from "node:assert/strict"
import test from "node:test"

import {
  approachMotionSpeed,
  createArtistNodes,
  findArtistNode,
  stepArtistPhysics,
} from "./artist-physics.ts"

const artists = (count) =>
  Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    slug: `artist-${index + 1}`,
    name: `Artist ${index + 1}`,
    imageUrl: null,
    imageAlt: "",
  }))

test("creates a deterministic free-floating field", () => {
  assert.deepEqual(
    createArtistNodes(artists(20), 40, 8),
    createArtistNodes(artists(20).reverse(), 40, 8)
  )
})

test("gravity draws an isolated node toward the center", () => {
  const [node] = createArtistNodes(artists(2), 1, 0).slice(1)
  node.x = 100
  node.y = 0
  node.vx = 0
  node.vy = 0
  const before = node.x
  for (let index = 0; index < 30; index += 1)
    stepArtistPhysics([node], 1 / 60, { activeId: null, gap: 0 })
  assert.ok(node.x < before)
})

test("an active node stays pinned while it grows", () => {
  const [node] = createArtistNodes(artists(1), 40, 8)
  stepArtistPhysics([node], 1 / 30, { activeId: node.artist.id, gap: 8 })
  assert.equal(node.x, 0)
  assert.equal(node.y, 0)
  assert.ok(node.renderRadius > node.radius)
})

test("collision resolution separates overlapping nodes", () => {
  const nodes = createArtistNodes(artists(2), 40, 8)
  nodes[1].x = 1
  nodes[1].y = 0
  stepArtistPhysics(nodes, 1 / 60, { activeId: null, gap: 8, gravity: 0 })
  assert.ok(
    Math.hypot(nodes[1].x - nodes[0].x, nodes[1].y - nodes[0].y) >= 87.9
  )
})

test("hit testing keeps the active node through a padded exit boundary", () => {
  const nodes = createArtistNodes(artists(2), 40, 8)
  const active = nodes[0]
  assert.equal(findArtistNode(nodes, 50, 0, active.artist.id), active)
  assert.equal(findArtistNode(nodes, 60, 0, active.artist.id), null)
})

test("motion ramps up quickly and eases smoothly into sleep", () => {
  const elapsed = 1 / 60
  const rampedUp = approachMotionSpeed(0, 1, elapsed)
  const slowedDown = approachMotionSpeed(1, 0, elapsed)
  assert.ok(rampedUp > 1 - slowedDown)

  let speed = 1
  for (let index = 0; index < 300; index += 1)
    speed = approachMotionSpeed(speed, 0, elapsed)
  assert.equal(speed, 0)
})

test("zero simulation speed still animates active radius without moving", () => {
  const [node] = createArtistNodes(artists(1), 40, 8)
  const before = { x: node.x, y: node.y }
  stepArtistPhysics([node], 1 / 60, {
    activeId: node.artist.id,
    gap: 8,
    speed: 0,
  })
  assert.deepEqual({ x: node.x, y: node.y }, before)
  assert.ok(node.renderRadius > node.radius)
})
