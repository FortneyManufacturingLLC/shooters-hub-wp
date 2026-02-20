<?php
/**
 * Plugin Name: Shooters Hub
 * Description: Embeddable Match Finder and Club Finder powered by The Shooters Hub.
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
require __DIR__ . '/inc/EntityPages.php';

// Init
add_action('init', function(){
  SH\Assets::register();
  SH\Block::register();
  SH\EntityPages::register_routes();
});
add_filter('query_vars', ['SH\EntityPages', 'query_vars']);
add_action('admin_menu', ['SH\Admin', 'menu']);
add_action('admin_init', ['SH\Admin', 'register_settings']);
add_shortcode('shooters_hub_match_finder', ['SH\Shortcode', 'render_match_finder']);
add_shortcode('shooters_hub_club_finder', ['SH\Shortcode', 'render_club_finder']);
add_shortcode('shooters_hub_entity_page', ['SH\Shortcode', 'render_entity_page']);
add_shortcode('shooters_hub_match_page', function($atts = []) { return SH\Shortcode::render_entity_page(array_merge((array)$atts, ['type' => 'match'])); });
add_shortcode('shooters_hub_club_page', function($atts = []) { return SH\Shortcode::render_entity_page(array_merge((array)$atts, ['type' => 'club'])); });
add_shortcode('shooters_hub_series_page', function($atts = []) { return SH\Shortcode::render_entity_page(array_merge((array)$atts, ['type' => 'series'])); });
add_shortcode('shooters_hub_leaderboard_page', function($atts = []) { return SH\Shortcode::render_entity_page(array_merge((array)$atts, ['type' => 'leaderboard'])); });
add_action('rest_api_init', ['SH\RestProxy', 'register_routes']);
register_activation_hook(__FILE__, ['SH\Admin', 'ensure_match_finder_page']);
register_activation_hook(__FILE__, ['SH\EntityPages', 'flush_routes']);
register_deactivation_hook(__FILE__, ['SH\EntityPages', 'flush_routes']);

add_filter('plugin_action_links_' . plugin_basename(__FILE__), function(array $links): array {
  $settingsUrl = admin_url('options-general.php?page=shooters-hub');
  array_unshift($links, '<a href="' . esc_url($settingsUrl) . '">Settings</a>');
  return $links;
});

// Plugin Update Checker (GitHub). Optional at runtime.
$sh_puc = __DIR__ . '/vendor/plugin-update-checker/plugin-update-checker.php';
if (file_exists($sh_puc)) {
  require $sh_puc;
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
}
