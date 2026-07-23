/* MEETUS 0.6.25.2 COMMUNITY2-TG6 — search filters, live restore, GIF preview and styled confirmations */
(() => {
  "use strict";

  let activeSearchFilter = "all";
  let confirmResolve = null;
  let pendingGif = null;
  let pendingGifKind = null;
  let gifSending = false;

  const originalPerformSearch = performSearch;
  const originalSetSidebarMode = setSidebarMode;
  const originalSendProviderMedia = sendProviderMedia;
  const originalAppendMessage = appendMessage;

  function ensureConfirmModal() {
    let backdrop = document.getElementById("tg6ConfirmBackdrop");
    if (backdrop) return backdrop;

    backdrop = document.createElement("div");
    backdrop.id = "tg6ConfirmBackdrop";
    backdrop.className = "modal-backdrop tg6-confirm-backdrop hidden";
    backdrop.innerHTML = `
      <section class="tg6-confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="tg6ConfirmTitle" aria-describedby="tg6ConfirmText">
        <div class="tg6-confirm-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M12 3 2.8 19h18.4L12 3Z"/><path d="M12 9v4M12 16.5v.2"/></svg>
        </div>
        <div class="tg6-confirm-copy">
          <strong id="tg6ConfirmTitle">Подтвердите действие</strong>
          <p id="tg6ConfirmText"></p>
        </div>
        <div class="tg6-confirm-actions">
          <button type="button" class="tg6-confirm-cancel" data-tg6-confirm="cancel">Отмена</button>
          <button type="button" class="tg6-confirm-accept" data-tg6-confirm="accept">Подтвердить</button>
        </div>
      </section>
    `;
    document.body.appendChild(backdrop);

    const finish = (value) => {
      backdrop.classList.add("hidden");
      const resolver = confirmResolve;
      confirmResolve = null;
      resolver?.(value);
    };

    backdrop.querySelector('[data-tg6-confirm="cancel"]')?.addEventListener("click", () => finish(false));
    backdrop.querySelector('[data-tg6-confirm="accept"]')?.addEventListener("click", () => finish(true));
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) finish(false);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !backdrop.classList.contains("hidden")) {
        event.preventDefault();
        finish(false);
      }
    });

    return backdrop;
  }

  window.MeetusConfirm = function MeetusConfirm(message, options = {}) {
    const backdrop = ensureConfirmModal();
    if (confirmResolve) {
      confirmResolve(false);
      confirmResolve = null;
    }

    const danger = options.danger !== false;
    const title = options.title || (danger ? "Подтвердите действие" : "Подтверждение");
    const confirmText = options.confirmText || (danger ? "Подтвердить" : "Продолжить");
    const cancelText = options.cancelText || "Отмена";

    backdrop.classList.toggle("danger", danger);
    backdrop.querySelector("#tg6ConfirmTitle").textContent = title;
    backdrop.querySelector("#tg6ConfirmText").textContent = String(message || "");
    backdrop.querySelector('[data-tg6-confirm="accept"]').textContent = confirmText;
    backdrop.querySelector('[data-tg6-confirm="cancel"]').textContent = cancelText;
    backdrop.classList.remove("hidden");

    requestAnimationFrame(() => {
      backdrop.querySelector('[data-tg6-confirm="cancel"]')?.focus();
    });

    return new Promise((resolve) => {
      confirmResolve = resolve;
    });
  };

  function classifySearchSections() {
    const sections = [...searchResults.querySelectorAll(".global-search-section")];
    for (const section of sections) {
      const title = section.querySelector(".global-search-heading strong")?.textContent?.trim().toLowerCase() || "";
      if (title.includes("сообщ")) section.dataset.searchSection = "messages";
      else if (title.includes("польз")) section.dataset.searchSection = "users";
      else section.dataset.searchSection = "chats";
    }
    return sections;
  }

  function applySearchFilter(filter) {
    activeSearchFilter = ["all", "chats", "messages"].includes(filter) ? filter : "all";
    const tabs = searchResults.querySelectorAll(".global-search-tabs button");
    tabs.forEach((button, index) => {
      const value = ["all", "chats", "messages"][index] || "all";
      button.dataset.searchFilter = value;
      button.classList.toggle("active", value === activeSearchFilter);
    });

    classifySearchSections().forEach((section) => {
      const kind = section.dataset.searchSection;
      const visible =
        activeSearchFilter === "all" ||
        (activeSearchFilter === "messages" && kind === "messages") ||
        (activeSearchFilter === "chats" && (kind === "chats" || kind === "users"));
      section.classList.toggle("hidden", !visible);
    });
  }

  function bindSearchFilters() {
    const tabs = searchResults.querySelector(".global-search-tabs");
    if (!tabs || tabs.dataset.tg6Bound === "1") return;
    tabs.dataset.tg6Bound = "1";
    tabs.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      const buttons = [...tabs.querySelectorAll("button")];
      const index = buttons.indexOf(button);
      applySearchFilter(["all", "chats", "messages"][index] || "all");
    });
    applySearchFilter("all");
  }

  performSearch = async function tg6PerformSearch(...args) {
    const result = await originalPerformSearch.apply(this, args);
    bindSearchFilters();
    return result;
  };

  function updateSidebarSearchVisibility(mode = state.sidebarMode) {
    const sidebar = document.querySelector(".sidebar");
    sidebar?.classList.toggle("tg6-requests-mode", mode === "requests");
    const block = searchInput?.closest(".sidebar-search-block");
    block?.classList.toggle("hidden", mode === "requests");
  }

  setSidebarMode = function tg6SetSidebarMode(mode) {
    const result = originalSetSidebarMode.apply(this, arguments);
    updateSidebarSearchVisibility(mode);
    return result;
  };

  function decorateStickerBubble(message) {
    if (!message?.id || message.kind !== "sticker") return;
    const row = messageArea?.querySelector(`[data-message-id="${CSS.escape(message.id)}"]`);
    row?.classList.add("sticker-only-message");
    row?.querySelector(".message-bubble")?.classList.add("sticker-only-bubble");
  }

  appendMessage = function tg6AppendMessage(message) {
    const result = originalAppendMessage(message);
    decorateStickerBubble(message);
    return result;
  };

  function ensureGifPreview() {
    let backdrop = document.getElementById("tg6GifPreviewBackdrop");
    if (backdrop) return backdrop;

    backdrop = document.createElement("div");
    backdrop.id = "tg6GifPreviewBackdrop";
    backdrop.className = "modal-backdrop tg6-gif-preview-backdrop hidden";
    backdrop.innerHTML = `
      <section class="tg6-gif-preview" role="dialog" aria-modal="true" aria-label="Предпросмотр GIF">
        <header>
          <div>
            <strong>Предпросмотр GIF</strong>
            <span>Проверьте анимацию перед отправкой</span>
          </div>
          <button type="button" class="icon-button" data-tg6-gif-close title="Закрыть">×</button>
        </header>
        <div class="tg6-gif-preview-media">
          <img id="tg6GifPreviewImage" alt="GIF">
        </div>
        <div id="tg6GifPreviewTitle" class="tg6-gif-preview-title"></div>
        <div id="tg6GifPreviewStatus" class="tg6-gif-preview-status"></div>
        <footer>
          <button type="button" class="tg6-gif-cancel" data-tg6-gif-close>Отмена</button>
          <button type="button" class="tg6-gif-send" data-tg6-gif-send>Отправить</button>
        </footer>
      </section>
    `;
    document.body.appendChild(backdrop);

    const close = () => {
      if (gifSending) return;
      backdrop.classList.add("hidden");
      pendingGif = null;
      pendingGifKind = null;
      backdrop.querySelector("#tg6GifPreviewImage").removeAttribute("src");
      backdrop.querySelector("#tg6GifPreviewStatus").textContent = "";
    };

    backdrop.querySelectorAll("[data-tg6-gif-close]").forEach((button) => button.addEventListener("click", close));
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) close();
    });
    backdrop.querySelector("[data-tg6-gif-send]")?.addEventListener("click", async () => {
      if (!pendingGif || gifSending) return;
      gifSending = true;
      const sendButton = backdrop.querySelector("[data-tg6-gif-send]");
      const status = backdrop.querySelector("#tg6GifPreviewStatus");
      sendButton.disabled = true;
      sendButton.textContent = "Отправляем…";
      status.textContent = "Сохраняем GIF…";
      await originalSendProviderMedia(pendingGif, pendingGifKind || "gif");
      gifSending = false;
      sendButton.disabled = false;
      sendButton.textContent = "Отправить";
      if (contentPicker.classList.contains("hidden")) {
        backdrop.classList.add("hidden");
        pendingGif = null;
        pendingGifKind = null;
      } else {
        status.textContent = contentPickerStatus.textContent || "Не удалось отправить GIF";
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !backdrop.classList.contains("hidden") && !gifSending) {
        backdrop.classList.add("hidden");
        pendingGif = null;
        pendingGifKind = null;
      }
    });
    return backdrop;
  }

  function openGifPreview(result, kind) {
    const backdrop = ensureGifPreview();
    pendingGif = result;
    pendingGifKind = kind;
    backdrop.querySelector("#tg6GifPreviewImage").src = result.previewUrl || result.url;
    backdrop.querySelector("#tg6GifPreviewTitle").textContent = result.title || "GIF";
    backdrop.querySelector("#tg6GifPreviewStatus").textContent = "";
    backdrop.classList.remove("hidden");
  }

  sendProviderMedia = async function tg6SendProviderMedia(result, kind) {
    if (kind !== "gif") return originalSendProviderMedia.apply(this, arguments);
    openGifPreview(result, kind);
  };

  function decorateExistingStickers() {
    state.activeMessages?.forEach(decorateStickerBubble);
    document.querySelectorAll(".community2-thread-message").forEach((row) => {
      if (row.querySelector(".message-sticker")) {
        row.classList.add("sticker-only-message");
        row.querySelector(".message-bubble")?.classList.add("sticker-only-bubble");
      }
    });
  }

  function initialize() {
    ensureConfirmModal();
    ensureGifPreview();
    updateSidebarSearchVisibility();
    bindSearchFilters();
    decorateExistingStickers();

    let mutationFrame = 0;
    const observer = new MutationObserver(() => {
      if (mutationFrame) return;
      mutationFrame = requestAnimationFrame(() => {
        mutationFrame = 0;
        bindSearchFilters();
        decorateExistingStickers();
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  initialize();

  window.MeetusTg6 = {
    applySearchFilter,
    openGifPreview,
    updateSidebarSearchVisibility,
  };
})();
