# O-Analysis

A browser app for analysing orienteering maps. Import a map image, overlay GPX
tracks (georeferenced by pinning points), draw routes, add numbered control
annotations, and export an annotated PNG.

Everything runs in the browser. Projects autosave to IndexedDB, and you can
save them as `.anal` files to move between devices or keep a copy.

## Getting started

Requires [Bun](https://bun.sh) 1.3 or newer.

```bash
bun install
bun run dev        # start the dev server
```

## Scripts

| Command | What it does |
| --- | --- |
| `bun run dev` | Vite dev server with hot reload |
| `bun run test` | Unit tests (Vitest) |
| `bun run lint` | Oxlint |
| `bun run build` | Generate PWA icons, type-check, and build for production |
| `bun run preview` | Serve the production build locally |

## Configuration

Copy `.env.example` to `.env.local` and set `VITE_ANALYTICS_HOSTNAME` to the
domain registered with One Dollar Stats. Without it, the build uses
`oanalysis.com`.

## Project layout

- `src/store.ts`: Zustand store, undo/redo history, and the IndexedDB autosave
  layer (project JSON plus the map image as a separate Blob)
- `src/utils/project.ts`: open, save, and the confirm-before-replacing flow
- `src/utils/projectValidation.ts`: checks every entry of a `.anal` file before
  it is loaded
- `src/utils/export.ts`, `src/utils/exportScale.ts`: PNG composition and the
  iOS canvas-size limit
- `src/components/canvas/`: Konva layers for the map, GPX tracks and markers
- `src/utils/gpx.ts`, `gpxMetrics.ts`: GPX parsing and per-point metrics

## Project file format

`.anal` files are JSON with `format: "map-analysis"` and `version: 1`. They hold
the map image as a data URL, GPX tracks, drawings, annotations, and the canvas
rotation. Older files that embed the map image load without changes.

## Privacy

The app does not upload map, track or project data. Analytics records only
anonymous usage events, such as that an export happened. See the Privacy Policy
inside the app for details.
