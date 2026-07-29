"use client"

import { useState } from "react"
import { Heading } from "@astryxdesign/core/Heading"
import { Text } from "@astryxdesign/core/Text"

import { PrototypeSwitcher } from "./prototype-switcher"
import type { AlbumPost, VariantKey } from "./types"
import { VariantA, VariantB, VariantC, VariantD, VariantE } from "./variants"

// PROTOTYPE: Five record-flipping mechanics on `/?variant=`, to be reduced to one.
const variants = {
  A: VariantA,
  B: VariantB,
  C: VariantC,
  D: VariantD,
  E: VariantE,
}

interface CatalogPrototypeProps {
  albums: AlbumPost[]
  initialVariant: VariantKey
}

export function CatalogPrototype({
  albums,
  initialVariant,
}: CatalogPrototypeProps) {
  const [variant, setVariant] = useState(initialVariant)
  const ActiveVariant = variants[variant]

  if (!albums.length) {
    return (
      <>
        <main className="catalog-empty">
          <Heading level={1}>The catalog could not load</Heading>
          <Text as="p" color="secondary">
            Check the WordPress connection, then refresh this page.
          </Text>
        </main>
        <PrototypeSwitcher current={variant} onChange={setVariant} />
      </>
    )
  }

  return (
    <>
      <ActiveVariant albums={albums} />
      <PrototypeSwitcher current={variant} onChange={setVariant} />
    </>
  )
}
