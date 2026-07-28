import { Heading } from "@astryxdesign/core/Heading"
import { Text } from "@astryxdesign/core/Text"

import { AlbumLanes } from "./album-lanes"
import type { AlbumPost } from "./types"

interface VariantProps {
  albums: AlbumPost[]
}

export function VariantA({ albums }: VariantProps) {
  return (
    <main className="variant-shell variant-a">
      <header className="shop-header">
        <Heading level={1} color="inherit">
          After the Needle
        </Heading>
        <Text type="supporting" color="inherit">
          Five bins. {albums.length} records. Scroll a lane, then pull a sleeve.
        </Text>
      </header>
      <AlbumLanes albums={albums} variant="A" />
      <footer className="shop-footer">
        <Text type="code" color="inherit">
          New arrivals · Read the shelf from left to right
        </Text>
      </footer>
    </main>
  )
}

export function VariantB({ albums }: VariantProps) {
  return (
    <main className="variant-shell variant-b">
      <header className="player-header">
        <Text type="code" color="inherit">
          LIBRARY / ALBUMS
        </Text>
        <Heading level={1} color="inherit">
          Coverflow 817
        </Heading>
        <Text type="supporting" color="inherit">
          Scroll any channel
        </Text>
      </header>
      <section className="player-stage">
        <aside className="player-rail">
          <Text type="code" color="inherit">
            SELECT
          </Text>
          <Text type="display-3" color="inherit">
            ↓
          </Text>
        </aside>
        <AlbumLanes albums={albums} variant="B" />
      </section>
      <footer className="player-footer">
        <Text type="code" color="inherit">
          MENU
        </Text>
        <Text type="supporting" color="inherit">
          Album art is the interface
        </Text>
        <Text type="code" color="inherit">
          ENTER
        </Text>
      </footer>
    </main>
  )
}

export function VariantC({ albums }: VariantProps) {
  return (
    <main className="variant-shell variant-c">
      <aside className="archive-sidebar">
        <Text type="code" color="inherit">
          PERSONAL INDEX
        </Text>
        <Heading level={1} color="inherit">
          Recorded listening
        </Heading>
        <Text as="p" type="body" color="inherit">
          A visual register of albums heard, considered, and written about.
        </Text>
        <footer>
          <Text type="code" color="inherit" hasTabularNumbers>
            {albums.length} ENTRIES · 5 COLUMNS
          </Text>
        </footer>
      </aside>
      <section className="archive-catalog">
        <header className="archive-header">
          <Text type="code" color="inherit">
            TITLE / ARTIST / YEAR
          </Text>
          <Text type="code" color="inherit">
            SCROLL EACH COLUMN
          </Text>
        </header>
        <AlbumLanes albums={albums} variant="C" />
      </section>
    </main>
  )
}

export function VariantD({ albums }: VariantProps) {
  return (
    <main className="variant-shell variant-d">
      <header className="radio-header">
        <Heading level={1} color="inherit">
          Needle Drop Radio
        </Heading>
        <Text type="code" color="inherit">
          LIVE ARCHIVE · {albums.length} TRANSMISSIONS
        </Text>
      </header>
      <section className="radio-stage">
        <Text type="display-1" color="inherit">
          ON AIR
        </Text>
        <AlbumLanes albums={albums} variant="D" />
      </section>
      <footer className="radio-footer">
        <Text type="code" color="inherit">
          TUNE VERTICALLY
        </Text>
        <Text type="supporting" color="inherit">
          Five frequencies carrying one unruly record archive.
        </Text>
      </footer>
    </main>
  )
}

export function VariantE({ albums }: VariantProps) {
  return (
    <main className="variant-shell variant-e">
      <header className="gallery-header">
        <Heading level={1} color="inherit">
          Records worth living with
        </Heading>
        <Text as="p" type="body" color="inherit">
          Move slowly. Each column is a shelf; each cover opens a listening
          note.
        </Text>
      </header>
      <section className="gallery-stage">
        <aside className="gallery-marker" aria-hidden="true">
          <Text type="code" color="inherit">
            LISTEN / READ / RETURN
          </Text>
        </aside>
        <AlbumLanes albums={albums} variant="E" />
      </section>
      <footer className="gallery-footer">
        <Text type="supporting" color="inherit">
          An index of {albums.length} album notes
        </Text>
      </footer>
    </main>
  )
}
