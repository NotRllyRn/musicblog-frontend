"use client"

import { Heading } from "@astryxdesign/core/Heading"
import { Text } from "@astryxdesign/core/Text"

import { RecordField } from "./record-field"
import { ThemeToggle } from "./theme-toggle"
import type { AlbumPost } from "./types"

interface CatalogBrowserProps {
  albums: AlbumPost[]
}

export function CatalogBrowser({ albums }: CatalogBrowserProps) {
  if (!albums.length) {
    return (
      <>
        <main className="catalog-empty">
          <Heading level={1}>The catalog could not load</Heading>
          <Text as="p" color="secondary">
            Check the WordPress connection, then refresh this page.
          </Text>
        </main>
        <ThemeToggle />
      </>
    )
  }

  return (
    <>
      <main className="variant-shell">
        <header className="catalog-header">
          <Heading level={1} color="inherit">
            After the Needle
          </Heading>
          <Text type="supporting" color="inherit">
            {albums.length} records · hinged by hand
          </Text>
        </header>
        <RecordField albums={albums} />
      </main>
      <ThemeToggle />
    </>
  )
}
