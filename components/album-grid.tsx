import { AlbumCard } from "@/components/album-card"
import type { Album } from "@/types/album"

type AlbumGridProps = {
  albums: Album[]
}

export function AlbumGrid({ albums }: AlbumGridProps) {
  return (
    <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {albums.map((album, index) => (
        <AlbumCard key={album.id} album={album} priority={index < 6} />
      ))}
    </div>
  )
}
