"use client"

import { TextInput } from "@astryxdesign/core/TextInput"
import { Text } from "@astryxdesign/core/Text"
import { VisuallyHidden } from "@astryxdesign/core/VisuallyHidden"
import type { KeyboardEvent } from "react"

interface CatalogSearchProps {
  error: boolean
  isDisabled: boolean
  isSearching: boolean
  onChange: (query: string) => void
  query: string
  resultCount: number | null
}

export function CatalogSearch({
  error,
  isDisabled,
  isSearching,
  onChange,
  query,
  resultCount,
}: CatalogSearchProps) {
  const normalizedLength = query.trim().length
  const status = error
    ? "Search could not load. Change the query to try again."
    : isSearching
      ? `Searching for ${query.trim()}`
      : resultCount === null
        ? normalizedLength === 1
          ? "Type one more character to search"
          : "Search the album catalog"
        : `${resultCount} ${resultCount === 1 ? "record" : "records"} found`

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape" && query) {
      event.preventDefault()
      onChange("")
    }
  }

  return (
    <search className="catalog-search" inert={isDisabled ? true : undefined}>
      <TextInput
        className="catalog-search-input"
        hasClear
        isDisabled={isDisabled}
        isLabelHidden
        isLoading={isSearching}
        label="Search album reviews"
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder="Search albums…"
        size="lg"
        startIcon="search"
        status={
          error
            ? {
                type: "error",
                message:
                  "Search could not load. Change the query to try again.",
              }
            : undefined
        }
        value={query}
      />
      <VisuallyHidden as="div" aria-live="polite">
        {error ? null : status}
      </VisuallyHidden>
      {resultCount !== null && !isSearching && (
        <Text
          as="p"
          color="secondary"
          display="block"
          justify="center"
          type="supporting"
        >
          {status}
        </Text>
      )}
    </search>
  )
}
