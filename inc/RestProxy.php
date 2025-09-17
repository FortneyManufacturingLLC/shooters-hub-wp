<?php namespace SH;

class RestProxy {
  public static function register_routes() {
    register_rest_route('shooters-hub/v1', '/proxy', [
      'methods'  => 'GET',
      'callback' => [__CLASS__, 'handle'],
      'permission_callback' => '__return_true',
    ]);
  }

  public static function handle(WP_REST_Request $req) {
    $opts = get_option(Admin::OPT, []);
    $api  = rtrim($opts['api_base'] ?? '', '/');
    $key  = $opts['api_key'] ?? '';
    if (!$api || !$key) {
      return new WP_Error('sh_missing_api', 'Shooters Hub API not configured', ['status'=>500]);
    }

    $qs = $req->get_query_params();
    $path = $qs['path'] ?? '/matches';
    unset($qs['path']);

    $qs = Helpers::clamp_query($qs, $opts);

    $url = $api . $path . ($qs ? ('?' . http_build_query($qs)) : '');
    $cache_key = 'sh_' . md5($url);
    if ($cached = get_transient($cache_key)) {
      return rest_ensure_response($cached);
    }

    $resp = wp_remote_get($url, [
      'headers' => ['Authorization' => 'Bearer ' . $key, 'Accept'=>'application/json'],
      'timeout' => 12,
    ]);
    if (is_wp_error($resp)) return $resp;

    $code = wp_remote_retrieve_response_code($resp);
    $body = json_decode(wp_remote_retrieve_body($resp), true);

    if ($code >= 200 && $code < 300 && is_array($body)) {
      set_transient($cache_key, $body, intval($opts['cache_ttl'] ?? 60));
      return rest_ensure_response($body);
    }
    return new WP_Error('sh_api_error', 'Shooters Hub API error', ['status'=>$code, 'body'=>$body]);
  }
}
