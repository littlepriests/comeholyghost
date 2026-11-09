(function () {
    var apiUrl = "/api/guestbook";
    var localKey = "pd-guestbook-local";
    var form = document.querySelector("[data-guestbook-form]");
    var list = document.querySelector("[data-guestbook-list]");
    var error = document.querySelector("[data-guestbook-error]");
    var status = document.querySelector("[data-guestbook-status]");
    if (!form || !list) return;

    var mode = "remote";
    var entries = [];

    function setStatus(text) {
        if (!status) return;
        if (!text) {
            status.hidden = true;
            status.textContent = "";
            return;
        }
        status.hidden = false;
        status.textContent = text;
    }

    function setError(text) {
        if (!error) return;
        if (!text) {
            error.hidden = true;
            error.textContent = "";
            return;
        }
        error.hidden = false;
        error.textContent = text;
    }

    function formatWhen(iso) {
        if (!iso) return "";
        var date = new Date(iso);
        if (Number.isNaN(date.getTime())) return "";
        return date.toLocaleString();
    }

    function loadLocal() {
        try {
            var parsed = JSON.parse(localStorage.getItem(localKey) || "[]");
            return Array.isArray(parsed) ? parsed : [];
        } catch (err) {
            return [];
        }
    }

    function saveLocal(next) {
        localStorage.setItem(localKey, JSON.stringify(next.slice(0, 100)));
    }

    function render(items) {
        list.replaceChildren();
        if (!items.length) {
            var empty = document.createElement("li");
            empty.className = "guestbook__empty";
            empty.textContent = "No entries yet.";
            list.appendChild(empty);
            return;
        }
        items.forEach(function (entry) {
            var item = document.createElement("li");
            var when = document.createElement("p");
            when.className = "guestbook__when";
            var time = document.createElement("time");
            time.dateTime = entry.at || "";
            time.textContent = formatWhen(entry.at);
            when.appendChild(time);
            item.appendChild(when);
            if (entry.name) {
                var who = document.createElement("p");
                who.className = "guestbook__who";
                who.textContent = entry.name;
                item.appendChild(who);
            }
            if (entry.message) {
                var message = document.createElement("p");
                message.className = "guestbook__message";
                message.textContent = entry.message;
                item.appendChild(message);
            }
            list.appendChild(item);
        });
    }

    function useLocal(reason) {
        mode = "local";
        entries = loadLocal();
        render(entries);
        setStatus(reason || "Local preview only — signatures stay in this browser until the site is on Netlify.");
    }

    function fetchEntries() {
        return fetch(apiUrl, {
            headers: { Accept: "application/json" },
            credentials: "same-origin"
        }).then(function (response) {
            if (!response.ok) throw new Error("bad status");
            return response.json();
        }).then(function (data) {
            mode = "remote";
            entries = Array.isArray(data.entries) ? data.entries : [];
            render(entries);
            setStatus("");
        });
    }

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        setError("");

        var data = new FormData(form);
        var name = String(data.get("name") || "").trim().slice(0, 80);
        var message = String(data.get("message") || "").trim().slice(0, 500);
        var website = String(data.get("website") || "").trim();

        if (!name && !message) {
            setError("Write a name, a comment, or both.");
            return;
        }

        if (mode === "local") {
            if (website) {
                form.reset();
                return;
            }
            var now = new Date();
            entries.unshift({
                name: name,
                message: message,
                at: now.toISOString()
            });
            entries = entries.slice(0, 100);
            saveLocal(entries);
            render(entries);
            form.reset();
            return;
        }

        var submit = form.querySelector("button[type='submit']");
        if (submit) submit.disabled = true;

        fetch(apiUrl, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json"
            },
            credentials: "same-origin",
            body: JSON.stringify({
                name: name,
                message: message,
                website: website
            })
        }).then(function (response) {
            return response.json().then(function (body) {
                return { ok: response.ok, body: body };
            });
        }).then(function (result) {
            if (!result.ok) {
                setError((result.body && result.body.error) || "Could not save that entry.");
                return;
            }
            entries = Array.isArray(result.body.entries) ? result.body.entries : entries;
            render(entries);
            form.reset();
        }).catch(function () {
            setError("Could not reach the guestbook. Try again in a moment.");
        }).finally(function () {
            if (submit) submit.disabled = false;
        });
    });

    fetchEntries().catch(function () {
        useLocal();
    });
})();
