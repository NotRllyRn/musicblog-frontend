"use client"

import { Text, VisuallyHidden, useMediaQuery } from "@astryxdesign/core"
import {
  AnimatePresence,
  motion,
  type MotionValue,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react"
import Image from "next/image"
import {
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type UIEvent,
  type WheelEvent,
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"

import { requestAlbumTiltPermission } from "./album-cover-tilt"
import { getRecordTransform, mechanicSettings } from "./mechanics"
import type { AlbumPost } from "./types"

interface RecordDeckProps {
  albums: AlbumPost[]
  detailVisible: boolean
  index: number
  openedAlbumId: number | null
  onEndChange: (index: number, ended: boolean) => void
  onExitInteraction: () => void
  onNeedMore: () => void
  onOpenAlbum: (album: AlbumPost, invoker: HTMLElement) => void
  onPrefetchAlbum: (album: AlbumPost) => void
  onSelectionChange: (visualIndex: number | null) => void
  searchTransitioning: boolean
  selectionActive: boolean
  selectedVisualIndex: number | null
  startsAtFirst: boolean
  suppressSearchTransition: boolean
  totalRecords: number
}

interface AnimatedRecordProps {
  album?: AlbumPost
  detailVisible: boolean
  isActive: boolean
  isDetailSource: boolean
  isHovered: boolean
  position: MotionValue<number>
  reduceMotion: boolean
  trackLayout: boolean
  trackSearchTransition: boolean
  visualIndex: number
}

const AnimatedRecord = memo(function AnimatedRecord({
  album,
  detailVisible,
  isActive,
  isDetailSource,
  isHovered,
  position,
  reduceMotion,
  trackLayout,
  trackSearchTransition,
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
    if (isDetailSource && detailVisible) pullSpring.jump(0)
  }, [detailVisible, isDetailSource, isHovered, pullSpring, pullTarget])

  const distance = () => visualIndex - position.get()
  const transform = useTransform(() =>
    getRecordTransform(distance(), visualIndex, reduceMotion, pull.get())
  )
  const dynamicStyle = { transform }

  return (
    <motion.li
      className="deck-record"
      data-hovered={isHovered || undefined}
      data-visual-index={visualIndex}
      style={dynamicStyle}
    >
      {!(album && isDetailSource && detailVisible) && (
        <motion.figure
          className={`record-figure${album ? "" : " record-placeholder"}`}
          data-album-id={album?.id}
          data-search-transition={
            album && trackSearchTransition ? `album-${album.id}` : undefined
          }
          layoutId={
            album && trackLayout ? `album-cover-${album.id}` : undefined
          }
        >
          {album && (
            <Image
              className="record-art"
              src={album.imageUrl}
              alt=""
              fill
              loading={isActive ? "eager" : "lazy"}
              sizes="(max-width: 47.99rem) 34vw, (max-width: 69.99rem) 21vw, 14vw"
            />
          )}
        </motion.figure>
      )}
    </motion.li>
  )
})

interface RecordHitZoneProps {
  position: MotionValue<number>
  reduceMotion: boolean
  visualIndex: number
}

const RecordHitZone = memo(function RecordHitZone({
  position,
  reduceMotion,
  visualIndex,
}: RecordHitZoneProps) {
  const transform = useTransform(() =>
    getRecordTransform(visualIndex - position.get(), visualIndex, reduceMotion)
  )
  const hitStyle = { transform }

  return (
    <motion.li
      className="record-hit-zone"
      data-visual-index={visualIndex}
      style={hitStyle}
    />
  )
})

export function RecordDeck({
  albums,
  detailVisible,
  index,
  openedAlbumId,
  onEndChange,
  onExitInteraction,
  onNeedMore,
  onOpenAlbum,
  onPrefetchAlbum,
  onSelectionChange,
  searchTransitioning,
  selectionActive,
  selectedVisualIndex,
  startsAtFirst,
  suppressSearchTransition,
  totalRecords,
}: RecordDeckProps) {
  const settings = mechanicSettings
  const radius = Math.floor(settings.window / 2)
  const recordsAbove = radius - 4
  const recordsBelow = radius
  const initialIndex = startsAtFirst
    ? 0
    : Math.min(albums.length - 1, radius + 2 + (index % 3))
  const [activeIndex, setActiveIndex] = useState(initialIndex)
  const [hoveredVisualIndex, setHoveredVisualIndex] = useState<number | null>(
    null
  )
  const [showPreview, setShowPreview] = useState(false)
  const activeRef = useRef(initialIndex)
  const deck = useRef<HTMLElement>(null)
  const initialized = useRef(false)
  const openFrame = useRef<number | null>(null)
  const prefetchTimer = useRef<ReturnType<typeof setTimeout>>(null)
  const scroll = useRef<HTMLOListElement>(null)
  const scrolling = useRef(false)
  const wheelTarget = useRef(initialIndex * settings.step)
  const settleTimer = useRef<ReturnType<typeof setTimeout>>(null)
  const isTouch = useMediaQuery("(hover: none), (pointer: coarse)")
  const reduceMotion = Boolean(useReducedMotion())
  const rawPosition = useMotionValue(initialIndex)
  const smoothPosition = useSpring(rawPosition, {
    damping: 34,
    mass: 0.42,
    stiffness: 300,
  })
  const position = reduceMotion ? rawPosition : smoothPosition
  const openedVisualIndex = albums.findIndex(
    (album) => album.id === openedAlbumId
  )
  const detailVisualIndex = openedVisualIndex < 0 ? null : openedVisualIndex
  const interactionVisualIndex = isTouch
    ? selectedVisualIndex
    : hoveredVisualIndex
  const activeAlbum = albums[activeIndex]
  const previewVisualIndex = interactionVisualIndex ?? activeIndex
  const previewAlbum = albums[previewVisualIndex]
  const previewVisible =
    detailVisualIndex === null &&
    (isTouch ? selectedVisualIndex !== null : showPreview)
  const previewPullTarget = useMotionValue(0)
  const previewPullSpring = useSpring(previewPullTarget, {
    damping: 28,
    mass: 0.32,
    stiffness: 280,
  })
  const previewPull = reduceMotion ? previewPullTarget : previewPullSpring
  const previewTransform = useTransform(() =>
    getRecordTransform(
      previewVisualIndex - position.get(),
      previewVisualIndex,
      reduceMotion,
      previewPull.get()
    )
  )
  const previewStyle = { transform: previewTransform }

  useEffect(() => {
    previewPullTarget.set(interactionVisualIndex === null ? 0 : 1)
    if (detailVisualIndex !== null && detailVisible) previewPullSpring.jump(0)
  }, [
    detailVisible,
    detailVisualIndex,
    interactionVisualIndex,
    previewPullSpring,
    previewPullTarget,
  ])

  const setScroll = useCallback(
    (node: HTMLOListElement | null) => {
      scroll.current = node
      if (node && !initialized.current) {
        wheelTarget.current = initialIndex * settings.step
        node.scrollTop = wheelTarget.current
        rawPosition.jump(initialIndex)
        smoothPosition.jump(initialIndex)
        initialized.current = true
      }
    },
    [initialIndex, rawPosition, settings.step, smoothPosition]
  )

  useEffect(
    () => () => {
      if (openFrame.current !== null) cancelAnimationFrame(openFrame.current)
      if (prefetchTimer.current) clearTimeout(prefetchTimer.current)
      if (settleTimer.current) clearTimeout(settleTimer.current)
    },
    []
  )

  useEffect(() => {
    if (
      albums.length < totalRecords &&
      activeIndex + recordsBelow >= albums.length - 1
    )
      onNeedMore()
  }, [activeIndex, albums.length, onNeedMore, recordsBelow, totalRecords])

  useEffect(() => {
    onEndChange(index, activeIndex === totalRecords - 1 && Boolean(activeAlbum))
  }, [activeAlbum, activeIndex, index, onEndChange, totalRecords])

  useMotionValueEvent(position, "change", (value) => {
    const next = Math.max(0, Math.min(totalRecords - 1, Math.round(value)))
    if (next === activeRef.current) return
    activeRef.current = next
    setActiveIndex(next)
  })

  const visualIndexAt = (
    target: EventTarget | null,
    point?: { x: number; y: number }
  ) => {
    const pulledRecord = deck.current?.querySelector<HTMLElement>(
      '.deck-record[data-hovered="true"]'
    )
    const pulledBounds = pulledRecord?.getBoundingClientRect()
    if (
      point &&
      pulledRecord &&
      pulledBounds &&
      point.x >= pulledBounds.left &&
      point.x <= pulledBounds.right &&
      point.y >= pulledBounds.top &&
      point.y <= pulledBounds.bottom
    )
      return Number(pulledRecord.dataset.visualIndex)

    const elements = target instanceof Element ? [target] : []
    if (point) elements.push(...document.elementsFromPoint(point.x, point.y))

    for (const element of elements) {
      const record = element.closest<HTMLElement>("[data-visual-index]")
      if (record?.closest(".record-deck") !== deck.current) continue
      const next = Number(record.dataset.visualIndex)
      if (Number.isFinite(next)) return next
    }

    return null
  }

  const clearSelection = () => {
    if (prefetchTimer.current) clearTimeout(prefetchTimer.current)
    setHoveredVisualIndex(null)
    setShowPreview(false)
    if (isTouch) onSelectionChange(null)
  }

  const openAlbum = (album: AlbumPost) => {
    if (!deck.current) return
    void requestAlbumTiltPermission()
    const invoker = deck.current
    if (openFrame.current !== null) cancelAnimationFrame(openFrame.current)
    openFrame.current = requestAnimationFrame(() => {
      openFrame.current = requestAnimationFrame(() => {
        openFrame.current = null
        clearSelection()
        onOpenAlbum(album, invoker)
      })
    })
  }

  const restartPreview = () => {
    previewPullTarget.set(0)
    previewPullSpring.jump(0)
  }

  const finishScrolling = () => {
    scrolling.current = false
    if (scroll.current) wheelTarget.current = scroll.current.scrollTop
  }

  const moveTo = (nextIndex: number) => {
    const next = Math.max(0, Math.min(totalRecords - 1, nextIndex))
    wheelTarget.current = next * settings.step
    clearSelection()
    scroll.current?.scrollTo({
      top: wheelTarget.current,
      behavior: reduceMotion ? "auto" : "smooth",
    })
  }

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const moves: Partial<Record<string, number>> = {
      ArrowDown: activeIndex + 1,
      ArrowUp: activeIndex - 1,
      End: totalRecords - 1,
      Home: 0,
    }

    if (event.key in moves) {
      event.preventDefault()
      moveTo(moves[event.key] ?? activeIndex)
    }

    const activates = event.key === "Enter" || (!isTouch && event.key === " ")
    if (activates && activeAlbum && deck.current) {
      event.preventDefault()
      openAlbum(activeAlbum)
    }
  }

  const onClick = (event: MouseEvent<HTMLElement>) => {
    onExitInteraction()
    const foundIndex = visualIndexAt(event.target, {
      x: event.clientX,
      y: event.clientY,
    })
    const visualIndex =
      foundIndex !== null && albums[foundIndex] ? foundIndex : null

    if (isTouch) {
      if (selectionActive) {
        if (visualIndex === selectedVisualIndex && visualIndex !== null)
          openAlbum(albums[visualIndex])
        else onSelectionChange(null)
        return
      }

      if (visualIndex !== null) {
        restartPreview()
        onPrefetchAlbum(albums[visualIndex])
        onSelectionChange(visualIndex)
      }
      return
    }

    if (visualIndex !== null) openAlbum(albums[visualIndex])
  }

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (isTouch) return
    onExitInteraction()
    if (scrolling.current) return
    const foundIndex = visualIndexAt(event.target, {
      x: event.clientX,
      y: event.clientY,
    })
    const visualIndex =
      foundIndex !== null && albums[foundIndex] ? foundIndex : null
    if (visualIndex !== hoveredVisualIndex && prefetchTimer.current)
      clearTimeout(prefetchTimer.current)
    if (visualIndex !== null && visualIndex !== hoveredVisualIndex) {
      restartPreview()
      prefetchTimer.current = setTimeout(
        () => onPrefetchAlbum(albums[visualIndex]),
        300
      )
    }
    setHoveredVisualIndex(visualIndex)
    setShowPreview(visualIndex !== null)
  }

  const onScroll = (event: UIEvent<HTMLOListElement>) => {
    onExitInteraction()
    rawPosition.set(event.currentTarget.scrollTop / settings.step)
    if (!scrolling.current) wheelTarget.current = event.currentTarget.scrollTop
    clearSelection()
  }

  const onWheel = (event: WheelEvent<HTMLElement>) => {
    onExitInteraction()
    clearSelection()
    scrolling.current = true
    if (scroll.current) {
      const multiplier = event.deltaMode === 1 ? 16 : 1
      const sensitivity = 1.5
      const max = (totalRecords - 1) * settings.step
      wheelTarget.current = Math.max(
        0,
        Math.min(
          max,
          wheelTarget.current + event.deltaY * multiplier * sensitivity
        )
      )
      scroll.current.scrollTop = wheelTarget.current
    }
    if (settleTimer.current) clearTimeout(settleTimer.current)
    settleTimer.current = setTimeout(finishScrolling, 280)
  }

  const start = Math.max(0, activeIndex - recordsAbove)
  const end = Math.min(totalRecords, activeIndex + recordsBelow + 1)
  const windowed = Array.from({ length: end - start }, (_, offset) => {
    const visualIndex = start + offset
    return { album: albums[visualIndex], visualIndex }
  })
  const hovered =
    interactionVisualIndex !== null &&
    !windowed.some(({ visualIndex }) => visualIndex === interactionVisualIndex)
      ? [
          {
            album: albums[interactionVisualIndex],
            visualIndex: interactionVisualIndex,
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
      className={`record-deck deck-${index + 1}`}
      aria-haspopup="dialog"
      aria-keyshortcuts={`ArrowUp ArrowDown Home End Enter${isTouch ? "" : " Space"}`}
      aria-label={`Browse albums vertically. Selected: ${activeAlbum?.title ?? "album"}.`}
      onBlur={() => {
        if (!isTouch) clearSelection()
      }}
      onClick={onClick}
      onKeyDown={onKeyDown}
      onPointerLeave={() => {
        if (!isTouch) clearSelection()
      }}
      onPointerMove={onPointerMove}
      onWheel={onWheel}
      ref={deck}
      role="button"
      tabIndex={0}
    >
      <ol className="record-stage" aria-hidden="true">
        {visible.map(({ album, visualIndex }) => (
          <AnimatedRecord
            album={album}
            detailVisible={detailVisible}
            isActive={visualIndex === activeIndex}
            isDetailSource={album?.id === openedAlbumId}
            isHovered={visualIndex === interactionVisualIndex}
            key={album?.id ?? `placeholder-${visualIndex}`}
            position={position}
            reduceMotion={reduceMotion}
            trackLayout={
              !searchTransitioning &&
              Boolean(album) &&
              (album?.id === openedAlbumId ||
                (openedAlbumId === null &&
                  (visualIndex === activeIndex ||
                    visualIndex === previewVisualIndex)))
            }
            trackSearchTransition={
              !suppressSearchTransition &&
              Boolean(album) &&
              visualIndex === activeIndex
            }
            visualIndex={visualIndex}
          />
        ))}
      </ol>

      <ol className="record-hit-stage" aria-hidden="true">
        {visible.map(
          ({ album, visualIndex }) =>
            album && (
              <RecordHitZone
                key={album.id}
                position={position}
                reduceMotion={reduceMotion}
                visualIndex={visualIndex}
              />
            )
        )}
      </ol>

      <AnimatePresence initial={false}>
        {previewVisible && previewAlbum && (
          <motion.ol
            className="record-preview-stage"
            aria-hidden="true"
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.18 }}
          >
            <motion.li
              className="record-preview-positioner"
              style={previewStyle}
            >
              <aside
                className="record-preview"
                data-album-id={previewAlbum.id}
                data-visual-index={previewVisualIndex}
              >
                <Text type="label" color="inherit" maxLines={2}>
                  {previewAlbum.title}
                </Text>
                <Text type="supporting" color="inherit" maxLines={1}>
                  {previewAlbum.artist}
                </Text>
              </aside>
            </motion.li>
          </motion.ol>
        )}
      </AnimatePresence>

      <ol
        className="record-scroll"
        aria-hidden="true"
        onScroll={onScroll}
        ref={setScroll}
      >
        {Array.from({ length: totalRecords }, (_, recordIndex) => (
          <li className="record-stop" key={recordIndex} />
        ))}
        <li className="record-tail" />
      </ol>

      {previewVisible && previewAlbum && (
        <VisuallyHidden as="div" aria-live="polite">
          {previewAlbum.title}, {previewAlbum.artist}
        </VisuallyHidden>
      )}
    </section>
  )
}
