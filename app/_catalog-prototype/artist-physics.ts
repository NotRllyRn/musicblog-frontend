import type { ArtistProfile } from "./types"

export interface ArtistNode {
  artist: ArtistProfile
  radius: number
  renderRadius: number
  vx: number
  vy: number
  x: number
  y: number
}

export interface ArtistPhysicsOptions {
  activeId: number | null
  damping?: number
  gap: number
  gravity?: number
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

export function createArtistNodes(
  artists: ArtistProfile[],
  radius: number,
  gap: number
) {
  const spacing = (radius * 2 + gap) / Math.sqrt(Math.PI)
  return [...artists]
    .sort((left, right) => left.id - right.id)
    .map((artist, index) => {
      const angle = index * GOLDEN_ANGLE
      const distance = spacing * Math.sqrt(index)
      const drift = 8 + (artist.id % 7)
      return {
        artist,
        radius,
        renderRadius: radius,
        vx: -Math.sin(angle) * drift,
        vy: Math.cos(angle) * drift,
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
      } satisfies ArtistNode
    })
}

export function artistWorldRadius(nodes: ArtistNode[], padding: number) {
  return Math.max(
    padding,
    ...nodes.map((node) => Math.hypot(node.x, node.y) + node.radius + padding)
  )
}

export function findArtistNode(
  nodes: ArtistNode[],
  x: number,
  y: number,
  activeId: number | null,
  exitPadding = 16
) {
  const active = nodes.find(({ artist }) => artist.id === activeId)
  if (
    active &&
    Math.hypot(x - active.x, y - active.y) <= active.renderRadius + exitPadding
  )
    return active

  let nearest: ArtistNode | null = null
  let nearestDistance = Number.POSITIVE_INFINITY
  for (const node of nodes) {
    const distance = Math.hypot(x - node.x, y - node.y)
    if (distance <= node.renderRadius && distance < nearestDistance) {
      nearest = node
      nearestDistance = distance
    }
  }
  return nearest
}

export function stepArtistPhysics(
  nodes: ArtistNode[],
  elapsedSeconds: number,
  { activeId, damping = 2.8, gap, gravity = 0.035 }: ArtistPhysicsOptions
) {
  const elapsed = Math.min(elapsedSeconds, 1 / 30)
  const drag = Math.exp(-damping * elapsed)
  let fastest = 0

  for (const node of nodes) {
    const active = node.artist.id === activeId
    const targetRadius = node.radius * (active ? 1.35 : 1)
    node.renderRadius +=
      (targetRadius - node.renderRadius) * (1 - Math.exp(-12 * elapsed))
    if (active) {
      node.vx = 0
      node.vy = 0
      continue
    }
    node.vx = (node.vx - node.x * gravity * elapsed) * drag
    node.vy = (node.vy - node.y * gravity * elapsed) * drag
    node.x += node.vx * elapsed
    node.y += node.vy * elapsed
  }

  const cellSize =
    Math.max(...nodes.map(({ renderRadius }) => renderRadius)) * 2 + gap
  const cells = new Map<string, number[]>()
  for (const [index, node] of nodes.entries()) {
    const key = `${Math.floor(node.x / cellSize)}:${Math.floor(node.y / cellSize)}`
    const cell = cells.get(key)
    if (cell) cell.push(index)
    else cells.set(key, [index])
  }

  for (const [index, node] of nodes.entries()) {
    const cellX = Math.floor(node.x / cellSize)
    const cellY = Math.floor(node.y / cellSize)
    for (let offsetX = -1; offsetX <= 1; offsetX += 1)
      for (let offsetY = -1; offsetY <= 1; offsetY += 1)
        for (const otherIndex of cells.get(
          `${cellX + offsetX}:${cellY + offsetY}`
        ) ?? []) {
          if (otherIndex <= index) continue
          const other = nodes[otherIndex]
          let dx = other.x - node.x
          let dy = other.y - node.y
          let distance = Math.hypot(dx, dy)
          const separation = node.renderRadius + other.renderRadius + gap
          if (distance >= separation) continue
          if (!distance) {
            const angle =
              ((node.artist.id + other.artist.id) % 360) * (Math.PI / 180)
            dx = Math.cos(angle)
            dy = Math.sin(angle)
            distance = 1
          }
          const overlap = separation - distance
          const unitX = dx / distance
          const unitY = dy / distance
          const nodeActive = node.artist.id === activeId
          const otherActive = other.artist.id === activeId
          const nodeShare = nodeActive ? 0 : otherActive ? 1 : 0.5
          const otherShare = otherActive ? 0 : nodeActive ? 1 : 0.5
          node.x -= unitX * overlap * nodeShare
          node.y -= unitY * overlap * nodeShare
          other.x += unitX * overlap * otherShare
          other.y += unitY * overlap * otherShare
        }
  }

  for (const node of nodes)
    fastest = Math.max(fastest, Math.hypot(node.vx, node.vy))
  return fastest
}
