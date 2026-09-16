import type { ArtistProfile } from "./types"

export interface ArtistLayoutItem {
  artist: ArtistProfile
  x: number
  y: number
}

export interface ArtistLayout {
  height: number
  items: ArtistLayoutItem[]
  width: number
}

export interface ArtistLayoutConfig {
  columns: number
  diameter: number
  gap: number
  padding?: number
}

export interface ArtistDisplacement {
  x: number
  y: number
}

export interface ArtistDisplacementConfig {
  activeScale: number
  diameter: number
  gap: number
  influenceRadiusMultiplier: number
  softPush: number
}

export function calculateWorldBounds(
  items: ArtistLayoutItem[],
  diameter: number,
  padding: number
) {
  const radius = diameter / 2
  return {
    width: Math.max(
      diameter + padding * 2,
      ...items.map(({ x }) => x + radius + padding)
    ),
    height: Math.max(
      diameter + padding * 2,
      ...items.map(({ y }) => y + radius + padding)
    ),
  }
}

export function buildArtistLayout(
  artists: ArtistProfile[],
  { columns, diameter, gap, padding = diameter }: ArtistLayoutConfig
): ArtistLayout {
  const spacing = diameter + gap
  const verticalSpacing = (Math.sqrt(3) / 2) * spacing
  const items = [...artists]
    .sort((left, right) => left.id - right.id)
    .map((artist, index) => {
      const row = Math.floor(index / columns)
      const column = index % columns
      return {
        artist,
        x:
          padding + diameter / 2 + column * spacing + (row % 2) * (spacing / 2),
        y: padding + diameter / 2 + row * verticalSpacing,
      }
    })

  return { items, ...calculateWorldBounds(items, diameter, padding) }
}

export function calculateHoverDisplacements(
  layout: ArtistLayoutItem[],
  activeId: number | null,
  {
    activeScale,
    diameter,
    gap,
    influenceRadiusMultiplier,
    softPush,
  }: ArtistDisplacementConfig
) {
  const offsets = new Map<number, ArtistDisplacement>()
  const active = layout.find(({ artist }) => artist.id === activeId)
  if (!active) {
    for (const { artist } of layout) offsets.set(artist.id, { x: 0, y: 0 })
    return offsets
  }

  const minimumSeparation = (diameter * (activeScale + 1)) / 2 + gap
  const influenceRadius = diameter * influenceRadiusMultiplier
  for (const item of layout) {
    if (item.artist.id === activeId) {
      offsets.set(item.artist.id, { x: 0, y: 0 })
      continue
    }

    const dx = item.x - active.x
    const dy = item.y - active.y
    const distance = Math.hypot(dx, dy)
    if (distance >= influenceRadius) {
      offsets.set(item.artist.id, { x: 0, y: 0 })
      continue
    }

    const angle = ((item.artist.id % 360) * Math.PI) / 180
    const unitX = distance ? dx / distance : Math.cos(angle)
    const unitY = distance ? dy / distance : Math.sin(angle)
    const collisionPush = Math.max(0, minimumSeparation - distance)
    const influence = (influenceRadius - distance) / influenceRadius
    const magnitude = collisionPush + influence * softPush
    offsets.set(item.artist.id, {
      x: unitX * magnitude,
      y: unitY * magnitude,
    })
  }
  return offsets
}
