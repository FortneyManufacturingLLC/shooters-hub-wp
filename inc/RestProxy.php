<?php namespace SH;

use WP_Error;
use WP_REST_Request;

class RestProxy {
  public static function register_routes() {
    register_rest_route('shooters-hub/v1', '/proxy', [
      'methods' => ['GET', 'POST', 'OPTIONS'],
      'callback' => [__CLASS__, 'handle'],
      'permission_callback' => '__return_true',
    ]);

    register_rest_route('shooters-hub/v1', '/proxy/(?P<path>.*)', [
      'methods' => ['GET', 'POST', 'OPTIONS'],
      'callback' => [__CLASS__, 'handle'],
      'permission_callback' => '__return_true',
    ]);

    register_rest_route('shooters-hub/v1', '/proxy/olc/(?P<path>.*)', [
      'methods' => 'GET',
      'callback' => [__CLASS__, 'handle_olc'],
      'permission_callback' => '__return_true',
    ]);
  }

  private static function get_proxy_config(): array {
    $opts = get_option(Admin::OPT, []);
    $api = rtrim((string)($opts['api_base'] ?? ''), '/');
    $key = (string)($opts['api_key'] ?? '');
    $ttl = isset($opts['cache_ttl']) && is_numeric($opts['cache_ttl']) ? max(0, intval($opts['cache_ttl'])) : 60;

    return [$api, $key, $ttl];
  }

  private static function upstream_path(WP_REST_Request $req): string {
    $routePath = trim((string)$req->get_param('path'));
    if ($routePath !== '') {
      return '/' . ltrim($routePath, '/');
    }

    $qs = $req->get_query_params();
    if (!empty($qs['path'])) {
      return '/' . ltrim((string)$qs['path'], '/');
    }

    return '/';
  }

  private static function make_url(string $apiBase, string $path, array $query): string {
    $path = '/' . ltrim($path, '/');
    $url = $apiBase . $path;
    if (!empty($query)) {
      $url .= '?' . http_build_query($query);
    }
    return $url;
  }

  private static function do_proxy(string $api, string $key, int $ttl, string $path, array $query, string $method = 'GET', string $body = '') {
    $url = self::make_url($api, $path, $query);
    $cacheKey = 'sh_proxy_' . md5($url);
    $method = strtoupper($method);

    if ($method === 'GET' && $ttl > 0) {
      $cached = get_transient($cacheKey);
      if ($cached !== false) {
        return rest_ensure_response($cached);
      }
    }

    $requestArgs = [
      'method'  => $method,
      'headers' => [
        'Authorization' => 'Bearer ' . $key,
        'Accept'        => 'application/json',
      ],
      'timeout' => 20,
    ];
    if ($method !== 'GET' && $method !== 'HEAD') {
      $requestArgs['headers']['Content-Type'] = 'application/json';
      $requestArgs['body'] = $body;
    }

    $resp = wp_remote_request($url, $requestArgs);

    if (is_wp_error($resp)) {
      return $resp;
    }

    $code = wp_remote_retrieve_response_code($resp);
    $bodyText = wp_remote_retrieve_body($resp);
    $body = json_decode($bodyText, true);

    if ($code >= 200 && $code < 300) {
      $payload = is_array($body) ? $body : ['raw' => $bodyText];
      if ($method === 'GET' && $ttl > 0) {
        set_transient($cacheKey, $payload, $ttl);
      }
      return rest_ensure_response($payload);
    }

    return new WP_Error('sh_api_error', 'Shooters Hub API error', [
      'status' => $code,
      'body'   => is_array($body) ? $body : $bodyText,
      'url'    => $url,
    ]);
  }

  public static function handle(WP_REST_Request $req) {
    list($api, $key, $ttl) = self::get_proxy_config();
    if ($api === '' || $key === '') {
      return new WP_Error('sh_missing_api', 'Shooters Hub API is not configured', ['status' => 500]);
    }

    $path = self::upstream_path($req);

    $method = strtoupper((string)$req->get_method());
    if ($method === 'OPTIONS') return rest_ensure_response(['ok' => true]);

    $query = $req->get_query_params();
    unset($query['path']);

    return self::do_proxy($api, $key, $ttl, $path, $query, $method, (string)$req->get_body());
  }

  public static function handle_olc(WP_REST_Request $req) {
    list($api, $key, $ttl) = self::get_proxy_config();
    if ($api === '' || $key === '') {
      return new WP_Error('sh_missing_api', 'Shooters Hub API is not configured', ['status' => 500]);
    }

    $path = '/olc/' . ltrim((string)$req->get_param('path'), '/');
    $query = $req->get_query_params();
    unset($query['path']);

    return self::do_proxy($api, $key, $ttl, $path, $query);
  }
}
