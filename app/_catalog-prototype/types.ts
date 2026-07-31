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

export interface AlbumPage {
  albums: AlbumPost[]
  page: number
  total: number
  totalPages: number
}
