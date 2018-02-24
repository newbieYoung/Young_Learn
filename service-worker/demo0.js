self.addEventListener("install", event => {
    console.log("V1 installing…");

    // 这里缓存一个 3.png
    event.waitUntil(
        caches.open("static-v1").then(cache => cache.add("../img/3.png"))
    );
});

self.addEventListener("activate", event => {
    console.log("V1 now ready to handle fetches!");
    
    //默认情况下，页面的请求（fetch）不会通过 SW，除非它本身是通过 SW 获取的，也就是说，在安装 SW 之后，需要刷新页面才能有效果，clients.claim()可以改变这种默认行为。
    //clients.claim();
});

self.addEventListener("fetch", event => {
    const url = new URL(event.request.url);

    console.log('fetch '+url.pathname);

    //如果是同域并且请求的是 '2.png' 的话，那么返回 '3.png'
    if (url.origin == location.origin && url.pathname.indexOf('2.png')!=-1) {
        event.respondWith(caches.match("../img/3.png"));
    }
});