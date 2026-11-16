(function () {
    // Same-site nav swaps #page-root and re-runs this script, so bind per form.
    var form = document.querySelector("[data-unsubscribe-form]");
    if (!form || form.dataset.bound) return;
    form.dataset.bound = "1";

    var submitBtn = form.querySelector("[data-unsubscribe-submit]");
    var errEl = form.querySelector("[data-unsubscribe-error]");
    var okEl = form.querySelector("[data-unsubscribe-ok]");
    var emailInput = form.querySelector("[data-unsubscribe-email]");
    var busy = false;

    try {
        var params = new URLSearchParams(window.location.search || "");
        var fromQuery = params.get("email");
        if (fromQuery && emailInput && !emailInput.value) {
            emailInput.value = fromQuery;
        }
    } catch (error) {
        // ignore
    }

    function setError(message) {
        if (!errEl) return;
        if (message) {
            errEl.hidden = false;
            errEl.textContent = message;
        } else {
            errEl.hidden = true;
            errEl.textContent = "";
        }
    }

    function setOk(message) {
        if (!okEl) return;
        if (message) {
            okEl.hidden = false;
            okEl.textContent = message;
        } else {
            okEl.hidden = true;
            okEl.textContent = "";
        }
    }

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        if (busy) return;
        setError("");
        setOk("");

        if (typeof form.reportValidity === "function" && !form.reportValidity()) {
            return;
        }

        var email = emailInput ? String(emailInput.value || "").trim() : "";
        var honey = form.querySelector('input[name="website"]');
        var payload = {
            email: email,
            website: honey ? String(honey.value || "") : ""
        };

        if (typeof window.siteSkipMeteredApi === "function" && window.siteSkipMeteredApi()) {
            setOk("preview deploy — not changed on the real list.");
            return;
        }

        busy = true;
        if (submitBtn) submitBtn.disabled = true;

        fetch("/api/unsubscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify(payload)
        })
            .then(function (response) {
                return response.json().then(function (body) {
                    return { ok: response.ok, body: body || {} };
                }).catch(function () {
                    return { ok: response.ok, body: {} };
                });
            })
            .then(function (result) {
                if (result.ok) {
                    setOk(result.body.message || "you're off the list.");
                    return;
                }
                setError(result.body.error || "couldn’t unsubscribe right now. try again in a bit.");
            })
            .catch(function () {
                setError("couldn’t reach the unsubscribe service.");
            })
            .finally(function () {
                busy = false;
                if (submitBtn) submitBtn.disabled = false;
            });
    });
})();
