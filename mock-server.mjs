// Serves ./www the way qBittorrent does and fakes /api/v2 so the WebUI can be themed without a real server.
// Usage: node mock-server.mjs [port]   (then open http://localhost:8080, /login for the login page)
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname, normalize } from "node:path";

const PORT = Number(process.argv[2] ?? 8080);
const WWW = join(import.meta.dirname, "www");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".gif": "image/gif", ".ico": "image/x-icon", ".json": "application/json" };

// qBittorrent fills these in at serve time; translations are dropped to the English source string.
const fillTemplate = (text) => text
    .replace(/QBT_TR\((.*?)\)QBT_TR\[CONTEXT=[a-zA-Z_][a-zA-Z0-9_]*\]/gs, "$1")
    .replaceAll("${LANG}", "en")
    .replaceAll("${CACHEID}", String(Date.now()))
    .replaceAll("${LANGUAGE_OPTIONS}", '<option value="en">English</option>');

const now = () => Math.floor(Date.now() / 1000);
const GiB = 1024 ** 3;
const MiB = 1024 ** 2;
const rand = (max) => Math.floor(Math.random() * max);

const seeds = [
    ["ubuntu-24.04.1-desktop-amd64.iso", "downloading", 0.42, 5.8 * GiB, "Linux"],
    ["debian-12.7.0-amd64-netinst.iso", "uploading", 1, 631 * MiB, "Linux"],
    ["Big Buck Bunny 1080p", "stalledDL", 0.13, 885 * MiB, "Movies"],
    ["Sintel 4K", "stoppedDL", 0.67, 4.2 * GiB, "Movies"],
    ["archlinux-2024.10.01-x86_64.iso", "stalledUP", 1, 1.1 * GiB, "Linux"],
    ["Tears of Steel", "queuedDL", 0, 2.3 * GiB, "Movies"],
    ["fedora-workstation-41.iso", "checkingDL", 0.88, 2.2 * GiB, "Linux"],
    ["Public domain audiobook collection", "error", 0.31, 760 * MiB, ""],
    ["Missing files example", "missingFiles", 0.5, 120 * MiB, ""],
    ["magnet: fetching metadata", "metaDL", 0, 0, ""],
    ["Forced seed example", "forcedUP", 1, 3.4 * GiB, "Linux"],
    ["Stopped and done", "stoppedUP", 1, 512 * MiB, "Movies"],
];

const torrents = Object.fromEntries(seeds.map(([name, state, progress, size, category], i) => {
    const hash = (i + 1).toString(16).padStart(40, "a");
    const downloaded = Math.floor(size * progress);
    return [hash, {
        name, state, progress, size, total_size: size, category,
        hash, infohash_v1: hash, infohash_v2: "",
        tags: i % 3 === 0 ? "favorite, hd" : "",
        added_on: now() - (i + 1) * 86400, completion_on: progress === 1 ? now() - i * 3600 : -1,
        amount_left: size - downloaded, completed: downloaded, downloaded, downloaded_session: downloaded,
        uploaded: downloaded * 0.8, uploaded_session: 0, ratio: progress * 0.8,
        dlspeed: 0, upspeed: 0, dl_limit: -1, up_limit: -1, eta: 8640000,
        num_seeds: rand(30), num_complete: rand(300), num_leechs: rand(20), num_incomplete: rand(100),
        availability: progress === 1 ? -1 : 1.4, popularity: 0.3, priority: state === "queuedDL" ? 1 : 0,
        save_path: "/downloads", download_path: "", content_path: `/downloads/${name}`, root_path: `/downloads/${name}`,
        tracker: "udp://tracker.example.org:1337/announce", trackers_count: 2,
        has_tracker_error: state === "error", has_tracker_warning: i === 2, has_other_announce_error: false,
        auto_tmm: false, force_start: state.startsWith("forced"), seq_dl: false, f_l_piece_prio: false, super_seeding: false,
        has_metadata: state !== "metaDL", private: false, comment: "",
        max_ratio: -1, max_seeding_time: -1, max_inactive_seeding_time: -1, ratio_limit: -2, seeding_time_limit: -2, inactive_seeding_time_limit: -2,
        seeding_time: 0, time_active: 3600 * (i + 1), last_activity: now(), seen_complete: now(), reannounce: 1200,
        magnet_uri: `magnet:?xt=urn:btih:${hash}`,
    }];
}));

// Keeps the list alive: active torrents get fresh speeds and progress on every poll.
const tick = () => {
    for (const t of Object.values(torrents)) {
        if (["downloading", "forcedDL"].includes(t.state)) {
            t.dlspeed = 2 * MiB + rand(6 * MiB);
            t.progress = Math.min(0.999, t.progress + 0.002);
            t.downloaded = t.completed = Math.floor(t.size * t.progress);
            t.amount_left = t.size - t.downloaded;
            t.eta = Math.floor(t.amount_left / t.dlspeed);
        }
        if (["uploading", "forcedUP", "downloading"].includes(t.state))
            t.upspeed = rand(2 * MiB);
    }
};

let rid = 0;
const maindata = () => {
    tick();
    const list = Object.values(torrents);
    return {
        rid: ++rid,
        full_update: true,
        torrents,
        categories: {
            Linux: { name: "Linux", savePath: "/downloads/linux" },
            Movies: { name: "Movies", savePath: "/downloads/movies" },
        },
        tags: ["favorite", "hd"],
        trackers: { "udp://tracker.example.org:1337/announce": Object.keys(torrents) },
        server_state: {
            connection_status: "connected", dht_nodes: 312, refresh_interval: 1500,
            dl_info_speed: list.reduce((s, t) => s + t.dlspeed, 0), dl_info_data: 48 * GiB, dl_rate_limit: 0,
            up_info_speed: list.reduce((s, t) => s + t.upspeed, 0), up_info_data: 31 * GiB, up_rate_limit: 0,
            use_alt_speed_limits: false, queueing: true, free_space_on_disk: 734 * GiB,
            last_external_address_v4: "203.0.113.7", last_external_address_v6: "",
            alltime_dl: 1.2 * 1024 * GiB, alltime_ul: 0.9 * 1024 * GiB, global_ratio: "0.75",
            total_peer_connections: 87, total_buffers_size: 0, queued_io_jobs: 0, average_time_queue: 0,
            read_cache_overload: "0", write_cache_overload: "0", total_queued_size: 0, total_wasted_session: 0,
        },
    };
};

const preferences = {
    locale: "en", refresh_interval: 1500, save_path: "/downloads", temp_path: "/downloads/incomplete", temp_path_enabled: false,
    auto_tmm_enabled: false, add_stopped_enabled: false, add_to_top_of_queue: false, torrent_content_layout: "Original",
    torrent_stop_condition: "None", max_ratio: -1, max_ratio_act: 0, max_seeding_time: -1, max_inactive_seeding_time: -1,
    share_limits_mode: 0, queueing_enabled: true, dl_limit: 0, up_limit: 0, alt_dl_limit: 10240, alt_up_limit: 10240,
    web_ui_port: PORT, rss_processing_enabled: false, status_bar_external_ip: true, confirm_torrent_deletion: true,
};

const api = {
    "auth/login": () => "Ok.",
    "auth/logout": () => "",
    "app/version": () => "v5.3.0",
    "app/webapiVersion": () => "2.11.4",
    "app/buildInfo": () => ({ qt: "6.8.0", libtorrent: "2.0.10.0", boost: "1.86.0", openssl: "3.4.0", zlib: "1.3.1", bitness: 64, platform: "macos" }),
    "app/preferences": () => preferences,
    "app/networkInterfaceList": () => [],
    "app/networkInterfaceAddressList": () => [],
    "app/cookies": () => [],
    "app/getFreeSpaceAtPath": () => 734 * GiB,
    "clientdata/load": () => ({}),
    "sync/maindata": maindata,
    "sync/torrentPeers": () => ({
        rid: ++rid, full_update: true, show_flags: true,
        peers: {
            "198.51.100.4:51413": { ip: "198.51.100.4", port: 51413, client: "qBittorrent/5.0.1", country: "Sweden", country_code: "se", connection: "BT", flags: "D U", flags_desc: "", progress: 0.6, dl_speed: 512 * 1024, up_speed: 64 * 1024, downloaded: 200 * MiB, uploaded: 30 * MiB, relevance: 1, files: "" },
            "203.0.113.9:6881": { ip: "203.0.113.9", port: 6881, client: "Transmission 4.0.6", country: "Germany", country_code: "de", connection: "uTP", flags: "d", flags_desc: "", progress: 1, dl_speed: 1.2 * MiB, up_speed: 0, downloaded: 400 * MiB, uploaded: 0, relevance: 0, files: "" },
        },
    }),
    "torrents/properties": (q) => {
        const t = torrents[q.get("hash")] ?? Object.values(torrents)[0];
        return {
            ...t, save_path: t.save_path, creation_date: t.added_on - 86400, created_by: "mktorrent 1.1", comment: "Mock torrent",
            piece_size: 4 * MiB, pieces_num: Math.ceil(t.size / (4 * MiB)), pieces_have: Math.floor(t.size * t.progress / (4 * MiB)),
            total_downloaded: t.downloaded, total_uploaded: t.uploaded, total_size: t.size, share_ratio: t.ratio,
            dl_speed: t.dlspeed, up_speed: t.upspeed, dl_speed_avg: t.dlspeed, up_speed_avg: t.upspeed,
            nb_connections: 12, nb_connections_limit: 100, seeds: t.num_seeds, seeds_total: t.num_complete, peers: t.num_leechs, peers_total: t.num_incomplete,
            addition_date: t.added_on, completion_date: t.completion_on, last_seen: t.seen_complete, time_elapsed: t.time_active,
            total_wasted: 0, is_private: false, download_path: "",
        };
    },
    "torrents/trackers": () => [
        { url: "** [DHT] **", status: 2, tier: "", num_peers: 40, num_seeds: 0, num_leeches: 0, num_downloaded: 0, msg: "" },
        { url: "udp://tracker.example.org:1337/announce", status: 2, tier: 0, num_peers: 25, num_seeds: 18, num_leeches: 7, num_downloaded: 900, msg: "" },
        { url: "https://dead.example.net/announce", status: 4, tier: 1, num_peers: 0, num_seeds: 0, num_leeches: 0, num_downloaded: 0, msg: "Connection refused" },
    ],
    "torrents/webseeds": () => [],
    "torrents/files": (q) => {
        const t = torrents[q.get("hash")] ?? Object.values(torrents)[0];
        return [
            { index: 0, name: `${t.name}/main.bin`, size: t.size * 0.9, progress: t.progress, priority: 1, availability: 1, is_seed: t.progress === 1, piece_range: [0, 100] },
            { index: 1, name: `${t.name}/extras/readme.txt`, size: t.size * 0.1, progress: 1, priority: 6, availability: 1, is_seed: true, piece_range: [101, 110] },
        ];
    },
    "torrents/pieceStates": (q) => {
        const t = torrents[q.get("hash")] ?? Object.values(torrents)[0];
        return Array.from({ length: 200 }, (_, i) => (i / 200 < t.progress ? 2 : i % 17 === 0 ? 1 : 0));
    },
    "torrents/pieceAvailability": () => Array.from({ length: 200 }, (_, i) => 1 + (i % 7)),
    "torrents/categories": () => maindata().categories,
    "torrents/tags": () => ["favorite", "hd"],
    "transfer/info": () => maindata().server_state,
    "transfer/speedLimitsMode": () => "0",
    "log/main": () => [
        { id: 0, message: "qBittorrent v5.3.0 started", timestamp: now() - 600, type: 1 },
        { id: 1, message: "Trying to listen on 0.0.0.0:6881", timestamp: now() - 590, type: 2 },
        { id: 2, message: "Could not reach dead.example.net", timestamp: now() - 300, type: 4 },
        { id: 3, message: "Something serious went wrong", timestamp: now() - 10, type: 8 },
    ],
    "log/peers": () => [],
    "search/plugins": () => [],
    "rss/items": () => ({}),
    "rss/rules": () => ({}),
    "torrentcreator/status": () => [],
};

const send = (res, status, body, type = "text/plain") => {
    res.writeHead(status, { "Content-Type": `${type}; charset=utf-8`, "Cache-Control": "no-store" });
    res.end(body);
};

const serveFile = async (res, dirs, path) => {
    for (const dir of dirs) {
        const file = normalize(join(WWW, dir, path));
        if (!file.startsWith(join(WWW, dir)))
            return send(res, 403, "Forbidden");
        try {
            const ext = extname(file);
            const data = await readFile(file);
            const isText = [".html", ".js", ".css"].includes(ext);
            return send(res, 200, isText ? fillTemplate(data.toString()) : data, MIME[ext] ?? "application/octet-stream");
        }
        catch {}
    }
    send(res, 404, "Not found");
};

createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = decodeURIComponent(url.pathname);

    if (path.startsWith("/api/v2/")) {
        const handler = api[path.slice("/api/v2/".length)];
        const result = handler ? handler(url.searchParams) : "";
        if (!handler)
            console.log(`unmocked: ${req.method} ${path}`);
        return typeof result === "string"
            ? send(res, 200, result)
            : send(res, 200, JSON.stringify(result), "application/json");
    }
    if (path === "/login")
        return serveFile(res, ["public"], "index.html");
    serveFile(res, ["private", "public"], path === "/" ? "index.html" : path);
}).listen(PORT, () => console.log(`Mock qBittorrent WebUI on http://localhost:${PORT}`));
