<?php
/**
 * Plugin Name: Shooters Hub
 * Description: Embeddable Match Finder and Club Finder powered by The Shooters Hub.
 * Version: 1.0.1
 * Author: FortneyMFG
 * Author URI: https://fortneymfg.com
 * Text Domain: shooters-hub
 * Update URI: https://updates.fortneymfg.com/plugins/shooters-hub-wp
 */

if (!defined('ABSPATH')) exit;

if (!defined('SH_PLUGIN_VERSION')) {
  define('SH_PLUGIN_VERSION', '1.0.1');
}
if (!defined('SH_PLUGIN_SLUG')) {
  define('SH_PLUGIN_SLUG', 'shooters-hub-wp');
}
if (!defined('SH_UPDATES_BASE_URL')) {
  define('SH_UPDATES_BASE_URL', 'https://updates.fortneymfg.com');
}
if (!defined('SH_UPDATES_CHANNEL')) {
  define('SH_UPDATES_CHANNEL', 'stable');
}

$sh_autoload = __DIR__ . '/vendor/autoload.php';
if (file_exists($sh_autoload)) {
  require_once $sh_autoload;
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

// Fortney native updater integration via shared plugin core.
if (class_exists('\\Fortney\\PluginCore\\V1\\Core\\Bootstrap') && class_exists('\\Fortney\\PluginCore\\V1\\Core\\PluginIdentity')) {
  $sh_identity = new \Fortney\PluginCore\V1\Core\PluginIdentity(
    SH_PLUGIN_SLUG,
    __FILE__,
    SH_PLUGIN_VERSION,
    'Shooters Hub',
    SH_UPDATES_BASE_URL,
    SH_UPDATES_CHANNEL
  );

  $sh_credentials = null;
  if (defined('SH_UPDATES_SITE_KEY') && defined('SH_UPDATES_SITE_SECRET') && SH_UPDATES_SITE_KEY && SH_UPDATES_SITE_SECRET) {
    $sh_credentials = new \Fortney\PluginCore\V1\Update\SiteCredentials(
      SH_UPDATES_SITE_KEY,
      SH_UPDATES_SITE_SECRET
    );
  }

  \Fortney\PluginCore\V1\Core\Bootstrap::registerUpdater($sh_identity, $sh_credentials);
}
