# Contributing

## Run it

```bash
node --watch mock-server.mjs        # http://localhost:8090  (/login shows the login page)
```

It runs on port 8090 because 8080 is taken locally; the default is in `mock-server.mjs`. To try the theme on a real qBittorrent, turn on **Use alternative WebUI** in Options › Web UI and point it at `www/`. Toggle the setting off and on, then hard-reload, after changes.

## Layout

| Path | What |
|---|---|
| `www/` | Stock WebUI from tag `release-5.3.0` (`src/webui/www`), plus the theme. |
| `www/private/css/theme.css` | All theme styling. Loaded last; overrides the stock CSS instead of editing it. |
| `www/public/css/login-theme.css` | Login page styling. Self-contained, because `private/` isn't served before login. Not named `theme.css` because the mock resolves `private/` first and would shadow it. |
| `www/private/scripts/theme.js` | Theme behaviour: the phone menus, drill-downs and details sheet, dialog frames on phones, Mocha window sizing. |
| `mock-server.mjs` | Serves `www/` the way qBittorrent does (fills in `QBT_TR(...)`, `${LANG}`, `${CACHEID}`) and fakes `/api/v2`. Unknown endpoints are logged as `unmocked:`. |
| `icons.mjs` | Regenerates `www/private/images` from Lucide. Download the icons with `curl -sL $(npm view lucide-static@1.61.0 dist.tarball) \| tar xz`, then run `node icons.mjs package/icons`. |

## Stock files

The first commit, `4874bbe`, is the pristine stock `release-5.3.0` WebUI. This lists every edit made to a stock file, leaving out the theme's own files and the regenerated icons:

```bash
git diff 4874bbe -- www ':!www/private/css/theme.css' ':!www/private/scripts/theme.js' \
    ':!www/public/css/login-theme.css' ':!www/public/scripts/login-theme.js' ':!www/private/images'
```

Keep stock edits small, and give each one a short comment saying why. Upgrading to a new qBittorrent means copying in its stock `www/`, reapplying that diff and rerunning `icons.mjs`.

## Design principles (mobile, ≤ 640px)

Distilled from Apple's Human Interface Guidelines and Google's Material Design 3 (Oct 2026). Every new or changed mobile screen follows these. A screen that can't (usually because stock markup or behaviour is in the way) is an exception: ask the user before making it (when working unattended, leave that screen as is and report it), then list it under "Exceptions" with the reason.

1. **Touch targets:** 44×44px minimum on everything tappable (Apple 44pt; Material 48dp), at least 8px between neighbouring targets. List rows, menu items and the primary button are 48px, which satisfies both (chosen by the user). A small visual (20px checkbox, 16px icon) is fine when its row or padding is the target.
2. **Spacing:** only 4 / 8 / 12 / 16 / 24.
3. **Gutter:** 16px side margins on every screen (Material and iOS; the login page already used it). Chosen by the user over the earlier 12px.
4. **Lists and drill-down:** one item per row, full width, a trailing chevron when the row opens another page, each level a history entry with a back chevron at the leading edge of the title bar. Never a horizontally scrolling table or tab row for primary content. Result lists are cards.
5. **Forms:** label above a full-width field, never a placeholder as the only label, 16px input text (stops iOS zoom). Radios for 2–5 exclusive choices, a select beyond that. A checkbox sits on its label's row, and the whole row is the target.
6. **One primary action per view:** blue filled, white text, full width in a sticky footer or trailing in the title bar. Other actions are plain (grey) buttons; show priority by style, not size. Destructive actions are red. In a row of buttons the primary is trailing; in a stack it's on top.
7. **Dialogs:** forms and multi-step tasks are full-screen sheets (title bar with close/back, content, sticky footer). Small centred dialogs are only for short confirmations with at most 3 buttons. One modal at a time; nothing opens behind another layer.
8. **Menus:** items 44–48px, most-used first, grouped with dividers, one submenu level at most, "…" when more input follows, icons on every item of a group or none. A menu taller than the screen scrolls inside its own box.
9. **Type:** body 16px (line height 24), secondary 14px, nothing under 11px; sheet titles about 20–22px.
10. **Contrast:** text at least 4.5:1 (3:1 at 18px+ or bold); icons and control outlines at least 3:1.
11. **Dark surfaces:** depth shown by lighter tones, not shadows: background < card < sheet/menu < raised control.
12. **States:** every control has a pressed/active state; disabled controls are dimmed but stay visible.
13. **Same features at every size:** mobile may move a feature (into ☰, a drill-down, a long-press menu) but never removes it.

Sources: Apple HIG, Google's touch-target guidance and the Material 3 component docs and tokens.

**Exceptions** (approved by the user)
- Context menus stay stock, 30px rows (below rule 8). The user compared them with a 44px bottom sheet and preferred stock. Their text stays 13px too (below rule 9): at 16px the torrent menu runs off an 812px screen.
- Data tables (Add torrent's files; Torrent Creator; Rename Files) are 14px, not 16px (rule 9). At 16px their narrow columns (IP, port, tier) cut off almost everything. Chosen by the user from mockups.

## Verifying

- Use the browser pane at mobile (375×812) and at a desktop width over 640. Very wide emulated sizes render tiny, so ~720–1100 works best.
- MooTools replaces the global `Event`; use `CustomEvent` when dispatching events from scripts.
- While the browser pane is hidden the page renders no frames, so `requestAnimationFrame` and ResizeObserver never fire, and virtual tables set up then show a count with no rows. Show the pane before judging anything that renders on resize.
- The native file picker can't be driven by automation. Call `qBittorrent.Client.uploadTorrentFiles([new File(...)])`, the same path the picker uses.

## Workflow

Work is tracked in GitHub issues, labelled `bug`, `enhancement`, `accessibility`, `tech-debt` or `needs-device-test`. Every change starts from an issue: pick one, or open one. Anything bigger than a small fix, and anything visual on phones, is agreed in the issue first, with mockups or screenshots, because the Design principles are hard rules and a change that breaks one won't be merged.

Design choices (the mockups offered, which one was picked, the options rejected) are recorded as comments on the issue, with screenshots, not in the repo. The why of a single piece of code goes in a comment at that code; the why of a decision goes in the issue.

### Outside contributors

Fork, work on a branch, and open a pull request that says `Closes #N`. Keep it to one issue. For visual changes, attach screenshots at 375×812 and at a desktop width, before and after. Write commit messages in conventional-commit format (`fix(webui): ...`). Keep edits to stock files small and commented (see Stock files). Pull requests are squash-merged, so don't worry about tidying the history.

### Maintainer

The maintainer, and agents working for them, push straight to `main` with no pull requests, in conventional-commit format with `Closes #N` (or `Refs #N`) in the body. Parked or rejected work: close the issue as "not planned" with the patch attached to it.

## Mock server

It fakes torrents in every state, peers, trackers, files, the log, preferences, RSS, search, cookies and the add flow. Client data is kept in memory, so it resets when the mock restarts. To set a client data setting directly, POST it to `api/v2/clientdata/store` (keys have a `qbt_` prefix) and reload.
