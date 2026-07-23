/* MEETUS 0.6.25.2 COMMUNITY2-TG5 — recovery, 10-minute delete window, user search and new-chat menu */
(() => {
  "use strict";

  const TEN_MINUTES_MS = 10 * 60 * 1000;
  let boundSocket = null;
  let contactSearchTimer = null;
  let userSearchTimer = null;

  const originalAppendMessage = appendMessage;
  const originalOpenMessageContextMenu = openMessageContextMenu;
  const originalConnectSocket = connectSocket;
  const originalSetSidebarMode = setSidebarMode;

  function messageMetadata(message) {
    return message?.metadata && typeof message.metadata === "object"
      ? message.metadata
      : {};
  }

  function isTombstone(message) {
    return Boolean(messageMetadata(message).deletedForEveryone);
  }

  function parseDate(value) {
    const date = new Date(value || 0);
    return Number.isFinite(date.getTime()) ? date : null;
  }

  function messageAgeMs(message) {
    const date = parseDate(message?.created_at || message?.createdAt);
    return date ? Date.now() - date.getTime() : Number.POSITIVE_INFINITY;
  }

  function restoreUntil(message) {
    return parseDate(
      messageMetadata(message).restoreUntil ||
      messageMetadata(message).restore_until,
    );
  }

  function canDeleteForEveryone(message) {
    return Boolean(
      message &&
      message.sender_id === state.user?.id &&
      !isTombstone(message) &&
      message.kind !== "system" &&
      !message.auto_forwarded &&
      messageAgeMs(message) <= TEN_MINUTES_MS
    );
  }

  function canRestore(message) {
    const deadline = restoreUntil(message);
    return Boolean(
      message &&
      message.sender_id === state.user?.id &&
      isTombstone(message) &&
      deadline &&
      deadline.getTime() > Date.now()
    );
  }

  function remainingLabel(message) {
    const deadline = restoreUntil(message);
    if (!deadline) return "";
    const seconds = Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / 1000));
    const minutes = Math.floor(seconds / 60);
    const rest = String(seconds % 60).padStart(2, "0");
    return `${minutes}:${rest}`;
  }

  function decorateRecovery(message) {
    if (!message?.id) return;
    const row = messageArea?.querySelector(
      `[data-message-id="${CSS.escape(message.id)}"]`,
    );
    if (!row) return;

    row.classList.toggle("message-restorable", canRestore(message));
    row.querySelector("[data-restore-message]")?.remove();

    if (!canRestore(message)) return;

    const deleted = row.querySelector(".message-deleted-text");
    if (!deleted) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "message-restore-button";
    button.dataset.restoreMessage = message.id;
    button.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 7H4v-5"/>
        <path d="M4 7a9 9 0 1 1-1 8"/>
      </svg>
      <span>Восстановить</span>
      <small>${remainingLabel(message)}</small>
    `;
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      restoreMessage(message);
    });
    deleted.appendChild(button);
  }

  appendMessage = function tg5AppendMessage(message) {
    const result = originalAppendMessage(message);
    decorateRecovery(message);
    return result;
  };

  openMessageContextMenu = function tg5OpenMessageContextMenu(message, trigger) {
    document.getElementById("messageRestoreAction")?.classList.toggle(
      "hidden",
      !canRestore(message),
    );
    const result = originalOpenMessageContextMenu(message, trigger);
    messageDeleteEveryoneAction?.classList.toggle(
      "hidden",
      !canDeleteForEveryone(message),
    );
    return result;
  };

  deleteMessageForScope = async function tg5DeleteMessageForScope(message, scope) {
    const chatId = state.activeChat?.id;
    if (!chatId || !message?.id) return;

    const result = await request(
      `/chats/${chatId}/messages/${message.id}?scope=${encodeURIComponent(scope)}`,
      { method: "DELETE" },
    );

    if (scope === "everyone") {
      const tombstone = result?.message || {
        ...message,
        kind: "text",
        text: "Сообщение удалено",
        media_key: null,
        mime_type: null,
        file_name: null,
        file_size: null,
        duration_ms: null,
        waveform: null,
        width: null,
        height: null,
        reply_to_id: null,
        reactions: [],
        metadata: {
          ...messageMetadata(message),
          deletedForEveryone: true,
          deletedForEveryoneAt: new Date().toISOString(),
          restoreUntil: result?.restoreUntil,
        },
      };
      replaceMessageInCurrentView(message.id, tombstone);
      decorateRecovery({ ...message, ...tombstone });
    } else {
      removeMessageFromCurrentView(message.id);
    }

    await loadChats(false);
  };

  async function restoreMessage(message) {
    const chatId = state.activeChat?.id || message.chat_id;
    if (!chatId || !message?.id || !canRestore(message)) return;

    const button = messageArea?.querySelector(
      `[data-message-id="${CSS.escape(message.id)}"] [data-restore-message]`,
    );
    if (button) button.disabled = true;

    try {
      const restored = await request(
        `/chats/${chatId}/messages/${message.id}/restore`,
        { method: "POST", body: JSON.stringify({}) },
      );
      closeMessageContextMenu();
      replaceMessageInCurrentView(message.id, restored);
      await loadChats(false);
    } catch (error) {
      if (button) button.disabled = false;
      alert(error.message);
    }
  }

  function applyDeletedPayload(payload) {
    const message = payload?.message;
    const messageId = payload?.messageId || message?.id;
    const chatId = payload?.chatId || message?.chat_id;
    if (!messageId || !chatId || state.activeChat?.id !== chatId) return;

    if (message) {
      replaceMessageInCurrentView(messageId, message);
      decorateRecovery(message);
    } else {
      const existing = findMessageById(messageId);
      if (existing) decorateRecovery(existing);
    }
  }

  function applyRestoredPayload(payload) {
    const message = payload?.message || payload;
    const messageId = payload?.messageId || message?.id;
    const chatId = payload?.chatId || message?.chat_id;
    if (!messageId || !chatId) return;

    if (state.activeChat?.id === chatId && message) {
      replaceMessageInCurrentView(messageId, message);
    }
    loadChats(false);
  }

  function bindTg5Socket() {
    const socket = state.socket;
    if (!socket || socket === boundSocket) return;
    boundSocket = socket;
    socket.on("message.deleted", applyDeletedPayload);
    socket.on("message.restored", applyRestoredPayload);
  }

  connectSocket = function tg5ConnectSocket(...args) {
    const result = originalConnectSocket.apply(this, args);
    queueMicrotask(bindTg5Socket);
    return result;
  };

  function updateRestoreButtons() {
    state.activeMessages?.forEach((message) => {
      if (isTombstone(message)) decorateRecovery(message);
    });
  }

  function ensureNewChatUi() {
    if (!document.getElementById("tg5NewChatMenu")) {
      const menu = document.createElement("div");
      menu.id = "tg5NewChatMenu";
      menu.className = "tg5-new-chat-menu hidden";
      menu.innerHTML = `
        <button type="button" data-tg5-new-chat="user">
          <svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M18 8v6M15 11h6"/></svg>
          <span>Добавить пользователя</span>
        </button>
        <button type="button" data-tg5-new-chat="group">
          <svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="10" r="2.5"/><path d="M3 20a6 6 0 0 1 12 0M14 20a5 5 0 0 1 7 0"/></svg>
          <span>Создать группу</span>
        </button>
        <button type="button" data-tg5-new-chat="channel">
          <svg viewBox="0 0 24 24"><path d="m4 13 13-6v10L4 13zM8 14v5M17 10l3-2M17 14l3 2"/></svg>
          <span>Создать канал</span>
        </button>
        <button type="button" data-tg5-new-chat="linked">
          <svg viewBox="0 0 24 24"><path d="M9 15 15 9M7 17l-2 2a3 3 0 0 1-4-4l4-4a3 3 0 0 1 4 0M17 7l2-2a3 3 0 0 1 4 4l-4 4a3 3 0 0 1-4 0"/></svg>
          <span>Канал + группа</span>
        </button>
      `;
      document.body.appendChild(menu);
      menu.addEventListener("click", (event) => {
        const action = event.target.closest("[data-tg5-new-chat]")?.dataset.tg5NewChat;
        if (!action) return;
        toggleNewChatMenu(false);
        if (action === "user") openUserSearchModal();
        if (["group", "channel", "linked"].includes(action)) openCommunityModal(action);
      });
    }

    if (!document.getElementById("tg5UserSearchModal")) {
      const modal = document.createElement("div");
      modal.id = "tg5UserSearchModal";
      modal.className = "modal-backdrop tg5-user-search-backdrop hidden";
      modal.innerHTML = `
        <section class="tg5-user-search-modal" role="dialog" aria-modal="true" aria-label="Добавить пользователя">
          <header>
            <div>
              <strong>Добавить пользователя</strong>
              <span>Поиск по @username</span>
            </div>
            <button type="button" class="icon-button" data-tg5-close-user-search title="Закрыть">×</button>
          </header>
          <div class="tg5-user-search-body">
            <div class="search-box">
              <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
              <input id="tg5UsernameSearchInput" type="search" placeholder="Введите @username" autocomplete="off">
            </div>
            <div id="tg5UsernameSearchResults" class="tg5-user-search-results">
              <div class="empty-list">Введите минимум 2 символа username</div>
            </div>
          </div>
        </section>
      `;
      document.body.appendChild(modal);
      modal.querySelector("[data-tg5-close-user-search]")?.addEventListener("click", closeUserSearchModal);
      modal.addEventListener("click", (event) => {
        if (event.target === modal) closeUserSearchModal();
      });
      modal.querySelector("#tg5UsernameSearchInput")?.addEventListener("input", (event) => {
        clearTimeout(userSearchTimer);
        userSearchTimer = setTimeout(() => searchUsersByUsername(event.target.value), 260);
      });
    }
  }

  function positionNewChatMenu() {
    const button = document.getElementById("newChatButton");
    const menu = document.getElementById("tg5NewChatMenu");
    if (!button || !menu) return;
    const rect = button.getBoundingClientRect();
    const width = Math.max(260, menu.offsetWidth || 260);
    let left = rect.right - width;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
    menu.style.left = `${left}px`;
    menu.style.top = `${rect.bottom + 8}px`;
  }

  function toggleNewChatMenu(force) {
    ensureNewChatUi();
    const menu = document.getElementById("tg5NewChatMenu");
    const shouldOpen = typeof force === "boolean" ? force : menu.classList.contains("hidden");
    menu.classList.toggle("hidden", !shouldOpen);
    if (shouldOpen) {
      toggleMainMenu(false);
      requestAnimationFrame(positionNewChatMenu);
    }
  }

  function openUserSearchModal() {
    ensureNewChatUi();
    const modal = document.getElementById("tg5UserSearchModal");
    const input = document.getElementById("tg5UsernameSearchInput");
    const results = document.getElementById("tg5UsernameSearchResults");
    modal.classList.remove("hidden");
    input.value = "";
    results.innerHTML = '<div class="empty-list">Введите минимум 2 символа username</div>';
    requestAnimationFrame(() => input.focus());
  }

  function closeUserSearchModal() {
    document.getElementById("tg5UserSearchModal")?.classList.add("hidden");
  }

  function userResultMarkup(user, { compact = false } = {}) {
    const username = user.username ? `@${escapeHtml(user.username)}` : "Без username";
    const isContact = state.contacts?.some((contact) => contact.id === user.id);
    return `
      <div class="tg5-user-result ${compact ? "compact" : ""}">
        <button type="button" class="tg5-user-main" data-tg5-open-user="${user.id}">
          ${avatarMarkup(user.display_name, user.avatar_key, "avatar tg5-user-avatar")}
          <span>
            <strong>${escapeHtml(user.display_name)}</strong>
            <small>${username}${isContact ? " · в контактах" : ""}</small>
          </span>
        </button>
        ${
          isContact
            ? ""
            : `<button type="button" class="tg5-add-contact" data-tg5-add-contact="${user.id}" title="Добавить в контакты">Добавить</button>`
        }
      </div>
    `;
  }

  function bindUserResults(container, users, closeAfterOpen = false) {
    container.querySelectorAll("[data-tg5-open-user]").forEach((button) => {
      button.addEventListener("click", async () => {
        if (closeAfterOpen) closeUserSearchModal();
        await createChat(button.dataset.tg5OpenUser);
      });
    });
    container.querySelectorAll("[data-tg5-add-contact]").forEach((button) => {
      button.addEventListener("click", () => {
        const user = users.find((item) => item.id === button.dataset.tg5AddContact);
        if (user) openContactRequest(user);
      });
    });
  }

  async function searchUsersByUsername(value) {
    const input = String(value || "").trim().replace(/^@/, "");
    const results = document.getElementById("tg5UsernameSearchResults");
    if (!results) return;
    if (input.length < 2) {
      results.innerHTML = '<div class="empty-list">Введите минимум 2 символа username</div>';
      return;
    }
    results.innerHTML = '<div class="search-loading">Ищем пользователя…</div>';
    try {
      const found = await request(`/users/search?q=${encodeURIComponent(input)}`);
      const users = (Array.isArray(found) ? found : [])
        .filter((user) => user.username && user.username.toLowerCase().includes(input.toLowerCase()));
      results.innerHTML = users.length
        ? users.map((user) => userResultMarkup(user)).join("")
        : '<div class="empty-list">Пользователь с таким username не найден</div>';
      bindUserResults(results, users, true);
    } catch (error) {
      results.innerHTML = `<div class="empty-list">${escapeHtml(error.message)}</div>`;
    }
  }

  async function searchUsersInContacts(value) {
    const clean = String(value || "").trim();
    if (clean.length < 2) {
      renderContacts(clean);
      return;
    }

    contactList.innerHTML = '<div class="search-loading">Ищем пользователей…</div>';
    try {
      const found = await request(`/users/search?q=${encodeURIComponent(clean)}`);
      const users = Array.isArray(found) ? found : [];
      contactList.innerHTML = users.length
        ? `<div class="tg5-contact-search-caption">Пользователи</div>${users.map((user) => userResultMarkup(user, { compact: true })).join("")}`
        : '<div class="empty-list">Пользователи не найдены</div>';
      bindUserResults(contactList, users, false);
    } catch (error) {
      contactList.innerHTML = `<div class="empty-list">${escapeHtml(error.message)}</div>`;
    }
  }

  setSidebarMode = function tg5SetSidebarMode(mode) {
    const result = originalSetSidebarMode(mode);
    if (mode === "contacts") {
      searchInput.placeholder = "Поиск пользователей по имени или @username";
    } else if (mode === "chats") {
      searchInput.placeholder = "Чаты, сообщения или пользователи";
    }
    return result;
  };

  function ensureRestoreMenuAction() {
    if (!messageContextMenu || document.getElementById("messageRestoreAction")) return;
    const action = document.createElement("button");
    action.id = "messageRestoreAction";
    action.type = "button";
    action.className = "hidden";
    action.dataset.messageAction = "restore";
    action.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 7H4V2"/><path d="M4 7a9 9 0 1 1-1 8"/>
      </svg>
      <span>Восстановить</span>
    `;
    const divider = messageContextMenu.querySelector(".message-context-divider");
    messageContextMenu.insertBefore(action, divider || messageContextMenu.firstChild);
    action.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const message = state.contextMessage;
      if (message) restoreMessage(message);
    }, true);
  }

  function initialize() {
    ensureNewChatUi();
    ensureRestoreMenuAction();
    bindTg5Socket();

    document.getElementById("newChatButton")?.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        toggleNewChatMenu();
      },
      true,
    );

    searchInput?.addEventListener(
      "input",
      (event) => {
        if (state.sidebarMode !== "contacts") return;
        event.stopImmediatePropagation();
        clearTimeout(contactSearchTimer);
        contactSearchTimer = setTimeout(
          () => searchUsersInContacts(searchInput.value),
          260,
        );
      },
      true,
    );

    document.addEventListener("click", (event) => {
      const menu = document.getElementById("tg5NewChatMenu");
      const button = document.getElementById("newChatButton");
      if (menu && !menu.classList.contains("hidden") && !menu.contains(event.target) && !button?.contains(event.target)) {
        toggleNewChatMenu(false);
      }
    });

    window.addEventListener("resize", () => {
      if (!document.getElementById("tg5NewChatMenu")?.classList.contains("hidden")) positionNewChatMenu();
    });

    setInterval(updateRestoreButtons, 1000);
    state.activeMessages?.forEach(decorateRecovery);
  }

  initialize();

  window.MeetusTg5 = {
    restoreMessage,
    canDeleteForEveryone,
    canRestore,
    openUserSearchModal,
  };
})();
