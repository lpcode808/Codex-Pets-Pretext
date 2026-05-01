# Codex Pets Text Explorer

[Live GitHub Pages implementation](https://lpcode808.github.io/Codex-Pets-Pretext/)

A small prototype for the Codex pets idea: keep the Codex docs/settings page shape, add a Settings > Pets style selector, then let the selected official pet sprite explore live text while the text routes around it.

For future Codex/agent context, see [AGENT_CONTEXT.md](./AGENT_CONTEXT.md).

## How it was created

This project began as a user request in Codex Desktop on May 1, 2026. The user pointed to the OpenAI Developers Codex app settings page, especially the Codex Pets section, and asked for a playful shareable prototype that combined the pets with Cheng Lou's Pretext text layout idea.

The first agent response was a simple standalone canvas demo with hand-drawn pet-like avatars moving through text. The user then refined the request: use the original pets from the docs, mimic the Codex docs/settings page more closely, add a pet selector, and let the selected pet explore text while the paragraph layout makes room for it.

The final implementation was built as a static HTML/CSS/JavaScript prototype. It recreates the broad shape of the Codex settings page, downloads the public pet sprite sheets referenced by the docs component, wires up a selector for all eight pets, and uses Pretext when available to route text around the animated sprite. A canvas-measurement fallback keeps the demo working if the hosted Pretext module cannot load.

## What it uses

- The eight public pet sprite sheets referenced by the Codex app settings docs component:
  Codex, Dewey, Fireball, Rocky, Seedy, Stacky, BSOD, and Null Signal.
- The docs component's exposed animation grid: 8 columns by 9 rows, with 192 by 208 pixel frames.
- The docs component's pet names, prompts, and default animation states.
- Pretext line layout APIs when the hosted module loads, with a local canvas-measurement fallback.

## What it shows

- A Codex docs/settings mock with top nav, side docs nav, article content, and an "On this page" rail.
- A built-in pet selector that updates the selected sprite, prompt card, badge, and active canvas explorer.
- A text canvas where the selected pet moves through the paragraph and each line is routed around the sprite.
- Three exploration modes: roam text, scan line by line, and orbit paragraph.

## To try

Run a small static server from this folder:

```sh
python3 -m http.server 8000
```

Then open `http://127.0.0.1:8000/index.html`.
