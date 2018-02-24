const expectedCaches = ["static-v2"];

self.addEventListener("install", event => {
    console.log("V2 installing…");

    /**
     * 让你的新 SW 踢掉旧的，然后当它变为 waiting 状态时立即激活（注意这里不会跳过 installing，只会跳过 waiting），
     * 也就是说你的页面有一部分资源是通过旧 SW 获取，剩下一部分是通过新 SW 获取的，如果这样做会给你带来麻烦，那就不要用skipWaiting()。
     */
    self.skipWaiting();

    // 这里缓存一个 3.png
    event.waitUntil(
        caches.open("static-v2").then(cache => cache.add("../img/3.png"))
    );
});

self.addEventListener("activate", event => {
    /* Activate 在旧的 SW 离开时会被触发，这时新的 SW 可以控制 clients。这时候你可以做一些在老 SW 运行时不能做的事情，比如清理缓存。
     * cache storage API 和 localStorage，IndexedDB 一样是“同域”的。如果你在一个父域下运行多个网站，这就要小心你不要把别的网站的缓存删掉了。
     */

    // 删除额外的缓存，static-v1 将被删掉
    event.waitUntil(
        caches.keys().then(keys => {
            console.log('keys '+keys);

            Promise.all(keys.map(key => {
                if (!expectedCaches.includes(key)) {
                    return caches.delete(key);
                }
            })) 
        }).then(() => {
            console.log("V2 now ready to handle fetches!");

            //默认情况下，页面的请求（fetch）不会通过 SW，除非它本身是通过 SW 获取的，也就是说，在安装 SW 之后，需要刷新页面才能有效果，clients.claim()可以改变这种默认行为。
            //clients.claim();
        })
    );
});

self.addEventListener("fetch", event => {
    const url = new URL(event.request.url);

    console.log('fetch '+url.pathname);

    //如果是同域并且请求的是 '2.png' 的话，那么返回 '3.png'
    if (url.origin == location.origin && url.pathname.indexOf('2.png')!=-1) {
        event.respondWith(caches.match("../img/3.png"));
    }
});