"use client"

import { use } from "react"

import { AlbumPostTemplate } from "@/components/album-post-template"

export default function AlbumPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = use(params)

  return <AlbumPostTemplate slug={slug} />
}
