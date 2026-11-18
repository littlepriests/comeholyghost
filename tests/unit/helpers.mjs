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

/** In-memory stand-in for a Blobs store with etag-conditional writes. */
export function memoryStore() {
    const data = new Map();
    let version = 0;
    return {
        data,
        async get(key) {
            return data.has(key) ? structuredClone(data.get(key).value) : null;
        },
        async getWithMetadata(key) {
            if (!data.has(key)) return null;
            const { value, etag } = data.get(key);
            return { data: structuredClone(value), etag, metadata: {} };
        },
        async setJSON(key, value, options = {}) {
            const existing = data.get(key);
            if (options.onlyIfNew && existing) return { modified: false };
            if (options.onlyIfMatch && (!existing || existing.etag !== options.onlyIfMatch)) {
                return { modified: false };
            }
            const etag = `"v${++version}"`;
            data.set(key, { value: structuredClone(value), etag });
            return { modified: true, etag };
        },
    };
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
