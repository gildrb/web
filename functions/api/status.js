export function onRequest({ request }) {
    if (request.url.startsWith("https://www.gildrb.com/")) {
        return Response.redirect(
            request.url.replace(
                "https://www.gildrb.com/",
                "https://gildrb.com/",
            ),
            301,
        );
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
        return Response.json(
            { error: "Method not allowed" },
            { status: 405, headers: { Allow: "GET, HEAD" } },
        );
    }

    return Response.json(
        {
            status: "ok",
            service: "gildrb-public-api",
            timestamp: new Date().toISOString(),
        },
        { headers: { "Cache-Control": "no-store" } },
    );
}
