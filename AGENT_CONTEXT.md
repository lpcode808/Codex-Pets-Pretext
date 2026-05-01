# Agent Context

This repo was created from a Codex Desktop conversation on May 1, 2026.

Original user intent:

- The user linked the OpenAI Developers Codex app settings page at `https://developers.openai.com/codex/app/settings#codex-pets`.
- They liked the Codex pets idea and wanted a shareable prototype where the pets move through text using Cheng Lou's Pretext text layout approach.
- The first pass was a standalone canvas demo with drawn pet-like avatars.
- The user then asked to "go to the original pets docs and grab or recreate them," mimic the original docs/settings page, add a pet selector, and let the selected pet explore the text.
- The prototype was rebuilt as a Codex docs/settings page mock with all eight public pet sprite sheets referenced by the docs component.
- The user then asked to move it into a dedicated `Codex-Pets-Pretext` project folder for GitHub publishing.

Useful implementation details:

- `app.js` contains the pet metadata copied from the public hydrated docs component: names, prompts, sprite URLs, default animation states, and sprite frame timing.
- The official sprite sheets are stored under `assets/pets/`.
- Each sprite sheet is 1536 by 1872 pixels, arranged as an 8 column by 9 row grid of 192 by 208 pixel frames.
- The text canvas tries to import `@chenglou/pretext` from `https://esm.sh/@chenglou/pretext?bundle`.
- If that import fails, the app uses a local canvas text-measurement fallback.
- The key interaction is that the selected pet moves across the canvas and the text line layout creates blocked intervals around the sprite, then routes text through the remaining row segments.

Source references used during the conversation:

- OpenAI Codex pets docs: `https://developers.openai.com/codex/app/settings#codex-pets`
- Pet asset paths exposed by the docs component, e.g. `/images/codex/app/pets/codex-spritesheet.webp`
- Pretext repo: `https://github.com/chenglou/pretext`

Conversation breadcrumb:

- The temporary build workspace was a Codex Desktop scratch folder created on May 1, 2026.
- If a future agent harness can inspect local Codex Desktop thread history, search for the thread around May 1, 2026 containing: "hey you folks made a cool thing", "hot new framework pretext", and "Codex-Pets-Pretext".
