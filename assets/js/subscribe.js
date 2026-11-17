(function () {
    if (window.__siteSubscribe) return;
    window.__siteSubscribe = true;

    let dialog = document.querySelector("[data-subscribe-dialog]");
    if (!dialog || typeof dialog.showModal !== "function") return;

    let form = dialog.querySelector("[data-subscribe-form]");
    let submitBtn = dialog.querySelector("[data-subscribe-submit]");
    let errEl = dialog.querySelector("[data-subscribe-error]");
    let okEl = dialog.querySelector("[data-subscribe-ok]");
    let emailInput = form ? form.querySelector('input[name="email"]') : null;
    let busy = false;

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

    function openDialog() {
        setError("");
        setOk("");
        if (form) form.reset();
        dialog.showModal();
        window.requestAnimationFrame(function () {
            if (emailInput) emailInput.focus();
        });
    }

    document.addEventListener("click", function (event) {
        let open = event.target.closest("[data-subscribe-open]");
        if (!open) return;
        event.preventDefault();
        openDialog();
    });

    // Enter would trigger implicit submission with the form's first submit
    // button, which is close (method="dialog"); route it to subscribe instead.
    if (emailInput && submitBtn) {
        emailInput.addEventListener("keydown", function (event) {
            if (event.key !== "Enter" || event.isComposing) return;
            event.preventDefault();
            submitBtn.click();
        });
    }

    if (submitBtn) {
        submitBtn.addEventListener("click", function () {
            if (!form || busy) return;
            setError("");
            setOk("");

            if (typeof form.reportValidity === "function" && !form.reportValidity()) {
                return;
            }

            let email = emailInput ? String(emailInput.value || "").trim() : "";
            let honey = form.querySelector('input[name="website"]');
            let payload = {
                email: email,
                website: honey ? String(honey.value || "") : ""
            };

            if (typeof window.siteSkipMeteredApi === "function" && window.siteSkipMeteredApi()) {
                setOk("preview deploy — not added to the real list. merge to main to test Resend.");
                if (emailInput) emailInput.value = "";
                return;
            }

            busy = true;
            submitBtn.disabled = true;

            fetch("/api/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json", Accept: "application/json" },
                body: JSON.stringify(payload)
            })
                .then(function (response) {
                    return response.json().then(function (body) {
                        return { ok: response.ok, status: response.status, body: body || {} };
                    }).catch(function () {
                        return { ok: response.ok, status: response.status, body: {} };
                    });
                })
                .then(function (result) {
                    if (result.ok) {
                        setOk(result.body.message || "you're on the list. check your inbox for a hello.");
                        if (emailInput) emailInput.value = "";
                        return;
                    }
                    setError(result.body.error || "couldn’t subscribe right now. try again in a bit.");
                })
                .catch(function () {
                    setError("couldn’t reach the subscribe service. is the site running on Netlify / netlify dev?");
                })
                .finally(function () {
                    busy = false;
                    submitBtn.disabled = false;
                });
        });
    }
})();
