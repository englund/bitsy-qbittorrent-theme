# qBittorrent WebUI theme: handoff

A modern, dark, mobile-friendly theme for the qBittorrent **5.3.0** WebUI. It is built as an *alternative WebUI*: a modified copy of the stock files in `www/`, developed against a mock API server so no real qBittorrent is needed.

## Run it

```bash
node --watch mock-server.mjs        # http://localhost:8090  (/login shows the login page)
```

- Port **8090**: 8080 is taken by a local nginx on this machine. The default is in `mock-server.mjs`.
- `.claude/launch.json` (preview config "mock") is excluded by a global gitignore, so it isn't in the repo.
- To use the theme for real: qBittorrent → Options → Web UI → **Use alternative WebUI** → point it at `<repo>/www`. Toggle the setting off and on, then hard-reload, after changes.
- Commits are authored with the personal address (victor.englund@protonmail.com) via an `includeIf "gitdir:~/src/"` rule. That's intended.

## Layout

| Path | What |
|---|---|
| `www/` | Stock WebUI from tag `release-5.3.0` (`src/webui/www`), plus our edits. The first commit is the pristine copy, so `git diff 4874bbe` shows every theme change. |
| `www/private/css/theme.css` | **All theme styling.** Loaded last; overrides the stock CSS instead of editing it. |
| `www/public/css/login-theme.css` | Login page styling. Self-contained (repeats the tokens it needs) because `private/` isn't served before login. Not named `theme.css` because the mock resolves `private/` first and would shadow it. |
| `www/private/scripts/theme.js` | Theme behaviour: the mobile sort menu, the mobile details sheet, tagging dialog frames for phones, and the shared `placeBelow` popover helper. |
| `mock-server.mjs` | Serves `www/` the way qBittorrent does: it fills in `QBT_TR(...)`, `${LANG}`, `${CACHEID}` and `${LANGUAGE_OPTIONS}`, and fakes `/api/v2`. Unknown endpoints are logged as `unmocked:`. |
| `icons.mjs` | Regenerates the icons from Lucide (see Icons). |

### Stock files we edited (keep these edits small; they matter when upgrading)
- `public/index.html`: links `login-theme.css` after `login.css`.
- `private/index.html`: links `theme.css` and `theme.js`; adds the mobile sort button and menu; the toolbar's leading `&nbsp;&nbsp;` is removed.
- `private/scripts/dynamicTable.js`: each `td` gets `data-column=<name>` so CSS can target columns; `TorrentsTable` uses 92px rows on mobile and updates when the breakpoint is crossed.
- 25 dialog pages (`private/*.html` that link `style.css`): link `theme.css`.
- `private/images/*.svg`: replaced with Lucide icons.

## Decisions

**Approach**
- Override, don't rewrite: one `theme.css` loaded last, plus minimal JS hooks. Upgrading means re-copying a new stock `www/` and re-applying the small list of edits above.
- Dark only: the theme tokens are set on both `:root` and `:root.dark`, so the light/dark toggle has no effect.
- Colors are CSS custom properties at the top of `theme.css` (`--bg`, `--surface`, `--surface-2/3`, `--accent` (blue), `--green`, `--orange`, `--red`, etc.). The stock `--color-*` variables are mapped onto them.

**Mobile (≤ 640px)**
- One column. The status filters become a horizontal chip row; categories, tags and trackers are hidden. Torrents show as **cards**: name and state icon, progress bar, then status, ↓ speed, ↑ speed and ETA.
- Hidden on mobile: the menu bar (so there's no logout button), queue buttons, torrent creator, the Search/RSS/Log tabs, the properties panel and the table header.
- The table is virtualized, so the card height is a *JS row height*. The **92px slot** (84px card + 8px gap) is defined in both `dynamicTable.js` and `theme.css`; keep them in sync.
- Sorting on mobile uses **one dropdown button** (a popover menu) showing the current column. Picking the active column flips the direction. It calls `torrentsTable.setSortedColumn`, so it persists like a header click. (We tried a select plus a separate direction button first; rejected.)
- Inputs on mobile use 16px text so iOS Safari doesn't zoom.
- Tapping a card opens a **details sheet**: the stock properties panel shown full-screen (`:root.details-open`), with a title bar (`#detailsSheetBar`, added by `theme.js`) holding the name and a close button. General's label/value table is restacked into one pair per line; Trackers, Peers and Content scroll sideways; their content is inset 16px while header and row backgrounds run to the edges (the scroller is padded and backgrounds are stretched back with `box-shadow` via `--row-bg`, because cells can't be padded without breaking column alignment). The Content filter gets its own row below the tabs. Tapping the active tab is disabled there, because stock would collapse the panel and remember that for desktop.

**Dialogs (Mocha windows)**
- Desktop: rounded, shadowed windows; form sections (`fieldset.settings`) are cards with small uppercase headings; the primary action (`button[type=submit]`, `#addButton`, Options Save) is blue in a **sticky footer**.
- Mobile: every window becomes a **full-screen sheet** (52px title bar, large close button). Rows stack: the label sits above its field, and checkboxes sit on the right.
- Dialog content lives in iframes, where media queries measure the *frame*, not the screen. `theme.js` adds `.mobile-sheet` to each dialog frame's `<html>` when the screen is phone-sized, and in-dialog mobile rules use `:root.mobile-sheet`, never `@media`.
- Mocha splits panel heights in proportion to their current height, so a panel must never be 0px tall. That's why `.panel` keeps a transparent 1px border.

**Tabs**
- A segmented control: a dark track, 34px tabs, 4px gaps, a subtle grey hover, and a blue selected pill.
- Rules are prefixed with `:root` because some windows (Options) load a **second copy of `Tabs.css`** after `theme.css`.
- Tab rows that don't fit **scroll sideways**, like the status chips. (A "⋮ more" overflow menu was built and then reverted; don't reintroduce it.)

**Icons**
- **Lucide** (ISC license; each SVG keeps its license comment). `icons.mjs` maps stock filename → Lucide name + color. Colors are baked into the SVG because `<img>` doesn't inherit `currentColor`.
- Color meaning: muted grey by default; green = start/downloading; blue = seeding/add/links; orange = queued/stop/stalled; red = remove/error; yellow = warning; purple = completed. Stalled torrents use grey arrows.
- To regenerate: download `lucide-static@1.61.0` (the command is in the header of `icons.mjs`), then run `node icons.mjs <path>/package/icons`.

**Login page**
- A centered card (max 360px; full width with a 16px gutter on phones): logo above the title (moved with `order`, not in the HTML), muted labels above 16px inputs, full-width blue Login button, red error text that wraps.

**Misc**
- Checkboxes and radios: both the box and its label are `vertical-align: middle`. This was measured to be within 0.3px across all Options tabs.

## Mock server notes
- Fakes 12 torrents in every state, speeds that change on each refresh, peers, trackers, files, pieces, the log and preferences.
- The add flow works end to end: `parseMetadata`/`fetchMetadata` return believable metadata, and `torrents/add` actually adds to the list (name, category, tags, stopped). It remembers names by hash, and URLs are split on `\r?\n`.
- Known gap: preferences lack the scheduler times, which logs one harmless console error when Options opens.

## Verifying
- Use the browser pane at **mobile** (375×812) and at a desktop width over 640. Very wide emulated sizes render tiny, so ~720–1100 works best.
- `MooTools` replaces the global `Event`; use `CustomEvent` when dispatching events from scripts.
- The native file picker can't be driven by automation. Call `qBittorrent.Client.uploadTorrentFiles([new File(...)])`, which is the same path the picker uses.

## Open ideas / next steps
- Mobile details sheet: card-style layouts for the Trackers/Peers/Content tables, and closing it with the phone's back gesture.
- Mobile: a way to reach logout, Search, RSS and Log (the menu bar is hidden).
- Mobile: category, tag and tracker filters (only the status chips are shown).
- Long-press context menu on cards: built into the stock UI but not tested on a real touch device.
- Test on a real phone (only emulated so far).
- Optional: a more compact variant of the tabs for the details-panel header on desktop (currently 53px tall).

## History
```
ecc4f44 feat(webui): restyle tabs as a segmented control
334c012 feat(webui): theme dialogs and make them full-screen sheets on mobile
25859cd feat(mock): support the add torrent flow and move to port 8090
e2efdfc fix(webui): update torrent row height when crossing the mobile breakpoint
988e727 feat(webui): add mobile sort menu and align toolbar with search bar
771e45f fix(mock): fake the piece availability endpoint
c119f53 feat(webui): replace stock icons with lucide
a1383d8 feat(webui): add modern dark theme with mobile card layout
4874bbe chore: add stock 5.3.0 webui and mock api server
```
