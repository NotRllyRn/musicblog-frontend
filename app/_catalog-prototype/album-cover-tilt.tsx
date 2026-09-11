"use client"

import { useMediaQuery } from "@astryxdesign/core"
import {
  type MotionStyle,
  type MotionValue,
  useIsPresent,
  useSpring,
} from "motion/react"
import type { PointerEvent, RefObject } from "react"
import { useEffect, useRef } from "react"

const MAX_TILT = 12
const SENSOR_RANGE = 18
const spring = { stiffness: 220, damping: 24, mass: 0.7 }
const clamp = (value: number, limit = 1) =>
  Math.max(-limit, Math.min(limit, value))

type OrientationEventConstructor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"denied" | "granted">
}

let orientationPermission: Promise<boolean> | null = null

function canUseOrientation() {
  return (
    window.isSecureContext &&
    navigator.maxTouchPoints > 0 &&
    "DeviceOrientationEvent" in window &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
}

function getOrientationPermissionRequest() {
  return (DeviceOrientationEvent as OrientationEventConstructor)
    .requestPermission
}

export function requestAlbumTiltPermission() {
  if (!canUseOrientation()) return Promise.resolve(false)
  const request = getOrientationPermissionRequest()
  if (!request) return Promise.resolve(true)
  if (orientationPermission) return orientationPermission
  orientationPermission = request.call(DeviceOrientationEvent).then(
    (permission) => permission === "granted",
    () => {
      orientationPermission = null
      return false
    }
  )
  return orientationPermission
}

function viewportOrientation(beta: number, gamma: number) {
  const angle =
    screen.orientation?.angle ??
    (window as Window & { orientation?: number }).orientation ??
    0
  switch ((angle + 360) % 360) {
    case 90:
      return { x: beta, y: -gamma }
    case 180:
      return { x: -gamma, y: -beta }
    case 270:
      return { x: -beta, y: gamma }
    default:
      return { x: gamma, y: beta }
  }
}

function useOrientationTilt(
  enabled: boolean,
  rotateX: MotionValue<number>,
  rotateY: MotionValue<number>,
  pointerActiveRef: RefObject<boolean>,
  recalibrateRef: RefObject<() => void>
) {
  useEffect(() => {
    if (!enabled || !canUseOrientation()) return

    let active = true
    let frame: number | null = null
    let latest: { x: number; y: number } | null = null
    let baseline: { x: number; y: number } | null = null
    let samples: { x: number; y: number }[] = []

    const resetOrientation = () => {
      if (frame !== null) cancelAnimationFrame(frame)
      frame = null
      latest = null
      baseline = null
      samples = []
      rotateX.set(0)
      rotateY.set(0)
    }
    const applyOrientation = () => {
      frame = null
      if (!latest || !baseline || pointerActiveRef.current) return
      const tilt = (delta: number) =>
        (clamp(delta, SENSOR_RANGE) / SENSOR_RANGE) * MAX_TILT
      rotateX.set(-tilt(latest.y - baseline.y))
      rotateY.set(tilt(latest.x - baseline.x))
    }
    recalibrateRef.current = resetOrientation
    const onOrientation = (event: DeviceOrientationEvent) => {
      if (
        !active ||
        pointerActiveRef.current ||
        event.beta === null ||
        event.gamma === null ||
        !Number.isFinite(event.beta) ||
        !Number.isFinite(event.gamma)
      )
        return
      const orientation = viewportOrientation(event.beta, event.gamma)
      if (!baseline) {
        samples.push(orientation)
        if (samples.length < 6) return
        baseline = {
          x:
            samples.reduce((sum, sample) => sum + sample.x, 0) / samples.length,
          y:
            samples.reduce((sum, sample) => sum + sample.y, 0) / samples.length,
        }
        return
      }
      latest = orientation
      if (frame === null) frame = requestAnimationFrame(applyOrientation)
    }
    const onVisibilityChange = () => {
      if (!document.hidden) resetOrientation()
    }

    const permission = getOrientationPermissionRequest()
      ? (orientationPermission ?? Promise.resolve(false))
      : Promise.resolve(true)
    void permission.then((granted) => {
      if (active && granted)
        window.addEventListener("deviceorientation", onOrientation)
    })
    window.addEventListener("orientationchange", resetOrientation)
    document.addEventListener("visibilitychange", onVisibilityChange)

    return () => {
      active = false
      recalibrateRef.current = () => undefined
      window.removeEventListener("deviceorientation", onOrientation)
      window.removeEventListener("orientationchange", resetOrientation)
      document.removeEventListener("visibilitychange", onVisibilityChange)
      resetOrientation()
    }
  }, [enabled, pointerActiveRef, recalibrateRef, rotateX, rotateY])
}

export function useAlbumCoverTilt(reduceMotion: boolean) {
  const pointerActiveRef = useRef(false)
  const recalibrateRef = useRef<() => void>(() => undefined)
  const isPresent = useIsPresent()
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)")
  const motionDisabled = reduceMotion || prefersReducedMotion
  const rotateX = useSpring(0, spring)
  const rotateY = useSpring(0, spring)
  const tiltStyle: MotionStyle = { rotateX, rotateY }

  const reset = () => {
    pointerActiveRef.current = false
    recalibrateRef.current()
    rotateX.set(0)
    rotateY.set(0)
  }

  useOrientationTilt(
    isPresent && !motionDisabled,
    rotateX,
    rotateY,
    pointerActiveRef,
    recalibrateRef
  )

  useEffect(() => {
    if (isPresent && !motionDisabled) return
    pointerActiveRef.current = false
    recalibrateRef.current()
    if (motionDisabled) {
      rotateX.jump(0)
      rotateY.jump(0)
    } else {
      rotateX.set(0)
      rotateY.set(0)
    }
  }, [isPresent, motionDisabled, recalibrateRef, rotateX, rotateY])

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (
      motionDisabled ||
      !isPresent ||
      (event.pointerType === "touch" && !pointerActiveRef.current)
    )
      return
    pointerActiveRef.current = true
    const rect = event.currentTarget.getBoundingClientRect()
    const x = clamp((2 * (event.clientX - rect.left)) / rect.width - 1)
    const y = clamp((2 * (event.clientY - rect.top)) / rect.height - 1)
    rotateX.set(-y * MAX_TILT)
    rotateY.set(x * MAX_TILT)
  }

  return {
    style: tiltStyle,
    handlers: {
      onLostPointerCapture: reset,
      onPointerCancel: reset,
      onPointerDown: (event: PointerEvent<HTMLElement>) => {
        if (
          event.pointerType !== "touch" ||
          !isPresent ||
          motionDisabled ||
          event.button !== 0
        )
          return
        pointerActiveRef.current = true
        event.currentTarget.setPointerCapture(event.pointerId)
        onPointerMove(event)
      },
      onPointerLeave: (event: PointerEvent<HTMLElement>) => {
        if (event.pointerType !== "touch") reset()
      },
      onPointerMove,
      onPointerUp: (event: PointerEvent<HTMLElement>) => {
        if (event.pointerType === "touch") reset()
      },
    },
  }
}
