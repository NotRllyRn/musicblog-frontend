import { timingSafeEqual } from "node:crypto"

import { revalidateTag } from "next/cache"

import { mutateAlbumCatalog, type CatalogMutationEvent } from "@/lib/wordpress"

const events = new Set<CatalogMutationEvent>([
  "published",
  "updated",
  "deleted",
])

function authorized(request: Request) {
  const expected = process.env.WORDPRESS_WEBHOOK_SECRET
  const supplied = request.headers.get("authorization")?.replace(/^Bearer /, "")
  if (!expected || !supplied) return false

  const left = Buffer.from(expected)
  const right = Buffer.from(supplied)
  return left.length === right.length && timingSafeEqual(left, right)
}

export async function POST(request: Request) {
  if (!authorized(request))
    return Response.json({ error: "Unauthorized" }, { status: 401 })

  let body: { event?: unknown; postId?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (
    typeof body.event !== "string" ||
    !events.has(body.event as CatalogMutationEvent) ||
    !Number.isInteger(body.postId) ||
    Number(body.postId) < 1
  )
    return Response.json({ error: "Invalid event" }, { status: 400 })

  try {
    revalidateTag("wordpress-albums", { expire: 0 })
    return Response.json(
      await mutateAlbumCatalog(
        body.event as CatalogMutationEvent,
        Number(body.postId)
      )
    )
  } catch {
    return Response.json({ error: "Catalog update failed" }, { status: 502 })
  }
}
