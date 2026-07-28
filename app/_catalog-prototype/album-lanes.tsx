import type { AlbumPost, VariantKey } from "./types"
import { RecordLane } from "./record-lane"

interface AlbumLanesProps {
  albums: AlbumPost[]
  variant: VariantKey
}

export function AlbumLanes({ albums, variant }: AlbumLanesProps) {
  const lanes = Array.from({ length: 5 }, () => [] as AlbumPost[])
  albums.forEach((album, index) => lanes[index % lanes.length].push(album))

  return (
    <section className="album-lanes" aria-label="Five record bins">
      {lanes.map((lane, index) => (
        <RecordLane
          albums={lane}
          index={index}
          key={`${variant}-${index}`}
          variant={variant}
        />
      ))}
    </section>
  )
}
