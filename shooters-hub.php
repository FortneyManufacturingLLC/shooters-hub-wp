<?php
/**
 * Plugin Name: Shooters Hub
 * Description: Embeddable Match Finder, cards, and leaderboards powered by The Shooters Hub.
 * Version: 1.0.1
 * Author: Fortney Engineering
 * Text Domain: shooters-hub
 * Update URI: https://updates.shooters-hub.com/plugins/shooters-hub
 */

if (!defined('ABSPATH')) exit;

if (!defined('SH_PLUGIN_VERSION')) {
  define('SH_PLUGIN_VERSION', '1.0.1');
}

// Autoload
require __DIR__ . '/inc/Admin.php';
require __DIR__ . '/inc/Assets.php';
require __DIR__ . '/inc/Shortcode.php';
require __DIR__ . '/inc/Block.php';
require __DIR__ . '/inc/RestProxy.php';
require __DIR__ . '/inc/Helpers.php';

// Init
add_action('init', function(){
  SH\Assets::register();
  SH\Block::register();
});
add_action('admin_menu', ['SH\Admin', 'menu']);
add_action('admin_init', ['SH\Admin', 'register_settings']);
add_shortcode('shooters_hub_match_finder', ['SH\Shortcode', 'render_match_finder']);
add_shortcode('shooters_hub_match', ['SH\Shortcode', 'render_match']);
add_shortcode('shooters_hub_club', ['SH\Shortcode', 'render_club']);
add_shortcode('shooters_hub_leaderboard', ['SH\Shortcode', 'render_leaderboard']);
add_action('rest_api_init', ['SH\RestProxy', 'register_routes']);
register_activation_hook(__FILE__, ['SH\Admin', 'ensure_match_finder_page']);

// Plugin Update Checker (GitHub)
require __DIR__ . '/vendor/plugin-update-checker/plugin-update-checker.php';
$sh_updater = Puc_v4_Factory::buildUpdateChecker(
  'https://github.com/FortneyManufacturingLLC/shooters-hub-wp', // repo root
  __FILE__,
  'shooters-hub' // plugin slug/folder name in ZIP
);
$sh_updater->getVcsApi()->enableReleaseAssets();

// Optional: private repo token defined in wp-config.php: define('SH_GH_TOKEN','ghp_xxx');
if (defined('SH_GH_TOKEN') && SH_GH_TOKEN) {
  $sh_updater->setAuthentication(SH_GH_TOKEN);
}
