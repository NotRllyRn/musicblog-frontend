import {
  countActiveAlbumFilters,
  createEmptyAlbumFilters,
  MAX_SEARCH_QUERY_LENGTH,
  MIN_SEARCH_QUERY_LENGTH,
  normalizeAlbumSearchText,
  normalizeSearchQuery,
} from "@/app/_catalog-prototype/search-filters"

import type {
  AlbumExplicitFilter,
  AlbumRatingOperator,
} from "@/app/_catalog-prototype/types"

const MAX_PAGE = 10_000
const MAX_SELECTED_VALUES = 50
const MAX_TOTAL_SELECTED_VALUES = 75
const MAX_TOTAL_SELECTED_LENGTH = 6_000
const MAX_VALUE_LENGTH = 120

function scalar(parameters: URLSearchParams, name: string) {
  const values = parameters.getAll(name)
  if (values.length > 1) throw new TypeError(`Duplicate ${name}`)
  return values[0] ?? null
}

function selected(parameters: URLSearchParams, name: string) {
  const values = parameters
    .getAll(name)
    .map(normalizeSearchQuery)
    .filter(Boolean)
  if (
    values.length > MAX_SELECTED_VALUES ||
    values.some(
      (value) =>
        value.length > MAX_VALUE_LENGTH || /[\u0000-\u001f\u007f]/u.test(value)
    )
  )
    throw new TypeError(`Invalid ${name}`)
  return [...new Set(values)]
}

function calendarDate(value: string | null) {
  if (value === null) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) throw new TypeError("Invalid date")
  const [, year, month, day] = match
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  if (date.toISOString().slice(0, 10) !== value)
    throw new TypeError("Invalid date")
  return value
}

export function parseAlbumSearchParameters(parameters: URLSearchParams) {
  const query = normalizeSearchQuery(scalar(parameters, "q") ?? "")
  const requestedPage = Number(scalar(parameters, "page") ?? 1)
  const searchableQuery = normalizeAlbumSearchText(query)
  if (
    (query.length > 0 && searchableQuery.length < MIN_SEARCH_QUERY_LENGTH) ||
    query.length > MAX_SEARCH_QUERY_LENGTH ||
    !Number.isSafeInteger(requestedPage) ||
    requestedPage < 1 ||
    requestedPage > MAX_PAGE
  )
    throw new TypeError("Invalid search")

  const filters = createEmptyAlbumFilters()
  filters.artists = selected(parameters, "artist")
  filters.genres = selected(parameters, "genre")
  filters.releaseTypes = selected(parameters, "releaseType")
  const selectedValues = [
    ...filters.artists,
    ...filters.genres,
    ...filters.releaseTypes,
  ]
  if (
    selectedValues.length > MAX_TOTAL_SELECTED_VALUES ||
    selectedValues.reduce((total, value) => total + value.length, 0) >
      MAX_TOTAL_SELECTED_LENGTH
  )
    throw new TypeError("Too many selected filters")

  const explicit = scalar(parameters, "explicit")
  if (explicit && !["clean", "explicit"].includes(explicit))
    throw new TypeError("Invalid explicit filter")
  filters.explicit = (explicit ?? "any") as AlbumExplicitFilter

  const unreleased = scalar(parameters, "unreleased")
  if (unreleased !== null && unreleased !== "1")
    throw new TypeError("Invalid unreleased filter")
  filters.unreleased = unreleased === "1"

  const rating = scalar(parameters, "rating")
  const ratingOperator = scalar(parameters, "ratingOperator")
  if (
    (rating === null) !== (ratingOperator === null) ||
    (ratingOperator !== null && !["eq", "gte", "lte"].includes(ratingOperator))
  )
    throw new TypeError("Invalid rating filter")
  if (rating !== null) {
    const value = Number(rating)
    if (!Number.isInteger(value) || value < 0 || value > 100)
      throw new TypeError("Invalid rating")
    filters.rating = value
    filters.ratingOperator = ratingOperator as AlbumRatingOperator
  }

  filters.releaseDate = {
    start: calendarDate(scalar(parameters, "releaseFrom")),
    end: calendarDate(scalar(parameters, "releaseTo")),
  }
  filters.listenedDate = {
    start: calendarDate(scalar(parameters, "listenedFrom")),
    end: calendarDate(scalar(parameters, "listenedTo")),
  }
  if (
    (filters.releaseDate.start &&
      filters.releaseDate.end &&
      filters.releaseDate.start > filters.releaseDate.end) ||
    (filters.listenedDate.start &&
      filters.listenedDate.end &&
      filters.listenedDate.start > filters.listenedDate.end) ||
    (!query && countActiveAlbumFilters(filters) === 0)
  )
    throw new TypeError("Invalid search")

  return { filters, page: requestedPage, query }
}
