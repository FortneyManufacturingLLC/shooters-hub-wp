# Shooters Hub WordPress Plugin

[![Download latest release](https://img.shields.io/github/v/release/FortneyManufacturingLLC/shooters-hub-wp?label=Download%20Latest&style=for-the-badge)](https://github.com/FortneyManufacturingLLC/shooters-hub-wp/releases/latest)

Embed the Shooters Hub Match Finder and Club Finder inside WordPress. The plugin ships with shortcodes and Gutenberg blocks, and proxies API traffic through WordPress so your API key stays server-side.

## Features
- Match Finder and Club Finder powered by the same finder components used in the Shooters Hub web app
- OLC index/tile API support via WordPress REST proxy
- Global defaults in WP admin + per-instance shortcode/block overrides
- Optional Match Finder and Club Finder pages provisioned on activation
- Built-in Fortney native updater via `fe-plugin-core`

## Installation
1. Download the latest release ZIP from the button above.
2. In the WordPress admin, navigate to **Plugins → Add New → Upload Plugin** and upload the ZIP.
3. Activate “Shooters Hub”.
4. Configure **Settings → Shooters Hub** with your API base URL and key.
5. Add either finder block/shortcode to any page.

## Development
Install dependencies from the monorepo root:

```bash
npm install
```

Build the production bundle:

```bash
npm run build --workspace=wp-plugin
```

The build emits `build/match-finder.js` and `build/match-finder.css`, which are registered automatically by the plugin.

## Shortcodes
- `[shooters_hub_match_finder]`
- `[shooters_hub_club_finder]`

## Releasing
1. Bump the version in both files:
   - `shooters-hub.php` (`Version:` and `SH_PLUGIN_VERSION`)
   - `readme.txt` (`Stable tag`)
2. Commit and merge to `main`.
3. Create and push a tag matching that version, for example `v1.0.2`.
4. The repo release workflow calls the reusable template in `fortney-updates` to:
   - validate version consistency against the tag
   - install Composer dependencies (including `fe-plugin-core`)
   - build the plugin ZIP artifact
   - attach artifact to GitHub release
   - optionally publish metadata to `updates.fortneymfg.com`

## License
GPL-2.0-or-later. See [`license.txt`](license.txt).
