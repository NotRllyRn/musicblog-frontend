export interface AlbumPost {
  id: number
  title: string
  artist: string
  genre: string
  year: string
  href: string
  imageUrl: string
  imageAlt: string
}

export interface AlbumTrack {
  title: string
  highlight: boolean
  discNumber: number
  trackNumber: number
  durationMs: number | null
  explicit: boolean
  spotifyId: string | null
}

export interface AlbumDetail extends AlbumPost {
  contentHtml: string
  releaseDate: string | null
  listenedAt: string | null
  rating: number | null
  favorite: boolean
  genres: string[]
  releaseTypes: string[]
  notes: string | null
  tracks: AlbumTrack[]
  durationMs: number | null
  averageTrackMs: number | null
  explicit: boolean
  totalTracks: number | null
  listenCount: number | null
  spotifyUrl: string | null
  lastfmUrl: string | null
}

export interface AlbumPage {
  albums: AlbumPost[]
  page: number
  total: number
  totalPages: number
}

export type DeckCount = 3 | 5 | 7
