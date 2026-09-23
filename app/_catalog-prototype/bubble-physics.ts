export type BubbleId = number | string

export interface BubbleProfile {
  id: BubbleId
}

export interface BubbleNode<Profile extends BubbleProfile = BubbleProfile> {
  profile: Profile
  radius: number
  renderRadius: number
  vx: number
  vy: number
  x: number
  y: number
}

export interface BubblePhysicsOptions {
  activeId: BubbleId | null
  damping?: number
  gap: number
  gravity?: number
  speed?: number
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

export function approachMotionSpeed(
  current: number,
  target: 0 | 1,
  elapsedSeconds: number
) {
  const rate = target > current ? 18 : 2.2
  const next =
    current +
    (target - current) *
      (1 - Math.exp(-rate * Math.min(elapsedSeconds, 1 / 10)))
  return target === 0 && next < 0.004 ? 0 : next
}

function numericId(id: BubbleId) {
  if (typeof id === "number") return id
  let hash = 0
  for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) | 0
  return Math.abs(hash)
}

export function createBubbleNodes<Profile extends BubbleProfile>(
  profiles: Profile[],
  radius: number | ((profile: Profile) => number),
  gap: number
) {
  const radii = profiles.map((profile) =>
    typeof radius === "number" ? radius : radius(profile)
  )
  const spacing = Math.sqrt(
    radii.reduce((total, value) => total + (value * 2 + gap) ** 2, 0) /
      Math.max(1, radii.length) /
      Math.PI
  )
  return [...profiles]
    .sort((left, right) =>
      typeof left.id === "number" && typeof right.id === "number"
        ? left.id - right.id
        : String(left.id).localeCompare(String(right.id))
    )
    .map((profile, index) => {
      const angle = index * GOLDEN_ANGLE
      const distance = spacing * Math.sqrt(index)
      const id = numericId(profile.id)
      const nodeRadius = typeof radius === "number" ? radius : radius(profile)
      const drift = 8 + (id % 7)
      return {
        profile,
        radius: nodeRadius,
        renderRadius: nodeRadius,
        vx: -Math.sin(angle) * drift,
        vy: Math.cos(angle) * drift,
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
      } satisfies BubbleNode<Profile>
    })
}

export function bubbleWorldRadius(nodes: BubbleNode[], padding: number) {
  return Math.max(
    padding,
    ...nodes.map((node) => Math.hypot(node.x, node.y) + node.radius + padding)
  )
}

export function findBubbleNode<Profile extends BubbleProfile>(
  nodes: BubbleNode<Profile>[],
  x: number,
  y: number,
  activeId: BubbleId | null,
  exitPadding = 16
) {
  const active = nodes.find(({ profile }) => profile.id === activeId)
  if (
    active &&
    Math.hypot(x - active.x, y - active.y) <= active.renderRadius + exitPadding
  )
    return active

  let nearest: BubbleNode<Profile> | null = null
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

export function stepBubblePhysics(
  nodes: BubbleNode[],
  elapsedSeconds: number,
  {
    activeId,
    damping = 2.8,
    gap,
    gravity = 0.035,
    speed = 1,
  }: BubblePhysicsOptions
) {
  const elapsed = Math.min(elapsedSeconds, 1 / 30)
  const physicsElapsed = elapsed * clamp(speed, 0, 1)
  const drag = Math.exp(-damping * physicsElapsed)
  let fastest = 0

  for (const node of nodes) {
    const active = node.profile.id === activeId
    const targetRadius = node.radius * (active ? 1.35 : 1)
    node.renderRadius +=
      (targetRadius - node.renderRadius) * (1 - Math.exp(-12 * elapsed))
    if (!physicsElapsed) continue
    if (active) {
      node.vx = 0
      node.vy = 0
      continue
    }
    node.vx = (node.vx - node.x * gravity * physicsElapsed) * drag
    node.vy = (node.vy - node.y * gravity * physicsElapsed) * drag
    node.x += node.vx * physicsElapsed
    node.y += node.vy * physicsElapsed
  }

  if (!physicsElapsed || !nodes.length) return fastest

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
              ((numericId(node.profile.id) + numericId(other.profile.id)) %
                360) *
              (Math.PI / 180)
            dx = Math.cos(angle)
            dy = Math.sin(angle)
            distance = 1
          }
          const overlap = separation - distance
          const unitX = dx / distance
          const unitY = dy / distance
          const nodeActive = node.profile.id === activeId
          const otherActive = other.profile.id === activeId
          const nodeShare = nodeActive ? 0 : otherActive ? 1 : 0.5
          const otherShare = otherActive ? 0 : nodeActive ? 1 : 0.5
          const correction = overlap * Math.min(1, physicsElapsed * 60)
          node.x -= unitX * correction * nodeShare
          node.y -= unitY * correction * nodeShare
          other.x += unitX * correction * otherShare
          other.y += unitY * correction * otherShare
        }
  }

  for (const node of nodes)
    fastest = Math.max(fastest, Math.hypot(node.vx, node.vy))
  return fastest
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))
