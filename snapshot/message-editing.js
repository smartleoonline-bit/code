/* MEETUS 0.6.25.2 COMMUNITY2-TG5 — own-message editing everywhere */
(() => {
  "use strict";

  let boundSocket = null;
  const originalAppendMessage = appendMessage;
  const originalOpenMessageContextMenu = openMessageContextMenu;
  const originalSendTextMessage = sendTextMessage;
  const originalSetReplyMessage = setReplyMessage;
  const originalOpenChat = openChat;
  const originalConnectSocket = connectSocket;

  function ensureEditingDom() {
    if (!("editMessage" in state)) state.editMessage = null;

    if (!document.getElementById("editComposerBar")) {
      const replyBar = document.getElementById("replyComposerBar");
      const bar = document.createElement("div");
      bar.id = "editComposerBar";
      bar.className = "reply-composer-bar edit-composer-bar hidden";
      bar.innerHTML = `
        <div class="reply-composer-line"></div>
        <div class="reply-composer-content">
          <strong>Редактирование</strong>
          <span id="editComposerText"></span>
        </div>
        <button id="editComposerClose" type="button" class="reply-composer-close" title="Отменить редактирование">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17"/></svg>
        </button>
      `;
      replyBar?.parentElement?.insertBefore(bar, replyBar);
      bar.querySelector("#editComposerClose")?.addEventListener("click", clearEditMessage);
    }

    if (!document.getElementById("messageEditAction")) {
      const copyAction = messageContextMenu?.querySelector('[data-message-action="copy"]');
      const button = document.createElement("button");
      button.id = "messageEditAction";
      button.type = "button";
      button.dataset.messageAction = "edit";
      button.innerHTML = `
        <svg viewBox="0 0 24 24"><path d="M4 20h4l11-11-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/></svg>
        <span>Редактировать</span>
      `;
      copyAction?.parentElement?.insertBefore(button, copyAction);
    }
  }

  function editedAt(message) {
    return message?.edited_at || message?.editedAt || null;
  }

  function decorateEditedMessage(message) {
    if (!editedAt(message) || isDeletedForEveryone(message)) return;
    const row = messageArea?.querySelector(`[data-message-id="${CSS.escape(message.id)}"]`);
    const meta = row?.querySelector(".message-meta");
    if (!meta || meta.querySelector(".message-edited-label")) return;
    const label = document.createElement("span");
    label.className = "message-edited-label";
    label.textContent = "изменено";
    const time = meta.querySelector(".message-time");
    meta.insertBefore(label, time || meta.firstChild);
  }

  appendMessage = function tg4AppendMessage(message) {
    const result = originalAppendMessage(message);
    decorateEditedMessage(message);
    return result;
  };

  function canEditMessage(message) {
    return Boolean(
      message &&
      message.sender_id === state.user?.id &&
      !isDeletedForEveryone(message) &&
      message.kind !== "system" &&
      !message.auto_forwarded
    );
  }

  function clearEditMessage() {
    state.editMessage = null;
    document.getElementById("editComposerBar")?.classList.add("hidden");
    const text = document.getElementById("editComposerText");
    if (text) text.textContent = "";
    if (messageInput) {
      messageInput.placeholder = "Введите сообщение";
      resizeMessageInput();
      updateComposerAction();
    }
  }

  function setEditMessage(message) {
    if (!canEditMessage(message)) return;
    clearReplyMessage();
    state.editMessage = message;
    const preview = document.getElementById("editComposerText");
    if (preview) preview.textContent = messageSummary(message);
    document.getElementById("editComposerBar")?.classList.remove("hidden");
    messageInput.value = message.text || "";
    messageInput.placeholder = message.media_key ? "Добавить или изменить подпись" : "Измените сообщение";
    resizeMessageInput();
    updateComposerAction();
    messageInput.focus();
    messageInput.setSelectionRange(messageInput.value.length, messageInput.value.length);
  }

  openMessageContextMenu = function tg4OpenMessageContextMenu(message, trigger) {
    ensureEditingDom();
    const result = originalOpenMessageContextMenu(message, trigger);
    document.getElementById("messageEditAction")?.classList.toggle("hidden", !canEditMessage(message));
    return result;
  };

  setReplyMessage = function tg4SetReplyMessage(message) {
    clearEditMessage();
    return originalSetReplyMessage(message);
  };

  async function saveEditedMessage() {
    const target = state.editMessage;
    const chat = state.activeChat;
    if (!target || !chat || target.chat_id !== chat.id) {
      clearEditMessage();
      return;
    }

    const text = messageInput.value.trim();
    if (!text && !target.media_key) {
      setUploadStatus("Текст сообщения не может быть пустым", true);
      return;
    }

    const attemptedText = messageInput.value;
    messageInput.disabled = true;
    actionButton.disabled = true;
    try {
      const updated = await request(
        `/chats/${chat.id}/messages/${target.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ text }),
        },
      );
      replaceMessageInCurrentView(target.id, {
        ...updated,
        text: updated.text ?? (text || null),
        edited_at: updated.edited_at || updated.editedAt || new Date().toISOString(),
      });
      messageInput.value = "";
      clearEditMessage();
      scrollMessages();
      loadChats(false);
    } catch (error) {
      messageInput.value = attemptedText;
      resizeMessageInput();
      updateComposerAction();
      alert(error.message);
    } finally {
      messageInput.disabled = false;
      actionButton.disabled = false;
      messageInput.focus();
    }
  }

  sendTextMessage = async function tg4SendTextMessage() {
    if (state.editMessage) return saveEditedMessage();
    return originalSendTextMessage();
  };

  openChat = async function tg4OpenChat(chat) {
    clearEditMessage();
    return originalOpenChat(chat);
  };

  function applyEditedSocketPayload(payload) {
    const message = payload?.message || payload;
    const messageId = payload?.messageId || message?.id;
    const chatId = payload?.chatId || message?.chat_id;
    if (!messageId || !chatId) return;

    if (state.activeChat?.id === chatId) {
      replaceMessageInCurrentView(messageId, {
        ...message,
        id: messageId,
        chat_id: chatId,
        edited_at: message?.edited_at || message?.editedAt || new Date().toISOString(),
      });
    }
    if (state.editMessage?.id === messageId) {
      state.editMessage = { ...state.editMessage, ...message };
    }
    loadChats(false);
  }

  function bindEditingSocket() {
    const socket = state.socket;
    if (!socket || socket === boundSocket) return;
    boundSocket = socket;
    socket.on("message.edited", applyEditedSocketPayload);
  }

  connectSocket = function tg4ConnectSocket(...args) {
    const result = originalConnectSocket.apply(this, args);
    queueMicrotask(bindEditingSocket);
    return result;
  };

  document.addEventListener("click", (event) => {
    const editAction = event.target.closest('#messageEditAction[data-message-action="edit"]');
    if (!editAction) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const message = state.contextMessage;
    closeMessageContextMenu();
    if (message) setEditMessage(message);
  }, true);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.editMessage) {
      event.preventDefault();
      clearEditMessage();
    }
  });

  ensureEditingDom();
  bindEditingSocket();
  state.activeMessages?.forEach(decorateEditedMessage);

  window.MeetusMessageEditing = {
    setEditMessage,
    clearEditMessage,
    decorateEditedMessage,
  };
})();
