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
| `www/private/scripts/theme.js` | Theme behaviour: the mobile sort, filter and main menus, the mobile details sheet, the mobile Options category list, the mobile RSS and RSS Downloader drill-downs, search result taps, tagging dialog frames for phones, and the shared `placeBelow` popover helper. |
| `mock-server.mjs` | Serves `www/` the way qBittorrent does: it fills in `QBT_TR(...)`, `${LANG}`, `${CACHEID}` and `${LANGUAGE_OPTIONS}`, and fakes `/api/v2`. Unknown endpoints are logged as `unmocked:`. |
| `icons.mjs` | Regenerates the icons from Lucide (see Icons). |

### Stock files we edited (keep these edits small; they matter when upgrading)
- `public/index.html`: links `login-theme.css` after `login.css`.
- `private/index.html`: links `theme.css` and `theme.js`; adds the mobile sort button and menu, the mobile filter button (before Options), and the mobile main menu button and menu (after Options; CSS reorders the mobile toolbar); the toolbar's leading `&nbsp;&nbsp;` is removed.
- `private/scripts/dynamicTable.js`: each `td` gets `data-column=<name>` so CSS can target columns; a `useMobileRowHeight(px)` helper on `DynamicTable` swaps the virtual-list row height on mobile and rerenders when the breakpoint is crossed. Called by `TorrentsTable` (92), `SearchResultsTable` (72), at 48 by `RssFeedTable`, `RssArticleTable` and the three RSS Downloader tables, and at 44 by `TorrentFilesTable` (details sheet Content, Add torrent, bulk rename). It queries `window.top`, so tables in dialog frames follow the screen, not the frame.
- `private/scripts/client.js`: the window-resize handler doesn't save the filter width and panel split in the mobile layout, where the panel is hidden or full-screen and would save 0 or ~94%.
- 25 dialog pages (`private/*.html` that link `style.css`): link `theme.css`.
- `private/images/*.svg`: replaced with Lucide icons. `menu.svg` is new (the mobile ☰ button).

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

Sources: Apple HIG (layout, lists and tables, sheets, buttons, menus, text fields, toggles, accessibility, typography, dark mode, alerts, action sheets); Google accessibility touch-target guidance (support.google.com/accessibility/android/answer/7101858); Material 3 component docs and Compose Material3 tokens (list 56/72dp rows, menu items 48dp, minimum touch size 48dp). m3.material.io itself couldn't be read.

**Exceptions** (approved by the user)
- Context menus stay stock, 30px rows (below rule 8). The user compared them with a 44px bottom sheet and preferred stock.

## Decisions

**Approach**
- Override, don't rewrite: one `theme.css` loaded last, plus minimal JS hooks. Upgrading means re-copying a new stock `www/` and re-applying the small list of edits above.
- Dark only: the theme tokens are set on both `:root` and `:root.dark`, so the light/dark toggle has no effect.
- Colors are CSS custom properties at the top of `theme.css` (`--bg`, `--surface`, `--surface-2/3`, `--accent` (blue), `--green`, `--orange`, `--red`, etc.). The stock `--color-*` variables are mapped onto them.

**Mobile (≤ 640px)**
- One column. Torrents show as **cards**: name and state icon, progress bar, then status, ↓ speed, ↑ speed and ETA.
- Hidden on mobile: the menu bar, every toolbar action icon (add, remove, start, stop, queue, torrent creator), the main tabs, the ⚙ Options button, the properties panel and the table header.
- The mobile toolbar is **two rows**: ☰ and the search field, then the filter pill (left) and the sort pill (right). `#torrentsFilterToolbar` is `display: contents` so its search field and sort button join the toolbar's flex row, and `order` plus a near-100% search basis do the wrapping. Outside Transfers only ☰ is left (stock hides the search toolbar there; the pill is hidden with it, since its menu lives in the hidden filters column). `placeBelow` hangs a popover from the left edge of buttons in the left half of the screen and from the right edge otherwise.
- Torrent actions live in the **stock context menu**, opened by a long press (stock) or the vertical **⋮ on each card**. The ⋮ is a `tr::after` mask, not an element, because stock rebuilds the virtualized rows; `theme.js` treats a tap in the card's top-right 44×40px as a tap on it, stops the click (so the details sheet doesn't open) and dispatches `contextmenu` on the row, which selects it and opens the menu with its top-right corner on the ⋮'s centre, wherever in the hit area the tap landed. The details sheet has no actions button (the user chose card-only).
- A **☰ menu button** (`#mobileMenuButton`, first in the top toolbar) replaces ⚙ and opens `#mobileMenu`: Add Torrent File…, Add Torrent Link…, then Transfers, Search, RSS, Execution Log, then Torrent Creator, Statistics, Manage Cookies…, then Options, About and Logout. Each item clicks the hidden stock element named in its `data-click`, so stock behaviour is reused; labels use the stock `QBT_TR` strings. Items for tabs hidden by preferences (`.invisible` on the stock tab) are hidden, and the current tab is highlighted, both with CSS `:has()` on the stock tabs, so nothing is synced. ⚙ was folded into the menu (instead of adding ☰ next to it). Mobile `#mainColumn` needs its own `.invisible` rule (its `display: flex` beats stock's), and the Search/RSS/Log columns get `width: 100%` because Mocha leaves them 0px wide.
- The table is virtualized, so the card height is a *JS row height*. The **92px slot** (84px card + 8px gap) is defined in both `dynamicTable.js` and `theme.css`; keep them in sync.
- Sorting on mobile uses **one dropdown button** (a popover menu) showing the current column. Picking the active column flips the direction. It calls `torrentsTable.setSortedColumn`, so it persists like a header click. (We tried a select plus a separate direction button first; rejected.)
- Crossing back to desktop (e.g. rotating a phone to landscape) restores the saved panel split in `theme.js`: Mocha laid the hidden panel out at 0px and would keep it there, because it shares space in proportion to current heights.
- Filtering is **one pill button** at the left of the toolbar's second row. It opens the whole stock filters panel (`#Filters_pad`: Status, Categories, Tags, Trackers, with their section headers and counts) as a popover menu; picking an item filters and closes it. The pill shows the status icon and, as its label, the selected category/tag/tracker names (`·`-joined), or the status name when those are all "All"; counts are left off. Only one name fits at 375px, which is why the status is shown by icon only once another filter is set. The popover *is* the stock pad (`theme.js` sets `popover` and `.popoverMenu` on it on mobile and removes them on desktop), so stock click handlers, live counts, collapsible sections and auto-hidden zero filters work with no syncing. `theme.js` waits for the pad with a `MutationObserver`, because `client.js` creates the panel after an async start-up step. Mocha sets `display: block` inline on the pad, so the closed popover is hidden with `!important`. Its column can't be `display: none`, because a popover under a hidden ancestor doesn't render; the column collapses instead. Stock indents categories with an inline `padding-left` of depth × 20 + 6px, so their icons get 6px extra margin to line up with the other sections. The pill has a zero flex basis so it never pushes Sort to another line; it grows to its text and ellipsizes. `.popoverMenu` styles only its direct `button` children, so the category expand toggles aren't styled as menu items. (Replaced a sideways-scrolling chip row that hid most statuses. The pill was first in the search row next to Sort, but that squeezed the search field to ~10 characters.)
- Inputs on mobile use 16px text so iOS Safari doesn't zoom.
- **Touch targets and spacing** (agreed with the user): everything tappable is at least **44px** (`--touch`, Apple's minimum): fields, selects, buttons, icon buttons (☰, back, close, RSS actions), tabs, sliders, pills. Checkboxes and radios are a 20px box; the label beside them is the 44px target (a box holding one checkbox and its label becomes a flex row with an 8px gap; boxes with more fields keep their layout). Drill-down list rows stay 48px; popover menu items are ~44px. Spacing uses **4 / 8 / 12 / 16 / 24**: 12px page gutter, 8px between a label and its field and between controls in a row. The global minimums are one block at the end of `theme.css`, written twice: under the media query for the page and under `:root.mobile-sheet` for dialog frames. Virtualized tables with controls in their rows need a matching JS row height (`useMobileRowHeight`).
- Options on mobile: `.formRow`s wrap a label above its field (selects are full width too), a unit ("ms", "KiB/s") stays beside its field, Advanced's label | checkbox rows keep the checkbox on the label's line at the right, and a legend holding a checkbox is floated into its box (as in dialog frames). Create Torrent (loaded into the page, not a frame) stacks labels the same way. Confirm dialogs (remove torrent) put their buttons side by side across the bottom; Share ratio is one radio per row with the custom limits indented under it; its Save and Add torrent's Download are full-width blue.
- **Search, RSS and Log** follow the same rules: 12px side gutter, controls stacked full width, 34px fields with the 16px search icon. The views load their own `<style>` after `theme.css`, so rules overriding them are prefixed with `:root`. Their columns are `flex: 1` in the mobile page column (Mocha's inline heights overshot the footer).
- **Log** keeps its table (it scrolls sideways like the details-sheet tables); only the controls were fixed. Stock pins the filter bar at 24px, so its wrapped row overlapped the results line.
- **Search** results are **cards** like the torrents (name; size, ↑ seeders, ↓ leechers, engine), sharing the torrent card styles via `:is(#torrentsTableDiv, #searchResultsTableDiv)`. Tapping a card opens the download window (what a double-click does on desktop); the ⋮ (same `tr::after` and tap handler as torrent cards) opens the stock context menu. The seed/size filters and the "Search in:" label are hidden; the "Search in" select stays. Multiple searches still show as the stock tab row.
- **RSS** is a **drill-down** like the details sheet: feeds → articles → article, `data-rss-page` on `#rssView` shows one pane, each level is a `history` entry (`{ rss: ... }`), and a back bar (`#rssSheetBar`, added by `theme.js`) shows the feed name. Picking another view from ☰ drops those entries. Rows are 48px list rows with a chevron. The action buttons are icon-only beside the filter (their images carry the names). The article page hides the filter row and puts **Download torrent** (label cloned from the article context menu) in the bar; it dispatches `dblclick` on the selected article, the desktop path. Feed management (rename, delete, new folder) is the stock long-press menu.
- The **RSS Downloader** window is a drill-down like Options: rules → rule editor → matching articles, with `data-rssdl-page` (`rules`, `rule`, `articles`) on the window showing one column per page. Each level is a `history` entry (`{ rssDownloader: ... }`); back steps out and then closes the window, and × drops the entries it left. Tapping a rule (not its enable checkbox) drills in, titled with the rule name. The editor stacks labels above fields, then the feeds as 48px checkbox rows, then a **Matching RSS Articles** row (`#rssdlArticlesRow`, label from the stock `#articleTableDesc`) and Save. Add/remove are 34px icon buttons beside the "Download Rules" heading; rename/clone/clear stay on the stock long-press menu. Save is blue (desktop too). The view is loaded by XHR, not an iframe, so `@media` works; its `<style>` and `setup()`'s inline heights need `:root` and `!important`.
- Desktop RSS Downloader: stock `setup()` sizes the feeds list to what the rule settings leave, which our taller rows shrank to ~7px. The editor column is a flex column instead: the feeds list fills the rest (at least 120px), the column scrolls when that's too little, and Save is sticky at its bottom.
- The RSS article description is a sandboxed `srcdoc` frame that only links `style.css`; `theme.js` links `theme.css` into it and tags it `.rss-description` so it sits on the page background (desktop too). Stock colors every framed body with `body:not(:has(#desktop))`, so our rule repeats that selector to win.
- Mobile windows hide Mocha's maximize button (every window is already full-screen). In dialog frames, a fieldset legend holding a checkbox is floated into the box as its first row, so a label that wraps doesn't straddle the border (Add torrent › "Use another path…"). Options textareas are capped at the box width. Mobile Options tables holding a text field or textarea are full width, and those fields are `width: 100%` (a percentage doesn't count toward a table's minimum width, so it can't push the table wider); without that, a table shrinks to fit and its fields stop short (Downloads › email) or overflow (Web UI › server domains). Text fields directly in a form row are capped at the row (BitTorrent › tracker URL, stock `width: 40em`). The Log tab track is inset to the 12px gutter.
- Tapping a card opens a **details sheet**: the stock properties panel shown full-screen (`:root.details-open`), with a title bar (`#detailsSheetBar`, added by `theme.js`) holding the name and a close button. General's label/value table is restacked into one pair per line; Trackers, Peers and Content scroll sideways; their content is inset 12px on the left only, while header and row backgrounds run to the edge (the scroller is padded and backgrounds are stretched back with `box-shadow` via `--row-bg`, because cells can't be padded without breaking column alignment). There's no right inset: the header's `th` bottom borders can't be stretched that way, and the last column has room anyway. The header line is the `th` bottom border (stock's wrapper border is removed, it doubled it); a 1px gradient on the header wrapper continues it under the inset. Don't give that wrapper `max-content` width: stock header tables are 5000px wide. The stock panel header is hidden unless it holds the Content filter. The Content filter gets its own row at the top of the Content page.
- The sheet has **no tab row**: it opens on General, and rows under the progress bar (Trackers, Peers, HTTP Sources, Content; cloned from the stock tabs so they stay translated) drill into each tab as its own page, with a back chevron in the title bar. Each level is a `history.pushState` entry, so the phone's back gesture steps back and then closes; the close and back buttons call `history.back()`. Switching tabs goes through clicking the hidden stock tab, but never the already-selected one, because stock would collapse the panel and remember that for desktop. (Compared with icon-only tabs, a bottom tab bar and a picker menu; drill-down was chosen.)

**Dialogs (Mocha windows)**
- Desktop: rounded, shadowed windows; form sections (`fieldset.settings`) are cards with small uppercase headings; the primary action (`button[type=submit]`, `#addButton`, Options Save) is blue in a **sticky footer**.
- Mobile Options has **no tab row**: it opens on a list of the 8 categories (`#prefCategoryList`, rows cloned from the stock tabs), and each row drills into its category with a back chevron and the category as the title. It works like the details sheet: each level is a `history.pushState` entry (`{ options: ... }`), so the back gesture steps back and then closes the window, and closing with × or Save drops the entries it left (`history.go`). `theme.js` notices the window through a `MutationObserver`, because the window, its toolbar and its content load separately. × stays on the category pages (unlike the details sheet), since it's the way to leave without saving. Save stays at the bottom on every level, so edits across categories save together; on pages shorter than the screen it's pushed down by making the content a flex column (Mocha sets `display: block` inline, hence `!important`).
- Mobile: every window becomes a **full-screen sheet** (52px title bar, large close button). Rows stack: the label sits above its field, and checkboxes sit on the right.
- Dialog content lives in iframes, where media queries measure the *frame*, not the screen. `theme.js` adds `.mobile-sheet` to each dialog frame's `<html>` when the screen is phone-sized, and in-dialog mobile rules use `:root.mobile-sheet`, never `@media`.
- Mocha splits panel heights in proportion to their current height, so a panel must never be 0px tall. That's why `.panel` keeps a transparent 1px border.

**Tabs**
- A segmented control: a dark track, 34px tabs, 4px gaps, a subtle grey hover, and a blue selected pill.
- Rules are prefixed with `:root` because some windows (Options) load a **second copy of `Tabs.css`** after `theme.css`.
- Tab rows that don't fit **scroll sideways** (desktop only now: mobile replaced every such row with drill-down lists or a menu). (A "⋮ more" overflow menu was built and then reverted; don't reintroduce it.)

**Icons**
- **Lucide** (ISC license; each SVG keeps its license comment). `icons.mjs` maps stock filename → Lucide name + color. Colors are baked into the SVG because `<img>` doesn't inherit `currentColor`.
- Color meaning: muted grey by default; green = start/downloading; blue = seeding/add/links; orange = queued/stop/stalled; red = remove/error; yellow = warning; purple = completed. Stalled torrents use grey arrows.
- Exception: the drill-down chevrons are Lucide `chevron-left` (`.sheetBack`, shared by the details sheet and Options) and `chevron-right` (the list rows), inlined in `theme.css` as CSS masks so they take the text color. The back one is nudged up 1px to line up with the title's capitals. (Rotated CSS-border chevrons were tried; they rendered lopsided.)
- To regenerate: download `lucide-static@1.61.0` (the command is in the header of `icons.mjs`), then run `node icons.mjs <path>/package/icons`.

**Login page**
- A centered card (max 360px; full width with a 16px gutter on phones): logo above the title (moved with `order`, not in the HTML), muted labels above 16px inputs, full-width blue Login button, red error text that wraps.

**Misc**
- ☰ also has Start All, Stop All, Alternative speed limits (highlighted while on, via `:has()` on the stock status-bar icon's `src`) and Exit qBittorrent, each clicking the hidden stock element. `#mobileMenu` is capped at the screen height and scrolls. Global speed limits were already reachable: tapping the ↓/↑ speeds in the status bar opens them. The mock now remembers the alternative-speed toggle.
- About on mobile is a drill-down like Options: the About tab's content with a list of the other tabs under it, each opening its page with a back chevron. Options and About share `drillDownTabs()` in `theme.js` (About's first tab is the list page, so it has no row).
- Monitored folders (Options › Downloads) on mobile: the header row is hidden and each folder is a card, its path above its save location. Every row keeps a 44px right gutter so the fields line up beside the add button on the last one. The add icon was invisible at all sizes (stock's `padding-left: 170px` inside a 16px border-box width); it's now positioned beside the field.
- Options › Speed schedule: stock lays the time inputs out inline with bare `:` text and no spacing; it's a wrapping flex row with gaps and centered digits now (all sizes).
- Trackers table: every row reserves room for an expand icon that's hidden unless the tracker has endpoints. When no row has any, the icons are removed so the URLs line up with the header (desktop too).
- Checkboxes and radios: both the box and its label are `vertical-align: middle`. This was measured to be within 0.3px across all Options tabs.

## Mock server notes
- Fakes 12 torrents in every state, speeds that change on each refresh, peers, trackers, files, pieces, the log and preferences; RSS feeds in a folder with read and unread articles (fetching enabled); one search plugin, and any search returns the same 8 results; three RSS Downloader rules (one disabled) with the same matching articles for each.
- The add flow works end to end: `parseMetadata`/`fetchMetadata` return believable metadata, and `torrents/add` actually adds to the list (name, category, tags, stopped). It remembers names by hash, and URLs are split on `\r?\n`.
- Desktop Add torrent: the Torrent settings fields are `width: 100%; max-width: 16em`, as stock does for Rename only. At their natural widths (category 220px, tags 220px, content layout 174px), together with the one-line labels ("Download first and last pieces first" is 227px), they pushed the table ~44px past its fieldset at ~900px. Letting the labels wrap instead squeezed them to 78px. Stock's `td.fullWidth { word-break: break-all }` is reset there so "Set as default category" wraps between words.
- Known gap: preferences lack the scheduler times, which logs one harmless console error when Options opens.

## Verifying
- Use the browser pane at **mobile** (375×812) and at a desktop width over 640. Very wide emulated sizes render tiny, so ~720–1100 works best.
- `MooTools` replaces the global `Event`; use `CustomEvent` when dispatching events from scripts.
- The native file picker can't be driven by automation. Call `qBittorrent.Client.uploadTorrentFiles([new File(...)])`, which is the same path the picker uses.

## Open ideas / next steps
- Consistency pass: done for touch targets (an audit of every page, Options category and dialog reached from ☰ and the card menu finds nothing under 44px except inline text links and read-only Log rows). Spacing was normalized where the sweep showed a mismatch; `theme.css` still has stray 5/6/7/10/14px values, mostly desktop or inner paddings. Not covered: the context menu itself (30px rows, see below), About, Search plugins, Manage Cookies' table and the Monitored Folder table (rough edges below).
- Mobile sideways-scrolling rows are all gone (details sheet, Options, status chips).
- Mobile details sheet: card-style layouts for the Trackers/Peers/Content tables; item counts on the drill-down rows (skipped because file and web-seed counts aren't in the torrent list data).
- **Overnight plan** (agreed with the user, not started): the full plan and status are in the side-session notes as `overnight-plan.md`. In short: a 16px gutter and 48px rows pass over every mobile screen; finish Monitored Folder ("Other…" lays its text over the select's label); Search plugins as a list; Manage Cookies as cards; Rename Files stacked; the two stock context-menu bugs; "Use another path for incomplete torrents" (Options › Downloads) squeezes its label into a 4-line column on mobile; leftover spacing; then an audit against the Design principles, an independent review and a report with before/after screenshots.
- Long-press context menu on cards: built into the stock UI, only tested in emulation. Real-phone testing was dropped: the ⋮ button opens the same menu, so long press is a shortcut.
- Mobile context menu: stock styling, opened at the tap point; it's 25 rows of 30px and only just fits at 812px, so it can't reach 44px rows as is. A bottom sheet was built (full width, 44px rows, the row's name as title, submenus drilling in place) and compared with stock on every menu; the user preferred stock for now, so it was reverted. Its diff is saved outside the repo in the side-session notes as `context-menu-bottom-sheet.patch`. Found while comparing (stock, still open): on phones the filter-list menus open behind the filter popover (it is in the top layer), and in Add torrent a long press on a file row while scrolled down puts the menu above the visible area.
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
