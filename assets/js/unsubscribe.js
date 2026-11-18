(function () {
    // Same-site nav swaps #page-root and re-runs this script, so bind per form.
    let form = document.querySelector("[data-unsubscribe-form]");
    if (!form || form.dataset.bound) return;
    form.dataset.bound = "1";

    let submitBtn = form.querySelector("[data-unsubscribe-submit]");
    let errEl = form.querySelector("[data-unsubscribe-error]");
    let okEl = form.querySelector("[data-unsubscribe-ok]");
    let emailInput = form.querySelector("[data-unsubscribe-email]");
    let busy = false;
    // The token is the signed half of the link in the email. Without it the
    // API refuses, so a typed-in address cannot remove someone else.
    let token = "";

    try {
        let params = new URLSearchParams(window.location.search || "");
        token = params.get("token") || "";
        let fromQuery = params.get("email");
        if (fromQuery && emailInput && !emailInput.value) {
            emailInput.value = fromQuery;
        }
    } catch (error) {
        token = "";
    }

    if (emailInput) emailInput.readOnly = true;
    if (!token && submitBtn) submitBtn.disabled = true;

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

    if (!token) setError("use the unsubscribe link from your email.");

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        if (busy) return;
        setError("");
        setOk("");

        if (!token) {
            setError("use the unsubscribe link from your email.");
            return;
        }

        if (typeof form.reportValidity === "function" && !form.reportValidity()) {
            return;
        }

        let email = emailInput ? String(emailInput.value || "").trim() : "";
        let honey = form.querySelector('input[name="website"]');
        let payload = {
            email: email,
            token: token,
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
