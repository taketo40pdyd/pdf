/* PDFツールボックス: オフライン用 Service Worker
   - 自サイトのファイル: ネットワーク優先（更新がすぐ反映される。オフライン時だけ保存済みを使う）
   - CDNのライブラリ(pdf.js / pdf-lib / JSZip): 一度読み込んだら保存し、次回以降は保存分を優先 */
const CACHE = "pdftoolbox-v1";
const CDN = ["cdn.jsdelivr.net", "fastly.jsdelivr.net", "gcore.jsdelivr.net", "cdnjs.cloudflare.com", "unpkg.com"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(["./", "./index.html"])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const store = (req, res) => {
  if (res && (res.ok || res.type === "opaque")) {
    const copy = res.clone();
    caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
  }
  return res;
};

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    /* ネットワーク優先。「?_=」付きの更新確認リクエストも常に最新を取りに行く */
    e.respondWith(
      fetch(req).then(res => store(req, res)).catch(() =>
        caches.match(req, { ignoreSearch: true }).then(r => r || caches.match("./index.html"))
      )
    );
    return;
  }

  if (CDN.includes(url.hostname)) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => store(req, res)))
    );
  }
});
