<?php namespace SH;

class Block {
  public static function register() {
    if (!function_exists('register_block_type')) return;

    $blocks = [
      'match-finder' => ['callback' => [Shortcode::class, 'render_match_finder']],
      'club-finder'  => ['callback' => [Shortcode::class, 'render_club_finder']],
      'finder-suite' => ['callback' => [Shortcode::class, 'render_finder_suite']],
      'finder-suite-settings' => [],
      'finder-suite-filters' => [],
      'finder-suite-display' => [],
    ];

    foreach ($blocks as $folder => $config) {
      $path = __DIR__ . '/../block/' . $folder;
      if (!file_exists($path . '/block.json')) continue;
      $args = [];
      if (!empty($config['callback'])) {
        $args['render_callback'] = $config['callback'];
      }
      register_block_type($path, $args);
    }
  }
}
