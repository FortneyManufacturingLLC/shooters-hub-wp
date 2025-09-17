<?php namespace SH;

class Assets {
  public static function register() {
    $base = plugins_url('', dirname(__FILE__));
    $ver  = defined('SH_PLUGIN_VERSION') ? SH_PLUGIN_VERSION : '1.0.0';

    wp_register_script('sh-app', $base . '/build/match-finder.js', [], $ver, true);
    wp_register_style('sh-style', $base . '/build/match-finder.css', [], $ver);

    wp_register_script(
      'sh/block-editor',
      $base . '/block/editor.js',
      ['wp-blocks', 'wp-element', 'wp-components', 'wp-block-editor', 'wp-i18n'],
      $ver,
      true
    );
    wp_register_style('sh/block-editor', $base . '/block/editor.css', ['wp-edit-blocks'], $ver);
  }

  public static function enqueue() {
    wp_enqueue_script('sh-app');
    wp_enqueue_style('sh-style');
  }
}
