"use client"

import { Carousel } from "@astryxdesign/core/Carousel"
import { Heading } from "@astryxdesign/core/Heading"
import { Link } from "@astryxdesign/core/Link"
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList"
import { Text } from "@astryxdesign/core/Text"
import { VStack } from "@astryxdesign/core/VStack"

import { DetailPrototypeSwitcher } from "./detail-prototype-switcher"
import type { AlbumDetail } from "./types"

export type DetailVariant = "A" | "B" | "C" | "D" | "E"

interface DetailLayoutProps {
  detail: AlbumDetail
}

function formatDate(value: string | null) {
  if (!value) return null
  const date = new Date(`${value.slice(0, 10)}T00:00:00`)
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date)
}

function formatDuration(value: number | null) {
  if (value === null) return null
  const minutes = Math.round(value / 60_000)
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return hours ? `${hours} hr ${remainder} min` : `${minutes} min`
}

function DetailHeading({ detail }: DetailLayoutProps) {
  return (
    <header className="detail-heading">
      <Heading level={2} id="album-detail-title" color="inherit">
        {detail.title}
      </Heading>
      <Text type="large" color="inherit">
        {detail.artist}
      </Text>
      {detail.spotifyUrl && (
        <Link href={detail.spotifyUrl} isExternalLink>
          Listen on Spotify
        </Link>
      )}
    </header>
  )
}

function Score({ detail }: DetailLayoutProps) {
  return (
    <aside className="detail-score" aria-label="Album rating">
      <Text color="inherit" weight="bold">
        <strong>{detail.rating ?? "NA"}</strong>
        <small>/100</small>
      </Text>
    </aside>
  )
}

function GenreCloud({ detail }: DetailLayoutProps) {
  const genres = detail.genres.slice(0, 3)
  if (!genres.length) return null

  return (
    <ul className="detail-genre-cloud" aria-label="Genres">
      {genres.map((genre) => (
        <li key={genre}>
          <Text type="label" color="inherit">
            {genre}
          </Text>
        </li>
      ))}
    </ul>
  )
}

function Dates({ detail }: DetailLayoutProps) {
  const posted = formatDate(detail.postedAt)
  const released = formatDate(detail.releaseDate)
  const listened = formatDate(detail.listenedAt)

  return (
    <dl className="detail-dates">
      {released && (
        <VStack gap={0.5}>
          <dt>Released</dt>
          <dd>{released}</dd>
        </VStack>
      )}
      {listened && (
        <VStack gap={0.5}>
          <dt>Listened</dt>
          <dd>{listened}</dd>
        </VStack>
      )}
      {posted && (
        <VStack gap={0.5}>
          <dt>Posted</dt>
          <dd>{posted}</dd>
        </VStack>
      )}
    </dl>
  )
}

function Review({ detail }: DetailLayoutProps) {
  return (
    <section className="detail-review" aria-label="Review">
      {detail.contentHtml ? (
        <section
          className="detail-review-copy"
          // pi-lens-ignore: typescript.react.security.audit.react-dangerouslysetinnerhtml.react-dangerouslysetinnerhtml
          dangerouslySetInnerHTML={{ __html: detail.contentHtml }}
        />
      ) : detail.notes ? (
        <Text as="p" color="inherit">
          {detail.notes}
        </Text>
      ) : (
        <Text as="p" color="secondary">
          No written review.
        </Text>
      )}
    </section>
  )
}

function Highlights({ detail }: DetailLayoutProps) {
  const highlights = detail.tracks.filter((track) => track.highlight)
  if (!highlights.length) return null

  return (
    <section className="detail-highlights">
      <Text type="label" weight="semibold" color="inherit">
        Highlights
      </Text>
      <Carousel
        aria-label="Highlighted tracks"
        className="detail-highlight-carousel"
        gap={1}
        hasSnap
        padding={0.5}
      >
        {highlights.map((track) => (
          <article
            className="detail-highlight-track"
            key={track.spotifyId ?? track.title}
          >
            {track.spotifyId ? (
              <Link
                href={`https://open.spotify.com/track/${track.spotifyId}`}
                isExternalLink
                isStandalone
              >
                {track.title}
              </Link>
            ) : (
              <Text color="inherit">{track.title}</Text>
            )}
          </article>
        ))}
      </Carousel>
    </section>
  )
}

function hasFacts(detail: AlbumDetail) {
  return Boolean(
    detail.releaseTypes[0] ||
    detail.totalTracks !== null ||
    detail.durationMs !== null ||
    detail.averageTrackMs !== null ||
    detail.listenCount !== null ||
    detail.explicit ||
    detail.favorite ||
    detail.lastfmUrl
  )
}

function Facts({ detail }: DetailLayoutProps) {
  const duration = formatDuration(detail.durationMs)
  const average = formatDuration(detail.averageTrackMs)

  if (!hasFacts(detail)) return null

  return (
    <section className="detail-facts">
      <MetadataList columns="multi" label={{ position: "top" }}>
        {detail.releaseTypes[0] && (
          <MetadataListItem label="Release">
            {detail.releaseTypes[0]}
          </MetadataListItem>
        )}
        {detail.totalTracks !== null && (
          <MetadataListItem label="Tracks">
            {detail.totalTracks}
          </MetadataListItem>
        )}
        {duration && (
          <MetadataListItem label="Length">{duration}</MetadataListItem>
        )}
        {average && (
          <MetadataListItem label="Average track">{average}</MetadataListItem>
        )}
        {detail.listenCount !== null && (
          <MetadataListItem label="Listens">
            {detail.listenCount}
          </MetadataListItem>
        )}
        {detail.explicit && (
          <MetadataListItem label="Content">Explicit</MetadataListItem>
        )}
        {detail.favorite && (
          <MetadataListItem label="Favorite">Yes</MetadataListItem>
        )}
        {detail.lastfmUrl && (
          <MetadataListItem label="More">
            <Link href={detail.lastfmUrl} isExternalLink>
              Last.fm
            </Link>
          </MetadataListItem>
        )}
      </MetadataList>
    </section>
  )
}

function VariantA({ detail }: DetailLayoutProps) {
  return (
    <article
      className="album-detail-layout detail-layout-a"
      data-detail-content
    >
      <header className="detail-a-hero">
        <DetailHeading detail={detail} />
        <Score detail={detail} />
        <GenreCloud detail={detail} />
      </header>
      <Dates detail={detail} />
      <Highlights detail={detail} />
      <Review detail={detail} />
      <Facts detail={detail} />
    </article>
  )
}

function VariantB({ detail }: DetailLayoutProps) {
  return (
    <article
      className="album-detail-layout detail-layout-b"
      data-detail-content
    >
      <aside className="detail-b-rail">
        <Score detail={detail} />
        <Dates detail={detail} />
        <GenreCloud detail={detail} />
      </aside>
      <section className="detail-b-story">
        <DetailHeading detail={detail} />
        <Review detail={detail} />
        <Highlights detail={detail} />
      </section>
      <footer>
        <Facts detail={detail} />
      </footer>
    </article>
  )
}

function VariantC({ detail }: DetailLayoutProps) {
  return (
    <article
      className="album-detail-layout detail-layout-c"
      data-detail-content
    >
      <DetailHeading detail={detail} />
      <section className="detail-c-constellation">
        <Score detail={detail} />
        <GenreCloud detail={detail} />
        <Dates detail={detail} />
      </section>
      <Highlights detail={detail} />
      <Review detail={detail} />
      <Facts detail={detail} />
    </article>
  )
}

function VariantD({ detail }: DetailLayoutProps) {
  return (
    <article
      className="album-detail-layout detail-layout-d"
      data-detail-content
    >
      <header>
        <DetailHeading detail={detail} />
        <Score detail={detail} />
      </header>
      <section className="detail-d-columns">
        <Review detail={detail} />
        <aside>
          <Dates detail={detail} />
          <GenreCloud detail={detail} />
          <Facts detail={detail} />
        </aside>
      </section>
      <Highlights detail={detail} />
    </article>
  )
}

function VariantE({ detail }: DetailLayoutProps) {
  return (
    <article
      className="album-detail-layout detail-layout-e"
      data-detail-content
    >
      <header>
        <DetailHeading detail={detail} />
        <GenreCloud detail={detail} />
      </header>
      <ol className="detail-e-timeline">
        <li className="detail-e-verdict">
          <Score detail={detail} />
          <Dates detail={detail} />
        </li>
        <li>
          <Review detail={detail} />
        </li>
        {detail.tracks.some((track) => track.highlight) && (
          <li>
            <Highlights detail={detail} />
          </li>
        )}
        {hasFacts(detail) && (
          <li>
            <Facts detail={detail} />
          </li>
        )}
      </ol>
    </article>
  )
}

const variants: Record<
  DetailVariant,
  (props: DetailLayoutProps) => React.ReactNode
> = {
  A: VariantA,
  B: VariantB,
  C: VariantC,
  D: VariantD,
  E: VariantE,
}

export function AlbumDetailLayouts({ detail }: DetailLayoutProps) {
  return (
    <DetailPrototypeSwitcher>
      {(variant) => {
        const Layout = variants[variant]
        return <Layout detail={detail} />
      }}
    </DetailPrototypeSwitcher>
  )
}
