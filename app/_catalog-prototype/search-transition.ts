const MAX_ANIMATED_VIEWPORT_PIXELS = 3_000_000
const MAX_PROXY_PIXELS = 300_000
const PROXY_SELECTOR = ".catalog-search-proxy[data-album-id]"
const RECORD_SELECTOR =
  '.record-field:not([data-catalog-hidden="true"]) .record-figure[data-search-transition][data-album-id]'

interface RecordSnapshot {
  albumId: string
  node: HTMLElement
  rect: DOMRect
}

interface ActiveTransition {
  cancel: () => void
  layer: HTMLElement
}

interface ProxyEffect {
  animation: Animation
  target?: HTMLElement
}

let activeTransition: ActiveTransition | null = null

const snapshotsFrom = (selector: string, root: ParentNode = document) => {
  const center = window.innerWidth / 2
  const candidates = [...root.querySelectorAll<HTMLElement>(selector)].flatMap(
    (node) => {
      const albumId = node.dataset.albumId
      const rect = node.getBoundingClientRect()
      return albumId && rect.width && rect.height
        ? [{ albumId, node, rect }]
        : []
    }
  )
  candidates.sort(
    (left, right) =>
      Math.abs(left.rect.x + left.rect.width / 2 - center) -
      Math.abs(right.rect.x + right.rect.width / 2 - center)
  )

  let pixels = 0
  return candidates.filter(({ rect }, index) => {
    const area = rect.width * rect.height * window.devicePixelRatio ** 2
    if (index && pixels + area > MAX_PROXY_PIXELS) return false
    pixels += area
    return true
  })
}

const currentSnapshots = () =>
  activeTransition
    ? snapshotsFrom(PROXY_SELECTOR, activeTransition.layer)
    : snapshotsFrom(RECORD_SELECTOR)

const proxyFor = (snapshot: RecordSnapshot) => {
  const proxy = snapshot.node.cloneNode(false) as HTMLElement
  const image = snapshot.node.querySelector("img") as HTMLImageElement | null
  const inheritedArtwork = snapshot.node.classList.contains(
    "catalog-search-proxy"
  )
    ? getComputedStyle(snapshot.node).backgroundImage
    : "none"
  const artwork = image?.currentSrc || image?.src

  proxy.classList.add("catalog-search-proxy")
  proxy.removeAttribute("data-search-transition")
  proxy.removeAttribute("data-search-proxy-target")
  proxy.removeAttribute("style")
  if (artwork) proxy.style.backgroundImage = `url(${JSON.stringify(artwork)})`
  else if (inheritedArtwork !== "none")
    proxy.style.backgroundImage = inheritedArtwork
  return proxy
}

const createProxyLayer = () => {
  const layer = document.createElement("aside")
  layer.className = "catalog-search-proxy-layer"
  layer.ariaHidden = "true"
  const shell = document.querySelector<HTMLElement>(".variant-shell")
  if (shell) {
    const styles = getComputedStyle(shell)
    ;[
      "--catalog-ink",
      "--catalog-paper",
      "--record-border",
      "--record-radius",
      "--record-shadow",
    ].forEach((property) =>
      layer.style.setProperty(property, styles.getPropertyValue(property))
    )
  }
  document.body.append(layer)
  return layer
}

const transformBetween = (from: DOMRect, to: DOMRect) =>
  `translate3d(${from.x - to.x}px, ${from.y - to.y}px, 0) scale(${from.width / to.width}, ${from.height / to.height})`

const proxyKeyframes = ({
  destination,
  fromTransform,
  incoming,
}: {
  destination: boolean
  fromTransform: string
  incoming: boolean
}): Keyframe[] => {
  if (!destination)
    return [
      { opacity: 1, transform: fromTransform },
      { opacity: 0, transform: "none" },
    ]
  if (incoming)
    return [
      { opacity: 0, transform: fromTransform },
      { opacity: 1, transform: "none" },
    ]
  return [
    { opacity: 1, transform: fromTransform },
    { opacity: 1, transform: "none" },
  ]
}

const animateSnapshot = ({
  destination,
  duration,
  easing,
  incoming,
  layer,
  source,
}: {
  destination?: RecordSnapshot
  duration: number
  easing: string
  incoming: boolean
  layer: HTMLElement
  source: RecordSnapshot
}): ProxyEffect => {
  const targetRect = destination?.rect ?? source.rect
  const proxy = proxyFor(source)
  proxy.style.setProperty("--proxy-left", `${targetRect.x}px`)
  proxy.style.setProperty("--proxy-top", `${targetRect.y}px`)
  proxy.style.setProperty("--proxy-width", `${targetRect.width}px`)
  proxy.style.setProperty("--proxy-height", `${targetRect.height}px`)
  layer.append(proxy)

  const verticalOffset = incoming ? 8 : -8
  const fallbackTransform = `translate3d(0, ${verticalOffset}px, 0) scale(0.96)`
  const fromTransform = destination
    ? transformBetween(source.rect, targetRect)
    : fallbackTransform
  const animation = proxy.animate(
    proxyKeyframes({
      destination: Boolean(destination),
      fromTransform,
      incoming,
    }),
    { delay: 80, duration, easing, fill: "forwards" }
  )
  if (destination) destination.node.dataset.searchProxyTarget = "true"
  return { animation, target: destination?.node }
}

const recordsAfterUpdate = (sources: RecordSnapshot[]) => {
  const destinations = new Map(
    snapshotsFrom(RECORD_SELECTOR).map((snapshot) => [
      snapshot.albumId,
      snapshot,
    ])
  )
  const sourceIds = new Set(sources.map(({ albumId }) => albumId))
  const records = [
    ...sources,
    ...[...destinations.values()].filter(
      ({ albumId }) => !sourceIds.has(albumId)
    ),
  ]
  return { destinations, records, sourceIds }
}

const animateRecords = ({
  destinations,
  layer,
  records,
  sourceIds,
}: ReturnType<typeof recordsAfterUpdate> & { layer: HTMLElement }) => {
  const easing = getComputedStyle(document.documentElement)
    .getPropertyValue("--ease-standard")
    .trim()
  return records.map((source) =>
    animateSnapshot({
      destination: destinations.get(source.albumId),
      duration: 230,
      easing,
      incoming: !sourceIds.has(source.albumId),
      layer,
      source,
    })
  )
}

export function startSearchTransition(update: (animated: boolean) => void) {
  if (window.innerWidth * window.innerHeight > MAX_ANIMATED_VIEWPORT_PIXELS) {
    activeTransition?.cancel()
    update(false)
    return { cancel: () => undefined, finished: Promise.resolve() }
  }

  const sources = currentSnapshots()
  activeTransition?.cancel()
  update(true)

  const records = recordsAfterUpdate(sources)
  if (!records.records.length)
    return { cancel: () => undefined, finished: Promise.resolve() }

  const layer = createProxyLayer()
  const effects = animateRecords({ ...records, layer })

  let cleaned = false
  const cleanup = () => {
    if (cleaned) return
    cleaned = true
    effects.forEach(({ animation, target }) => {
      animation.cancel()
      target?.removeAttribute("data-search-proxy-target")
    })
    window.removeEventListener("resize", cleanup)
    layer.remove()
    if (activeTransition?.layer === layer) activeTransition = null
  }
  window.addEventListener("resize", cleanup, { once: true })
  activeTransition = { cancel: cleanup, layer }

  return {
    cancel: cleanup,
    finished: Promise.all(
      effects.map(({ animation }) => animation.finished)
    ).then(cleanup, cleanup),
  }
}
