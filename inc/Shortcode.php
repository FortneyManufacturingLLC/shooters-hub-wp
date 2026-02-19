<?php namespace SH;

class Shortcode {
  private static function parse_csv($value): array {
    if (is_array($value)) return array_values(array_filter(array_map('trim', $value), 'strlen'));
    if (!is_scalar($value)) return [];
    return array_values(array_filter(array_map('trim', explode(',', (string)$value)), 'strlen'));
  }

  private static function parse_float($value): ?float {
    return is_numeric($value) ? floatval($value) : null;
  }

  private static function parse_int($value): ?int {
    return is_numeric($value) ? intval($value) : null;
  }

  private static function sanitize_attrs($atts): array {
    $out = [];
    foreach ((array)$atts as $key => $value) {
      if (is_bool($value)) {
        $out[$key] = $value;
      } elseif (is_numeric($value)) {
        $out[$key] = $value + 0;
      } elseif (is_scalar($value)) {
        $out[$key] = sanitize_text_field((string)$value);
      }
    }
    return $out;
  }

  private static function default_filters(array $opts): array {
    $filters = [
      'types' => self::parse_csv($opts['default_types'] ?? ''),
      'subDisciplines' => self::parse_csv($opts['default_sub_disciplines'] ?? ''),
      'tiers' => self::parse_csv($opts['default_tiers'] ?? ''),
      'statuses' => self::parse_csv($opts['default_statuses'] ?? ''),
      'series' => self::parse_csv($opts['default_series'] ?? ''),
      'seriesMode' => (($opts['default_series_mode'] ?? 'or') === 'and') ? 'and' : 'or',
      'sort' => in_array(($opts['default_sort'] ?? ''), ['dateAsc', 'dateDesc', 'nameAsc', 'nameDesc'], true)
        ? $opts['default_sort']
        : 'dateAsc',
    ];

    $from = trim((string)($opts['date_from'] ?? ''));
    $to = trim((string)($opts['date_to'] ?? ''));
    if ($from === '' && $to === '') {
      $months = self::parse_int($opts['default_date_window_months'] ?? 6);
      if ($months !== null && $months > 0) {
        $startTs = current_time('timestamp');
        $endTs = strtotime('+' . $months . ' months', $startTs);
        if ($endTs !== false) {
          $from = wp_date('Y-m-d', $startTs);
          $to = wp_date('Y-m-d', $endTs);
        }
      }
    }
    if ($from !== '') $filters['from'] = $from;
    if ($to !== '') $filters['to'] = $to;

    $minEvents = self::parse_int($opts['default_min_events'] ?? null);
    if ($minEvents !== null && $minEvents >= 0) $filters['minEvents'] = $minEvents;

    $lat = self::parse_float($opts['default_lat'] ?? null);
    $lng = self::parse_float($opts['default_lng'] ?? null);
    $radius = self::parse_float($opts['default_radius'] ?? null);
    if ($lat !== null) $filters['lat'] = $lat;
    if ($lng !== null) $filters['lng'] = $lng;
    if ($radius !== null) $filters['radius'] = $radius;

    return $filters;
  }

  private static function mode_allowed_views(array $opts, string $mode): array {
    $csv = $mode === 'clubs'
      ? ($opts['club_allowed_views'] ?? 'map,list')
      : ($opts['match_allowed_views'] ?? 'map,list,calendar,chart');
    $allowed = self::parse_csv($csv);
    $valid = $mode === 'clubs' ? ['map', 'list'] : ['map', 'list', 'calendar', 'chart'];
    $filtered = array_values(array_filter($allowed, function($view) use ($valid) {
      return in_array($view, $valid, true);
    }));
    return !empty($filtered) ? $filtered : $valid;
  }

  private static function mode_default_view(array $opts, string $mode, array $allowed): string {
    $candidate = $mode === 'clubs'
      ? ($opts['club_default_view'] ?? 'map')
      : ($opts['match_default_view'] ?? 'map');
    return in_array($candidate, $allowed, true) ? $candidate : $allowed[0];
  }

  private static function theme(array $opts): array {
    $tokens = [];
    if (!empty($opts['theme_tokens'])) {
      $decoded = json_decode((string)$opts['theme_tokens'], true);
      if (is_array($decoded)) {
        foreach ($decoded as $key => $value) {
          if (is_scalar($value)) $tokens[(string)$key] = (string)$value;
        }
      }
    }
    return ['tokens' => $tokens];
  }

  private static function with_overrides(array $finder, array $attrs, string $mode): array {
    $map = [
      'lat' => 'lat',
      'lng' => 'lng',
      'radius' => 'radius',
      'from' => 'from',
      'to' => 'to',
      'zip' => 'zip',
      'seriesMode' => 'seriesMode',
      'sort' => 'sort',
      'minEvents' => 'minEvents',
      'lockedClubId' => 'lockedClubId',
      'hideDistanceFilters' => 'hideDistanceFilters',
      'publicAppBase' => 'publicAppBase',
      'entityLinkMode' => 'entityLinkMode',
      'layout' => 'controlsLayout',
    ];

    foreach ($map as $attrKey => $filterKey) {
      if (!array_key_exists($attrKey, $attrs)) continue;
      $value = $attrs[$attrKey];
      if ($value === '' || $value === null) continue;
      if (in_array($attrKey, ['lat', 'lng', 'radius'], true)) {
        if (is_numeric($value)) $finder['initialFilters'][$filterKey] = floatval($value);
        continue;
      }
      if ($attrKey === 'minEvents') {
        if (is_numeric($value)) $finder['initialFilters'][$filterKey] = intval($value);
        continue;
      }
      if ($attrKey === 'hideDistanceFilters') {
        $finder[$filterKey] = in_array(strtolower((string)$value), ['1', 'true', 'yes', 'on'], true);
        continue;
      }
      if ($attrKey === 'publicAppBase') {
        $finder[$filterKey] = esc_url_raw((string)$value);
        continue;
      }
      if ($attrKey === 'entityLinkMode') {
        $mode = strtolower((string)$value);
        $finder[$filterKey] = $mode === 'local' ? 'local' : 'external';
        continue;
      }
      if ($attrKey === 'layout') {
        $layout = strtolower((string)$value);
        $finder[$filterKey] = $layout === 'top' ? 'top' : 'left';
        continue;
      }
      if ($attrKey === 'lockedClubId') {
        if ($mode === 'matches') {
          $finder[$filterKey] = (string)$value;
        }
        continue;
      }
      $finder['initialFilters'][$filterKey] = (string)$value;
    }

    $arrayMap = [
      'types' => 'types',
      'subDisciplines' => 'subDisciplines',
      'tiers' => 'tiers',
      'statuses' => 'statuses',
      'series' => 'series',
    ];
    foreach ($arrayMap as $attrKey => $filterKey) {
      if (!array_key_exists($attrKey, $attrs)) continue;
      $finder['initialFilters'][$filterKey] = self::parse_csv($attrs[$attrKey]);
    }

    if (isset($attrs['allowedViews'])) {
      $candidate = self::parse_csv($attrs['allowedViews']);
      $valid = $mode === 'clubs' ? ['map', 'list'] : ['map', 'list', 'calendar', 'chart'];
      $finder['allowedViews'] = array_values(array_filter($candidate, function($view) use ($valid) {
        return in_array($view, $valid, true);
      }));
      if (empty($finder['allowedViews'])) {
        $finder['allowedViews'] = $valid;
      }
    }

    if (isset($attrs['defaultView'])) {
      $view = (string)$attrs['defaultView'];
      if (in_array($view, $finder['allowedViews'], true)) {
        $finder['defaultView'] = $view;
      }
    }

    return $finder;
  }

  private static function entity_path_bases(): array {
    return [
      'match' => untrailingslashit(home_url('/match')),
      'club' => untrailingslashit(home_url('/club')),
      'series' => untrailingslashit(home_url('/series')),
      'leaderboard' => untrailingslashit(home_url('/leaderboard')),
    ];
  }

  private static function render_finder(string $mode, array $atts = []): string {
    Assets::enqueue();

    $opts = get_option(Admin::OPT, []);
    $attrs = self::sanitize_attrs($atts);

    $allowedViews = self::mode_allowed_views($opts, $mode);
    $defaultView = self::mode_default_view($opts, $mode, $allowedViews);

    $defaultLat = self::parse_float($opts['default_lat'] ?? null);
    $defaultLng = self::parse_float($opts['default_lng'] ?? null);
    $defaultRadius = self::parse_float($opts['default_radius'] ?? null);

    $finder = [
      'allowedViews' => $allowedViews,
      'defaultView' => $defaultView,
      'defaultCenter' => [
        'lat' => $defaultLat,
        'lng' => $defaultLng,
      ],
      'defaultRadius' => $defaultRadius,
      'hideDistanceFilters' => !empty($opts['hide_distance_filters']),
      'controlsLayout' => 'left',
      'publicAppBase' => !empty($opts['public_app_base']) ? esc_url_raw((string)$opts['public_app_base']) : '',
      'defaultDateWindowMonths' => self::parse_int($opts['default_date_window_months'] ?? 6) ?? 6,
      'entityLinkMode' => !empty($opts['enable_local_entity_pages']) ? 'local' : 'external',
      'entityPathBases' => self::entity_path_bases(),
      'initialFilters' => self::default_filters($opts),
    ];

    $finder = self::with_overrides($finder, $attrs, $mode);

    $theme = self::theme($opts);
    if (!empty($attrs['themeTokens'])) {
      $decoded = json_decode((string)$attrs['themeTokens'], true);
      if (is_array($decoded)) {
        $tokens = [];
        foreach ($decoded as $key => $value) {
          if (is_scalar($value)) $tokens[(string)$key] = (string)$value;
        }
        if (!empty($tokens)) $theme['tokens'] = $tokens;
      }
    }

    $config = [
      'type' => 'finder',
      'mode' => $mode,
      'apiBase' => esc_url_raw(get_rest_url(null, 'shooters-hub/v1/proxy')),
      'olcBase' => esc_url_raw(get_rest_url(null, 'shooters-hub/v1/proxy/olc')),
      'finder' => $finder,
      'theme' => $theme,
      'poweredByLockedOn' => true,
    ];

    $id = 'sh-embed-' . wp_generate_uuid4();
    $json = wp_json_encode($config, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

    ob_start(); ?>
      <div id="<?php echo esc_attr($id); ?>"
           class="sh-embed sh-embed-finder sh-embed-<?php echo esc_attr($mode); ?>"
           data-sh-config="<?php echo esc_attr($json); ?>"></div>
    <?php
    return trim(ob_get_clean());
  }

  public static function render_match_finder($atts = []): string {
    return self::render_finder('matches', (array)$atts);
  }

  public static function render_club_finder($atts = []): string {
    return self::render_finder('clubs', (array)$atts);
  }

  public static function render_entity_page($atts = []): string {
    Assets::enqueue();

    $opts = get_option(Admin::OPT, []);
    if (!is_array($opts)) $opts = [];
    $attrs = self::sanitize_attrs((array)$atts);
    $route = EntityPages::current_context();

    $entityType = strtolower((string)($attrs['type'] ?? $route['entityType'] ?? ''));
    if (!in_array($entityType, ['match', 'club', 'series', 'leaderboard'], true)) {
      $entityType = 'match';
    }
    $entityId = trim((string)($attrs['id'] ?? $route['entityId'] ?? ''));

    $theme = self::theme($opts);
    if (!empty($attrs['themeTokens'])) {
      $decoded = json_decode((string)$attrs['themeTokens'], true);
      if (is_array($decoded)) {
        $tokens = [];
        foreach ($decoded as $key => $value) {
          if (is_scalar($value)) $tokens[(string)$key] = (string)$value;
        }
        if (!empty($tokens)) $theme['tokens'] = $tokens;
      }
    }

    $config = [
      'type' => 'entity-page',
      'entityType' => $entityType,
      'entityId' => $entityId,
      'apiBase' => esc_url_raw(get_rest_url(null, 'shooters-hub/v1/proxy')),
      'olcBase' => esc_url_raw(get_rest_url(null, 'shooters-hub/v1/proxy/olc')),
      'finder' => [
        'publicAppBase' => !empty($opts['public_app_base']) ? esc_url_raw((string)$opts['public_app_base']) : '',
        'entityLinkMode' => !empty($opts['enable_local_entity_pages']) ? 'local' : 'external',
        'entityPathBases' => self::entity_path_bases(),
      ],
      'theme' => $theme,
      'poweredByLockedOn' => true,
    ];

    $id = 'sh-embed-' . wp_generate_uuid4();
    $json = wp_json_encode($config, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

    ob_start(); ?>
      <div id="<?php echo esc_attr($id); ?>"
           class="sh-embed sh-embed-entity sh-embed-entity-<?php echo esc_attr($entityType); ?>"
           data-sh-config="<?php echo esc_attr($json); ?>"></div>
    <?php
    return trim(ob_get_clean());
  }
}
