export type Album = {
  id: string
  slug: string
  title: string
  artist: string
  coverUrl: string
  rating?: number
  listenDate?: string
  excerpt: string
  content: string
  tags: string[]
}
