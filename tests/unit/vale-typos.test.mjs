import { test } from "node:test";
import assert from "node:assert/strict";
import {
    isCaseOnlySpellingAlert,
    isSpellingCheck,
} from "../../scripts/vale-typos.mjs";

test("spelling checks are Vale.Spelling and any *.Spelling rule", () => {
    assert.equal(isSpellingCheck({ Check: "Vale.Spelling" }), true);
    assert.equal(isSpellingCheck({ Check: "write-good.Spelling" }), true);
    assert.equal(isSpellingCheck({ Check: "Vale.Terms" }), false);
    assert.equal(isSpellingCheck({}), false);
});

test("a case-only suggestion is capitalization, a real guess is a typo", () => {
    const illinois = { Check: "Vale.Spelling", Match: "illinois" };
    assert.equal(
        isCaseOnlySpellingAlert(illinois, ["Illinois", "pollinosis"]),
        true
    );
    const typo = { Check: "Vale.Spelling", Match: "conrete" };
    assert.equal(isCaseOnlySpellingAlert(typo, ["concrete"]), false);
    assert.equal(isCaseOnlySpellingAlert(illinois, []), false);
    assert.equal(isCaseOnlySpellingAlert(illinois), false);
    assert.equal(
        isCaseOnlySpellingAlert(
            { Check: "Vale.Terms", Match: "illinois" },
            ["Illinois"]
        ),
        false
    );
});
