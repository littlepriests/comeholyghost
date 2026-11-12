(function () {
  "use strict";

  if (window.__articleMediaLightbox) return;
  window.__articleMediaLightbox = true;

  var dialog = null;
  var imgEl = null;
  var items = [];
  var index = 0;

  function ensureDialog() {
    if (dialog) return dialog;
    dialog = document.createElement("dialog");
    dialog.className = "article-photo-lightbox";
    dialog.setAttribute("aria-label", "Expanded image");
    dialog.innerHTML =
      '<div class="article-photo-lightbox__inner">' +
      '<button type="button" class="article-photo-lightbox__close" aria-label="Close">&times;</button>' +
      '<img alt="" class="article-photo-lightbox__img">' +
      "</div>";
    document.body.appendChild(dialog);
    imgEl = dialog.querySelector(".article-photo-lightbox__img");
    dialog.querySelector(".article-photo-lightbox__close").addEventListener("click", function (event) {
      event.stopPropagation();
      dialog.close();
    });
    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) dialog.close();
    });
    // Second click on the preview advances within the active set (grid / gallery).
    imgEl.addEventListener("click", function (event) {
      event.stopPropagation();
      if (items.length > 1) {
        showAt(index + 1);
        return;
      }
      dialog.close();
    });
    dialog.addEventListener("close", function () {
      items = [];
      index = 0;
      if (imgEl) {
        imgEl.classList.remove("is-carousel");
        imgEl.removeAttribute("title");
      }
    });
    document.addEventListener("keydown", function (event) {
      if (!dialog || !dialog.open) return;
      if (event.key === "ArrowRight" && items.length > 1) {
        event.preventDefault();
        showAt(index + 1);
      } else if (event.key === "ArrowLeft" && items.length > 1) {
        event.preventDefault();
        showAt(index - 1);
      }
    });
    return dialog;
  }

  function nodeToItem(node) {
    var full = node.getAttribute("data-full");
    if (!full) return null;
    var thumb = node.querySelector("img");
    return {
      full: full,
      alt: (thumb && thumb.alt) || ""
    };
  }

  function collectSet(button) {
    var grid = button.closest(".article-photo-grid");
    var gallery = button.closest(".gallery");
    var nodes;
    if (grid) {
      nodes = grid.querySelectorAll("[data-article-photo][data-full]");
    } else if (gallery) {
      nodes = gallery.querySelectorAll("[data-article-photo][data-full]");
    } else {
      nodes = [button];
    }
    var list = [];
    var start = 0;
    for (var i = 0; i < nodes.length; i++) {
      var item = nodeToItem(nodes[i]);
      if (!item) continue;
      if (nodes[i] === button) start = list.length;
      list.push(item);
    }
    if (!list.length) {
      var alone = nodeToItem(button);
      if (alone) {
        list = [alone];
        start = 0;
      }
    }
    return { items: list, index: start };
  }

  function showAt(nextIndex) {
    if (!items.length || !imgEl) return;
    index = ((nextIndex % items.length) + items.length) % items.length;
    var item = items[index];
    imgEl.src = item.full;
    imgEl.alt = item.alt || "";
    imgEl.classList.toggle("is-carousel", items.length > 1);
    if (items.length > 1) {
      imgEl.title = "Click for next photo";
      dialog.setAttribute(
        "aria-label",
        "Expanded image " + (index + 1) + " of " + items.length
      );
    } else {
      imgEl.removeAttribute("title");
      dialog.setAttribute("aria-label", "Expanded image");
    }
  }

  function openPhoto(button) {
    var set = collectSet(button);
    if (!set.items.length) return;
    ensureDialog();
    items = set.items;
    showAt(set.index);
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      window.open(items[index].full, "_blank", "noopener");
    }
  }

  document.addEventListener("click", function (event) {
    var button = event.target.closest("[data-article-photo]");
    if (!button || button.closest("dialog")) return;
    event.preventDefault();
    openPhoto(button);
  });
})();
