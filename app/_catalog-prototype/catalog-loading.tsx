import { Heading } from "@astryxdesign/core/Heading"
import { Spinner } from "@astryxdesign/core/Spinner"
import { Text } from "@astryxdesign/core/Text"

import { ThemeToggle } from "./theme-toggle"

const decks = Array.from({ length: 7 }, (_, index) => index)
const sleeves = Array.from({ length: 9 }, (_, index) => index)

export function CatalogLoading() {
  return (
    <>
      <main className="variant-shell loading-shell" aria-busy="true">
        <header className="catalog-header">
          <Heading level={1} color="inherit">
            After the Needle
          </Heading>
          <Text type="supporting" color="inherit">
            Loading records
          </Text>
        </header>
        <section className="record-field loading-field" aria-hidden="true">
          {decks.map((deck) => (
            <ol className="loading-deck" key={deck}>
              {sleeves.map((sleeve) => (
                <li className="loading-sleeve" key={sleeve} />
              ))}
            </ol>
          ))}
        </section>
        <aside className="catalog-loader">
          <Spinner size="md" shade="inherit" aria-label="Loading albums" />
        </aside>
      </main>
      <ThemeToggle />
    </>
  )
}
