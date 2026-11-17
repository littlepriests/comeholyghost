/** Limits for a photo file committed under content/. The build publishes the sizes. */
export const SOURCE_LIMITS = {
    maxEdge: 2000,
    maxBytes: Math.floor(1.5 * 1024 * 1024)
};

/**
 * Empty string when the file is small enough to keep.
 * width/height are pixels; bytes is the file size.
 */
export function sourceImageProblem(width, height, bytes) {
    const longEdge = Math.max(Number(width) || 0, Number(height) || 0);
    const size = Number(bytes) || 0;
    if (longEdge > SOURCE_LIMITS.maxEdge) {
        return `long edge is ${longEdge}px, over ${SOURCE_LIMITS.maxEdge}px`;
    }
    if (size > SOURCE_LIMITS.maxBytes) {
        return `${size} bytes is over the ${SOURCE_LIMITS.maxBytes} byte limit`;
    }
    return "";
}
