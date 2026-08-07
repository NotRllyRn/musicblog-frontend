"use client"

import { Badge } from "@astryxdesign/core/Badge"
import { Button } from "@astryxdesign/core/Button"
import { Icon } from "@astryxdesign/core/Icon"
import { TextInput } from "@astryxdesign/core/TextInput"
import { Text } from "@astryxdesign/core/Text"
import { VisuallyHidden } from "@astryxdesign/core/VisuallyHidden"
import type { Dispatch, KeyboardEvent, SetStateAction } from "react"
import { useState } from "react"

import { CatalogFilters } from "./catalog-filters"
import { normalizeAlbumSearchText } from "./search-filters"
import type { AlbumFilterFacets, AlbumSearchFilters } from "./types"

interface CatalogSearchProps {
  activeFilterCount: number
  error: boolean
  facets: AlbumFilterFacets | null
  facetsError: boolean
  filters: AlbumSearchFilters
  isDisabled: boolean
  isLoadingFacets: boolean
  isSearching: boolean
  onChange: (query: string) => void
  onClearFilters: () => void
  onFilterChange: Dispatch<SetStateAction<AlbumSearchFilters>>
  onInteract: () => void
  onLoadFacets: () => Promise<AlbumFilterFacets>
  query: string
  resultCount: number | null
}

export function CatalogSearch({
  activeFilterCount,
  error,
  facets,
  facetsError,
  filters,
  isDisabled,
  isLoadingFacets,
  isSearching,
  onChange,
  onClearFilters,
  onFilterChange,
  onInteract,
  onLoadFacets,
  query,
  resultCount,
}: CatalogSearchProps) {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const normalizedLength = normalizeAlbumSearchText(query).length
  const status = error
    ? "Search could not load. Change the search or filters to try again."
    : isSearching
      ? "Searching the album catalog"
      : resultCount === null
        ? query.trim() && normalizedLength < 2 && activeFilterCount === 0
          ? "Use at least two letters or numbers to search"
          : "Search and filter the album catalog"
        : `${resultCount} ${resultCount === 1 ? "record" : "records"} found`

  const closeFilters = () => {
    setIsFiltersOpen(false)
    requestAnimationFrame(() =>
      document.querySelector<HTMLElement>(".catalog-filter-button")?.focus()
    )
  }

  const toggleFilters = () => {
    const next = !isFiltersOpen
    setIsFiltersOpen(next)
    if (next) void onLoadFacets().catch(() => undefined)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Escape" || event.defaultPrevented) return
    if (isFiltersOpen) {
      event.preventDefault()
      closeFilters()
    } else if (query) {
      event.preventDefault()
      onChange("")
    }
  }

  const onKeyDownCapture = (event: KeyboardEvent<HTMLElement>) => {
    if (
      event.key !== "Escape" ||
      !isFiltersOpen ||
      document.querySelector("[popover]:popover-open")
    )
      return
    event.preventDefault()
    closeFilters()
  }

  return (
    <search
      className="catalog-search"
      data-filters-open={isFiltersOpen || undefined}
      inert={isDisabled ? true : undefined}
      onKeyDownCapture={onKeyDownCapture}
      onPointerDownCapture={onInteract}
    >
      <section className="catalog-search-controls">
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
                    "Search could not load. Change the search or filters to try again.",
                }
              : undefined
          }
          value={query}
        />
        <Button
          aria-controls="catalog-filter-panel"
          aria-expanded={isFiltersOpen}
          className="catalog-filter-button"
          isDisabled={isDisabled}
          label="Filters"
          onClick={toggleFilters}
          size="lg"
          icon={<Icon icon="funnel" size="sm" />}
          endContent={
            !isFiltersOpen && activeFilterCount > 0 ? (
              <Badge label={String(activeFilterCount)} />
            ) : undefined
          }
          variant={isFiltersOpen ? "primary" : "secondary"}
        />
      </section>
      <section
        id="catalog-filter-panel"
        aria-hidden={!isFiltersOpen}
        className="catalog-filter-panel"
        data-open={isFiltersOpen || undefined}
        inert={!isFiltersOpen ? true : undefined}
      >
        <section className="catalog-filter-panel-inner">
          <CatalogFilters
            facets={facets}
            filters={filters}
            hasError={facetsError}
            isLoading={isLoadingFacets}
            onChange={onFilterChange}
            onClear={onClearFilters}
            onClose={closeFilters}
            onRetry={() => void onLoadFacets().catch(() => undefined)}
          />
        </section>
      </section>
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
