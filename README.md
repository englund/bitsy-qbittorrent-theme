# bitsy-qbittorrent-theme

A mobile-friendly theme for the **qBittorrent 5.3.0** WebUI, with dark, light and OLED black color schemes and five accent colors. On a phone, torrents show as cards, and filters, sorting and menus open as popovers. Dialogs become full-screen sheets, and Options, About and the torrent details drill down page by page. On desktop it's the familiar layout, restyled.

It's an *alternative WebUI*: a full copy of the stock WebUI with the theme applied, so nothing in qBittorrent itself is modified.

## Install

1. Get the files onto the machine that runs qBittorrent:

   ```bash
   git clone git@github.com:englund/bitsy-qbittorrent-theme.git
   ```

2. In qBittorrent, open **Tools → Options → Web UI** and turn on **Use alternative WebUI**.
3. Set **Files location** to the `www` folder inside the clone, for example `/home/you/bitsy-qbittorrent-theme/www`. It must point at `www`, not the repo root: qBittorrent expects the `public` and `private` folders directly inside it.
4. Click **Apply**, then reload the WebUI in your browser.

### Docker (e.g. linuxserver/qbittorrent)

Mount the `www` folder into the container and use the container path as **Files location**:

```yaml
volumes:
  - /path/to/bitsy-qbittorrent-theme/www:/themes/bitsy:ro
```

Then set **Files location** to `/themes/bitsy`.

## Color schemes

Set them in the WebUI under **Options › Behavior › Interface**:

- **Color scheme**: Dark, Light, OLED black, or Auto (follows your OS). Changing it reloads the page when you click Save.
- **Accent color**: blue (default), green, purple, orange or pink.

qBittorrent stores both with your WebUI settings, so your choice follows you to every device and browser. The login page can't read them before you sign in, so it uses the last scheme and accent this browser saw, or Auto and blue if it never signed in.

## Update

```bash
cd bitsy-qbittorrent-theme
git pull
```

qBittorrent caches the WebUI files, so after an update turn **Use alternative WebUI** off and on again, then hard-reload the page (Shift-reload, or clear the site's cache on a phone).

## Uninstall

Turn off **Use alternative WebUI**. qBittorrent goes back to its built-in WebUI.

## Compatibility

Built from the stock WebUI of qBittorrent **5.3.0**. Other versions may load but can break, since the WebUI and its API change between releases. If yours differs, use the stock WebUI until the theme is updated.

## Development

No qBittorrent is needed: `mock-server.mjs` serves `www/` the way qBittorrent does and fakes the API with sample torrents, RSS feeds, search results and logs.

```bash
node --watch mock-server.mjs        # http://localhost:8090 (needs Node 20.11+)
```

There's no CSS hot reload, so reload the page after edits. The theme lives in `www/private/css/theme.css` (styles) and `www/private/scripts/theme.js` (mobile behaviour); edits to stock files are kept small. `CONTRIBUTING.md` covers the design rules, the stock files that were changed and how work is tracked.

## License

The WebUI is qBittorrent's, licensed under the GPL (v2 or later). Icons are from [Lucide](https://lucide.dev) (ISC license).
