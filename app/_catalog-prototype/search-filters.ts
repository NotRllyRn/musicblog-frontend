import type { AlbumSearchFilters } from "./types"

export const MIN_SEARCH_QUERY_LENGTH = 2
export const MAX_SEARCH_QUERY_LENGTH = 80

export function createEmptyAlbumFilters(): AlbumSearchFilters {
  return {
    artists: [],
    explicit: "any",
    genres: [],
    listenedDate: { start: null, end: null },
    rating: null,
    ratingOperator: null,
    releaseDate: { start: null, end: null },
    releaseTypes: [],
    unreleased: false,
  }
}

export function countActiveAlbumFilters(filters: AlbumSearchFilters) {
  return (
    filters.artists.length +
    filters.genres.length +
    filters.releaseTypes.length +
    Number(filters.explicit !== "any") +
    Number(filters.unreleased) +
    Number(filters.rating !== null && filters.ratingOperator !== null) +
    Number(Boolean(filters.releaseDate.start || filters.releaseDate.end)) +
    Number(Boolean(filters.listenedDate.start || filters.listenedDate.end))
  )
}

export function normalizeSearchQuery(value: string) {
  return value.normalize("NFKC").replace(/\s+/gu, " ").trim()
}

export function normalizeAlbumSearchText(value: string) {
  return normalizeSearchQuery(value)
    .normalize("NFKD")
    .replace(/\p{Mark}/gu, "")
    .replace(/\$/gu, "s")
    .replace(/&/gu, " and ")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
}

function effectiveSearchQuery(value: string) {
  const query = normalizeSearchQuery(value)
  return normalizeAlbumSearchText(query).length >= MIN_SEARCH_QUERY_LENGTH
    ? query
    : ""
}

function appendMany(
  parameters: URLSearchParams,
  name: string,
  values: string[]
) {
  for (const value of [...values].sort((left, right) =>
    left.localeCompare(right)
  ))
    parameters.append(name, value)
}

function albumSearchParameters(
  query: string,
  filters: AlbumSearchFilters,
  page = 1
) {
  const parameters = new URLSearchParams()
  const keyword = effectiveSearchQuery(query)
  if (keyword) parameters.set("q", keyword)
  if (page > 1) parameters.set("page", String(page))

  appendMany(parameters, "artist", filters.artists)
  appendMany(parameters, "genre", filters.genres)
  appendMany(parameters, "releaseType", filters.releaseTypes)
  if (filters.unreleased) parameters.set("unreleased", "1")
  if (filters.explicit !== "any") parameters.set("explicit", filters.explicit)
  if (filters.rating !== null && filters.ratingOperator) {
    parameters.set("rating", String(filters.rating))
    parameters.set("ratingOperator", filters.ratingOperator)
  }
  if (filters.releaseDate.start)
    parameters.set("releaseFrom", filters.releaseDate.start)
  if (filters.releaseDate.end)
    parameters.set("releaseTo", filters.releaseDate.end)
  if (filters.listenedDate.start)
    parameters.set("listenedFrom", filters.listenedDate.start)
  if (filters.listenedDate.end)
    parameters.set("listenedTo", filters.listenedDate.end)

  return parameters
}

export function albumSearchCriteriaKey(
  query: string,
  filters: AlbumSearchFilters
) {
  return albumSearchParameters(query, filters).toString()
}
