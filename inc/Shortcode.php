<?php namespace SH;

class Shortcode {
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

  private static function defaults(array $opts): array {
    $float = function($value) {
      return is_numeric($value) ? floatval($value) : null;
    };
    return array_filter([
      'view'           => $opts['default_view'] ?? 'map',
      'lat'            => $float($opts['default_lat'] ?? null),
      'lng'            => $float($opts['default_lng'] ?? null),
      'radius'         => $float($opts['default_radius'] ?? null),
      'from'           => $opts['date_from'] ?? '',
      'to'             => $opts['date_to'] ?? '',
      'types'          => $opts['default_types'] ?? '',
      'tiers'          => $opts['default_tiers'] ?? '',
      'statuses'       => $opts['default_statuses'] ?? '',
      'seasons'        => $opts['default_seasons'] ?? '',
      'series'         => $opts['default_series'] ?? '',
      'locationLabel'  => $opts['default_location_label'] ?? '',
    ], function($value) {
      return $value !== '' && $value !== null;
    });
  }

  private static function locks(array $opts): array {
    return [
      'view'     => !empty($opts['lock_view']),
      'location' => !empty($opts['lock_location']),
      'radius'   => !empty($opts['lock_radius']),
      'filters'  => !empty($opts['lock_filters']),
    ];
  }

  private static function allowed_views(array $opts): array {
    if (empty($opts['allowed_views'])) return [];
    return array_filter(array_map('trim', explode(',', $opts['allowed_views'])));
  }

  private static function radius_limits(array $opts): array {
    $min = isset($opts['radius_min']) && is_numeric($opts['radius_min']) ? floatval($opts['radius_min']) : null;
    $max = isset($opts['radius_max']) && is_numeric($opts['radius_max']) ? floatval($opts['radius_max']) : null;
    return ['min' => $min, 'max' => $max];
  }

  private static function theme(array $opts): array {
    $tokens = [];
    if (!empty($opts['theme_tokens'])) {
      $decoded = json_decode((string)$opts['theme_tokens'], true);
      if (is_array($decoded)) $tokens = $decoded;
    }
    return [
      'mode'   => $opts['theme_mode'] ?? 'inherit',
      'tokens' => $tokens,
    ];
  }

  private static function render_embed(string $type, array $atts = []): string {
    Assets::enqueue();

    $opts = get_option(Admin::OPT, []);
    $showPowered = array_key_exists('show_powered_by', $opts) ? !empty($opts['show_powered_by']) : true;
    $poweredUrl  = !empty($opts['powered_by_url']) ? esc_url_raw($opts['powered_by_url']) : '';

    $config = [
      'type'    => $type,
      'restBase'=> esc_url_raw( get_rest_url(null, 'shooters-hub/v1/proxy') ),
      'attrs'   => self::sanitize_attrs($atts),
      'options' => [
        'defaults'      => self::defaults($opts),
        'locks'         => self::locks($opts),
        'allowedViews'  => self::allowed_views($opts),
        'radiusLimits'  => self::radius_limits($opts),
        'theme'         => self::theme($opts),
        'showPoweredBy' => $showPowered,
        'poweredByUrl'  => $poweredUrl,
      ],
    ];

    $id = 'sh-embed-' . wp_generate_uuid4();
    $json = wp_json_encode($config, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

    ob_start(); ?>
      <div id="<?php echo esc_attr($id); ?>"
           class="sh-embed sh-embed-<?php echo esc_attr($type); ?>"
           data-sh-config="<?php echo esc_attr($json); ?>"></div>
    <?php
    return trim(ob_get_clean());
  }

  public static function render_match_finder($atts = []): string {
    return self::render_embed('matchFinder', (array)$atts);
  }

  public static function render_match($atts = []): string {
    return self::render_embed('matchCard', (array)$atts);
  }

  public static function render_club($atts = []): string {
    return self::render_embed('clubCard', (array)$atts);
  }

  public static function render_leaderboard($atts = []): string {
    return self::render_embed('leaderboard', (array)$atts);
  }
}
