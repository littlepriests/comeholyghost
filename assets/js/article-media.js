(function () {
  "use strict";

  if (window.__articleMediaLightbox) return;
  window.__articleMediaLightbox = true;

  let dialog = null;
  let imgEl = null;
  let items = [];
  let index = 0;

  function ensureDialog() {
    if (dialog) return dialog;
    dialog = document.createElement("dialog");
    dialog.className = "article-photo-lightbox";
    dialog.setAttribute("aria-label", "Expanded image");
    dialog.innerHTML =
      '<div class="article-photo-lightbox__inner">' +
      '<button type="button" class="article-photo-lightbox__close" aria-label="Close">&times;</button>' +
      '<picture><source type="image/avif" data-lightbox-avif><img alt="" class="article-photo-lightbox__img"></picture>' +
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
    let full = node.getAttribute("data-full");
    if (!full) return null;
    let thumb = node.querySelector("img");
    return {
      full: full,
      fullAvif: node.getAttribute("data-full-avif") || "",
      alt: (thumb && thumb.alt) || ""
    };
  }

  function collectSet(button) {
    let grid = button.closest(".article-photo-grid");
    let gallery = button.closest(".gallery");
    let nodes;
    if (grid) {
      nodes = grid.querySelectorAll("[data-article-photo][data-full]");
    } else if (gallery) {
      nodes = gallery.querySelectorAll("[data-article-photo][data-full]");
    } else {
      nodes = [button];
    }
    let list = [];
    let start = 0;
    for (let i = 0; i < nodes.length; i++) {
      let item = nodeToItem(nodes[i]);
      if (!item) continue;
      if (nodes[i] === button) start = list.length;
      list.push(item);
    }
    if (!list.length) {
      let alone = nodeToItem(button);
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
    let item = items[index];
    let source = dialog.querySelector("[data-lightbox-avif]");
    if (source) {
      if (item.fullAvif) source.setAttribute("srcset", item.fullAvif);
      else source.removeAttribute("srcset");
    }
    imgEl.src = item.full;
    imgEl.alt = item.alt || "";
    imgEl.classList.toggle("is-carousel", items.length > 1);
    imgEl.removeAttribute("title");
    if (items.length > 1) {
      dialog.setAttribute(
        "aria-label",
        "Expanded image " + (index + 1) + " of " + items.length
      );
    } else {
      dialog.setAttribute("aria-label", "Expanded image");
    }
  }

  function openPhoto(button) {
    let set = collectSet(button);
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
    let button = event.target.closest("[data-article-photo]");
    if (!button || button.closest("dialog")) return;
    event.preventDefault();
    openPhoto(button);
  });
})();
