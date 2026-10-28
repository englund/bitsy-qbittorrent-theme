// Serves ./www the way qBittorrent does and fakes /api/v2 so the WebUI can be themed without a real server.
// Usage: node mock-server.mjs [port]   (then open http://localhost:8090, /login for the login page)
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname, normalize } from "node:path";

const PORT = Number(process.argv[2] ?? 8090);
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

const makeTorrent = ([name, state, progress, size, category], i) => {
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
};
const torrents = Object.fromEntries(seeds.map(makeTorrent));

// What parseMetadata/fetchMetadata hand to the add dialog. Files get added back by hash, so remember their names.
const namesByHash = new Map();
const fakeMetadata = (name, i) => {
    const hash = (1000 + i).toString(16).padStart(40, "b");
    namesByHash.set(hash, name);
    return metadataFor(name, hash);
};
const metadataFor = (name, hash) => ({
    infohash_v1: hash,
    infohash_v2: "",
    creation_date: now() - 30 * 86400,
    comment: "Mock torrent for the add dialog",
    info: {
        name,
        files: [
            { path: `${name}/${name}.mkv`, length: 1.4 * GiB },
            { path: `${name}/Subs/English.srt`, length: 82 * 1024 },
            { path: `${name}/Subs/Swedish.srt`, length: 79 * 1024 },
            { path: `${name}/README.txt`, length: 2048 },
        ],
    },
});

const nameFromSource = (source) => {
    const dn = source.startsWith("magnet:") && new URLSearchParams(source.split("?")[1] ?? "").get("dn");
    return dn || namesByHash.get(source) || source.split("/").pop().replace(/\.torrent$/, "") || "New torrent";
};

const addTorrents = (fields) => {
    const sources = (fields.get("urls") ?? "").split(/\r?\n/).filter(Boolean);
    for (const source of sources.length ? sources : ["file"]) {
        const i = Object.keys(torrents).length;
        const name = fields.get("rename") || nameFromSource(source);
        const paused = fields.get("stopped") === "true";
        const [hash, torrent] = makeTorrent([name, paused ? "stoppedDL" : "downloading", 0, 1.4 * GiB, fields.get("category") ?? ""], i);
        torrents[hash] = { ...torrent, added_on: now(), tags: fields.get("tags") ?? "" };
    }
    return "Ok.";
};

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
let altSpeed = false;
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
            use_alt_speed_limits: altSpeed, queueing: true, free_space_on_disk: 734 * GiB,
            last_external_address_v4: "203.0.113.7", last_external_address_v6: "",
            alltime_dl: 1.2 * 1024 * GiB, alltime_ul: 0.9 * 1024 * GiB, global_ratio: "0.75",
            total_peer_connections: 87, total_buffers_size: 0, queued_io_jobs: 0, average_time_queue: 0,
            read_cache_overload: "0", write_cache_overload: "0", total_queued_size: 0, total_wasted_session: 0,
        },
    };
};

// To set a client data setting directly, POST data={"qbt_<key>": value} to /api/v2/clientdata/store and reload.
const clientData = {};
let cookies = [
    { domain: "tracker.example.org", path: "/", name: "session", value: "f3a9c1e07b", expirationDate: 1830000000 },
    { domain: ".isos.example.net", path: "/rss", name: "uid", value: "42", expirationDate: 0 }
];

const preferences = {
    locale: "en", refresh_interval: 1500, save_path: "/downloads", temp_path: "/downloads/incomplete", temp_path_enabled: false,
    auto_tmm_enabled: false, add_stopped_enabled: false, add_to_top_of_queue: false, torrent_content_layout: "Original",
    torrent_stop_condition: "None", max_ratio: -1, max_ratio_act: 0, max_seeding_time: -1, max_inactive_seeding_time: -1,
    share_limits_mode: "MatchAny", queueing_enabled: true, dl_limit: 0, up_limit: 0, alt_dl_limit: 10240, alt_up_limit: 10240,
    web_ui_port: PORT, rss_processing_enabled: true, status_bar_external_ip: true, confirm_torrent_deletion: true,
    // The rest are qBittorrent 5.3's defaults, so Options loads every field and Save passes its validation.
    add_trackers: "", add_trackers_enabled: false, add_trackers_from_url_enabled: false, add_trackers_url: "", add_trackers_url_list: "",
    alternative_webui_enabled: false, alternative_webui_path: "", announce_ip: "", announce_port: 0, announce_to_all_tiers: true,
    announce_to_all_trackers: false, anonymous_mode: false, app_instance_name: "", async_io_threads: 10, auto_delete_mode: 0,
    autorun_enabled: false, autorun_on_torrent_added_enabled: false, autorun_on_torrent_added_program: "", autorun_program: "",
    banned_IPs: "", bdecode_depth_limit: 100, bdecode_token_limit: 10000000, bittorrent_protocol: 0, block_peers_on_privileged_ports: false,
    bypass_auth_subnet_whitelist: "", bypass_auth_subnet_whitelist_enabled: false, bypass_local_auth: false,
    category_changed_tmm_enabled: false, checking_memory_use: 32, confirm_remove_all_tags: true, confirm_remove_tracker_from_all_torrents: true,
    confirm_torrent_recheck: true, connection_speed: 30, current_interface_address: "", current_interface_name: "", current_network_interface: "",
    dht: true, dht_bootstrap_nodes: "dht.libtorrent.org:25401, router.bittorrent.com:6881", disk_cache: -1, disk_cache_ttl: 60,
    disk_io_read_mode: 1, disk_io_type: 0, disk_io_write_mode: 1, disk_queue_size: 1048576, dont_count_slow_torrents: false,
    dyndns_domain: "changeme.dyndns.org", dyndns_enabled: false, dyndns_password: "", dyndns_service: 0, dyndns_username: "",
    embedded_tracker_port: 9000, embedded_tracker_port_forwarding: false, enable_coalesce_read_write: false, enable_embedded_tracker: false,
    enable_multi_connections_from_same_ip: false, enable_multi_connections_from_same_peer_id: false, enable_piece_extent_affinity: false,
    enable_upload_suggestions: false, encryption: 0, excluded_file_names: "", excluded_file_names_enabled: false,
    file_log_age: 1, file_log_age_type: 1, file_log_backup_enabled: true, file_log_delete_old: true, file_log_enabled: true,
    file_log_max_size: 65, file_log_path: "/config/logs", file_pool_size: 100, hashing_threads: 1, hostname_cache_ttl: 1200,
    i2p_address: "127.0.0.1", i2p_enabled: false, i2p_inbound_length: 3, i2p_inbound_length_variance: 0, i2p_inbound_quantity: 3,
    i2p_mixed_mode: false, i2p_outbound_length: 3, i2p_outbound_length_variance: 0, i2p_outbound_quantity: 3, i2p_pex_enabled: true, i2p_port: 7656,
    idn_support_enabled: false, ignore_ssl_errors: false, incomplete_files_ext: false, ip_filter_enabled: false, ip_filter_path: "",
    ip_filter_trackers: false, limit_lan_peers: true, limit_tcp_overhead: false, limit_utp_rate: true, listen_port: 6881, lsd: true,
    mail_notification_auth_enabled: false, mail_notification_email: "", mail_notification_enabled: false, mail_notification_encryption_type: 0,
    mail_notification_password: "", mail_notification_sender: "qBittorrent_notification@example.com", mail_notification_smtp: "smtp.changeme.com",
    mail_notification_username: "", mark_of_the_web: true, max_active_checking_torrents: 1, max_active_downloads: 3, max_active_torrents: 5,
    max_active_uploads: 3, max_concurrent_http_announces: 50, max_connec: 500, max_connec_per_torrent: 100, max_inactive_seeding_time_enabled: false,
    max_outstanding_block_requests: 500, max_ratio_enabled: false, max_seeding_time_enabled: false, max_uploads: 20, max_uploads_per_torrent: 4,
    memory_working_set_limit: 512, merge_trackers: false, outgoing_ports_max: 0, outgoing_ports_min: 0, peer_tos: 4, peer_turnover: 4,
    peer_turnover_cutoff: 90, peer_turnover_interval: 300, performance_warning: false, pex: true, preallocate_all: false,
    proxy_auth_enabled: false, proxy_bittorrent: true, proxy_hostname_lookup: true, proxy_ip: "", proxy_misc: true, proxy_password: "",
    proxy_peer_connections: false, proxy_port: 8080, proxy_rss: true, proxy_type: "None", proxy_username: "", python_executable_path: "",
    reannounce_when_address_changed: false, recheck_completed_torrents: false, remove_torrent_file_backup: false, request_queue_size: 500,
    resolve_peer_countries: true, resolve_peer_host_names: false, resume_data_storage_type: "Legacy", rss_auto_downloading_enabled: true,
    rss_download_repack_proper_episodes: true, rss_fetch_delay: 2, rss_max_articles_per_feed: 50, rss_refresh_interval: 30,
    rss_smart_episode_filters: "s(\\d+)e(\\d+)\n(\\d+)x(\\d+)", save_path_changed_tmm_enabled: false, save_resume_data_interval: 60,
    save_statistics_interval: 15, scan_dirs: {}, schedule_from_hour: 8, schedule_from_min: 0, schedule_to_hour: 20, schedule_to_min: 0,
    scheduler_days: 0, scheduler_enabled: false, seeding_outgoing_connections: false, send_buffer_low_watermark: 10, send_buffer_watermark: 500,
    send_buffer_watermark_factor: 50, shutdown_timeout: -1, slow_torrent_dl_rate_threshold: 2, slow_torrent_inactive_timer: 60,
    slow_torrent_ul_rate_threshold: 2, socket_backlog_size: 30, socket_receive_buffer_size: 0, socket_send_buffer_size: 0, ssrf_mitigation: true,
    start_paused: false, stop_tracker_timeout: 2, store_search_job_results: true, store_search_jobs: true, torrent_changed_tmm_enabled: true,
    torrent_content_remove_option: "Delete", torrent_file_size_limit: 104857600, torrent_files_backup_dir: "", torrent_files_backup_enabled: false,
    torrent_files_finished_backup_dir: "", torrent_files_finished_backup_dir_enabled: false, upload_choking_algorithm: 1, upload_slots_behavior: 0,
    upnp: true, upnp_lease_duration: 0, use_category_paths_in_manual_mode: false, use_https: false, use_unwanted_folder: false,
    utp_tcp_mixed_mode: 0, validate_https_tracker_certificate: true, web_ui_address: "*", web_ui_api_key: "", web_ui_ban_duration: 3600,
    web_ui_clickjacking_protection_enabled: true, web_ui_csrf_protection_enabled: true, web_ui_custom_http_headers: "",
    web_ui_domain_list: "*", web_ui_host_header_validation_enabled: true, web_ui_https_cert_path: "", web_ui_https_key_path: "",
    web_ui_max_auth_fail_count: 5, web_ui_reverse_proxies_list: "", web_ui_reverse_proxy_enabled: false, web_ui_secure_cookie_enabled: true,
    web_ui_session_timeout: 3600, web_ui_sessions_count_limit: 1, web_ui_upnp: false, web_ui_use_custom_http_headers_enabled: false,
    web_ui_username: "admin", webtorrent_stun_server: "stun.l.google.com:19302",
};

const api = {
    "auth/login": () => "Ok.",
    "auth/logout": () => "",
    "app/version": () => "v5.3.0",
    "app/webapiVersion": () => "2.11.4",
    "app/buildInfo": () => ({ qt: "6.8.0", libtorrent: "2.0.10.0", boost: "1.86.0", openssl: "3.4.0", zlib: "1.3.1", bitness: 64, platform: "macos" }),
    "app/preferences": () => preferences,
    "app/setPreferences": (_, fields) => {
        Object.assign(preferences, JSON.parse(fields.get("json") ?? "{}"));
        return "";
    },
    "app/networkInterfaceList": () => [],
    "app/networkInterfaceAddressList": () => [],
    "app/cookies": () => cookies,
    "app/setCookies": (_, fields) => {
        cookies = JSON.parse(fields.get("cookies") ?? "[]");
        return "";
    },
    "app/getFreeSpaceAtPath": () => 734 * GiB,
    "clientdata/load": () => clientData,
    "clientdata/store": (_, fields) => {
        for (const [key, value] of Object.entries(JSON.parse(fields.get("data") ?? "{}"))) {
            if (value === null)
                delete clientData[key];
            else
                clientData[key] = value;
        }
        return "";
    },
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
    "torrents/parseMetadata": (q, fields) => fields.getAll("file").map((_, i) => fakeMetadata(`Sample Movie ${i + 1}`, i)),
    "torrents/fetchMetadata": (q, fields) => fakeMetadata(nameFromSource(fields.get("source") ?? ""), 0),
    "torrents/add": (q, fields) => addTorrents(fields),
    "torrents/pieceAvailability": () => Array.from({ length: 200 }, (_, i) => 1 + (i % 7)),
    "torrents/categories": () => maindata().categories,
    "torrents/tags": () => ["favorite", "hd"],
    "transfer/info": () => maindata().server_state,
    "transfer/speedLimitsMode": () => (altSpeed ? "1" : "0"),
    "transfer/toggleSpeedLimitsMode": () => { altSpeed = !altSpeed; return ""; },
    "log/main": () => [
        { id: 0, message: "qBittorrent v5.3.0 started", timestamp: now() - 600, type: 1 },
        { id: 1, message: "Trying to listen on 0.0.0.0:6881", timestamp: now() - 590, type: 2 },
        { id: 2, message: "Could not reach dead.example.net", timestamp: now() - 300, type: 4 },
        { id: 3, message: "Something serious went wrong", timestamp: now() - 10, type: 8 },
    ],
    "log/peers": () => [],
    "search/plugins": () => [
        { name: "example", fullName: "Example Tracker", enabled: true, url: "https://tracker.example.org", version: "1.0", supportedCategories: [{ id: "all", name: "All categories" }, { id: "software", name: "Software" }] },
        { name: "archive", fullName: "Linux ISO Archive", enabled: false, url: "https://isos.example.net", version: "2.3", supportedCategories: [{ id: "all", name: "All categories" }] },
    ],
    "search/start": () => ({ id: 1 }),
    "search/stop": () => "",
    "search/status": () => [],
    "search/results": (q) => ({
        status: "Stopped",
        total: 8,
        results: Number(q.get("offset")) > 0 ? [] : Array.from({ length: 8 }, (_, i) => ({
            fileName: `ubuntu-${24 - i}.04-desktop-amd64.iso`,
            fileUrl: `magnet:?xt=urn:btih:${String(i).padStart(40, "0")}`,
            fileSize: (4 + i * 0.3) * 2 ** 30,
            nbSeeders: 900 - i * 110,
            nbLeechers: 40 + i * 7,
            engineName: "Example Tracker",
            siteUrl: "https://tracker.example.org",
            descrLink: `https://tracker.example.org/t/${i}`,
            pubDate: now() - i * 86400 * 30,
        })),
    }),
    "rss/items": () => {
        const feed = (uid, name, count) => ({
            uid, url: `https://feeds.example.org/${uid}.xml`, title: name, lastBuildDate: "", isLoading: false, hasError: false,
            articles: Array.from({ length: count }, (_, i) => ({
                id: `${uid}-${i}`, title: `${name} release ${count - i}.0`, date: new Date((now() - i * 86400) * 1000).toUTCString(),
                link: `https://example.org/${uid}/${i}`, torrentURL: `https://example.org/${uid}/${i}.torrent`, author: "Release team",
                description: `<p>Release notes for ${name} ${count - i}.0. Bug fixes and new features.</p>`, isRead: i > 1,
            })),
        });
        return { "Linux": { "Ubuntu": feed("ubuntu", "Ubuntu", 6), "Debian": feed("debian", "Debian", 4) }, "Blender": feed("blender", "Blender", 3) };
    },
    "rss/rules": () => {
        const rule = (enabled, mustContain, feeds, extra = {}) => ({
            enabled, priority: 0, useRegex: false, mustContain, mustNotContain: "beta", episodeFilter: "", smartFilter: false,
            previouslyMatchedEpisodes: [], affectedFeeds: feeds.map((uid) => `https://feeds.example.org/${uid}.xml`), ignoreDays: 0,
            lastMatch: "", torrentParams: { category: "", tags: [], save_path: "", stopped: null, content_layout: null }, ...extra,
        });
        return {
            "Ubuntu LTS": rule(true, "Ubuntu *.04", ["ubuntu"], { lastMatch: new Date((now() - 3 * 86400) * 1000).toUTCString() }),
            "Debian stable": rule(true, "Debian", ["debian"]),
            "Blender": rule(false, "Blender", ["blender"]),
        };
    },
    "rss/matchingArticles": () => ({ Ubuntu: ["Ubuntu release 6.0", "Ubuntu release 4.0"], Debian: ["Debian release 4.0"] }),
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
        const fields = req.method === "POST" ? await new Response(req, { headers: req.headers }).formData().catch(() => new FormData()) : new FormData();
        const result = handler ? handler(url.searchParams, fields) : "";
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
