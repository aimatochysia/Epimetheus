# Epimetheus

A private kanban board that lives entirely in the browser. Columns hold blocks, and a block can hold more blocks. Nothing is sent to a server.

```bash
npm install
npm run dev
```

`npm test` checks the board rules. `npm run build` produces an installable offline app in `dist`.

The board is encrypted in IndexedDB with a key that stays on this browser. Export downloads the readable board as `epimetheus-board.json`. Import replaces the board with that file.

Ticking a parent whose blocks inside are all ticked carries that parent into the next column. Drag a block by its grip to reorder it, move it between columns, or drop it on the groove at the bottom of a card to nest it.
