// Replaces the stock WebUI icons with Lucide icons (ISC licensed), keeping the stock filenames.
// Usage: node icons.mjs <path to lucide-static/icons>
// Get the icons with: curl -sL $(npm view lucide-static@1.61.0 dist.tarball) | tar xz   (→ package/icons)
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const LUCIDE = process.argv[2];
if (!LUCIDE) {
    console.error("usage: node icons.mjs <lucide-static/icons dir>");
    process.exit(1);
}
const OUT = join(import.meta.dirname, "www/private/images");

// Icons load through <img>, where currentColor doesn't reach the SVG, so each one gets a fixed color.
// Keep in sync with the tokens in theme.css.
const muted = "#aeb6c8";
const accent = "#5b9bff";
const green = "#4ade80";
const orange = "#fb923c";
const red = "#f87171";
const yellow = "#facc15";
const purple = "#a78bfa";

// Each icon also needs an --icon line in theme.css, which masks every baked icon on Light;
// accent ones go in its accent mask list too.
const icons = {
    "application-exit": ["power", red],
    "application-rss": ["rss", orange],
    "application-url": ["link", muted],
    "browser-cookies": ["cookie", muted],
    "checked-completed": ["check", purple],
    "collapse": ["chevron-down", muted],
    "configure": ["settings", muted],
    "connected": ["globe", green],
    "dialog-warning": ["triangle-alert", yellow],
    "directory": ["folder", accent],
    "disconnected": ["wifi-off", red],
    "download": ["arrow-down-to-line", green],
    "downloading": ["arrow-down", green],
    "edit-clear": ["x", muted],
    "edit-copy": ["copy", muted],
    "edit-find": ["search", muted],
    "edit-rename": ["pencil", muted],
    "error": ["circle-alert", red],
    "filter-active": ["activity", green],
    "filter-all": ["layers", accent],
    "filter-inactive": ["circle-dashed", muted],
    "filter-stalled": ["hourglass", orange],
    "firewalled": ["shield-alert", orange],
    "folder-documents": ["folder-open", accent],
    "folder-new": ["folder-plus", accent],
    "force-recheck": ["refresh-cw", accent],
    "go-bottom": ["arrow-down-to-line", muted],
    "go-down": ["arrow-down", muted],
    "go-top": ["arrow-up-to-line", muted],
    "go-up": ["arrow-up", muted],
    "hash": ["hash", muted],
    "help-about": ["info", accent],
    "help-contents": ["book-open", muted],
    "insert-link": ["link", accent],
    "ip-blocked": ["ban", red],
    "list-add": ["circle-plus", accent],
    "list-remove": ["trash-2", red],
    "mail-inbox": ["inbox", muted],
    "menu": ["menu", muted],
    "name": ["type", muted],
    "network-connect": ["network", muted],
    "network-server": ["server", muted],
    "object-locked": ["lock", muted],
    "pause-session": ["pause", orange],
    "paused": ["pause", muted],
    "peers-add": ["user-plus", green],
    "peers-remove": ["user-minus", red],
    "peers": ["users", muted],
    "plugins": ["puzzle", muted],
    "preferences-advanced": ["sliders-horizontal", muted],
    "preferences-bittorrent": ["share-2", muted],
    "preferences-desktop": ["monitor", muted],
    "preferences-webui": ["globe", muted],
    "queued": ["clock", orange],
    "ratio": ["scale", muted],
    "reannounce": ["megaphone", muted],
    "regex": ["regex", muted],
    "set-location": ["folder-input", muted],
    "slow": ["gauge", orange],
    "sort-ascending": ["arrow-down-narrow-wide", muted],
    "sort-descending": ["arrow-down-wide-narrow", muted],
    "slow_off": ["gauge", muted],
    "stalledDL": ["arrow-down", muted],
    "stalledUP": ["arrow-up", muted],
    "stopped": ["square", muted],
    "system-log-out": ["log-out", muted],
    "tags": ["tag", accent],
    "task-complete": ["circle-check", green],
    "task-reject": ["circle-x", red],
    "torrent-creator": ["file-pen-line", muted],
    "torrent-magnet": ["magnet", accent],
    "torrent-start-forced": ["fast-forward", green],
    "torrent-start": ["play", green],
    "torrent-stop": ["square", orange],
    "tracker-error": ["radio-tower", red],
    "tracker-warning": ["radio-tower", yellow],
    "trackerless": ["unplug", muted],
    "trackers": ["radio-tower", muted],
    "upload": ["arrow-up", accent],
    "view-categories": ["folders", accent],
    "view-refresh": ["refresh-cw", muted],
    "view-statistics": ["chart-column", muted],
    "wallet-open": ["heart", red],
};

for (const [target, [lucide, color]] of Object.entries(icons)) {
    const svg = (await readFile(join(LUCIDE, `${lucide}.svg`), "utf8"))
        .replace(/\s*class="[^"]*"/, "")
        .replace('stroke="currentColor"', `stroke="${color}"`);
    await writeFile(join(OUT, `${target}.svg`), svg);
}
console.log(`wrote ${Object.keys(icons).length} icons to ${OUT}`);
