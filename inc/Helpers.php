<?php namespace SH;

class Helpers {
  private static function opt(array $opts, string $key): string {
    return isset($opts[$key]) ? trim((string)$opts[$key]) : '';
  }

  public static function clamp_query(array $qs, array $opts): array {
    $radiusMin = is_numeric(self::opt($opts, 'radius_min')) ? floatval($opts['radius_min']) : null;
    $radiusMax = is_numeric(self::opt($opts, 'radius_max')) ? floatval($opts['radius_max']) : null;

    if (!empty($opts['lock_radius']) && self::opt($opts, 'default_radius') !== '') {
      $qs['radius'] = floatval($opts['default_radius']);
    }

    if (isset($qs['radius'])) {
      $r = floatval($qs['radius']);
      if ($radiusMin !== null) $r = max($r, $radiusMin);
      if ($radiusMax !== null) $r = min($r, $radiusMax);
      $qs['radius'] = $r;
    }

    $allowedViews = [];
    if (!empty($opts['allowed_views'])) {
      $allowedViews = array_filter(array_map('trim', explode(',', $opts['allowed_views'])));
    }

    if (!empty($opts['lock_view']) && self::opt($opts, 'default_view') !== '') {
      $qs['view'] = $opts['default_view'];
    }

    if (!empty($allowedViews) && isset($qs['view'])) {
      if (!in_array($qs['view'], $allowedViews, true)) {
        $qs['view'] = $allowedViews[0];
      }
    }

    if (!empty($opts['lock_location'])) {
      if (self::opt($opts, 'default_lat') !== '' && self::opt($opts, 'default_lng') !== '') {
        $qs['lat'] = $opts['default_lat'];
        $qs['lng'] = $opts['default_lng'];
      }
      unset($qs['zip']);
    }

    if (!empty($opts['lock_filters'])) {
      $map = [
        'type'    => 'default_types',
        'tier'    => 'default_tiers',
        'status'  => 'default_statuses',
        'series'  => 'default_series',
        'seasons' => 'default_seasons',
        'from'    => 'date_from',
        'to'      => 'date_to',
      ];
      foreach ($map as $param => $optKey) {
        $val = self::opt($opts, $optKey);
        if ($val !== '') {
          $qs[$param] = $val;
        }
      }
    }

    if (!empty($opts['hide_sidebar'])) {
      $qs['sidebar'] = 'off';
    }

    if (self::opt($opts, 'default_lat') !== '' && self::opt($opts, 'default_lng') !== '') {
      if (!isset($qs['lat']) && !isset($qs['lng'])) {
        $qs['lat'] = $opts['default_lat'];
        $qs['lng'] = $opts['default_lng'];
      }
    }

    return $qs;
  }
}
