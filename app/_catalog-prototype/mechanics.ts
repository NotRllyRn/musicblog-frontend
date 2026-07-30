import type { FlipMechanic } from "@/app/_catalog-prototype/types"

interface MechanicSettings {
  snap: "mandatory" | "proximity" | "none"
  step: number
  window: number
}

interface RecordVisual {
  opacity: number
  transform: string
}

export const mechanicSettings: Record<FlipMechanic, MechanicSettings> = {
  hinge: { snap: "mandatory", step: 72, window: 19 },
  orbit: { snap: "proximity", step: 96, window: 19 },
  shuffle: { snap: "mandatory", step: 82, window: 19 },
  push: { snap: "mandatory", step: 86, window: 19 },
  accordion: { snap: "mandatory", step: 54, window: 19 },
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const mix = (from: number, to: number, amount: number) =>
  from + (to - from) * amount

export function getRecordVisual(
  mechanic: FlipMechanic,
  rawDistance: number,
  index: number,
  reduceMotion: boolean,
  pull = 0
): RecordVisual {
  const distance = reduceMotion ? Math.round(rawDistance) : rawDistance
  const magnitude = Math.abs(distance)
  const direction = Math.sign(distance) || 1
  const focus = clamp(magnitude, 0, 1)
  const tail = Math.max(0, magnitude - 1)
  const tilt = [-2.4, 1.4, -0.8, 2.1][index % 4]
  const stackedZ = direction < 0 ? -82 - tail * 9 : -138 + tail * 10
  const visual = {
    x: 0,
    y: direction * (mix(0, 124, focus) + tail * 38),
    z: mix(-24, stackedZ, focus),
    rotateX: mix(-20, -40, focus),
    rotateY: 0,
    rotateZ: mix(-0.6, tilt, focus),
    scaleX: 0.92,
    scaleY: 0.92,
    opacity: 1,
  }

  if (mechanic === "orbit") {
    const orbitZ = direction < 0 ? -126 - tail * 14 : -210 + tail * 15
    visual.x = direction * mix(0, 32 + tail * 3, focus)
    visual.y = direction * (mix(0, 190, focus) + tail * 42)
    visual.z = mix(105, orbitZ, focus)
    visual.rotateX = mix(12, direction * -24, focus)
    visual.rotateY = mix(-5, direction * 68, focus)
    visual.rotateZ = 0
    visual.scaleX = visual.scaleY = mix(1.03, 0.82, focus)
    visual.opacity = 1
  }

  if (mechanic === "shuffle") {
    visual.x = mix(tilt * 2, direction * tilt * 5, focus)
    visual.y = direction * (mix(0, 190, focus) + tail * 42)
    visual.z = direction < 0 ? -72 - tail * 10 : -112 + tail * 8
    if (magnitude < 1) visual.z = mix(65, visual.z, focus)
    visual.rotateX = mix(13, direction * -42, focus)
    visual.rotateZ = mix(tilt, direction * 6, focus)
    visual.scaleX = visual.scaleY = mix(1, 0.94, focus)
    visual.opacity = 1
  }

  if (mechanic === "push") {
    const side = index % 2 ? 1 : -1
    const pushZ = direction < 0 ? -96 - tail * 10 : -164 + tail * 11
    visual.x = mix(0, side * (42 + tail * 2), focus)
    visual.y = direction * (mix(0, 185, focus) + tail * 40)
    visual.z = mix(88, pushZ, focus)
    visual.rotateX = mix(15, direction * -62, focus)
    visual.rotateZ = mix(tilt, side * 7, focus)
    visual.scaleX = visual.scaleY = mix(1, 0.9, focus)
    visual.opacity = 1
  }

  if (mechanic === "accordion") {
    const accordionZ = direction < 0 ? -104 - tail * 8 : -158 + tail * 10
    visual.y =
      direction < 0
        ? -(mix(0, 45, focus) + tail * 42)
        : mix(0, 170, focus) + tail * 42
    visual.z = mix(76, accordionZ, focus)
    visual.rotateX = mix(13, direction * -78, focus)
    visual.rotateZ = 0
    visual.scaleX = mix(1, 0.94, focus)
    visual.scaleY = mix(1, 0.18, focus)
    visual.opacity = 1
  }

  const pullLift = direction < 0 ? Math.max(-42, 68 - tail * 24) : 68
  visual.z = mix(visual.z, mix(132, 180, focus), pull)
  visual.rotateX = mix(visual.rotateX, mix(-18, 0, focus), pull)
  visual.rotateY = mix(visual.rotateY, 0, pull)
  visual.rotateZ = mix(visual.rotateZ, 0, pull)
  visual.scaleX = mix(visual.scaleX, mix(1.04, 1, focus), pull)
  visual.scaleY = mix(visual.scaleY, mix(1.04, 1, focus), pull)

  const anchor = mechanic === "hinge" ? mix(-72, -50, focus) : -50
  const transform = [
    `translate3d(${visual.x.toFixed(2)}px, calc(${anchor.toFixed(2)}% + ${visual.y.toFixed(2)}px - ${(pull * pullLift * focus).toFixed(2)}%), ${visual.z.toFixed(2)}px)`,
    `rotateX(${visual.rotateX.toFixed(2)}deg)`,
    `rotateY(${visual.rotateY.toFixed(2)}deg)`,
    `rotateZ(${visual.rotateZ.toFixed(2)}deg)`,
    `scaleX(${visual.scaleX.toFixed(3)})`,
    `scaleY(${visual.scaleY.toFixed(3)})`,
  ].join(" ")

  return { opacity: visual.opacity, transform }
}
