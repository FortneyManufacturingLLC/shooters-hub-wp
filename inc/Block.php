<?php namespace SH;

class Block {
  public static function register() {
    if (!function_exists('register_block_type')) return;

    $blocks = [
      'match-finder' => ['callback' => [Shortcode::class, 'render_match_finder']],
      'match-card'   => ['callback' => [Shortcode::class, 'render_match']],
      'club-card'    => ['callback' => [Shortcode::class, 'render_club']],
      'leaderboard'  => ['callback' => [Shortcode::class, 'render_leaderboard']],
    ];

    foreach ($blocks as $folder => $config) {
      $path = __DIR__ . '/../block/' . $folder;
      if (!file_exists($path . '/block.json')) continue;
      register_block_type($path, [
        'render_callback' => $config['callback'],
      ]);
    }
  }
}
