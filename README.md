# After the Needle

A responsive record-shop browser for the music blog’s album archive.

```bash
pnpm dev
```

Open `http://localhost:3000/`. The catalog uses three groups on phones, five at
medium widths, and seven on desktop. Ultrawide layouts keep the catalog centered
at a readable width. Its light palette follows the quiet listening-index style;
its dark palette uses the warm record-shop treatment. The initial mode follows
the operating system and can be changed with the theme switch.

With a mouse, hover a record to preview it and click to open its existing post.
On touch screens, tap once to preview and tap the selected record again to open
it. Starting another scroll dismisses the preview. WordPress access is
server-only and read-only.
