const MAX_ATTEMPTS = 6;

/**
 * Read-modify-write one JSON blob without losing concurrent writes. `update`
 * gets the current value (null when the key is new) and returns the next one.
 * The write only lands if the blob is unchanged since the read; otherwise the
 * read and update run again. Resolves to the value that was written.
 */
export async function updateJSON(store, key, update) {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const current = await store.getWithMetadata(key, { type: "json" });
        const next = update(current ? current.data : null);
        const condition = current && current.etag ? { onlyIfMatch: current.etag } : { onlyIfNew: true };
        const { modified } = await store.setJSON(key, next, condition);
        if (modified) return next;
        await new Promise((resolve) => setTimeout(resolve, 15 * (attempt + 1) + Math.random() * 20));
    }
    throw new Error(`blob ${key}: too many concurrent writes`);
}
