/**
 * Replace globalThis.fetch. `respond(url, init)` returns { status, body }.
 * Returns the list of calls so tests can inspect what was sent.
 */
export function mockFetch(respond) {
    const calls = [];
    globalThis.fetch = async (url, init = {}) => {
        calls.push({ url: String(url), init });
        const { status = 200, body = {} } = respond(String(url), init) || {};
        return Response.json(body, { status });
    };
    return calls;
}

/** Set env vars for one test; returns a restore function. */
export function withEnv(vars) {
    const saved = {};
    for (const [key, value] of Object.entries(vars)) {
        saved[key] = process.env[key];
        if (value == null) delete process.env[key];
        else process.env[key] = value;
    }
    return () => {
        for (const [key, value] of Object.entries(saved)) {
            if (value == null) delete process.env[key];
            else process.env[key] = value;
        }
    };
}
