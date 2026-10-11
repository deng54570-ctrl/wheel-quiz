/* 离线缓存：页面加载成功一次之后，即使 GitHub 连不上也能打开 */
var CACHE = 'gacha-v1';
var ASSETS = ['./', './index.html'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(ASSETS); })
      .catch(function () {})
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  if (req.url.indexOf(self.location.origin) !== 0) return;

  e.respondWith(new Promise(function (resolve) {
    var settled = false;
    function done(r) { if (!settled && r) { settled = true; resolve(r); } }

    // 3 秒还没连上就先拿缓存顶上（GitHub 在国内经常卡十几秒）
    var timer = setTimeout(function () {
      caches.match(req, { ignoreSearch: true }).then(function (hit) {
        if (hit) done(hit);
      });
    }, 3000);

    fetch(req).then(function (res) {
      clearTimeout(timer);
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {});
      done(res);
    }).catch(function () {
      clearTimeout(timer);
      caches.match(req, { ignoreSearch: true }).then(function (hit) {
        done(hit || caches.match('./index.html'));
      });
    });
  }));
});
