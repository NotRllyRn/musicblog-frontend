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

export type VariantKey = "A" | "B" | "C" | "D" | "E"

export type FlipMechanic = "hinge" | "orbit" | "shuffle" | "push" | "accordion"
