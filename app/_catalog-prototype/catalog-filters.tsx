"use client"

import type { ISODateString } from "@astryxdesign/core/Calendar"
import { Button } from "@astryxdesign/core/Button"
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput"
import { DateInput } from "@astryxdesign/core/DateInput"
import { Grid } from "@astryxdesign/core/Grid"
import { HStack } from "@astryxdesign/core/HStack"
import { Icon } from "@astryxdesign/core/Icon"
import { IconButton } from "@astryxdesign/core/IconButton"
import { MultiSelector } from "@astryxdesign/core/MultiSelector"
import { NumberInput } from "@astryxdesign/core/NumberInput"
import { Section } from "@astryxdesign/core/Section"
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl"
import { Selector } from "@astryxdesign/core/Selector"
import { Spinner } from "@astryxdesign/core/Spinner"
import { Text } from "@astryxdesign/core/Text"
import { useMediaQuery } from "@astryxdesign/core/hooks"
import type { Dispatch, KeyboardEvent, SetStateAction } from "react"

import type {
  AlbumDateBounds,
  AlbumExplicitFilter,
  AlbumFilterFacets,
  AlbumRatingOperator,
  AlbumSearchFilters,
} from "./types"

interface CatalogFiltersProps {
  facets: AlbumFilterFacets | null
  filters: AlbumSearchFilters
  hasError: boolean
  isLoading: boolean
  onChange: Dispatch<SetStateAction<AlbumSearchFilters>>
  onClear: () => void
  onClose: () => void
  onRetry: () => void
}

function asIso(value: string | null) {
  return value ? (value as ISODateString) : undefined
}

function DateBoundsFilter({
  bounds,
  label,
  onChange,
  value,
}: {
  bounds: AlbumDateBounds
  label: string
  onChange: (value: AlbumDateBounds) => void
  value: AlbumDateBounds
}) {
  const isCompact = useMediaQuery("(max-width: 47.99rem)")
  if (!bounds.start || !bounds.end) return null

  if (!isCompact)
    return (
      <fieldset className="catalog-filter-date-group">
        <legend className="catalog-filter-legend">{label}</legend>
        <HStack gap={1}>
          <DateInput
            hasClear
            isLabelHidden
            label={`${label} from`}
            max={asIso(value.end ?? bounds.end)}
            min={bounds.start as ISODateString}
            onChange={(start) => onChange({ ...value, start: start ?? null })}
            placeholder="From"
            size="sm"
            value={asIso(value.start)}
          />
          <DateInput
            hasClear
            isLabelHidden
            label={`${label} to`}
            max={bounds.end as ISODateString}
            min={asIso(value.start ?? bounds.start)}
            onChange={(end) => onChange({ ...value, end: end ?? null })}
            placeholder="To"
            size="sm"
            value={asIso(value.end)}
          />
        </HStack>
      </fieldset>
    )

  const preventMobileDateTyping = (event: KeyboardEvent<HTMLInputElement>) => {
    if (
      event.key.length === 1 ||
      event.key === "Backspace" ||
      event.key === "Delete"
    )
      event.preventDefault()
  }

  return (
    <fieldset className="catalog-filter-date-group">
      <legend className="catalog-filter-legend">{label}</legend>
      <HStack align="center" gap={1}>
        <label className="catalog-filter-date-endpoint">
          From
          <input
            aria-label={`${label} from`}
            className="catalog-filter-date-input"
            inputMode="none"
            max={value.end ?? bounds.end}
            min={bounds.start}
            onChange={(event) =>
              onChange({ ...value, start: event.currentTarget.value || null })
            }
            onKeyDown={preventMobileDateTyping}
            type="date"
            value={value.start ?? ""}
          />
        </label>
        <label className="catalog-filter-date-endpoint">
          To
          <input
            aria-label={`${label} to`}
            className="catalog-filter-date-input"
            inputMode="none"
            max={bounds.end}
            min={value.start ?? bounds.start}
            onChange={(event) =>
              onChange({ ...value, end: event.currentTarget.value || null })
            }
            onKeyDown={preventMobileDateTyping}
            type="date"
            value={value.end ?? ""}
          />
        </label>
        {(value.start || value.end) && (
          <IconButton
            icon={<Icon icon="close" />}
            label={`Clear ${label.toLowerCase()}`}
            onClick={() => onChange({ start: null, end: null })}
            size="sm"
            tooltip={`Clear ${label.toLowerCase()}`}
            variant="ghost"
          />
        )}
      </HStack>
    </fieldset>
  )
}

export function CatalogFilters({
  facets,
  filters,
  hasError,
  isLoading,
  onChange,
  onClear,
  onClose,
  onRetry,
}: CatalogFiltersProps) {
  const update = (next: Partial<AlbumSearchFilters>) =>
    onChange((current) => ({ ...current, ...next }))

  if (isLoading && !facets)
    return (
      <Section padding={4} variant="transparent">
        <Spinner label="Preparing catalog filters" size="sm" />
      </Section>
    )

  if (hasError || !facets)
    return (
      <Section padding={4} variant="transparent">
        <HStack align="center" gap={2} justify="between">
          <Text color="secondary">Filters could not load.</Text>
          <Button label="Try again" onClick={onRetry} size="sm" />
        </HStack>
      </Section>
    )

  const ratingOperator = filters.ratingOperator ?? "gte"

  return (
    <Section padding={3} variant="transparent">
      <Grid columns={{ minWidth: 220, max: 4, repeat: "fit" }} gap={3}>
        <MultiSelector
          hasSearch
          label="Artists"
          onChange={(artists) => update({ artists })}
          options={facets.artists}
          placeholder="Any artist"
          searchPlaceholder="Find an artist…"
          size="sm"
          triggerDisplay="count"
          value={filters.artists}
        />
        <MultiSelector
          hasSearch
          label="Genres"
          onChange={(genres) => update({ genres })}
          options={facets.genres}
          placeholder="Any genre"
          searchPlaceholder="Find a genre…"
          size="sm"
          triggerDisplay="count"
          value={filters.genres}
        />
        <MultiSelector
          label="Release types"
          onChange={(releaseTypes) => update({ releaseTypes })}
          options={facets.releaseTypes}
          placeholder="Any type"
          size="sm"
          triggerDisplay="labels"
          value={filters.releaseTypes}
        />
        <fieldset className="catalog-filter-group">
          <legend className="catalog-filter-legend">Explicit content</legend>
          <SegmentedControl
            label="Explicit content"
            layout="fill"
            onChange={(explicit) =>
              update({ explicit: explicit as AlbumExplicitFilter })
            }
            size="sm"
            value={filters.explicit}
          >
            <SegmentedControlItem label="Any" value="any" />
            <SegmentedControlItem label="Explicit" value="explicit" />
            <SegmentedControlItem label="Clean" value="clean" />
          </SegmentedControl>
        </fieldset>
        <fieldset className="catalog-filter-rating-group">
          <legend className="catalog-filter-legend">Music rating</legend>
          <HStack gap={1}>
            <Selector
              isLabelHidden
              label="Rating comparison"
              onChange={(ratingOperator) =>
                update({
                  ratingOperator: ratingOperator as AlbumRatingOperator,
                })
              }
              options={[
                { label: "Equal to", value: "eq" },
                { label: "At least", value: "gte" },
                { label: "At most", value: "lte" },
              ]}
              size="sm"
              value={ratingOperator}
            />
            <NumberInput
              hasClear
              isDisabled={!facets.rating}
              isIntegerOnly
              isLabelHidden
              label="Rating value"
              max={facets.rating?.max ?? null}
              min={facets.rating?.min ?? null}
              onChange={(rating) =>
                update({
                  rating,
                  ratingOperator:
                    rating === null
                      ? filters.ratingOperator
                      : (filters.ratingOperator ?? "gte"),
                })
              }
              placeholder={
                facets.rating
                  ? `${facets.rating.min}–${facets.rating.max}`
                  : "No ratings"
              }
              size="sm"
              units="/100"
              value={filters.rating}
            />
          </HStack>
        </fieldset>
        <DateBoundsFilter
          bounds={facets.releaseDate}
          label="Release date"
          onChange={(releaseDate) => update({ releaseDate })}
          value={filters.releaseDate}
        />
        <DateBoundsFilter
          bounds={facets.listenedDate}
          label="Listened date"
          onChange={(listenedDate) => update({ listenedDate })}
          value={filters.listenedDate}
        />
        <fieldset className="catalog-filter-group catalog-filter-unreleased">
          <legend className="catalog-filter-legend">Availability</legend>
          <CheckboxInput
            description="Released after the listening date"
            isDisabled={facets.unreleasedCount === 0}
            label={`Unreleased when heard (${facets.unreleasedCount})`}
            onChange={(unreleased) => update({ unreleased })}
            size="sm"
            value={filters.unreleased}
          />
        </fieldset>
      </Grid>
      <HStack
        align="center"
        as="footer"
        gap={2}
        justify="between"
        paddingBlock={2}
        wrap="wrap"
      >
        <Text color="secondary" type="supporting">
          Multiple choices match any selected value; filter groups combine.
        </Text>
        <HStack gap={1}>
          <Button
            label="Clear filters"
            onClick={onClear}
            size="sm"
            variant="ghost"
          />
          <Button label="Close filters" onClick={onClose} size="sm" />
        </HStack>
      </HStack>
    </Section>
  )
}
