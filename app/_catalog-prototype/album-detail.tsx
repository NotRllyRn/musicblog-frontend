"use client"

import { Heading } from "@astryxdesign/core/Heading"
import { Icon } from "@astryxdesign/core/Icon"
import { Link } from "@astryxdesign/core/Link"
import { Text } from "@astryxdesign/core/Text"
import { motion, useReducedMotion } from "motion/react"
import Image from "next/image"
import {
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react"

import { AlbumDetailLayouts } from "./album-detail-layouts"
import type { AlbumDetail, AlbumPost } from "./types"

interface AlbumDetailOverlayProps {
  album: AlbumPost
  onClose: () => void
}

function SpotifyMark(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="12" r="11" fill="currentColor" />
      <path
        d="M6.8 9.1c3.7-1 7.8-.7 11.1 1M7.5 12.2c3.1-.8 6.8-.5 9.7.9M8.2 15.1c2.7-.6 5.6-.4 8 .8"
        stroke="var(--catalog-paper)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function AlbumDetailOverlay({
  album,
  onClose,
}: AlbumDetailOverlayProps) {
  const [detail, setDetail] = useState<AlbumDetail | null>(null)
  const [failed, setFailed] = useState(false)
  const overlay = useRef<HTMLElement>(null)
  const reduceMotion = Boolean(useReducedMotion())

  useEffect(() => {
    const controller = new AbortController()

    void fetch(`/api/albums/${album.id}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Album detail could not load")
        return response.json() as Promise<AlbumDetail>
      })
      .then(setDetail)
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError"))
          setFailed(true)
      })

    overlay.current?.focus()
    return () => controller.abort()
  }, [album.id])

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault()
      onClose()
      return
    }

    if (event.key !== "Tab" || !overlay.current) return

    const focusable = Array.from(
      overlay.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    )

    if (!focusable.length) {
      event.preventDefault()
      overlay.current.focus()
      return
    }

    const first = focusable[0]
    const last = focusable.at(-1)
    if (
      event.shiftKey &&
      (document.activeElement === first ||
        document.activeElement === overlay.current)
    ) {
      event.preventDefault()
      last?.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const closeFromEmptySpace = (event: PointerEvent<HTMLElement>) => {
    if (!(event.target as Element).closest("[data-detail-content]")) onClose()
  }

  const transition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.72, ease: [0.16, 1, 0.3, 1] as const }

  return (
    <motion.section
      animate={{ opacity: 1 }}
      aria-busy={!detail && !failed}
      aria-labelledby="album-detail-title"
      aria-modal="true"
      className="album-detail-overlay"
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
      onKeyDown={onKeyDown}
      onPointerDown={closeFromEmptySpace}
      ref={overlay}
      role="dialog"
      tabIndex={-1}
      transition={transition}
    >
      <section className="album-detail-cover-stage">
        <motion.aside
          className="album-detail-label"
          data-detail-content
          layoutId={`album-label-${album.id}`}
          transition={transition}
        >
          <header>
            <Text type="large" weight="semibold" color="inherit">
              {album.title}
            </Text>
            <Text type="body" color="inherit">
              {album.artist}
            </Text>
          </header>
          {detail?.spotifyUrl && (
            <nav className="album-spotify-link" data-detail-content>
              <Link
                href={detail.spotifyUrl}
                isExternalLink
                label={`Listen to ${album.title} on Spotify`}
              >
                <Icon icon={SpotifyMark} size="lg" />
              </Link>
            </nav>
          )}
        </motion.aside>
        <motion.figure
          className="album-detail-cover"
          data-detail-content
          layoutId={`album-cover-${album.id}`}
          transition={transition}
        >
          <Image
            alt={album.imageAlt}
            fill
            priority
            sizes="46vw"
            src={album.imageUrl}
          />
        </motion.figure>
      </section>

      {detail ? (
        <AlbumDetailLayouts detail={detail} />
      ) : (
        <motion.article
          animate={reduceMotion ? undefined : { opacity: 1, x: 0 }}
          className="album-detail-placeholder"
          data-detail-content
          initial={reduceMotion ? undefined : { opacity: 0, x: "3rem" }}
          transition={{ delay: reduceMotion ? 0 : 0.18, duration: 0.45 }}
        >
          <Heading level={2} id="album-detail-title" color="inherit">
            {album.title}
          </Heading>
          <Text as="p" color="inherit">
            {failed ? "Album details could not load." : "Loading album notes…"}
          </Text>
        </motion.article>
      )}
    </motion.section>
  )
}
