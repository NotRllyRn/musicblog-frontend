import assert from "node:assert/strict"
import test from "node:test"

import { albumShareImagePath, albumSharePath } from "./album-share.ts"

const album = {
  id: 2977,
  slug: "black-boy-alternative",
  title: "Black Boy (Alternative)",
  artist: "Dahi",
  imageUrl: "/api/albums/black-boy-alternative/artwork/c700a0ec0e57",
  imageAlt: "Black Boy (Alternative) album art",
}

test("versions album share URLs with the artwork", () => {
  assert.equal(
    albumSharePath(album),
    "/?album=black-boy-alternative&v=c700a0ec0e57"
  )
  assert.equal(
    albumShareImagePath(album),
    "/api/albums/black-boy-alternative/share/c700a0ec0e57"
  )
})
