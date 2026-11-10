(function () {
  "use strict";

  var dialog = null;
  var imgEl = null;

  function ensureDialog() {
    if (dialog) return dialog;
    dialog = document.createElement("dialog");
    dialog.className = "article-photo-lightbox";
    dialog.setAttribute("aria-label", "Expanded image");
    dialog.innerHTML =
      '<div class="article-photo-lightbox__inner">' +
      '<button type="button" class="article-photo-lightbox__close" aria-label="Close">&times;</button>' +
      '<img alt="">' +
      "</div>";
    document.body.appendChild(dialog);
    imgEl = dialog.querySelector("img");
    dialog.querySelector(".article-photo-lightbox__close").addEventListener("click", function () {
      dialog.close();
    });
    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) dialog.close();
    });
    return dialog;
  }

  function openPhoto(button) {
    var full = button.getAttribute("data-full");
    if (!full) return;
    var thumb = button.querySelector("img");
    ensureDialog();
    imgEl.src = full;
    imgEl.alt = (thumb && thumb.alt) || "";
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      window.open(full, "_blank", "noopener");
    }
  }

  document.addEventListener("click", function (event) {
    var button = event.target.closest("[data-article-photo]");
    if (!button) return;
    event.preventDefault();
    openPhoto(button);
  });
})();
