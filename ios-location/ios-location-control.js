(function () {
  "use strict";

  var CENTER_NAME = "打卡区域";
  var CENTER_LATITUDE = 30.8751483;
  var CENTER_LONGITUDE = 121.7694678;
  var RADIUS_METERS = 200;
  var DURATION_MINUTES = 30;

  var hasRequest =
    typeof $request !== "undefined" &&
    $request &&
    $request.url;

  function read(key, fallback) {
    var value = $persistentStore.read(key);
    return value == null || value === "" ? fallback : String(value);
  }

  function write(value, key) {
    return $persistentStore.write(String(value), key);
  }

  function isEnabled() {
    return read("enabled", "false").toLowerCase() === "true";
  }

  function finish(body, status) {
    if (hasRequest) {
      $done({
        response: {
          status: status || 200,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
          body: body || "OK"
        }
      });
    } else {
      $done();
    }
  }

  function notify(title, subtitle, body) {
    $notification.post(title, subtitle || "", body || "");
  }

  function getAction() {
    if (hasRequest) {
      var match = String($request.url).match(
        /\/__(?:stash|loon)_location\/(start|real|status)(?:\?|$)/
      );
      if (match) return match[1];
    }
    return "check";
  }

  function randomPoint(latitude, longitude, radiusMeters) {
    var lat = Number(latitude);
    var lng = Number(longitude);
    var distance = radiusMeters * Math.sqrt(Math.random());
    var angle = Math.random() * Math.PI * 2;
    var earthRadius = 6378137;
    var northMeters = distance * Math.cos(angle);
    var eastMeters = distance * Math.sin(angle);
    var offsetLat = (northMeters / earthRadius) * (180 / Math.PI);
    var offsetLng =
      (eastMeters /
        (earthRadius * Math.cos((lat * Math.PI) / 180))) *
      (180 / Math.PI);

    return {
      latitude: (lat + offsetLat).toFixed(7),
      longitude: (lng + offsetLng).toFixed(7),
      distance: Math.round(distance)
    };
  }

  function disableLocation(automatic) {
    var wasEnabled = isEnabled();
    var lastLat = read("last_latitude", "");
    var lastLng = read("last_longitude", "");
    var lastDistance = read("last_random_distance", "");

    write("false", "enabled");
    write("真实定位", "location_name");
    write("0", "location_started_at");
    write("0", "location_expires_at");

    if (wasEnabled) {
      var subtitle = automatic ? "已到期 · 真实定位" : "真实定位";
      if (lastDistance) {
        subtitle += " · 上次偏移约 " + lastDistance + " 米";
      }
      notify(
        "iOS 定位 · 已关闭",
        subtitle,
        lastLat && lastLng ? lastLat + ", " + lastLng : ""
      );
    }

    finish("REAL");
  }

  function startLocation() {
    var actual = randomPoint(
      CENTER_LATITUDE,
      CENTER_LONGITUDE,
      RADIUS_METERS
    );
    var startedAt = Date.now();
    var expiresAt = startedAt + DURATION_MINUTES * 60 * 1000;

    write("true", "enabled");
    write(actual.latitude, "latitude");
    write(actual.longitude, "longitude");
    write(CENTER_NAME, "location_name");
    write(startedAt, "location_started_at");
    write(expiresAt, "location_expires_at");
    write(RADIUS_METERS, "location_random_radius");
    write(actual.distance, "location_random_distance");
    write(actual.latitude, "last_latitude");
    write(actual.longitude, "last_longitude");
    write(RADIUS_METERS, "last_random_radius");
    write(actual.distance, "last_random_distance");

    notify(
      "iOS 定位 · 已开启",
      "200 米圆形随机 · 本次偏移约 " + actual.distance + " 米",
      actual.latitude +
        ", " +
        actual.longitude +
        "\n约 30 分钟后自动恢复真实定位"
    );

    finish(
      CENTER_NAME +
        "\n" +
        actual.latitude +
        ", " +
        actual.longitude +
        "\n偏移约 " +
        actual.distance +
        " 米"
    );
  }

  function showStatus() {
    if (!isEnabled()) {
      var lastLat = read("last_latitude", "");
      var lastLng = read("last_longitude", "");
      var lastDistance = read("last_random_distance", "");
      var closedBody = "真实定位";

      if (lastDistance) {
        closedBody += "\n上次偏移约 " + lastDistance + " 米";
      }
      if (lastLat && lastLng) {
        closedBody += "\n" + lastLat + ", " + lastLng;
      }

      notify("🧭 iOS 定位 · 已关闭", "真实定位", closedBody);
      finish(closedBody);
      return;
    }

    var latitude = read("latitude", "");
    var longitude = read("longitude", "");
    var distance = read("location_random_distance", "");
    var expiresAt = parseInt(read("location_expires_at", "0"), 10);
    var remain =
      expiresAt > Date.now()
        ? Math.max(1, Math.ceil((expiresAt - Date.now()) / 60000))
        : 0;
    var timerText =
      remain > 0
        ? "剩余约 " + remain + " 分钟"
        : "期限已到 · 等待自动恢复";
    var statusBody =
      "本次偏移约 " +
      distance +
      " 米\n" +
      latitude +
      ", " +
      longitude +
      "\n" +
      timerText;

    notify("📍 iOS 定位 · 已开启", "200 米圆形随机", statusBody);
    finish(statusBody);
  }

  function checkExpiry() {
    if (!isEnabled()) {
      finish("DISABLED");
      return;
    }

    var expiresAt = parseInt(read("location_expires_at", "0"), 10);
    if (expiresAt > 0 && Date.now() >= expiresAt) {
      disableLocation(true);
      return;
    }
    finish("ACTIVE");
  }

  var action = getAction();
  if (action === "start") {
    startLocation();
  } else if (action === "real") {
    disableLocation(false);
  } else if (action === "status") {
    showStatus();
  } else {
    checkExpiry();
  }
})();
