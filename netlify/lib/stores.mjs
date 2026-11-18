/**
 * Opens a Netlify Blobs store. @netlify/blobs is imported on first use, so
 * code that never opens a store (and the unit tests, which swap the opener
 * with useStores) runs without it installed.
 */
let open = async (name) => {
    const { getStore } = await import("@netlify/blobs");
    return getStore({ name, consistency: "strong" });
};

export function openStore(name) {
    return open(name);
}

/** Replace the opener; returns a function that puts the previous one back. */
export function useStores(opener) {
    const previous = open;
    open = opener;
    return () => {
        open = previous;
    };
}
