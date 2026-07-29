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
  visualIndex: number
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
  visualIndex,
}: AnimatedRecordProps) {
  const pullTarget = useMotionValue(0)
  const pullSpring = useSpring(pullTarget, {
    damping: 28,
    mass: 0.32,
    stiffness: 280,
  })
  const pull = reduceMotion ? pullTarget : pullSpring

  useEffect(() => {
    pullTarget.set(isHovered ? 1 : 0)
  }, [isHovered, pullTarget])

  const distance = () => visualIndex - position.get()
  const transform = useTransform(
    () =>
      getRecordVisual(
        mechanic,
        distance(),
        albumIndex,
        reduceMotion,
        pull.get()
      ).transform
  )
  const opacity = useTransform(
    () =>
      getRecordVisual(mechanic, distance(), albumIndex, reduceMotion).opacity
  )
  const dynamicStyle = { opacity, transform }

  return (
    <motion.li
      className="deck-record"
      data-active={isActive || undefined}
      data-album-index={albumIndex}
      data-hovered={isHovered || undefined}
      data-visual-index={visualIndex}
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
  const albumIndexFor = (visualIndex: number) =>
    ((visualIndex % albums.length) + albums.length) % albums.length
  const initialIndex = Math.min(albums.length - 1, radius + 2 + (index % 3))
  const [activeIndex, setActiveIndex] = useState(initialIndex)
  const [hoveredVisualIndex, setHoveredVisualIndex] = useState<number | null>(
    null
  )
  const [showPreview, setShowPreview] = useState(false)
  const activeRef = useRef(initialIndex)
  const deck = useRef<HTMLElement>(null)
  const initialized = useRef(false)
  const pointer = useRef({ x: 0, y: 0 })
  const scroll = useRef<HTMLOListElement>(null)
  const scrolling = useRef(false)
  const wheelTarget = useRef(initialIndex * settings.step)
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
  const previewVisualIndex = hoveredVisualIndex ?? activeIndex
  const previewAlbum = albums[albumIndexFor(previewVisualIndex)]

  const setScroll = useCallback(
    (node: HTMLOListElement | null) => {
      scroll.current = node
      if (node && !initialized.current) {
        wheelTarget.current = initialIndex * settings.step
        node.scrollTop = wheelTarget.current
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
        ? target.closest<HTMLElement>("[data-visual-index]")
        : null
    if (record?.closest(".record-deck") !== deck.current) return null
    const next = Number(record.dataset.visualIndex)
    return Number.isFinite(next) ? next : null
  }

  const retargetPointer = () => {
    scrolling.current = false
    if (scroll.current) wheelTarget.current = scroll.current.scrollTop
    const target = document.elementFromPoint(
      pointer.current.x,
      pointer.current.y
    )
    const next = albumIndexAt(target)
    const isInside =
      target instanceof Element &&
      target.closest(".record-deck") === deck.current
    setHoveredVisualIndex(next ?? (isInside ? activeRef.current : null))
  }

  const moveTo = (nextIndex: number) => {
    const next = Math.max(0, Math.min(albums.length - 1, nextIndex))
    wheelTarget.current = next * settings.step
    setHoveredVisualIndex(null)
    scroll.current?.scrollTo({
      top: wheelTarget.current,
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
    if (!scrolling.current) setHoveredVisualIndex(albumIndexAt(event.target))
  }

  const onWheel = (event: WheelEvent<HTMLElement>) => {
    pointer.current = { x: event.clientX, y: event.clientY }
    scrolling.current = true
    if (scroll.current) {
      const multiplier = event.deltaMode === 1 ? 16 : 1
      const sensitivity = mechanic === "hinge" ? 1.5 : 1
      const max = (albums.length - 1) * settings.step
      wheelTarget.current = Math.max(
        0,
        Math.min(max, wheelTarget.current + event.deltaY * multiplier * sensitivity)
      )
      scroll.current.scrollTop = wheelTarget.current
    }
    if (settleTimer.current) clearTimeout(settleTimer.current)
    settleTimer.current = setTimeout(retargetPointer, 280)
  }

  const start = activeIndex - radius
  const windowed = Array.from({ length: settings.window }, (_, offset) => {
    const visualIndex = start + offset
    const albumIndex = albumIndexFor(visualIndex)
    return { album: albums[albumIndex], albumIndex, visualIndex }
  })
  const hovered =
    hoveredVisualIndex !== null &&
    !windowed.some(({ visualIndex }) => visualIndex === hoveredVisualIndex)
      ? [
          {
            album: albums[albumIndexFor(hoveredVisualIndex)],
            albumIndex: albumIndexFor(hoveredVisualIndex),
            visualIndex: hoveredVisualIndex,
          },
        ]
      : []
  const visible = [...windowed, ...hovered].sort(
    (first, second) =>
      Math.abs(second.visualIndex - activeIndex) -
      Math.abs(first.visualIndex - activeIndex)
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
        setHoveredVisualIndex(null)
        setShowPreview(false)
      }}
      onPointerMove={onPointerMove}
      onWheel={onWheel}
      ref={deck}
      role="link"
      tabIndex={0}
    >
      <ol className="record-stage" aria-hidden="true">
        {visible.map(({ album, albumIndex, visualIndex }) => (
          <AnimatedRecord
            album={album}
            albumIndex={albumIndex}
            isActive={visualIndex === activeIndex}
            isHovered={visualIndex === hoveredVisualIndex}
            isPreviewed={visualIndex === previewVisualIndex && showPreview}
            key={`${album.id}-${visualIndex}`}
            mechanic={mechanic}
            position={position}
            reduceMotion={reduceMotion}
            visualIndex={visualIndex}
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
