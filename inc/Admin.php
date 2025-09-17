<?php namespace SH;

class Admin {
  const OPT = 'sh_options';

  public static function menu() {
    add_options_page('Shooters Hub', 'Shooters Hub', 'manage_options', 'shooters-hub', [__CLASS__, 'page']);
  }

  public static function register_settings() {
    register_setting(self::OPT, self::OPT, ['type' => 'array', 'show_in_rest' => false]);

    add_settings_section('api', 'API', [__CLASS__, 'section_api'], self::OPT);
    self::add_text('api_base', 'API Base URL', 'https://api.shooters-hub.com', 'api');
    self::add_text('api_key', 'API Key/Token', '••••••', 'api');

    add_settings_section('defaults', 'Match Finder Defaults', '__return_false', self::OPT);
    self::add_text('default_view', 'Default View (map|list|calendar)', 'map', 'defaults');
    self::add_text('default_lat', 'Default Latitude', '', 'defaults');
    self::add_text('default_lng', 'Default Longitude', '', 'defaults');
    self::add_text('default_radius', 'Default Radius (miles)', '150', 'defaults');
    self::add_text('default_location_label', 'Default Location Label', '', 'defaults');
    self::add_text('date_from', 'Default Date From (YYYY-MM-DD)', '', 'defaults');
    self::add_text('date_to', 'Default Date To (YYYY-MM-DD)', '', 'defaults');
    self::add_text('default_types', 'Default Types (CSV)', '', 'defaults');
    self::add_text('default_tiers', 'Default Tiers (CSV)', '', 'defaults');
    self::add_text('default_statuses', 'Default Statuses (CSV)', '', 'defaults');
    self::add_text('default_series', 'Default Series (CSV)', '', 'defaults');
    self::add_text('default_seasons', 'Default Seasons (CSV)', '', 'defaults');

    add_settings_section('locks', 'Locks & Limits', '__return_false', self::OPT);
    self::add_checkbox('lock_view', 'Lock view selection', 'locks');
    self::add_checkbox('lock_location', 'Lock map center and location filters', 'locks');
    self::add_checkbox('lock_radius', 'Lock radius', 'locks');
    self::add_checkbox('lock_filters', 'Lock advanced filters', 'locks');
    self::add_text('allowed_views', 'Allowed Views (CSV)', 'map,list,calendar', 'locks');
    self::add_text('radius_min', 'Radius Min (miles)', '10', 'locks');
    self::add_text('radius_max', 'Radius Max (miles)', '500', 'locks');

    add_settings_section('caching', 'Caching', '__return_false', self::OPT);
    self::add_text('cache_ttl', 'Cache TTL (seconds)', '60', 'caching');

    add_settings_section('presentation', 'Presentation & Branding', '__return_false', self::OPT);
    self::add_checkbox('show_powered_by', 'Display “Powered by The Shooters Hub”', 'presentation', true);
    self::add_text('powered_by_url', 'Powered by link URL', 'https://theshootershub.com', 'presentation');

    add_settings_section('theme', 'Theme', '__return_false', self::OPT);
    self::add_text('theme_mode', 'Theme Mode (inherit|preset|custom)', 'inherit', 'theme');
    self::add_text('theme_tokens', 'Theme Tokens (JSON of CSS vars)', '{"--sh-accent":"#0ea5e9"}', 'theme');
  }

  public static function section_api() {
    echo '<p>Enter the Shooters Hub API endpoint and API token. The plugin proxies requests through WordPress for security.</p>';
  }

  private static function add_text($key, $label, $placeholder = '', $section = 'defaults') {
    add_settings_field($key, $label, [__CLASS__, 'field_text'], self::OPT, $section, [
      'key' => $key,
      'placeholder' => $placeholder,
    ]);
  }

  private static function add_checkbox($key, $label, $section = 'defaults', $default = false) {
    add_settings_field($key, $label, [__CLASS__, 'field_checkbox'], self::OPT, $section, [
      'key' => $key,
      'label' => $label,
      'default' => $default,
    ]);
  }

  public static function field_text($args) {
    $opts = get_option(self::OPT, []);
    $key  = $args['key'];
    $val  = isset($opts[$key]) ? esc_attr($opts[$key]) : '';
    printf('<input type="text" name="%s[%s]" value="%s" class="regular-text" placeholder="%s" />', esc_attr(self::OPT), esc_attr($key), $val, esc_attr($args['placeholder'] ?? ''));
  }

  public static function field_checkbox($args) {
    $opts = get_option(self::OPT, []);
    $key  = $args['key'];
    $checked = isset($opts[$key]) ? (bool)$opts[$key] : (bool)($args['default'] ?? false);
    printf('<label><input type="checkbox" name="%s[%s]" value="1" %s /> %s</label>', esc_attr(self::OPT), esc_attr($key), checked($checked, true, false), esc_html($args['label'] ?? ''));
  }

  public static function page() {
    $opts = get_option(self::OPT, []);
    $page_id = isset($opts['match_finder_page_id']) ? intval($opts['match_finder_page_id']) : 0;
    $link = $page_id ? get_permalink($page_id) : '';
    ?>
    <div class="wrap">
      <h1>Shooters Hub Integration</h1>
      <p>Configure the API connection, match finder defaults, and branding for the Shooters Hub embeds. Use the provided shortcodes or Gutenberg blocks to add widgets anywhere on your site.</p>
      <form method="post" action="options.php">
        <?php settings_fields(self::OPT); do_settings_sections(self::OPT); submit_button(); ?>
      </form>
      <h2>Usage</h2>
      <ul>
        <li><code>[shooters_hub_match_finder]</code> &ndash; renders the interactive match finder.</li>
        <li><code>[shooters_hub_match id="MATCH_ID"]</code> &ndash; displays a single match card.</li>
        <li><code>[shooters_hub_club id="CLUB_ID"]</code> &ndash; displays a club profile card.</li>
        <li><code>[shooters_hub_leaderboard season="SEASON_ID"]</code> &ndash; displays a season leaderboard.</li>
      </ul>
      <?php if ($link) : ?>
        <p>The dedicated Match Finder page lives at: <a href="<?php echo esc_url($link); ?>" target="_blank" rel="noopener noreferrer"><?php echo esc_html($link); ?></a></p>
      <?php endif; ?>
      <p><em>All embeds proudly include a “Powered by The Shooters Hub” badge. Disable it from the settings if your license allows.</em></p>
    </div>
    <?php
  }

  public static function ensure_match_finder_page() {
    $opts = get_option(self::OPT, []);
    $page_id = isset($opts['match_finder_page_id']) ? intval($opts['match_finder_page_id']) : 0;
    if ($page_id && get_post($page_id)) return;

    $existing = get_page_by_path('shooters-hub-match-finder');
    if ($existing) {
      $opts['match_finder_page_id'] = $existing->ID;
      update_option(self::OPT, $opts);
      return;
    }

    $page_id = wp_insert_post([
      'post_title'   => 'Match Finder',
      'post_name'    => 'shooters-hub-match-finder',
      'post_status'  => 'publish',
      'post_type'    => 'page',
      'post_content' => '[shooters_hub_match_finder]'
    ]);
    if (!is_wp_error($page_id)) {
      $opts['match_finder_page_id'] = $page_id;
      update_option(self::OPT, $opts);
    }
  }
}
