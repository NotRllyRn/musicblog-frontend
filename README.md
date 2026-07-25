# Music Journal Frontend

A clean Next.js starting point for a WordPress-powered music journal. The
current page is intentionally small: it is a foundation smoke test for the
Astryx design system and does not include the previous prototype UI.

## Development

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Astryx

Astryx is installed with the neutral theme and wrapped at the application root.
Use its CLI to discover components before adding UI:

```bash
pnpm exec astryx build "music journal page"
pnpm exec astryx component Button
pnpm exec astryx doctor
```

The CSS cascade order starts in `app/layers.css`; Astryx reset, component, and
theme styles are imported from `app/globals.css`.
