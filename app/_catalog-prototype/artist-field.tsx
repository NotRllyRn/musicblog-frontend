"use client"

import { Button } from "@astryxdesign/core/Button"
import { Spinner } from "@astryxdesign/core/Spinner"
import { Text } from "@astryxdesign/core/Text"
import { getImageProps } from "next/image"
import { useEffect, useRef, useState } from "react"

import {
  type BubbleId,
  type BubbleNode,
  approachMotionSpeed,
  bubbleWorldRadius,
  createBubbleNodes,
  findBubbleNode,
  stepBubblePhysics,
} from "./bubble-physics"
import {
  bubbleTapAction,
  clampBubbleZoom,
  pinchCamera,
} from "./bubble-interaction"
import { genreColorIndex, genreRadius } from "./genre-bubbles"
import type { ArtistProfile, GenreProfile } from "./types"

interface ArtistFieldProps {
  artists: ArtistProfile[] | null
  hasError: boolean
  isLoading: boolean
  onRetry: () => void
  onSelect: (artist: ArtistProfile) => void
}

interface GenreFieldProps {
  genres: GenreProfile[] | null
  hasError: boolean
  isLoading: boolean
  onRetry: () => void
  onSelect: (genre: GenreProfile) => void
}

type CatalogProfile = ArtistProfile | GenreProfile

interface Portrait {
  image?: HTMLImageElement
  lastUsed: number
  status: "failed" | "loading" | "queued" | "ready"
}

interface BubbleRuntime {
  activeId: BubbleId | null
  cameraX: number
  cameraY: number
  destroyed: boolean
  dpr: number
  dragging: boolean
  frame: number | null
  height: number
  imageClock: number
  imageQueue: BubbleNode<CatalogProfile>[]
  images: Map<BubbleId, Portrait>
  inFlight: number
  motionSpeed: number
  motionUntil: number
  nodes: BubbleNode<CatalogProfile>[]
  pinchDistance: number
  pinched: boolean
  pinchWorldX: number
  pinchWorldY: number
  pinchZoom: number
  pointerId: number | null
  pointers: Map<number, { x: number; y: number }>
  pointerStartX: number
  pointerStartY: number
  previousTime: number
  radius: number
  reducedMotion: boolean
  startCameraX: number
  startCameraY: number
  width: number
  worldRadius: number
  zoom: number
}

const DESKTOP_RADIUS = 56
const MOBILE_RADIUS = 41
const DESKTOP_GENRE_RADIUS = { minimum: 42, maximum: 104 }
const MOBILE_GENRE_RADIUS = { minimum: 34, maximum: 72 }
const NODE_GAP = 10
const IMAGE_CONCURRENCY = 4
const IMAGE_CACHE_SIZE = 160
const ZOOM_STEP = 1.18

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

function initials(name: string) {
  const words = name
    .trim()
    .split(/\s+/u)
    .map((word) => word.match(/[\p{Letter}\p{Number}]/gu)?.join("") ?? "")
    .filter(Boolean)
  return (
    words.length > 1
      ? `${words[0][0]}${words.at(-1)?.[0] ?? ""}`
      : (words[0]?.slice(0, 2) ?? "?")
  ).toLocaleUpperCase()
}

function isArtist(profile: CatalogProfile): profile is ArtistProfile {
  return "imageUrl" in profile
}

function isGenre(profile: CatalogProfile): profile is GenreProfile {
  return "count" in profile
}

function canvasPoint(
  canvas: HTMLCanvasElement,
  runtime: BubbleRuntime,
  clientX: number,
  clientY: number
) {
  const bounds = canvas.getBoundingClientRect()
  return {
    x:
      (clientX - bounds.left - runtime.width / 2 - runtime.cameraX) /
      runtime.zoom,
    y:
      (clientY - bounds.top - runtime.height / 2 - runtime.cameraY) /
      runtime.zoom,
  }
}

function clampCamera(runtime: BubbleRuntime) {
  const horizontal = Math.max(
    0,
    runtime.worldRadius * runtime.zoom - runtime.width * 0.25
  )
  const vertical = Math.max(
    0,
    runtime.worldRadius * runtime.zoom - runtime.height * 0.25
  )
  runtime.cameraX = clamp(runtime.cameraX, -horizontal, horizontal)
  runtime.cameraY = clamp(runtime.cameraY, -vertical, vertical)
}

function drawLabel(
  context: CanvasRenderingContext2D,
  node: BubbleNode<CatalogProfile>,
  x: number,
  y: number,
  width: number,
  height: number,
  ink: string,
  paper: string
) {
  const fontSize = 13
  context.font = `600 ${fontSize}px system-ui, sans-serif`
  let label = `${node.profile.name}${isGenre(node.profile) ? ` · ${node.profile.count} album${node.profile.count === 1 ? "" : "s"}` : ""}`
  while (label.length > 12 && context.measureText(label).width > 210)
    label = `${label.slice(0, -2).trim()}…`
  const labelWidth = context.measureText(label).width + 20
  const labelHeight = 28
  const labelX = clamp(x - labelWidth / 2, 8, width - labelWidth - 8)
  const below = y + node.renderRadius + 10
  const labelY =
    below + labelHeight <= height - 8
      ? below
      : y - node.renderRadius - labelHeight - 10

  context.globalAlpha = 0.94
  context.fillStyle = paper
  context.beginPath()
  context.roundRect(labelX, labelY, labelWidth, labelHeight, 14)
  context.fill()
  context.globalAlpha = 1
  context.fillStyle = ink
  context.textAlign = "center"
  context.textBaseline = "middle"
  context.fillText(label, labelX + labelWidth / 2, labelY + labelHeight / 2)
}

const GENRE_COLOR_TOKENS = [
  "--color-border-blue",
  "--color-border-cyan",
  "--color-border-green",
  "--color-border-orange",
  "--color-border-pink",
  "--color-border-purple",
  "--color-border-red",
  "--color-border-teal",
  "--color-border-yellow",
]

function drawGenre(
  context: CanvasRenderingContext2D,
  profile: GenreProfile,
  x: number,
  y: number,
  radius: number,
  fill: string,
  ink: string
) {
  const words = profile.name.split(/(?<=[-])|\s+/u)
  const split = words.length > 1 ? Math.ceil(words.length / 2) : words.length
  const lines = [words.slice(0, split).join(" "), words.slice(split).join(" ")]
    .filter(Boolean)
    .slice(0, 2)
  let fontSize = Math.min(22, radius * 0.34)
  context.font = `700 ${fontSize}px system-ui, sans-serif`
  while (
    fontSize > 10 &&
    lines.some((line) => context.measureText(line).width > radius * 1.55)
  ) {
    fontSize -= 1
    context.font = `700 ${fontSize}px system-ui, sans-serif`
  }

  context.fillStyle = fill
  context.globalAlpha = 0.72
  context.fill()
  context.globalAlpha = 1
  context.fillStyle = ink
  context.textAlign = "center"
  context.textBaseline = "middle"
  const lineHeight = fontSize * 1.05
  lines.forEach((line, index) =>
    context.fillText(line, x, y + (index - (lines.length - 1) / 2) * lineHeight)
  )
}

function drawBubbleField(
  canvas: HTMLCanvasElement,
  runtime: BubbleRuntime,
  queuePortrait: (node: BubbleNode<CatalogProfile>) => void
) {
  const context = canvas.getContext("2d")
  if (!context || !runtime.width || !runtime.height) return

  context.setTransform(runtime.dpr, 0, 0, runtime.dpr, 0, 0)
  context.clearRect(0, 0, runtime.width, runtime.height)
  const style = getComputedStyle(canvas)
  const ink = style.color
  const paper = style.borderTopColor
  const active = runtime.nodes.find(
    ({ profile }) => profile.id === runtime.activeId
  )
  const nodes = active
    ? [...runtime.nodes.filter((node) => node !== active), active]
    : runtime.nodes
  const visible = new Set<BubbleId>()

  for (const node of nodes) {
    const x = runtime.width / 2 + runtime.cameraX + node.x * runtime.zoom
    const y = runtime.height / 2 + runtime.cameraY + node.y * runtime.zoom
    const radius = node.renderRadius * runtime.zoom
    if (
      x + radius < -radius ||
      x - radius > runtime.width + radius ||
      y + radius < -radius ||
      y - radius > runtime.height + radius
    )
      continue

    visible.add(node.profile.id)
    queuePortrait(node)
    context.save()
    context.beginPath()
    context.arc(x, y, radius, 0, Math.PI * 2)
    if (isGenre(node.profile)) {
      const color = style.getPropertyValue(
        GENRE_COLOR_TOKENS[
          genreColorIndex(node.profile.id, GENRE_COLOR_TOKENS.length)
        ]
      )
      drawGenre(context, node.profile, x, y, radius, color, ink)
    } else {
      context.fillStyle = paper
      context.globalAlpha = 0.88
      context.fill()
      context.clip()
      const portrait = runtime.images.get(node.profile.id)
      if (portrait?.status === "ready" && portrait.image) {
        portrait.lastUsed = ++runtime.imageClock
        context.globalAlpha = 1
        context.drawImage(
          portrait.image,
          x - radius,
          y - radius,
          radius * 2,
          radius * 2
        )
      } else {
        context.globalAlpha = 1
        context.fillStyle = ink
        context.font = `700 ${Math.round(radius * 0.52)}px system-ui, sans-serif`
        context.textAlign = "center"
        context.textBaseline = "middle"
        context.fillText(initials(node.profile.name), x, y + 1)
      }
    }
    context.restore()

    context.save()
    context.beginPath()
    context.arc(x, y, radius, 0, Math.PI * 2)
    context.strokeStyle = ink
    context.globalAlpha = node === active ? 0.8 : 0.24
    context.lineWidth = node === active ? 3 : 1.5
    context.stroke()
    context.restore()
  }

  if (active) {
    const x = runtime.width / 2 + runtime.cameraX + active.x * runtime.zoom
    const y = runtime.height / 2 + runtime.cameraY + active.y * runtime.zoom
    drawLabel(
      context,
      { ...active, renderRadius: active.renderRadius * runtime.zoom },
      x,
      y,
      runtime.width,
      runtime.height,
      ink,
      paper
    )
  }

  if (runtime.images.size > IMAGE_CACHE_SIZE)
    for (const [id] of [...runtime.images.entries()]
      .filter(
        ([id, portrait]) =>
          !visible.has(id) &&
          portrait.status !== "loading" &&
          portrait.status !== "queued"
      )
      .sort((left, right) => left[1].lastUsed - right[1].lastUsed)
      .slice(0, runtime.images.size - IMAGE_CACHE_SIZE))
      runtime.images.delete(id)
}

function BubbleField({
  profiles,
  kind,
  hasError,
  isLoading,
  onRetry,
  onSelect,
}: {
  profiles: CatalogProfile[] | null
  kind: "artists" | "genres"
  hasError: boolean
  isLoading: boolean
  onRetry: () => void
  onSelect: (profile: CatalogProfile) => void
}) {
  const helpId = `${kind}-field-help`
  const canvas = useRef<HTMLCanvasElement>(null)
  const runtime = useRef<BubbleRuntime | null>(null)
  const selectProfile = useRef(onSelect)
  const [activeProfile, setActiveProfile] = useState<CatalogProfile | null>(
    null
  )

  useEffect(() => {
    selectProfile.current = onSelect
  }, [onSelect])

  useEffect(() => {
    if (!profiles || !canvas.current) return
    const element = canvas.current
    const motionPreference = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    )
    const state: BubbleRuntime = {
      activeId: null,
      cameraX: 0,
      cameraY: 0,
      destroyed: false,
      dpr: 1,
      dragging: false,
      frame: null,
      height: 0,
      imageClock: 0,
      imageQueue: [],
      images: new Map(),
      inFlight: 0,
      motionSpeed: 0,
      motionUntil: 0,
      nodes: [],
      pinchDistance: 1,
      pinched: false,
      pinchWorldX: 0,
      pinchWorldY: 0,
      pinchZoom: 1,
      pointerId: null,
      pointers: new Map(),
      pointerStartX: 0,
      pointerStartY: 0,
      previousTime: 0,
      radius: 0,
      reducedMotion: motionPreference.matches,
      startCameraX: 0,
      startCameraY: 0,
      width: 0,
      worldRadius: 0,
      zoom: 1,
    }
    runtime.current = state

    const requestFrame = () => {
      if (state.frame === null)
        state.frame = requestAnimationFrame((time) => animate(time))
    }

    const wake = (duration: number) => {
      state.motionUntil = Math.max(
        state.motionUntil,
        performance.now() + duration
      )
      requestFrame()
    }

    const pumpImages = () => {
      while (state.inFlight < IMAGE_CONCURRENCY && state.imageQueue.length) {
        const node = state.imageQueue.shift()
        if (!node || !isArtist(node.profile) || !node.profile.imageUrl) continue
        const portrait = state.images.get(node.profile.id)
        if (!portrait || portrait.status !== "queued") continue
        portrait.status = "loading"
        state.inFlight += 1
        const image = new window.Image()
        const finish = async (status: "failed" | "ready") => {
          if (status === "ready") await image.decode().catch(() => undefined)
          portrait.status = status
          portrait.image = status === "ready" ? image : undefined
          state.inFlight -= 1
          requestFrame()
          pumpImages()
        }
        image.onload = () => void finish("ready")
        image.onerror = () => void finish("failed")
        try {
          image.src = getImageProps({
            alt: "",
            height: 256,
            src: node.profile.imageUrl,
            width: 256,
          }).props.src
        } catch {
          void finish("failed")
        }
      }
    }

    const queuePortrait = (node: BubbleNode<CatalogProfile>) => {
      if (
        !isArtist(node.profile) ||
        !node.profile.imageUrl ||
        state.images.has(node.profile.id)
      )
        return
      state.images.set(node.profile.id, {
        lastUsed: ++state.imageClock,
        status: "queued",
      })
      state.imageQueue.push(node)
      pumpImages()
    }

    const animate = (time: number) => {
      state.frame = null
      if (state.destroyed) return
      const elapsed = state.previousTime
        ? (time - state.previousTime) / 1_000
        : 1 / 60
      state.previousTime = time
      const target = !state.reducedMotion && time < state.motionUntil ? 1 : 0
      state.motionSpeed = approachMotionSpeed(
        state.motionSpeed,
        target,
        elapsed
      )
      if (!state.reducedMotion)
        stepBubblePhysics(state.nodes, elapsed, {
          activeId: state.activeId,
          gap: NODE_GAP,
          speed: state.motionSpeed,
        })
      drawBubbleField(element, state, queuePortrait)
      const radiiAnimating = state.nodes.some(
        (node) =>
          Math.abs(
            node.renderRadius -
              node.radius * (node.profile.id === state.activeId ? 1.35 : 1)
          ) > 0.05
      )
      if (target || state.motionSpeed || radiiAnimating) requestFrame()
      else state.previousTime = 0
    }

    const setActive = (node: BubbleNode<CatalogProfile> | null) => {
      const id = node?.profile.id ?? null
      if (state.activeId === id) return
      state.activeId = id
      setActiveProfile(node?.profile ?? null)
      if (state.reducedMotion)
        for (const candidate of state.nodes)
          candidate.renderRadius =
            candidate.radius * (candidate.profile.id === id ? 1.35 : 1)
      if (state.reducedMotion) requestFrame()
      else wake(220)
    }

    const hitTest = (clientX: number, clientY: number, sticky = true) => {
      const point = canvasPoint(element, state, clientX, clientY)
      return findBubbleNode(
        state.nodes,
        point.x,
        point.y,
        sticky ? state.activeId : null,
        sticky ? 16 : 0
      )
    }

    const zoomAt = (
      clientX: number,
      clientY: number,
      requestedZoom: number
    ) => {
      const nextZoom = clampBubbleZoom(requestedZoom)
      if (nextZoom === state.zoom) return
      const bounds = element.getBoundingClientRect()
      const anchorX = clientX - bounds.left
      const anchorY = clientY - bounds.top
      const world = canvasPoint(element, state, clientX, clientY)
      state.zoom = nextZoom
      state.cameraX = anchorX - state.width / 2 - world.x * nextZoom
      state.cameraY = anchorY - state.height / 2 - world.y * nextZoom
      clampCamera(state)
      setActive(null)
      requestFrame()
    }

    const onPointerDown = (event: PointerEvent) => {
      state.pointers.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      })
      element.setPointerCapture(event.pointerId)
      if (state.pointers.size > 1) {
        const [first, second] = [...state.pointers.values()]
        const clientX = (first.x + second.x) / 2
        const clientY = (first.y + second.y) / 2
        const world = canvasPoint(element, state, clientX, clientY)
        state.pinchDistance = Math.max(
          1,
          Math.hypot(second.x - first.x, second.y - first.y)
        )
        state.pinchWorldX = world.x
        state.pinchWorldY = world.y
        state.pinchZoom = state.zoom
        state.pinched = true
        state.dragging = true
        element.dataset.dragging = "true"
        setActive(null)
        return
      }
      state.pointerId = event.pointerId
      state.pointerStartX = event.clientX
      state.pointerStartY = event.clientY
      state.startCameraX = state.cameraX
      state.startCameraY = state.cameraY
      state.dragging = false
    }
    const onPointerMove = (event: PointerEvent) => {
      if (state.pointers.has(event.pointerId))
        state.pointers.set(event.pointerId, {
          x: event.clientX,
          y: event.clientY,
        })
      if (state.pinched && state.pointers.size > 1) {
        const [first, second] = [...state.pointers.values()]
        const clientX = (first.x + second.x) / 2
        const clientY = (first.y + second.y) / 2
        const bounds = element.getBoundingClientRect()
        const camera = pinchCamera({
          anchorX: state.pinchWorldX,
          anchorY: state.pinchWorldY,
          clientX,
          clientY,
          distance: Math.hypot(second.x - first.x, second.y - first.y),
          height: state.height,
          left: bounds.left,
          startDistance: state.pinchDistance,
          startZoom: state.pinchZoom,
          top: bounds.top,
          width: state.width,
        })
        state.zoom = camera.zoom
        state.cameraX = camera.cameraX
        state.cameraY = camera.cameraY
        clampCamera(state)
        requestFrame()
        return
      }
      if (state.pointerId === event.pointerId) {
        const dx = event.clientX - state.pointerStartX
        const dy = event.clientY - state.pointerStartY
        if (state.dragging || Math.hypot(dx, dy) > 4) {
          state.dragging = true
          state.cameraX = state.startCameraX + dx
          state.cameraY = state.startCameraY + dy
          clampCamera(state)
          element.dataset.dragging = "true"
          setActive(null)
          requestFrame()
          return
        }
      }
      if (event.pointerType !== "mouse") return
      const node = hitTest(event.clientX, event.clientY)
      element.toggleAttribute("data-hovered", Boolean(node))
      setActive(node)
    }
    const onPointerUp = (event: PointerEvent) => {
      if (!state.pointers.has(event.pointerId)) return
      const dragged = state.dragging
      state.pointers.delete(event.pointerId)
      if (element.hasPointerCapture(event.pointerId))
        element.releasePointerCapture(event.pointerId)
      if (state.pointers.size) {
        const [pointerId, pointer] = [...state.pointers.entries()][0]
        state.pointerId = pointerId
        state.pointerStartX = pointer.x
        state.pointerStartY = pointer.y
        state.startCameraX = state.cameraX
        state.startCameraY = state.cameraY
        state.dragging = false
        return
      }
      state.pointerId = null
      state.dragging = false
      delete element.dataset.dragging
      if (state.pinched) {
        state.pinched = false
        return
      }
      if (dragged) return
      const node = hitTest(event.clientX, event.clientY, false)
      if (event.pointerType === "mouse") {
        if (node) selectProfile.current(node.profile)
        else setActive(null)
      } else {
        const action = bubbleTapAction(state.activeId, node?.profile.id ?? null)
        if (action === "select" && node) selectProfile.current(node.profile)
        else setActive(action === "preview" ? node : null)
      }
    }
    const onPointerCancel = (event: PointerEvent) => {
      state.pointers.delete(event.pointerId)
      if (state.pointers.size) {
        const [pointerId, pointer] = [...state.pointers.entries()][0]
        state.pointerId = pointerId
        state.pointerStartX = pointer.x
        state.pointerStartY = pointer.y
        state.startCameraX = state.cameraX
        state.startCameraY = state.cameraY
        state.dragging = false
        return
      }
      state.pointerId = null
      state.dragging = false
      state.pinched = false
      delete element.dataset.dragging
      setActive(null)
    }
    const onPointerLeave = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && state.pointerId === null) {
        element.removeAttribute("data-hovered")
        setActive(null)
      }
    }
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      zoomAt(
        event.clientX,
        event.clientY,
        state.zoom * Math.exp(-event.deltaY * 0.001)
      )
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        ![
          "ArrowLeft",
          "ArrowRight",
          "Home",
          "End",
          "Escape",
          "+",
          "=",
          "-",
          "0",
          "Enter",
          " ",
        ].includes(event.key)
      )
        return
      event.preventDefault()
      if (event.key === "Escape") return setActive(null)
      if (event.key === "Enter" || event.key === " ") {
        const active = state.nodes.find(
          ({ profile }) => profile.id === state.activeId
        )
        if (active) selectProfile.current(active.profile)
        return
      }
      if (["+", "=", "-", "0"].includes(event.key)) {
        const bounds = element.getBoundingClientRect()
        const requestedZoom =
          event.key === "0"
            ? 1
            : state.zoom * (event.key === "-" ? 1 / ZOOM_STEP : ZOOM_STEP)
        zoomAt(
          bounds.left + state.width / 2,
          bounds.top + state.height / 2,
          requestedZoom
        )
        return
      }
      const current = state.nodes.findIndex(
        ({ profile }) => profile.id === state.activeId
      )
      const index =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? state.nodes.length - 1
            : event.key === "ArrowLeft"
              ? (current - 1 + state.nodes.length) % state.nodes.length
              : (current + 1) % state.nodes.length
      const node = state.nodes[index]
      if (!node) return
      state.cameraX = -node.x * state.zoom
      state.cameraY = -node.y * state.zoom
      clampCamera(state)
      setActive(node)
    }
    const onMotionChange = () => {
      state.reducedMotion = motionPreference.matches
      if (state.reducedMotion) {
        state.motionSpeed = 0
        for (const node of state.nodes)
          node.renderRadius =
            node.radius * (node.profile.id === state.activeId ? 1.35 : 1)
        requestFrame()
      } else wake(700)
    }
    const resize = new ResizeObserver(([entry]) => {
      const { height, width } = entry.contentRect
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const radius = width <= 768 ? MOBILE_RADIUS : DESKTOP_RADIUS
      state.width = width
      state.height = height
      state.dpr = dpr
      element.width = Math.round(width * dpr)
      element.height = Math.round(height * dpr)
      if (radius !== state.radius) {
        state.radius = radius
        const maximumCount = Math.max(
          ...profiles.map((profile) => (isGenre(profile) ? profile.count : 1))
        )
        const genreRadii =
          width <= 768 ? MOBILE_GENRE_RADIUS : DESKTOP_GENRE_RADIUS
        state.nodes = createBubbleNodes(
          profiles,
          (profile) =>
            isGenre(profile)
              ? genreRadius(
                  profile.count,
                  maximumCount,
                  genreRadii.minimum,
                  genreRadii.maximum
                )
              : radius,
          NODE_GAP
        )
        state.worldRadius = bubbleWorldRadius(
          state.nodes,
          Math.max(radius, genreRadii.maximum) * 2
        )
        state.cameraX = 0
        state.cameraY = 0
        state.images.clear()
        state.imageQueue = []
      }
      if (state.reducedMotion) requestFrame()
      else wake(1_400)
    })
    const theme = new MutationObserver(() => requestFrame())

    element.addEventListener("keydown", onKeyDown)
    element.addEventListener("pointerdown", onPointerDown)
    element.addEventListener("pointercancel", onPointerCancel)
    element.addEventListener("pointerleave", onPointerLeave)
    element.addEventListener("pointermove", onPointerMove)
    element.addEventListener("pointerup", onPointerUp)
    element.addEventListener("wheel", onWheel, { passive: false })
    motionPreference.addEventListener("change", onMotionChange)
    resize.observe(element)
    theme.observe(document.documentElement, {
      attributeFilter: ["class", "data-theme", "style"],
      attributes: true,
    })

    return () => {
      state.destroyed = true
      if (state.frame !== null) cancelAnimationFrame(state.frame)
      element.removeEventListener("keydown", onKeyDown)
      element.removeEventListener("pointerdown", onPointerDown)
      element.removeEventListener("pointercancel", onPointerCancel)
      element.removeEventListener("pointerleave", onPointerLeave)
      element.removeEventListener("pointermove", onPointerMove)
      element.removeEventListener("pointerup", onPointerUp)
      element.removeEventListener("wheel", onWheel)
      motionPreference.removeEventListener("change", onMotionChange)
      resize.disconnect()
      theme.disconnect()
      runtime.current = null
    }
  }, [profiles])

  if (!profiles)
    return (
      <section className="artist-status" aria-live="polite">
        {hasError ? (
          <>
            <Text color="inherit">
              {kind === "artists" ? "Artists" : "Genres"} could not load.
            </Text>
            <Button label="Try again" onClick={onRetry} size="sm" />
          </>
        ) : (
          <Spinner label={`Preparing ${kind}`} shade="inherit" size="md" />
        )}
      </section>
    )

  return (
    <section
      aria-busy={isLoading}
      aria-label={`Browse ${profiles.length} ${kind}`}
      className="artist-viewport"
    >
      <canvas
        aria-describedby={helpId}
        aria-keyshortcuts="ArrowLeft ArrowRight Home End Enter Space + - 0"
        aria-label={
          activeProfile
            ? `Selected ${kind.slice(0, -1)}: ${activeProfile.name}`
            : `${profiles.length} ${kind}`
        }
        className="artist-canvas"
        ref={canvas}
        tabIndex={0}
      >
        Browse {profiles.length} {kind}.
      </canvas>
      <Text as="p" className="artist-field-help" color="inherit" id={helpId}>
        Drag to explore. Pinch, scroll, or use +/− to zoom. Tap once to preview
        a {kind.slice(0, -1)} and again to filter its albums.
      </Text>
      <Text aria-live="polite" as="span" className="artist-announcement">
        {activeProfile
          ? `${activeProfile.name}${isGenre(activeProfile) ? `, ${activeProfile.count} albums` : ""}`
          : ""}
      </Text>
    </section>
  )
}

export function ArtistField(props: ArtistFieldProps) {
  return (
    <BubbleField
      hasError={props.hasError}
      isLoading={props.isLoading}
      kind="artists"
      onRetry={props.onRetry}
      onSelect={(profile) => props.onSelect(profile as ArtistProfile)}
      profiles={props.artists}
    />
  )
}

export function GenreField(props: GenreFieldProps) {
  return (
    <BubbleField
      hasError={props.hasError}
      isLoading={props.isLoading}
      kind="genres"
      onRetry={props.onRetry}
      onSelect={(profile) => props.onSelect(profile as GenreProfile)}
      profiles={props.genres}
    />
  )
}
