<?php namespace SH;

class Admin {
  const OPT = 'sh_options';

  public static function menu() {
    add_options_page('Shooters Hub', 'Shooters Hub', 'manage_options', 'shooters-hub', [__CLASS__, 'page']);
  }

  public static function register_settings() {
    register_setting(self::OPT, self::OPT, [
      'type'              => 'array',
      'show_in_rest'      => false,
      'sanitize_callback' => [__CLASS__, 'sanitize_options'],
    ]);

    add_settings_section('api', 'API', [__CLASS__, 'section_api'], self::OPT);
    self::add_text('api_base', 'API Base URL', 'https://shootershub.fortneyengineering.com/api', 'api');
    self::add_text('api_key', 'API Key/Token', '', 'api');
    self::add_text('public_app_base', 'Public Shooters Hub App Base URL', 'https://shootershub.fortneyengineering.com', 'api');

    add_settings_section('defaults', 'Global Finder Defaults', '__return_false', self::OPT);
    self::add_text('default_lat', 'Default Latitude', '', 'defaults');
    self::add_text('default_lng', 'Default Longitude', '', 'defaults');
    self::add_text('default_radius', 'Default Radius (miles)', '100', 'defaults');
    self::add_text('date_from', 'Default Date From (YYYY-MM-DD)', '', 'defaults');
    self::add_text('date_to', 'Default Date To (YYYY-MM-DD)', '', 'defaults');
    self::add_text('default_date_window_months', 'Default Date Window (months from today, 0=off)', '6', 'defaults');
    self::add_text('default_types', 'Default Disciplines (CSV)', '', 'defaults');
    self::add_text('default_sub_disciplines', 'Default Sub-disciplines (CSV)', '', 'defaults');
    self::add_text('default_tiers', 'Default Tiers (CSV)', '', 'defaults');
    self::add_text('default_statuses', 'Default Statuses (CSV)', '', 'defaults');
    self::add_text('default_series', 'Default Series IDs (CSV)', '', 'defaults');
    self::add_text('default_series_mode', 'Series Mode (or|and)', 'or', 'defaults');
    self::add_text('default_sort', 'Sort (dateAsc|dateDesc|nameAsc|nameDesc)', 'dateAsc', 'defaults');
    self::add_text('default_min_events', 'Club Finder Default Min Events', '', 'defaults');
    self::add_text('default_layout', 'Default Controls Layout (left|top)', 'left', 'defaults');

    add_settings_section('views_match', 'Match Finder Views', '__return_false', self::OPT);
    self::add_text('match_allowed_views', 'Allowed Views (CSV)', 'map,list,calendar,chart', 'views_match');
    self::add_text('match_default_view', 'Default View', 'map', 'views_match');

    add_settings_section('views_club', 'Club Finder Views', '__return_false', self::OPT);
    self::add_text('club_allowed_views', 'Allowed Views (CSV)', 'map,list', 'views_club');
    self::add_text('club_default_view', 'Default View', 'map', 'views_club');

    add_settings_section('theme', 'Theme', '__return_false', self::OPT);
    self::add_text('theme_tokens', 'Theme Tokens (JSON CSS variables)', '{"--primary":"#f59e0b"}', 'theme');

    add_settings_section('behavior', 'Behavior', '__return_false', self::OPT);
    self::add_checkbox('hide_distance_filters', 'Hide distance filters', 'behavior');
    self::add_checkbox('enable_local_entity_pages', 'Use local WordPress entity links in finder results', 'behavior');
    self::add_checkbox('default_show_header', 'Show header by default', 'behavior', true);
    self::add_checkbox('default_show_view_toggle', 'Show view toggle by default', 'behavior', true);
    self::add_checkbox('default_show_filters_panel', 'Show filters panel by default', 'behavior', true);
    self::add_checkbox('default_show_results_toolbar', 'Show results toolbar by default', 'behavior', true);
    self::add_checkbox('default_show_status_messages', 'Show status messages by default', 'behavior', true);
    self::add_checkbox('default_lock_view', 'Lock view switcher by default', 'behavior');
    self::add_checkbox('default_lock_location', 'Lock location controls by default', 'behavior');
    self::add_checkbox('default_lock_radius', 'Lock radius control by default', 'behavior');
    self::add_checkbox('default_lock_filters', 'Lock filters by default', 'behavior');

    add_settings_section('caching', 'Caching', '__return_false', self::OPT);
    self::add_text('cache_ttl', 'Cache TTL (seconds)', '60', 'caching');
  }

  public static function sanitize_options($input): array {
    $input = is_array($input) ? $input : [];
    $current = get_option(self::OPT, []);
    if (!is_array($current)) $current = [];

    $next = [];
    $textKeys = [
      'api_base',
      'default_lat',
      'default_lng',
      'default_radius',
      'date_from',
      'date_to',
      'default_date_window_months',
      'default_types',
      'default_sub_disciplines',
      'default_tiers',
      'default_statuses',
      'default_series',
      'default_series_mode',
      'default_sort',
      'default_min_events',
      'default_layout',
      'match_allowed_views',
      'match_default_view',
      'club_allowed_views',
      'club_default_view',
      'theme_tokens',
      'cache_ttl',
      'public_app_base',
    ];

    foreach ($textKeys as $key) {
      $next[$key] = isset($input[$key]) ? sanitize_text_field((string)$input[$key]) : '';
    }

    // Keep API key if left blank in the form.
    if (array_key_exists('api_key', $input)) {
      $apiKey = trim((string)$input['api_key']);
      $next['api_key'] = $apiKey === '' ? ($current['api_key'] ?? '') : sanitize_text_field($apiKey);
    } else {
      $next['api_key'] = $current['api_key'] ?? '';
    }

    $boolKeys = [
      'hide_distance_filters',
      'enable_local_entity_pages',
      'default_show_header',
      'default_show_view_toggle',
      'default_show_filters_panel',
      'default_show_results_toolbar',
      'default_show_status_messages',
      'default_lock_view',
      'default_lock_location',
      'default_lock_radius',
      'default_lock_filters',
    ];
    foreach ($boolKeys as $key) {
      $next[$key] = !empty($input[$key]) ? 1 : 0;
    }

    foreach ([
      'match_finder_page_id',
      'club_finder_page_id',
      'match_entity_page_id',
      'club_entity_page_id',
      'series_entity_page_id',
      'leaderboard_entity_page_id',
    ] as $idKey) {
      if (isset($current[$idKey])) $next[$idKey] = intval($current[$idKey]);
    }

    return $next;
  }

  public static function section_api() {
    echo '<p>Enter your Shooters Hub API base URL and API key. Finder requests are proxied through WordPress so the key stays server-side.</p>';
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
    $key = $args['key'];
    $raw = isset($opts[$key]) ? (string)$opts[$key] : '';
    $isApiKey = $key === 'api_key';
    $value = $isApiKey ? '' : esc_attr($raw);
    $placeholder = $isApiKey
      ? ($raw !== '' ? 'Stored (leave blank to keep current key)' : 'Paste API key')
      : ($args['placeholder'] ?? '');

    printf(
      '<input type="%s" name="%s[%s]" value="%s" class="regular-text" placeholder="%s" autocomplete="off" />',
      esc_attr($isApiKey ? 'password' : 'text'),
      esc_attr(self::OPT),
      esc_attr($key),
      $value,
      esc_attr($placeholder)
    );
  }

  public static function field_checkbox($args) {
    $opts = get_option(self::OPT, []);
    $key = $args['key'];
    $checked = isset($opts[$key]) ? (bool)$opts[$key] : (bool)($args['default'] ?? false);
    printf(
      '<label><input type="checkbox" name="%s[%s]" value="1" %s /> %s</label>',
      esc_attr(self::OPT),
      esc_attr($key),
      checked($checked, true, false),
      esc_html($args['label'] ?? '')
    );
  }

  public static function page() {
    $opts = get_option(self::OPT, []);
    $matchPageId = isset($opts['match_finder_page_id']) ? intval($opts['match_finder_page_id']) : 0;
    $clubPageId = isset($opts['club_finder_page_id']) ? intval($opts['club_finder_page_id']) : 0;
    $matchEntityPageId = isset($opts['match_entity_page_id']) ? intval($opts['match_entity_page_id']) : 0;
    $clubEntityPageId = isset($opts['club_entity_page_id']) ? intval($opts['club_entity_page_id']) : 0;
    $seriesEntityPageId = isset($opts['series_entity_page_id']) ? intval($opts['series_entity_page_id']) : 0;
    $leaderboardEntityPageId = isset($opts['leaderboard_entity_page_id']) ? intval($opts['leaderboard_entity_page_id']) : 0;
    $matchLink = $matchPageId ? get_permalink($matchPageId) : '';
    $clubLink = $clubPageId ? get_permalink($clubPageId) : '';
    $matchEntityLink = $matchEntityPageId ? get_permalink($matchEntityPageId) : '';
    $clubEntityLink = $clubEntityPageId ? get_permalink($clubEntityPageId) : '';
    $seriesEntityLink = $seriesEntityPageId ? get_permalink($seriesEntityPageId) : '';
    $leaderboardEntityLink = $leaderboardEntityPageId ? get_permalink($leaderboardEntityPageId) : '';
    ?>
    <div class="wrap">
      <h1>Shooters Hub Finder Integration</h1>
      <p>Configure API access and global defaults for the Match Finder and Club Finder embeds.</p>
      <form method="post" action="options.php">
        <?php settings_fields(self::OPT); do_settings_sections(self::OPT); submit_button(); ?>
      </form>

      <h2>Shortcodes</h2>
      <ul>
        <li><code>[shooters_hub_match_finder]</code> &ndash; renders the full match finder.</li>
        <li><code>[shooters_hub_club_finder]</code> &ndash; renders the full club finder.</li>
        <li><code>[shooters_hub_match_page]</code>, <code>[shooters_hub_club_page]</code>, <code>[shooters_hub_series_page]</code>, <code>[shooters_hub_leaderboard_page]</code> &ndash; entity template pages.</li>
        <li><code>[shooters_hub_entity_page type=\"match|club|series|leaderboard\" id=\"optional\"]</code> &ndash; generic entity renderer.</li>
      </ul>

      <?php if ($matchLink) : ?>
        <p>Match Finder page: <a href="<?php echo esc_url($matchLink); ?>" target="_blank" rel="noopener noreferrer"><?php echo esc_html($matchLink); ?></a></p>
      <?php endif; ?>
      <?php if ($clubLink) : ?>
        <p>Club Finder page: <a href="<?php echo esc_url($clubLink); ?>" target="_blank" rel="noopener noreferrer"><?php echo esc_html($clubLink); ?></a></p>
      <?php endif; ?>
      <?php if ($matchEntityLink) : ?>
        <p>Match template page: <a href="<?php echo esc_url($matchEntityLink); ?>" target="_blank" rel="noopener noreferrer"><?php echo esc_html($matchEntityLink); ?></a></p>
      <?php endif; ?>
      <?php if ($clubEntityLink) : ?>
        <p>Club template page: <a href="<?php echo esc_url($clubEntityLink); ?>" target="_blank" rel="noopener noreferrer"><?php echo esc_html($clubEntityLink); ?></a></p>
      <?php endif; ?>
      <?php if ($seriesEntityLink) : ?>
        <p>Series template page: <a href="<?php echo esc_url($seriesEntityLink); ?>" target="_blank" rel="noopener noreferrer"><?php echo esc_html($seriesEntityLink); ?></a></p>
      <?php endif; ?>
      <?php if ($leaderboardEntityLink) : ?>
        <p>Leaderboard template page: <a href="<?php echo esc_url($leaderboardEntityLink); ?>" target="_blank" rel="noopener noreferrer"><?php echo esc_html($leaderboardEntityLink); ?></a></p>
      <?php endif; ?>
      <p>Entity routes: <code>/match/{id}</code>, <code>/club/{id}</code>, <code>/series/{id}</code>, <code>/leaderboard/{id}</code>.</p>
      <p><strong>Powered by The Shooters Hub badge is always enabled in this build.</strong></p>
    </div>
    <?php
  }

  private static function ensure_page(array &$opts, string $slug, string $title, string $shortcode, string $optKey): void {
    $pageId = isset($opts[$optKey]) ? intval($opts[$optKey]) : 0;
    if ($pageId && get_post($pageId)) return;

    $existing = get_page_by_path($slug);
    if ($existing) {
      $opts[$optKey] = intval($existing->ID);
      return;
    }

    $pageId = wp_insert_post([
      'post_title'   => $title,
      'post_name'    => $slug,
      'post_status'  => 'publish',
      'post_type'    => 'page',
      'post_content' => $shortcode,
    ]);

    if (!is_wp_error($pageId)) {
      $opts[$optKey] = intval($pageId);
    }
  }

  public static function ensure_match_finder_page() {
    $opts = get_option(self::OPT, []);
    if (!is_array($opts)) $opts = [];

    self::ensure_page(
      $opts,
      'shooters-hub-match-finder',
      'Match Finder',
      '[shooters_hub_match_finder]',
      'match_finder_page_id'
    );

    self::ensure_page(
      $opts,
      'shooters-hub-club-finder',
      'Club Finder',
      '[shooters_hub_club_finder]',
      'club_finder_page_id'
    );

    self::ensure_page(
      $opts,
      'shooters-hub-match',
      'Match',
      '[shooters_hub_match_page]',
      'match_entity_page_id'
    );

    self::ensure_page(
      $opts,
      'shooters-hub-club',
      'Club',
      '[shooters_hub_club_page]',
      'club_entity_page_id'
    );

    self::ensure_page(
      $opts,
      'shooters-hub-series',
      'Series',
      '[shooters_hub_series_page]',
      'series_entity_page_id'
    );

    self::ensure_page(
      $opts,
      'shooters-hub-leaderboard',
      'Leaderboard',
      '[shooters_hub_leaderboard_page]',
      'leaderboard_entity_page_id'
    );

    update_option(self::OPT, $opts);
  }
}
