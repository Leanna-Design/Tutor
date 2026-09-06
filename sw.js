const CACHE_NAME = "tutor-manager-v6";

const APP_FILES = [
    "./",
    "./index.html",
    "./styles.css",
    "./app.js",
    "./manifest.json",
    "./icon-home-192.png",
    "./icon-home-512.png"
];

self.addEventListener("install", event => {

    event.waitUntil(

        caches.open(CACHE_NAME)
            .then(cache => {

                return cache.addAll(APP_FILES);

            })
            .then(() => {

                return self.skipWaiting();

            })

    );

});


self.addEventListener("activate", event => {

    event.waitUntil(

        caches.keys()
            .then(keys => {

                return Promise.all(

                    keys
                        .filter(
                            key =>
                                key !== CACHE_NAME
                        )
                        .map(
                            key =>
                                caches.delete(key)
                        )

                );

            })
            .then(() => {

                return self.clients.claim();

            })

    );

});


self.addEventListener("fetch", event => {

    if (event.request.method !== "GET") {
        return;
    }


    const requestURL =
        new URL(event.request.url);


    if (
        requestURL.origin !==
        self.location.origin
    ) {

        return;

    }


    /*
     * Always fetch the latest version first.
     * If offline, use the cached version.
     */

    event.respondWith(

        fetch(event.request)
            .then(response => {

                if (
                    !response ||
                    response.status !== 200
                ) {

                    return response;

                }


                const responseClone =
                    response.clone();


                caches.open(CACHE_NAME)
                    .then(cache => {

                        cache.put(
                            event.request,
                            responseClone
                        );

                    });


                return response;

            })
            .catch(() => {

                return caches.match(
                    event.request
                );

            })

    );

});
