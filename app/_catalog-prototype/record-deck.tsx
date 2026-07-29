"use client"

import { Text } from "@astryxdesign/core"
import {
  motion,
  type MotionValue,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react"
import Image from "next/image"
import {
  type KeyboardEvent,
  type PointerEvent,
  type WheelEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"

import { getRecordVisual, mechanicSettings } from "./mechanics"
import type { AlbumPost, FlipMechanic } from "./types"

interface RecordDeckProps {
  albums: AlbumPost[]
  index: number
  mechanic: FlipMechanic
}

interface AnimatedRecordProps {
  album: AlbumPost
  albumIndex: number
  isActive: boolean
  isHovered: boolean
  isPreviewed: boolean
  mechanic: FlipMechanic
  position: MotionValue<number>
  reduceMotion: boolean
}

function AnimatedRecord({
  album,
  albumIndex,
  isActive,
  isHovered,
  isPreviewed,
  mechanic,
  position,
  reduceMotion,
}: AnimatedRecordProps) {
  const pullTarget = useMotionValue(0)
  const pullSpring = useSpring(pullTarget, {
    damping: 28,
    mass: 0.32,
    stiffness: 280,
  })
  const pull = reduceMotion ? pullTarget : pullSpring

  useEffect(() => {
    pullTarget.set(isHovered && !isActive ? 1 : 0)
  }, [isActive, isHovered, pullTarget])

  const transform = useTransform(
    () =>
      getRecordVisual(
        mechanic,
        albumIndex - position.get(),
        albumIndex,
        reduceMotion,
        pull.get()
      ).transform
  )
  const opacity = useTransform(
    () =>
      getRecordVisual(
        mechanic,
        albumIndex - position.get(),
        albumIndex,
        reduceMotion,
        pull.get()
      ).opacity
  )
  const dynamicStyle = { opacity, transform }

  return (
    <motion.li
      className="deck-record"
      data-active={isActive || undefined}
      data-album-index={albumIndex}
      data-hovered={isHovered || undefined}
      data-preview={isPreviewed || undefined}
      onClick={() => window.location.assign(album.href)}
      style={dynamicStyle}
    >
      <figure className="record-figure">
        <Image
          className="record-art"
          src={album.imageUrl}
          alt=""
          fill
          loading={isActive ? "eager" : "lazy"}
          sizes="(min-width: 64rem) 15vw, 14rem"
          unoptimized
        />
      </figure>
    </motion.li>
  )
}

export function RecordDeck({ albums, index, mechanic }: RecordDeckProps) {
  const settings = mechanicSettings[mechanic]
  const radius = Math.floor(settings.window / 2)
  const initialIndex = Math.min(albums.length - 1, radius + 2 + (index % 3))
  const [activeIndex, setActiveIndex] = useState(initialIndex)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const activeRef = useRef(initialIndex)
  const deck = useRef<HTMLElement>(null)
  const initialized = useRef(false)
  const pointer = useRef({ x: 0, y: 0 })
  const scroll = useRef<HTMLOListElement>(null)
  const scrolling = useRef(false)
  const settleTimer = useRef<ReturnType<typeof setTimeout>>(null)
  const reduceMotion = Boolean(useReducedMotion())
  const { scrollY } = useScroll({ container: scroll })
  const rawPosition = useTransform(scrollY, (value) => value / settings.step)
  const smoothPosition = useSpring(rawPosition, {
    damping: 34,
    mass: 0.42,
    stiffness: 300,
  })
  const position = reduceMotion ? rawPosition : smoothPosition
  const activeAlbum = albums[activeIndex]
  const previewIndex = hoveredIndex ?? activeIndex
  const previewAlbum = albums[previewIndex]

  const setScroll = useCallback(
    (node: HTMLOListElement | null) => {
      scroll.current = node
      if (node && !initialized.current) {
        node.scrollTop = initialIndex * settings.step
        initialized.current = true
      }
    },
    [initialIndex, settings.step]
  )

  useEffect(
    () => () => {
      if (settleTimer.current) clearTimeout(settleTimer.current)
    },
    []
  )

  useMotionValueEvent(position, "change", (value) => {
    const next = Math.max(0, Math.min(albums.length - 1, Math.round(value)))
    if (next === activeRef.current) return
    activeRef.current = next
    setActiveIndex(next)
  })

  const albumIndexAt = (target: EventTarget | null) => {
    const record =
      target instanceof Element
        ? target.closest<HTMLElement>("[data-album-index]")
        : null
    if (record?.closest(".record-deck") !== deck.current) return null
    const next = Number(record.dataset.albumIndex)
    return Number.isFinite(next) ? next : null
  }

  const retargetPointer = () => {
    scrolling.current = false
    setHoveredIndex(
      albumIndexAt(document.elementFromPoint(pointer.current.x, pointer.current.y))
    )
  }

  const moveTo = (nextIndex: number) => {
    const next = Math.max(0, Math.min(albums.length - 1, nextIndex))
    setHoveredIndex(null)
    scroll.current?.scrollTo({
      top: next * settings.step,
      behavior: reduceMotion ? "auto" : "smooth",
    })
  }

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const moves: Partial<Record<string, number>> = {
      ArrowDown: activeIndex + 1,
      ArrowUp: activeIndex - 1,
      End: albums.length - 1,
      Home: 0,
    }

    if (event.key in moves) {
      event.preventDefault()
      moveTo(moves[event.key] ?? activeIndex)
    }

    if (event.key === "Enter" && activeAlbum) {
      window.location.assign(activeAlbum.href)
    }
  }

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    pointer.current = { x: event.clientX, y: event.clientY }
    if (!scrolling.current) setHoveredIndex(albumIndexAt(event.target))
  }

  const onWheel = (event: WheelEvent<HTMLElement>) => {
    event.preventDefault()
    pointer.current = { x: event.clientX, y: event.clientY }
    scrolling.current = true
    setHoveredIndex(null)
    if (scroll.current) {
      const multiplier = event.deltaMode === 1 ? 16 : 1
      scroll.current.scrollTop += event.deltaY * multiplier
    }
    if (settleTimer.current) clearTimeout(settleTimer.current)
    settleTimer.current = setTimeout(retargetPointer, 180)
  }

  const start = Math.max(
    0,
    Math.min(albums.length - settings.window, activeIndex - radius)
  )
  const visible = albums
    .slice(start, start + settings.window)
    .map((album, offset) => ({ album, albumIndex: start + offset }))
    .sort(
      (first, second) =>
        Math.abs(second.albumIndex - activeIndex) -
        Math.abs(first.albumIndex - activeIndex)
    )

  return (
    <section
      className={`record-deck mechanic-${mechanic} deck-${index + 1}`}
      aria-keyshortcuts="ArrowUp ArrowDown Home End Enter"
      aria-label={`Browse albums vertically. Selected: ${activeAlbum?.title ?? "album"}.`}
      onBlur={() => setShowPreview(false)}
      onFocus={() => setShowPreview(true)}
      onKeyDown={onKeyDown}
      onPointerEnter={() => setShowPreview(true)}
      onPointerLeave={() => {
        setHoveredIndex(null)
        setShowPreview(false)
      }}
      onPointerMove={onPointerMove}
      onWheel={onWheel}
      ref={deck}
      role="link"
      tabIndex={0}
    >
      <ol className="record-stage" aria-hidden="true">
        {visible.map(({ album, albumIndex }) => (
          <AnimatedRecord
            album={album}
            albumIndex={albumIndex}
            isActive={albumIndex === activeIndex}
            isHovered={albumIndex === hoveredIndex}
            isPreviewed={albumIndex === previewIndex && showPreview}
            key={album.id}
            mechanic={mechanic}
            position={position}
            reduceMotion={reduceMotion}
          />
        ))}
      </ol>

      <ol
        className={`record-scroll snap-${settings.snap}`}
        aria-hidden="true"
        ref={setScroll}
      >
        {albums.map((album) => (
          <li className="record-stop" key={album.id} />
        ))}
        <li className="record-tail" />
      </ol>

      {showPreview && previewAlbum && (
        <aside className="record-preview" aria-live="polite">
          <Text type="label" color="inherit" maxLines={2}>
            {previewAlbum.title}
          </Text>
          <Text type="supporting" color="inherit" maxLines={1}>
            {previewAlbum.artist}
          </Text>
        </aside>
      )}
    </section>
  )
}
