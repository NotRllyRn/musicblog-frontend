"use client"

import { useMediaQuery } from "@astryxdesign/core"
import { Button } from "@astryxdesign/core/Button"
import { Text } from "@astryxdesign/core/Text"
import { VisuallyHidden } from "@astryxdesign/core/VisuallyHidden"
import { motion, useReducedMotion } from "motion/react"
import Image from "next/image"
import {
  type KeyboardEvent,
  type MouseEvent,
  useEffect,
  useRef,
  useState,
} from "react"

import { useAlbumCoverTilt } from "./album-cover-tilt"
import { AlbumDetailLayouts } from "./album-detail-layouts"
import type { AlbumDetail, AlbumPost } from "./types"

interface AlbumDetailOverlayProps {
  album: AlbumPost
  detailRequest: Promise<AlbumDetail>
  initialDetail: AlbumDetail | null
  onClose: () => void
}

export function AlbumDetailOverlay({
  album,
  detailRequest,
  initialDetail,
  onClose,
}: AlbumDetailOverlayProps) {
  const [detail, setDetail] = useState<AlbumDetail | null>(initialDetail)
  const [failed, setFailed] = useState(false)
  const overlay = useRef<HTMLElement>(null)
  const isCompact = useMediaQuery("(max-width: 47.99rem)")
  const reduceMotion = Boolean(useReducedMotion())
  const coverTilt = useAlbumCoverTilt(reduceMotion)

  useEffect(() => {
    let active = true
    void detailRequest
      .then((albumDetail) => {
        if (active && !overlay.current?.hasAttribute("data-closing"))
          setDetail(albumDetail)
      })
      .catch(() => {
        if (active) setFailed(true)
      })

    overlay.current?.focus()
    return () => {
      active = false
    }
  }, [detailRequest])

  const close = () => {
    overlay.current?.setAttribute("data-closing", "")
    onClose()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault()
      close()
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

  const closeFromEmptySpace = (event: MouseEvent<HTMLElement>) => {
    if (!(event.target as Element).closest("[data-detail-content]")) close()
  }

  const transition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.72, ease: [0.16, 1, 0.3, 1] as const }
  const sceneTransition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.72, ease: [0.4, 0, 0.2, 1] as const }

  return (
    <motion.section
      aria-busy={!detail && !failed}
      aria-label={`${album.title} details`}
      aria-modal="true"
      className="album-detail-overlay"
      exit={{ opacity: 1 }}
      initial={false}
      onClick={closeFromEmptySpace}
      onKeyDown={onKeyDown}
      ref={overlay}
      role="dialog"
      tabIndex={-1}
      transition={transition}
    >
      <motion.aside
        animate={{ opacity: 1 }}
        aria-hidden="true"
        className="album-detail-backdrop"
        exit={{ opacity: 0 }}
        initial={{ opacity: 0 }}
        transition={sceneTransition}
      />
      <VisuallyHidden>
        <Button label="Close album details" onClick={close}>
          Close album details
        </Button>
      </VisuallyHidden>
      <section
        className="album-detail-content"
        data-compact={isCompact || undefined}
      >
        <motion.section
          className="album-detail-cover-stage"
          layout
          transition={transition}
        >
          <motion.figure
            animate={{ opacity: 1 }}
            className="album-detail-cover"
            data-detail-content
            exit={{
              opacity: 0,
              transition: { duration: reduceMotion ? 0 : 0.48 },
            }}
            layout
            layoutCrossfade={false}
            layoutId={`album-cover-${album.id}`}
            transition={transition}
            {...coverTilt.handlers}
          >
            <motion.picture
              className="album-cover-tilt"
              style={coverTilt.style}
            >
              <Image
                alt={album.imageAlt}
                draggable={false}
                fill
                loading="eager"
                sizes="(max-width: 47.99rem) 82vw, 640px"
                src={album.imageUrl}
              />
            </motion.picture>
          </motion.figure>
        </motion.section>

        {detail ? (
          <motion.section
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            className="album-detail-information"
            exit={reduceMotion ? undefined : { opacity: 0, y: "1.5rem" }}
            initial={reduceMotion ? undefined : { opacity: 0, y: "1.5rem" }}
            transition={sceneTransition}
          >
            <AlbumDetailLayouts detail={detail} />
          </motion.section>
        ) : (
          <motion.article
            className="album-detail-placeholder"
            data-detail-content
            exit={reduceMotion ? undefined : { opacity: 0, y: "1.5rem" }}
          >
            <Text as="p" color="inherit">
              {failed
                ? "Album details could not load."
                : "Loading album notes…"}
            </Text>
          </motion.article>
        )}
      </section>
    </motion.section>
  )
}
