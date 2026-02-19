<?php namespace SH;

class EntityPages {
  const QUERY_ENTITY_ID = 'sh_entity_id';
  const QUERY_ENTITY_TYPE = 'sh_entity_type';

  private static function page_slug_from_option(array $opts, string $optKey, string $fallback): string {
    $pageId = isset($opts[$optKey]) ? intval($opts[$optKey]) : 0;
    if ($pageId > 0) {
      $post = get_post($pageId);
      if ($post && !empty($post->post_name)) {
        return sanitize_title((string)$post->post_name);
      }
    }
    return $fallback;
  }

  private static function add_entity_route(string $entityType, string $pageSlug): void {
    $safeSlug = trim($pageSlug, '/');
    if ($safeSlug === '') return;
    add_rewrite_rule(
      '^' . $entityType . 's?/([^/]+)/?$',
      'index.php?pagename=' . $safeSlug . '&' . self::QUERY_ENTITY_TYPE . '=' . $entityType . '&' . self::QUERY_ENTITY_ID . '=$matches[1]',
      'top'
    );
  }

  public static function register_routes(): void {
    $opts = get_option(Admin::OPT, []);
    if (!is_array($opts)) $opts = [];

    add_rewrite_tag('%' . self::QUERY_ENTITY_ID . '%', '([^&]+)');
    add_rewrite_tag('%' . self::QUERY_ENTITY_TYPE . '%', '([^&]+)');

    self::add_entity_route('match', self::page_slug_from_option($opts, 'match_entity_page_id', 'shooters-hub-match'));
    self::add_entity_route('club', self::page_slug_from_option($opts, 'club_entity_page_id', 'shooters-hub-club'));
    self::add_entity_route('series', self::page_slug_from_option($opts, 'series_entity_page_id', 'shooters-hub-series'));
    self::add_entity_route('leaderboard', self::page_slug_from_option($opts, 'leaderboard_entity_page_id', 'shooters-hub-leaderboard'));
  }

  public static function query_vars(array $vars): array {
    $vars[] = self::QUERY_ENTITY_ID;
    $vars[] = self::QUERY_ENTITY_TYPE;
    return $vars;
  }

  public static function current_context(): array {
    $entityId = (string)get_query_var(self::QUERY_ENTITY_ID, '');
    $entityType = strtolower((string)get_query_var(self::QUERY_ENTITY_TYPE, ''));
    if (!in_array($entityType, ['match', 'club', 'series', 'leaderboard'], true)) {
      $entityType = '';
    }
    return [
      'entityId' => sanitize_text_field($entityId),
      'entityType' => $entityType,
    ];
  }

  public static function flush_routes(): void {
    self::register_routes();
    flush_rewrite_rules();
  }
}
