Read `DESIGN.md` first: it holds the hard design rules. `CONTRIBUTING.md` holds the workflow.

Start a session with `gh issue list`, and follow the Workflow section of `CONTRIBUTING.md`.

## Verifying

- Use the browser pane at mobile (375×812) and at a desktop width over 640. Very wide emulated sizes render tiny, so ~720–1100 works best.
- While the browser pane is hidden the page renders no frames, so `requestAnimationFrame` and ResizeObserver never fire, and virtual tables set up then show a count with no rows. Show the pane before judging anything that renders on resize.
- The native file picker can't be driven by automation. Call `qBittorrent.Client.uploadTorrentFiles([new File(...)])`, the same path the picker uses.
