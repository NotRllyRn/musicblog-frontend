import { Heading } from "@astryxdesign/core/Heading"
import { Text } from "@astryxdesign/core/Text"

import { RecordField } from "./record-field"
import type { AlbumPost } from "./types"

interface VariantProps {
  albums: AlbumPost[]
}

export function VariantA({ albums }: VariantProps) {
  return (
    <main className="variant-shell variant-a">
      <header className="catalog-header">
        <Heading level={1} color="inherit">
          After the Needle
        </Heading>
        <Text type="supporting" color="inherit">
          {albums.length} records · hinged by hand
        </Text>
      </header>
      <RecordField albums={albums} mechanic="hinge" />
    </main>
  )
}

export function VariantB({ albums }: VariantProps) {
  return (
    <main className="variant-shell variant-b">
      <header className="catalog-header">
        <Text type="code" color="inherit">
          PERSONAL LIBRARY
        </Text>
        <Heading level={1} color="inherit">
          Memory Flow
        </Heading>
        <Text type="supporting" color="inherit">
          {albums.length} album notes
        </Text>
      </header>
      <RecordField albums={albums} mechanic="orbit" />
    </main>
  )
}

export function VariantC({ albums }: VariantProps) {
  return (
    <main className="variant-shell variant-c">
      <header className="catalog-header">
        <Heading level={1} color="inherit">
          Listening index
        </Heading>
        <Text type="supporting" color="inherit">
          Records heard, considered, and written about · {albums.length}
        </Text>
      </header>
      <RecordField albums={albums} mechanic="shuffle" />
    </main>
  )
}

export function VariantD({ albums }: VariantProps) {
  return (
    <main className="variant-shell variant-d">
      <header className="catalog-header">
        <Heading level={1} color="inherit">
          Needle Drop
        </Heading>
        <Text type="code" color="inherit">
          UNSORTED BY NATURE · {albums.length}
        </Text>
      </header>
      <Text type="display-1" color="inherit" aria-hidden="true">
        PULL ONE
      </Text>
      <RecordField albums={albums} mechanic="push" />
    </main>
  )
}

export function VariantE({ albums }: VariantProps) {
  return (
    <main className="variant-shell variant-e">
      <header className="catalog-header">
        <Heading level={1} color="inherit">
          In rotation
        </Heading>
        <Text type="supporting" color="inherit">
          An unfolding archive of {albums.length} records
        </Text>
      </header>
      <RecordField albums={albums} mechanic="accordion" />
    </main>
  )
}
