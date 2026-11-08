(function () {
    var entriesKey = "pd-guestbook";
    var form = document.querySelector("[data-guestbook-form]");
    var list = document.querySelector("[data-guestbook-list]");
    var error = document.querySelector("[data-guestbook-error]");
    if (!form || !list) return;

    function loadEntries() {
        try {
            var parsed = JSON.parse(localStorage.getItem(entriesKey) || "[]");
            return Array.isArray(parsed) ? parsed : [];
        } catch (err) {
            return [];
        }
    }

    function render(entries) {
        list.replaceChildren();
        if (!entries.length) {
            var empty = document.createElement("li");
            empty.className = "guestbook__empty";
            empty.textContent = "No entries yet.";
            list.appendChild(empty);
            return;
        }
        entries.forEach(function (entry) {
            var item = document.createElement("li");
            var when = document.createElement("p");
            when.className = "guestbook__when";
            var time = document.createElement("time");
            time.dateTime = entry.at || "";
            time.textContent = entry.when || "";
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

    var entries = loadEntries();
    render(entries);

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        var data = new FormData(form);
        var name = String(data.get("name") || "").trim().slice(0, 80);
        var message = String(data.get("message") || "").trim().slice(0, 500);
        if (!name && !message) {
            if (error) error.hidden = false;
            return;
        }
        if (error) error.hidden = true;
        var now = new Date();
        entries.unshift({
            name: name,
            message: message,
            at: now.toISOString(),
            when: now.toLocaleString()
        });
        entries = entries.slice(0, 100);
        localStorage.setItem(entriesKey, JSON.stringify(entries));
        render(entries);
        form.reset();
    });
})();
