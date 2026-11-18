import { test } from "node:test";
import assert from "node:assert/strict";
import { SOURCE_LIMITS, sourceImageProblem } from "../../scripts/lib/image-source-rules.mjs";

test("a 1600px photo under 1.5MB is fine to commit", () => {
    assert.equal(sourceImageProblem(1600, 1200, 900 * 1024), "");
    assert.equal(sourceImageProblem(SOURCE_LIMITS.maxEdge, 1000, SOURCE_LIMITS.maxBytes), "");
});

test("a camera dump over 2000px or over 1.5MB is refused", () => {
    assert.match(sourceImageProblem(4032, 3024, 400 * 1024), /4032px/);
    assert.match(sourceImageProblem(1600, 1600, SOURCE_LIMITS.maxBytes + 1), /byte limit/);
});
