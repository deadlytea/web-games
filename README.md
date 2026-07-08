# toddler-games

A collection of tiny touch-friendly web games, behind one launcher. Vector/SVG
art, synthesized sound, no asset files, works offline once built.

## Run

```sh
npm install      # first time only
npm run dev      # local dev, prints a LAN URL for the tablet
npm run build    # production build into dist/
npm run preview  # serve the build (also on the LAN)
```

`npm run dev` prints a `Network:` URL — open that on the tablet (same Wi-Fi).

## Add a game

1. Create `src/games/<name>/index.ts` exporting a `Game` (see `types.ts`).
   It gets a container element and returns `{ unmount() }`.
2. Add it to the array in `src/registry.ts`.

That's the whole contract. Use plain SVG/DOM for simple games; pull in a game
engine (e.g. KAPLAY) only inside games that need physics.

## Art

Shapes are inline SVG in `src/games/<name>/shapes.ts`. To add more, ask Claude
for a shape drawn in a `0 0 100 100` viewBox and paste it into the `SHAPES` list.
