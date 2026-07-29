import { RecordDeck } from "./record-deck"
import type { AlbumPost, FlipMechanic } from "./types"

interface RecordFieldProps {
  albums: AlbumPost[]
  mechanic: FlipMechanic
}

export function RecordField({ albums, mechanic }: RecordFieldProps) {
  const stacks = Array.from({ length: 7 }, () => [] as AlbumPost[])
  albums.forEach((album, index) => stacks[index % stacks.length].push(album))

  return (
    <section className="record-field" aria-label="Scrollable album catalog">
      {stacks.map((records, index) => (
        <RecordDeck
          albums={records}
          index={index}
          key={`${mechanic}-${index}`}
          mechanic={mechanic}
        />
      ))}
    </section>
  )
}
