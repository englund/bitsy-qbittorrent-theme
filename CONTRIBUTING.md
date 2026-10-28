# Contributing

Set up as in the README's Development section.

## Stock files

The first commit, `4874bbe`, is the pristine stock `release-5.3.0` WebUI. This lists every edit made to a stock file, leaving out the theme's own files and the regenerated icons:

```bash
git diff 4874bbe -- www ':!www/private/css/theme.css' ':!www/private/scripts/theme.js' \
    ':!www/public/css/login-theme.css' ':!www/public/scripts/login-theme.js' ':!www/private/images'
```

Keep stock edits small, and give each one a short comment saying why. Upgrading to a new qBittorrent means copying in its stock `www/`, reapplying that diff and rerunning `icons.mjs`.

## Gotchas

- MooTools replaces the global `Event`; use `CustomEvent` when dispatching events from scripts.

## Workflow

Work is tracked in GitHub issues, labelled `bug`, `enhancement`, `accessibility`, `tech-debt` or `needs-device-test`. Every change starts from an issue: pick one, or open one. Anything bigger than a small fix, and anything visual on phones, is agreed in the issue first, with mockups or screenshots, because the rules in `DESIGN.md` are hard rules and a change that breaks one won't be merged.

Design choices (the mockups offered, which one was picked, the options rejected) are recorded as comments on the issue, with screenshots, not in the repo. The why of a single piece of code goes in a comment at that code; the why of a decision goes in the issue.

### Outside contributors

Fork, work on a branch, and open a pull request that says `Closes #N`. Keep it to one issue. For visual changes, attach screenshots at 375×812 and at a desktop width, before and after. Write commit messages in conventional-commit format (`fix(webui): ...`). Pull requests are squash-merged, so don't worry about tidying the history. Pull requests written with AI tools are welcome, but you must have read, understood and tested every change yourself and be able to answer review questions about it. Pull requests opened by autonomous agents with no human behind them are closed.

### Maintainer

The maintainer, and agents working for them, push straight to `main` with no pull requests, in conventional-commit format with `Closes #N` (or `Refs #N`) in the body. Parked or rejected work: close the issue as "not planned" with the patch attached to it.
