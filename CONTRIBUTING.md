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

## Verifying

- Use the browser pane at mobile (375×812) and at a desktop width over 640. Very wide emulated sizes render tiny, so ~720–1100 works best.
- MooTools replaces the global `Event`; use `CustomEvent` when dispatching events from scripts.
- While the browser pane is hidden the page renders no frames, so `requestAnimationFrame` and ResizeObserver never fire, and virtual tables set up then show a count with no rows. Show the pane before judging anything that renders on resize.
- The native file picker can't be driven by automation. Call `qBittorrent.Client.uploadTorrentFiles([new File(...)])`, the same path the picker uses.

## Workflow

Work is tracked in GitHub issues, labelled `bug`, `enhancement`, `accessibility`, `tech-debt` or `needs-device-test`. Every change starts from an issue: pick one, or open one. Anything bigger than a small fix, and anything visual on phones, is agreed in the issue first, with mockups or screenshots, because the rules in `DESIGN.md` are hard rules and a change that breaks one won't be merged.

Design choices (the mockups offered, which one was picked, the options rejected) are recorded as comments on the issue, with screenshots, not in the repo. The why of a single piece of code goes in a comment at that code; the why of a decision goes in the issue.

### Outside contributors

Fork, work on a branch, and open a pull request that says `Closes #N`. Keep it to one issue. For visual changes, attach screenshots at 375×812 and at a desktop width, before and after. Write commit messages in conventional-commit format (`fix(webui): ...`). Keep edits to stock files small and commented (see Stock files). Pull requests are squash-merged, so don't worry about tidying the history. Pull requests written with AI tools are welcome, but you must have read, understood and tested every change yourself and be able to answer review questions about it. Pull requests opened by autonomous agents with no human behind them are closed.

### Maintainer

The maintainer, and agents working for them, push straight to `main` with no pull requests, in conventional-commit format with `Closes #N` (or `Refs #N`) in the body. Parked or rejected work: close the issue as "not planned" with the patch attached to it.

## Mock server

It fakes torrents in every state, peers, trackers, files, the log, preferences, RSS, search, cookies and the add flow. Client data is kept in memory, so it resets when the mock restarts. To set a client data setting directly, POST it to `api/v2/clientdata/store` (keys have a `qbt_` prefix) and reload.
