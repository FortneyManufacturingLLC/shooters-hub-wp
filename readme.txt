=== Shooters Hub ===
Contributors: fortneyengineering
Requires at least: 6.0
Tested up to: 6.6
Stable tag: 0.1.2
License: GPLv2 or later

Embed the Shooters Hub Match Finder and Club Finder on any WordPress site.

== Description ==
The official Shooters Hub plugin provides a secure way to surface finder data on your site. Configure the API base URL and token under **Settings → Shooters Hub**, then use shortcodes or Gutenberg blocks to place either finder anywhere.

* `[shooters_hub_match_finder]` – full Match Finder (map/list/calendar/chart).
* `[shooters_hub_club_finder]` – full Club Finder (map/list).

Each block mirrors shortcode functionality and can be adjusted from the block inspector. The plugin provisions optional “Match Finder” and “Club Finder” pages during activation for quick start.

== Installation ==
1. Upload the plugin zip or run the provided build pipeline (`npm run build`).
2. Activate “Shooters Hub” from the WordPress plugins list.
3. Visit **Settings → Shooters Hub** and enter your API base URL and API key.
4. Add the provided shortcodes or the “Shooters Hub – …” Gutenberg blocks to any page.

== Frequently Asked Questions ==
= Where do I get an API token? =
API access is provided through The Shooters Hub partner program. Configure the base URL and token supplied by the platform.

= Can I hide the “Powered by The Shooters Hub” badge? =
Not in this build. Attribution is forced on.

== Changelog ==
= 1.0.1 =
* Switched the auto-update feed to the dedicated `FortneyManufacturingLLC/shooters-hub-wp` repository.
* Added release automation scaffolding and synced README content for GitHub distribution.

= 1.0.0 =
* Rebuilt the plugin UI with a dedicated React embed.
* Added WordPress admin settings for API, defaults, locks, and theme tokens.
* Added Gutenberg blocks for the match finder, match card, club card, and leaderboard widgets.
* Added REST proxy caching controls and automatic Match Finder page provisioning.
