# After the Needle

A responsive record-shop browser for the music blog’s album archive.

```bash
pnpm dev
```

Open `http://localhost:3000/?variant=A`. Try variants `A` through `E` with the
bottom controls. Variant A is the selected hinged-record direction. The catalog
uses three groups on phones, five at medium widths, and seven on desktop.
Ultrawide layouts keep the catalog centered at a readable width.

With a mouse, hover a record to preview it and click to open its existing post.
On touch screens, tap once to preview and tap the selected record again to open
it. Starting another scroll dismisses the preview. WordPress access is
server-only and read-only.
