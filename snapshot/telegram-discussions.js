/* MEETUS 0.6.25.2 COMMUNITY2-TG11-WORKSPACE3
 * Telegram-style channel threads in the central messenger pane.
 * Linked groups are hidden from regular users and remain manageable by owners/admins.
 */
(() => {
  "use strict";

  const community2 = {
    initialized: false,
    socket: null,
    mode: null,
    thread: null,
    threadReplyTo: null,
    threadEditMessage: null,
    returnToSidebarAfterWorkspace: false,
    threadContextMessage: null,
    threadLoading: false,
    threadRefreshTimer: null,
    replies: [],
    unreadReplies: 0,
    refreshRepliesTimer: null,
    spaces: new Map(),
    spacesLoaded: false,
    spacesLoading: null,
    composerBusy: false,
    voice: null,
    threadPinnedMessage: null,
    attachmentMode: "media",
  };

  const byId = (id) => document.getElementById(id);

  function workspaceRequest(path, options = {}) {
    return request(`/workspace${path}`, options);
  }

  function canManageCurrentThread() {
    return community2.thread?.canManageDiscussion === true;
  }

  async function writeWorkspaceClipboard(value) {
    try { await navigator.clipboard.writeText(value); return; } catch {}
    const field = document.createElement('textarea');
    field.value = value; field.style.position = 'fixed'; field.style.opacity = '0';
    document.body.append(field); field.select(); document.execCommand('copy'); field.remove();
  }

  function threadMeta(message) {
    const value = message?.metadata?.telegramDiscussion;
    return value && typeof value === "object" ? value : null;
  }

  function textPreview(message, fallback = "Сообщение") {
    return (
      message?.text ||
      message?.file_name ||
      message?.fileName ||
      {
        image: "Фото",
        video: "Видео",
        voice: "Голосовое сообщение",
        file: "Файл",
        gif: "GIF",
        sticker: "Стикер",
      }[message?.kind] ||
      fallback
    );
  }

  function shortText(value, limit = 140) {
    const normalized = String(value || "").replace(/\s+/g, " ").trim();
    if (normalized.length <= limit) return normalized;
    return `${normalized.slice(0, limit - 1)}…`;
  }

  function deletedMetadata(message) {
    return message?.metadata && typeof message.metadata === "object"
      ? message.metadata
      : {};
  }

  function isDeletedComment(message) {
    return Boolean(deletedMetadata(message).deletedForEveryone);
  }

  function parsedDate(value) {
    const date = new Date(value || 0);
    return Number.isFinite(date.getTime()) ? date : null;
  }

  function canDeleteCommentForEveryone(comment) {
    const created = parsedDate(comment?.created_at || comment?.createdAt);
    return Boolean(
      comment &&
      comment.sender_id === state.user?.id &&
      !isDeletedComment(comment) &&
      comment.kind !== "system" &&
      created &&
      Date.now() - created.getTime() <= 10 * 60 * 1000
    );
  }

  function commentRestoreUntil(comment) {
    return parsedDate(
      deletedMetadata(comment).restoreUntil ||
      deletedMetadata(comment).restore_until,
    );
  }

  function canRestoreComment(comment) {
    const deadline = commentRestoreUntil(comment);
    return Boolean(
      comment &&
      comment.sender_id === state.user?.id &&
      isDeletedComment(comment) &&
      deadline &&
      deadline.getTime() > Date.now()
    );
  }

  function restoreCountdown(comment) {
    const deadline = commentRestoreUntil(comment);
    if (!deadline) return "";
    const seconds = Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / 1000));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  }

  function formatRole(role) {
    return {
      owner: "владелец",
      admin: "администратор",
      member: "участник",
      subscriber: "подписчик",
    }[role] || "";
  }

  function avatarMarkup(key, name, extraClass = "") {
    const label = String(name || "П").trim().slice(0, 1).toUpperCase() || "П";
    if (key) {
      return `<img class="community2-avatar ${extraClass}" src="/api/media/${encodeURIComponent(key)}" alt="" loading="lazy">`;
    }
    return `<span class="community2-avatar community2-avatar-fallback ${extraClass}" aria-hidden="true">${escapeHtml(label)}</span>`;
  }

  function mediaPreviewMarkup(message) {
    if (!message?.media_key && !message?.mediaKey) return "";
    const normalized = {
      ...message,
      media_key: message.media_key || message.mediaKey,
      mime_type: message.mime_type || message.mimeType,
      file_name: message.file_name || message.fileName,
      file_size: message.file_size ?? message.fileSize,
      duration_ms: message.duration_ms ?? message.durationMs,
    };
    return mediaMarkup(normalized);
  }

  function bindVisualMessageMedia(container, message) {
    if (!container || !message) return;
    const imageButton = container.querySelector(".media-image-button");
    imageButton?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const gifAsVideo = isGifMessage(message) && !String(message.mime_type || "").toLowerCase().startsWith("image/");
      openMediaViewer(message.media_key, gifAsVideo);
    });

    const videoButton = container.querySelector(".media-video-button");
    if (videoButton) {
      const preview = videoButton.querySelector(".message-video-preview");
      const duration = videoButton.querySelector(".message-video-duration");
      preview?.addEventListener("loadedmetadata", () => {
        if (duration && Number.isFinite(preview.duration)) duration.textContent = formatDuration(preview.duration * 1000);
      });
      videoButton.addEventListener("click", () => openMediaViewer(message.media_key, true));
    }

    const gifButton = container.querySelector(".message-gif-button");
    const gifVideo = container.querySelector(".message-gif-video");
    gifButton?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openMediaViewer(message.media_key, Boolean(gifVideo));
    });
    container.querySelector(".message-sticker-button")?.addEventListener("click", () => openMediaViewer(message.media_key, false));
    container.querySelectorAll(".voice-message").forEach(setupVoicePlayer);
  }

  function bindCommunity2Media(root) {
    if (!root) return;
    const source = community2.thread?.sourceMessage;
    bindVisualMessageMedia(root.querySelector(".community2-source-card"), source);

    root.querySelectorAll("[data-community2-comment-id]").forEach((row) => {
      const comment = findThreadComment(row.dataset.community2CommentId);
      if (!comment) return;
      bindVisualMessageMedia(row, comment);
      row.querySelector(".message-menu-trigger")?.addEventListener("click", (event) => {
        event.stopPropagation();
        openThreadContextMenu(comment, event.currentTarget);
      });
      row.querySelector("[data-community2-jump-parent]")?.addEventListener("click", () => {
        focusThreadMessage(comment.reply_to_id);
      });
      row.querySelectorAll("[data-reaction-emoji]").forEach((button) => {
        button.addEventListener("click", () => toggleThreadReaction(comment, button.dataset.reactionEmoji));
      });
      row.querySelector("[data-community2-restore]")?.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        restoreThreadComment(comment, event.currentTarget);
      });
    });
  }

  function sourceCardMarkup(message, title = "Публикация") {
    const sender = message?.sender_name || message?.senderName || title;
    return `
      <article class="community2-source-card">
        <div class="community2-source-head">
          <div class="community2-source-author">
            ${avatarMarkup(message?.sender_avatar_key || message?.senderAvatarKey, sender)}
            <strong>${escapeHtml(sender)}</strong>
          </div>
          <span>${escapeHtml(formatTime(message?.created_at || message?.createdAt))}</span>
        </div>
        ${mediaPreviewMarkup(message)}
        ${message?.text ? `<div class="community2-source-text">${linkifyMessageText(message.text)}</div>` : ""}
      </article>
    `;
  }

  function replyQuoteMarkup(comment) {
    if (!comment.reply_target_user_id && !comment.reply_target_name) return "";
    const preview = shortText(
      comment.reply_target_text ||
        comment.reply_target_file_name ||
        ({ image: "Фото", video: "Видео", voice: "Голосовое сообщение", file: "Файл" }[comment.reply_target_kind]) ||
        "Сообщение",
      120,
    );
    return `
      <button type="button" class="community2-comment-quote" data-community2-jump-parent="${escapeHtml(comment.reply_to_id)}">
        <strong>${escapeHtml(comment.reply_target_name || "Сообщение")}</strong>
        <span>${escapeHtml(preview)}</span>
      </button>
    `;
  }

  function commentMarkup(comment) {
    const mine = comment.sender_id === state.user?.id;
    const role = formatRole(comment.sender_role);
    const sender = comment.sender_name || "Пользователь";
    const edited = comment.edited_at || comment.editedAt;
    const deleted = isDeletedComment(comment);
    const hasMedia = !deleted && Boolean(comment.media_key || comment.mediaKey);
    const deletedBody = deleted
      ? `
          <div class="message-deleted-text">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8.5 8.5 7 7"/></svg>
            <span>Сообщение удалено</span>
            ${
              canRestoreComment(comment)
                ? `<button type="button" class="community2-restore-button" data-community2-restore="${escapeHtml(comment.id)}">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7H4v-5"/><path d="M4 7a9 9 0 1 1-1 8"/></svg>
                    <span>Восстановить</span><small>${restoreCountdown(comment)}</small>
                  </button>`
                : ""
            }
          </div>
        `
      : `
          ${replyQuoteMarkup(comment)}
          ${mediaPreviewMarkup(comment)}
          ${comment.text ? `<div class="message-text">${linkifyMessageText(comment.text)}</div>` : ""}
        `;

    return `
      <div class="message-row community2-thread-message ${mine ? "mine" : ""}" data-community2-comment-id="${escapeHtml(comment.id)}">
        <div class="message-bubble ${hasMedia ? "has-media" : ""} ${!deleted && ["image", "video"].includes(comment.kind) ? "visual-media-bubble" : ""} ${!deleted && isGifMessage(comment) ? "gif-media-bubble" : ""} ${!deleted && comment.kind === "sticker" ? "sticker-only-bubble" : ""}">
          <button type="button" class="message-menu-trigger" title="Действия">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>
          </button>
          <div class="community2-thread-sender">
            ${avatarMarkup(comment.sender_avatar_key, sender, "community2-thread-avatar")}
            <strong>${escapeHtml(sender)}</strong>
            ${role ? `<span>${escapeHtml(role)}</span>` : ""}
          </div>
          ${deletedBody}
          <span class="message-meta">
            ${edited && !deleted ? '<span class="message-edited-label">изменено</span>' : ""}
            <span class="message-time">${escapeHtml(formatTime(comment.created_at || comment.createdAt))}</span>
            ${mine ? messageReceiptMarkup(comment.receipt_status || "sent") : ""}
          </span>
          ${deleted ? "" : reactionMarkup(comment)}
        </div>
      </div>
    `;
  }

  function findThreadComment(messageId) {
    return community2.thread?.comments?.find((item) => item.id === messageId) || null;
  }

  function clearThreadEdit() {
    community2.threadEditMessage = null;
    byId("community2ThreadEditBar")?.classList.add("hidden");
    if (byId("community2ThreadEditText")) byId("community2ThreadEditText").textContent = "";
    const input = byId("community2ThreadInput");
    if (input) input.placeholder = "Введите сообщение";
    updateThreadComposerAction();
  }

  function setThreadEdit(comment) {
    if (!comment || comment.sender_id !== state.user?.id) return;
    clearThreadReply();
    community2.threadEditMessage = comment;
    byId("community2ThreadEditText").textContent = shortText(textPreview(comment), 110);
    byId("community2ThreadEditBar").classList.remove("hidden");
    const input = byId("community2ThreadInput");
    input.value = comment.text || "";
    input.placeholder = comment.media_key ? "Добавить или изменить подпись" : "Измените сообщение";
    resizeThreadInput();
    updateThreadComposerAction();
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }

  function closeThreadContextMenu() {
    byId("community2ThreadContextMenu")?.classList.add("hidden");
    byId("community2ThreadReactionGrid")?.classList.add("hidden");
    community2.threadContextMessage = null;
  }

  function openThreadContextMenu(comment, trigger) {
    const menu = byId("community2ThreadContextMenu");
    if (!menu || !comment) return;
    community2.threadContextMessage = comment;
    const mine = comment.sender_id === state.user?.id;
    const deleted = isDeletedComment(comment);
    menu.querySelector('[data-community2-thread-action="edit"]')?.classList.toggle("hidden", !mine || deleted);
    menu.querySelector('[data-community2-thread-action="restore"]')?.classList.toggle("hidden", !canRestoreComment(comment));
    menu.querySelector('[data-community2-thread-action="delete-everyone"]')?.classList.toggle("hidden", !canDeleteCommentForEveryone(comment));
    menu.querySelector('[data-community2-thread-action="delete-me"]')?.classList.toggle("hidden", !comment?.id);
    menu.querySelector(".quick-reaction-row")?.classList.toggle("hidden", deleted);
    const canManage = canManageCurrentThread();
    menu.querySelector('[data-community2-thread-action="pin"]')?.classList.toggle("hidden", !canManage || deleted);
    menu.querySelector('[data-community2-thread-action="message-link"]')?.classList.toggle("hidden", !canManage || deleted);
    const pinLabel = byId("community2ThreadPinLabel");
    if (pinLabel) pinLabel.textContent = community2.threadPinnedMessage?.id === comment.id ? "Открепить сообщение" : "Закрепить сообщение";
    menu.classList.remove("hidden");
    const rect = trigger.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    let left = rect.right - menuRect.width;
    let top = rect.bottom + 5;
    left = Math.min(Math.max(8, left), window.innerWidth - menuRect.width - 8);
    if (top + menuRect.height > window.innerHeight - 8) top = rect.top - menuRect.height - 5;
    menu.style.left = `${left}px`;
    menu.style.top = `${Math.max(8, top)}px`;
  }

  async function toggleThreadReaction(comment, emoji) {
    if (!comment || !emoji || !community2.thread) return;
    const mine = (comment.reactions || []).some((item) => normalizeReaction(item).emoji === emoji && normalizeReaction(item).reactedByMe);
    try {
      const reactions = await request(
        `/channel-posts/${community2.thread.channelMessageId}/comments/${comment.id}/reaction`,
        mine
          ? { method: "DELETE" }
          : { method: "POST", body: JSON.stringify({ emoji }) },
      );
      comment.reactions = reactions;
      renderThread();
    } catch (error) {
      showStatus(error.message);
    }
  }

  async function deleteThreadComment(comment, scope) {
    if (!comment || !community2.thread) return;
    const everyone = scope === "everyone";
    if (everyone && !(await window.MeetusConfirm(
      "Удалить это сообщение у всех? Восстановить его можно будет в течение 10 минут.",
      {
        danger: true,
        title: "Удалить сообщение?",
        confirmText: "Удалить у всех",
      },
    ))) return;
    try {
      const result = await request(
        `/channel-posts/${community2.thread.channelMessageId}/comments/${comment.id}?scope=${encodeURIComponent(scope)}`,
        { method: "DELETE" },
      );
      closeThreadContextMenu();
      if (everyone && result?.message) {
        const index = community2.thread.comments.findIndex((item) => item.id === comment.id);
        if (index >= 0) community2.thread.comments[index] = result.message;
        renderThread();
      } else {
        community2.thread = await request(`/channel-posts/${community2.thread.channelMessageId}/discussion`);
        renderThread();
      }
    } catch (error) {
      showStatus(error.message);
    }
  }

  async function restoreThreadComment(comment, button) {
    if (!comment || !community2.thread || !canRestoreComment(comment)) return;
    if (button) button.disabled = true;
    try {
      const restored = await request(
        `/channel-posts/${community2.thread.channelMessageId}/comments/${comment.id}/restore`,
        { method: "POST", body: JSON.stringify({}) },
      );
      const index = community2.thread.comments.findIndex((item) => item.id === comment.id);
      if (index >= 0) community2.thread.comments[index] = restored;
      renderThread();
    } catch (error) {
      if (button) button.disabled = false;
      showStatus(error.message);
    }
  }

  async function loadThreadPinnedMessage() {
    const chatId = community2.thread?.discussionChatId;
    if (!chatId) { community2.threadPinnedMessage = null; return; }
    try { community2.threadPinnedMessage = await workspaceRequest(`/chats/${chatId}/pinned-message`); }
    catch { community2.threadPinnedMessage = null; }
    renderThreadPinnedBanner();
  }

  function renderThreadPinnedBanner() {
    const body = byId("community2WorkspaceBody");
    body?.querySelector(".community2-thread-pinned")?.remove();
    const message = community2.threadPinnedMessage;
    if (!body || !message) return;
    const preview = message.text || message.file_name || ({ image: "Фото", video: "Видео", voice: "Голосовое сообщение", file: "Файл" }[message.kind]) || "Сообщение";
    const node = document.createElement("div");
    node.className = "community2-thread-pinned";
    node.innerHTML = `<button type="button"><strong>Закреплённое сообщение</strong><span>${escapeHtml(message.sender_name || "Пользователь")}: ${escapeHtml(shortText(preview, 120))}</span></button>${canManageCurrentThread() ? '<button type="button" data-thread-unpin title="Открепить">×</button>' : ''}`;
    node.querySelector("button")?.addEventListener("click", () => focusThreadMessage(message.id));
    node.querySelector("[data-thread-unpin]")?.addEventListener("click", async (event) => {
      event.stopPropagation();
      await workspaceRequest(`/chats/${community2.thread.discussionChatId}/pinned-message`, { method: "POST", body: JSON.stringify({ messageId: null }) });
      community2.threadPinnedMessage = null; renderThreadPinnedBanner(); showStatus("Сообщение откреплено");
    });
    body.prepend(node);
  }

  async function toggleThreadPinnedMessage(comment) {
    if (!comment || !canManageCurrentThread()) return;
    const current = community2.threadPinnedMessage?.id === comment.id;
    const result = await workspaceRequest(`/chats/${community2.thread.discussionChatId}/pinned-message`, {
      method: "POST", body: JSON.stringify({ messageId: current ? null : comment.id }),
    });
    community2.threadPinnedMessage = result.message || null;
    renderThreadPinnedBanner();
    showStatus(current ? "Сообщение откреплено" : "Сообщение закреплено");
  }

  async function copyThreadMessageLink(comment) {
    if (!comment || !canManageCurrentThread()) return;
    const url = new URL(location.origin + "/");
    url.searchParams.set("post", community2.thread.channelMessageId);
    url.searchParams.set("comment", comment.id);
    await writeWorkspaceClipboard(url.toString());
    showStatus("Ссылка на сообщение скопирована");
  }

  async function handleThreadContextAction(action) {
    const comment = community2.threadContextMessage;
    if (!comment) return;
    if (action === "reply") setThreadReply(comment);
    if (action === "edit") setThreadEdit(comment);
    if (action === "copy") await copyMessageContent(comment);
    if (action === "info") openMessageInfo(comment);
    if (action === "pin") await toggleThreadPinnedMessage(comment);
    if (action === "message-link") await copyThreadMessageLink(comment);
    if (action === "restore") await restoreThreadComment(comment);
    if (action === "delete-me") await deleteThreadComment(comment, "me");
    if (action === "delete-everyone") await deleteThreadComment(comment, "everyone");
    if (action !== "more-reactions") closeThreadContextMenu();
  }

  function centerHost() {
    let host = messageArea?.parentElement || document.querySelector("main") || document.body;
    if (typeof chatList !== "undefined" && chatList) {
      while (host.parentElement && !host.parentElement.contains(chatList)) {
        host = host.parentElement;
      }
    }
    return host;
  }

  function ensureDom() {
    if (byId("community2Workspace")) return;

    const host = centerHost();
    host.classList.add("community2-center-host");

    const workspace = document.createElement("section");
    workspace.id = "community2Workspace";
    workspace.className = "community2-workspace hidden";
    workspace.setAttribute("aria-live", "polite");
    workspace.innerHTML = `
      <header class="community2-workspace-header">
        <button id="community2WorkspaceBack" type="button" class="community2-back-button" title="Назад">‹</button>
        <div class="community2-workspace-title">
          <strong id="community2WorkspaceTitle">Обсуждение</strong>
          <span id="community2WorkspaceSubtitle"></span>
        </div>
        <button id="community2WorkspaceSource" type="button" class="community2-header-action hidden">К публикации</button>
      </header>
      <main id="community2WorkspaceBody" class="community2-workspace-body"></main>
      <div id="community2ThreadEditBar" class="community2-compose-reply community2-compose-edit hidden">
        <div>
          <strong>Редактирование</strong>
          <span id="community2ThreadEditText"></span>
        </div>
        <button id="community2ThreadEditCancel" type="button" title="Отменить редактирование">×</button>
      </div>
      <div id="community2ThreadReplyBar" class="community2-compose-reply hidden">
        <div>
          <strong id="community2ThreadReplyTitle">Ответ</strong>
          <span id="community2ThreadReplyText"></span>
        </div>
        <button id="community2ThreadReplyCancel" type="button" title="Отменить ответ">×</button>
      </div>
      <form id="community2ThreadForm" class="community2-thread-form hidden" autocomplete="off">
        <input id="community2ThreadFileInput" type="file" multiple hidden
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.7z">
        <button id="community2ThreadAttach" type="button" class="community2-composer-button community2-thread-plus" title="Добавить" aria-label="Добавить">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
        </button>
        <button id="community2ThreadEmoji" type="button" class="community2-composer-button" title="Смайлы" aria-label="Смайлы">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8.5 10h.01M15.5 10h.01M8.5 14.5c1.1 1 2.2 1.5 3.5 1.5s2.4-.5 3.5-1.5"/></svg>
        </button>
        <div class="community2-input-shell">
          <textarea id="community2ThreadInput" rows="1" maxlength="4000" placeholder="Введите сообщение"></textarea>
          <span id="community2VoiceTimer" class="community2-voice-timer hidden">00:00</span>
        </div>
        <button id="community2ThreadAction" type="button" class="community2-composer-action" data-mode="voice" title="Голосовое сообщение" aria-label="Голосовое сообщение">
          <span class="community2-action-send" aria-hidden="true">➤</span>
          <svg class="community2-action-mic" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v4M9 21h6"/></svg>
          <span class="community2-action-stop" aria-hidden="true"></span>
        </button>
        <div id="community2ThreadAttachmentMenu" class="community2-thread-attachment-menu hidden">
          <button type="button" data-thread-attach-kind="document">▣ Документ</button>
          <button type="button" data-thread-attach-kind="media">▧ Фото и видео</button>
          <button type="button" data-thread-attach-kind="camera">◉ Снять фото</button>
          <button type="button" data-thread-attach-kind="video-camera">▸ Записать видео</button>
          <button type="button" data-thread-attach-kind="audio">♫ Аудио</button>
        </div>
        <div id="community2ThreadEmojiPanel" class="community2-emoji-panel hidden" role="dialog" aria-label="Смайлы"></div>
      </form>
      <div id="community2ThreadStatus" class="community2-status hidden"></div>
    `;
    host.appendChild(workspace);

    if (!byId("community2ThreadContextMenu")) {
      const menu = document.createElement("div");
      menu.id = "community2ThreadContextMenu";
      menu.className = "message-context-menu community2-thread-context-menu hidden";
      const reactions = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
      const extended = (typeof BUILT_IN_EMOJIS !== "undefined" ? BUILT_IN_EMOJIS : reactions).slice(0, 90);
      menu.innerHTML = `
        <div class="quick-reaction-row">
          ${reactions.map((emoji) => `<button type="button" data-community2-thread-reaction="${emoji}">${emoji}</button>`).join("")}
          <button type="button" class="more-reaction-button" data-community2-thread-action="more-reactions" title="Другие реакции">⌄</button>
        </div>
        <div id="community2ThreadReactionGrid" class="community2-thread-reaction-grid hidden">
          ${extended.map((emoji) => `<button type="button" data-community2-thread-reaction="${emoji}">${emoji}</button>`).join("")}
        </div>
        <button type="button" data-community2-thread-action="reply"><span>↩</span><span>Ответить</span></button>
        <button type="button" data-community2-thread-action="edit"><span>✎</span><span>Редактировать</span></button>
        <button type="button" data-community2-thread-action="copy"><span>▣</span><span>Копировать</span></button>
        <button type="button" data-community2-thread-action="info"><span>ⓘ</span><span>Данные о сообщении</span></button>
        <button type="button" data-community2-thread-action="pin"><span>📌</span><span id="community2ThreadPinLabel">Закрепить сообщение</span></button>
        <button type="button" data-community2-thread-action="message-link"><span>↗</span><span>Копировать ссылку на сообщение</span></button>
        <button type="button" class="hidden" data-community2-thread-action="restore"><span>↶</span><span>Восстановить</span></button>
        <div class="message-context-divider"></div>
        <button type="button" class="message-delete-action" data-community2-thread-action="delete-me"><span>♲</span><span>Удалить у меня</span></button>
        <button type="button" class="message-delete-action" data-community2-thread-action="delete-everyone"><span>♲</span><span>Удалить у всех</span></button>
      `;
      document.body.appendChild(menu);
      menu.addEventListener("click", async (event) => {
        const reaction = event.target.closest("[data-community2-thread-reaction]")?.dataset.community2ThreadReaction;
        if (reaction) {
          const comment = community2.threadContextMessage;
          closeThreadContextMenu();
          await toggleThreadReaction(comment, reaction);
          return;
        }
        const action = event.target.closest("[data-community2-thread-action]")?.dataset.community2ThreadAction;
        if (!action) return;
        if (action === "more-reactions") {
          byId("community2ThreadReactionGrid")?.classList.toggle("hidden");
          return;
        }
        await handleThreadContextAction(action);
      });
    }

    byId("community2WorkspaceBack").addEventListener("click", closeWorkspace);
    byId("community2WorkspaceSource").addEventListener("click", openCurrentSource);
    byId("community2ThreadReplyCancel").addEventListener("click", clearThreadReply);
    byId("community2ThreadEditCancel").addEventListener("click", clearThreadEdit);
    byId("community2ThreadForm").addEventListener("submit", sendThreadComment);
    byId("community2ThreadAttach").addEventListener("click", toggleThreadAttachmentMenu);
    byId("community2ThreadFileInput").addEventListener("change", handleThreadFiles);
    byId("community2ThreadAttachmentMenu").addEventListener("click", (event) => {
      const kind = event.target.closest("[data-thread-attach-kind]")?.dataset.threadAttachKind;
      if (kind) chooseThreadAttachment(kind);
    });
    byId("community2ThreadEmoji").addEventListener("click", toggleThreadEmojiPanel);
    byId("community2ThreadAction").addEventListener("click", handleThreadAction);
    byId("community2ThreadInput").addEventListener("input", () => {
      resizeThreadInput();
      updateThreadComposerAction();
    });
    byId("community2ThreadInput").addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        byId("community2ThreadForm").requestSubmit();
      }
    });
    renderThreadEmojiPanel();
  }

  function showWorkspace(mode) {
    ensureDom();
    community2.mode = mode;
    community2.returnToSidebarAfterWorkspace =
      !messengerScreen.classList.contains("chat-open");
    messengerScreen.classList.add("chat-open");
    byId("community2Workspace").classList.remove("hidden");
    byId("community2Workspace").dataset.mode = mode;
  }

  function closeWorkspace() {
    byId("community2Workspace")?.classList.add("hidden");
    if (community2.returnToSidebarAfterWorkspace) {
      messengerScreen.classList.remove("chat-open");
    }
    community2.returnToSidebarAfterWorkspace = false;
    community2.mode = null;
    community2.thread = null;
    clearThreadReply();
    clearThreadEdit();
    closeThreadContextMenu();
    closeThreadAttachmentMenu();
  }

  function setComposerVisible(visible) {
    byId("community2ThreadForm")?.classList.toggle("hidden", !visible);
    if (!visible) {
      clearThreadReply();
      clearThreadEdit();
      closeThreadEmojiPanel();
      cancelVoiceRecording();
    }
    updateThreadComposerAction();
  }

  function showStatus(text = "", action = null) {
    const status = byId("community2ThreadStatus");
    if (!status) return;
    status.classList.toggle("hidden", !text && !action);
    status.innerHTML = text ? `<span>${escapeHtml(text)}</span>` : "";
    if (action) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "community2-status-action";
      button.textContent = action.label;
      button.addEventListener("click", action.handler);
      status.appendChild(button);
    }
  }

  function clearThreadReply() {
    community2.threadReplyTo = null;
    byId("community2ThreadReplyBar")?.classList.add("hidden");
    if (byId("community2ThreadReplyText")) byId("community2ThreadReplyText").textContent = "";
  }

  function setThreadReply(comment) {
    clearThreadEdit();
    community2.threadReplyTo = comment;
    byId("community2ThreadReplyTitle").textContent = `Ответ: ${comment.sender_name || "Пользователь"}`;
    byId("community2ThreadReplyText").textContent = shortText(textPreview(comment), 100);
    byId("community2ThreadReplyBar").classList.remove("hidden");
    byId("community2ThreadInput").focus();
  }

  function pluralComments(value) {
    const number = Math.abs(Number(value || 0));
    const lastTwo = number % 100;
    const last = number % 10;
    if (lastTwo >= 11 && lastTwo <= 14) return "комментариев";
    if (last === 1) return "комментарий";
    if (last >= 2 && last <= 4) return "комментария";
    return "комментариев";
  }

  function recentRepliersMarkup(repliers) {
    const items = Array.isArray(repliers) ? repliers.slice(0, 3) : [];
    if (!items.length) return "";
    return `<span class="community2-recent-repliers">${items.map((item) => avatarMarkup(item.avatar_key || item.avatarKey, item.display_name || item.displayName, "community2-mini-avatar")).join("")}</span>`;
  }

  function renderThread() {
    const data = community2.thread;
    const body = byId("community2WorkspaceBody");
    if (!body || !data) return;

    byId("community2WorkspaceTitle").textContent = data.channelTitle || "Обсуждение";
    byId("community2WorkspaceSubtitle").textContent = `${Number(data.commentCount || 0)} ${pluralComments(data.commentCount)}`;
    byId("community2WorkspaceSource").classList.remove("hidden");

    const comments = Array.isArray(data.comments) ? data.comments : [];
    body.innerHTML = `
      <div class="community2-thread-source-wrap">
        ${sourceCardMarkup(data.sourceMessage, data.channelTitle || "Канал")}
        <div class="community2-thread-source-footer">
          <div>${recentRepliersMarkup(data.recentRepliers)}<span>${commentButtonText(data.commentCount)}</span></div>
          <div class="community2-thread-admin-tools">
            ${data.canManageDiscussion ? `<button type="button" class="${data.commentsEnabled === false ? 'comments-off' : ''}" data-community2-toggle-comments>${data.commentsEnabled === false ? '☐ Комментарии отключены' : '☑ Комментарии включены'}</button>` : ""}
            ${data.canManageDiscussion ? '<button type="button" data-community2-open-group>Управление группой</button>' : ""}
          </div>
        </div>
      </div>
      <div class="community2-comments-title">${comments.length ? "Комментарии" : "Комментариев пока нет"}</div>
      <div class="community2-comments-list">${comments.map(commentMarkup).join("")}</div>
    `;

    body.querySelector("[data-community2-open-group]")?.addEventListener("click", async () => {
      const { discussionChatId, discussionRootMessageId } = data;
      closeWorkspace();
      await openSearchMessageResult(discussionChatId, discussionRootMessageId);
    });

    body.querySelector("[data-community2-toggle-comments]")?.addEventListener("click", async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      try {
        const result = await workspaceRequest(`/messages/${data.channelMessageId}/comments`, {
          method: "POST",
          body: JSON.stringify({ commentsEnabled: data.commentsEnabled === false }),
        });
        community2.thread = await request(`/channel-posts/${data.channelMessageId}/discussion`);
        community2.thread.commentsEnabled = result.commentsEnabled !== false;
        renderThread();
      } catch (error) { showStatus(error.message); }
      finally { button.disabled = false; }
    });

    bindCommunity2Media(body);
    loadThreadPinnedMessage().catch(() => {});

    const canComment = data.canComment === true && data.commentsEnabled !== false;
    setComposerVisible(canComment);
    const input = byId("community2ThreadInput");
    input.disabled = !canComment;
    byId("community2ThreadAttach").disabled = !canComment;
    byId("community2ThreadEmoji").disabled = !canComment;
    byId("community2ThreadAction").disabled = !canComment;
    updateThreadComposerAction();

    if (data.commentsEnabled === false) {
      showStatus("Комментарии к этой публикации отключены.");
    } else if (data.requiresJoin) {
      showStatus("Для комментария нужно присоединиться к пространству обсуждения.", {
        label: "Присоединиться",
        handler: joinCurrentDiscussion,
      });
    } else if (!canComment) {
      showStatus("Комментарии для вас недоступны.");
    } else {
      showStatus();
    }
  }

  function focusThreadMessage(messageId) {
    if (!messageId) return;
    const target = byId("community2WorkspaceBody")?.querySelector(
      `[data-community2-comment-id="${CSS.escape(messageId)}"]`,
    );
    if (!target) return;
    target.scrollIntoView({ block: "center", behavior: "smooth" });
    target.classList.add("community2-focus");
    setTimeout(() => target.classList.remove("community2-focus"), 1800);
  }

  async function openCurrentSource() {
    const data = community2.thread;
    if (!data) return;
    closeWorkspace();
    await openSearchMessageResult(data.channelId, data.channelMessageId);
  }

  async function openThread(channelMessageId, focusMessageId = null) {
    if (!channelMessageId || community2.threadLoading) return;

    showWorkspace("thread");
    community2.threadLoading = true;
    community2.thread = null;
    clearThreadReply();
    clearThreadEdit();
    setComposerVisible(false);
    showStatus();
    byId("community2WorkspaceTitle").textContent = "Обсуждение";
    byId("community2WorkspaceSubtitle").textContent = "Загружаем…";
    byId("community2WorkspaceSource").classList.add("hidden");
    byId("community2WorkspaceBody").innerHTML = '<div class="community2-loading">Загружаем обсуждение…</div>';

    try {
      community2.thread = await request(`/channel-posts/${channelMessageId}/discussion`);
      renderThread();
      updateThreadCountEverywhere(
        community2.thread.channelMessageId,
        community2.thread.commentCount,
        community2.thread,
      );
      if (focusMessageId) requestAnimationFrame(() => focusThreadMessage(focusMessageId));
    } catch (error) {
      byId("community2WorkspaceBody").innerHTML = `<div class="community2-empty"><strong>Обсуждение недоступно</strong><span>${escapeHtml(error.message)}</span></div>`;
    } finally {
      community2.threadLoading = false;
    }
  }

  async function joinCurrentDiscussion() {
    const data = community2.thread;
    if (!data) return;
    showStatus("Присоединяем…");
    try {
      await request(`/channel-posts/${data.channelMessageId}/join-discussion`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      await loadDiscussionSpaces(true);
      community2.thread = await request(`/channel-posts/${data.channelMessageId}/discussion`);
      renderThread();
      byId("community2ThreadInput")?.focus();
    } catch (error) {
      showStatus(error.message);
    }
  }

  function closeThreadAttachmentMenu() {
    byId("community2ThreadAttachmentMenu")?.classList.add("hidden");
    byId("community2ThreadAttach")?.classList.remove("active");
  }

  function toggleThreadAttachmentMenu() {
    if (community2.composerBusy || community2.thread?.canComment !== true) return;
    const menu = byId("community2ThreadAttachmentMenu");
    const opening = menu?.classList.contains("hidden");
    menu?.classList.toggle("hidden", !opening);
    byId("community2ThreadAttach")?.classList.toggle("active", Boolean(opening));
    closeThreadEmojiPanel();
  }

  function chooseThreadAttachment(kind) {
    const input = byId("community2ThreadFileInput");
    if (!input) return;
    community2.attachmentMode = kind;
    input.multiple = kind === "media" || kind === "document";
    input.removeAttribute("capture");
    if (kind === "document") input.accept = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.7z,*/*";
    if (kind === "media") input.accept = "image/*,video/*";
    if (kind === "camera") { input.accept = "image/*"; input.setAttribute("capture", "environment"); }
    if (kind === "video-camera") { input.accept = "video/*"; input.setAttribute("capture", "environment"); }
    if (kind === "audio") input.accept = "audio/*";
    closeThreadAttachmentMenu();
    input.click();
  }

  function composerReplyToId() {
    return community2.threadReplyTo?.id || community2.thread?.discussionRootMessageId;
  }

  function resizeThreadInput() {
    const input = byId("community2ThreadInput");
    if (!input) return;
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 132)}px`;
  }

  function updateThreadComposerAction() {
    const action = byId("community2ThreadAction");
    const input = byId("community2ThreadInput");
    if (!action || !input) return;
    const recording = Boolean(community2.voice?.recorder && community2.voice.recorder.state === "recording");
    const hasText = Boolean(input.value.trim());
    const editing = Boolean(community2.threadEditMessage);
    action.dataset.mode = recording ? "stop" : (hasText || editing) ? "send" : "voice";
    action.title = recording ? "Остановить запись" : (hasText || editing) ? "Сохранить/отправить" : "Голосовое сообщение";
    action.setAttribute("aria-label", action.title);
  }

  function setThreadComposerBusy(busy, label = "") {
    community2.composerBusy = busy;
    const allowed = community2.thread?.canComment === true && community2.thread?.commentsEnabled !== false;
    const controls = ["community2ThreadAttach", "community2ThreadEmoji", "community2ThreadAction", "community2ThreadInput"];
    controls.forEach((id) => {
      const element = byId(id);
      if (element) element.disabled = busy || !allowed;
    });
    byId("community2ThreadForm")?.classList.toggle("is-busy", busy);
    if (label) showStatus(label);
    updateThreadComposerAction();
  }

  function closeThreadEmojiPanel() {
    byId("community2ThreadEmojiPanel")?.classList.add("hidden");
    byId("community2ThreadEmoji")?.classList.remove("active");
  }

  function toggleThreadEmojiPanel() {
    if (community2.composerBusy) return;
    const panel = byId("community2ThreadEmojiPanel");
    if (!panel) return;
    const opening = panel.classList.contains("hidden");
    panel.classList.toggle("hidden", !opening);
    byId("community2ThreadEmoji")?.classList.toggle("active", opening);
  }

  function renderThreadEmojiPanel() {
    const panel = byId("community2ThreadEmojiPanel");
    if (!panel || panel.childElementCount) return;
    const emojis = [
      "😀", "😃", "😄", "😁", "😂", "🤣", "😊", "😍", "🥰", "😘",
      "😎", "🤔", "😢", "😭", "😡", "🤯", "👍", "👎", "👏", "🙏",
      "💪", "🤝", "❤️", "🔥", "🎉", "✅", "❌", "⭐", "🚀", "💯",
      "👀", "🤩", "😅", "🙌", "👌", "🤦", "🤷", "💬", "📌", "🎮",
    ];
    panel.innerHTML = emojis.map((emoji) => `<button type="button" data-community2-emoji="${emoji}">${emoji}</button>`).join("");
    panel.querySelectorAll("[data-community2-emoji]").forEach((button) => {
      button.addEventListener("click", () => insertThreadEmoji(button.dataset.community2Emoji));
    });
  }

  function insertThreadEmoji(emoji) {
    const input = byId("community2ThreadInput");
    if (!input) return;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    input.setRangeText(emoji, start, end, "end");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.focus();
  }

  async function refreshThreadAfterSend(created) {
    const channelMessageId = community2.thread?.channelMessageId;
    if (!channelMessageId) return;
    community2.thread = await request(`/channel-posts/${channelMessageId}/discussion`);
    renderThread();
    requestAnimationFrame(() => focusThreadMessage(created?.id));
  }

  async function sendThreadComment(event) {
    event.preventDefault();
    const data = community2.thread;
    const input = byId("community2ThreadInput");
    const text = input.value.trim();
    if (!data || community2.composerBusy) return;

    const editing = community2.threadEditMessage;
    if (editing) {
      if (!text && !editing.media_key) {
        showStatus("Текст сообщения не может быть пустым");
        return;
      }
      setThreadComposerBusy(true, "Сохраняем изменения…");
      try {
        const updated = await request(`/channel-posts/${data.channelMessageId}/comments/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify({ text }),
        });
        const index = data.comments.findIndex((item) => item.id === editing.id);
        if (index >= 0) data.comments[index] = { ...data.comments[index], ...updated };
        input.value = "";
        clearThreadEdit();
        resizeThreadInput();
        renderThread();
      } catch (error) {
        showStatus(error.message);
      } finally {
        setThreadComposerBusy(false);
      }
      return;
    }

    if (!text) return;
    const replyToId = composerReplyToId();
    setThreadComposerBusy(true, "Отправляем комментарий…");
    closeThreadEmojiPanel();

    try {
      const created = await request(`/channel-posts/${data.channelMessageId}/comments`, {
        method: "POST",
        body: JSON.stringify({ kind: "text", text, replyToId }),
      });
      input.value = "";
      resizeThreadInput();
      clearThreadReply();
      await refreshThreadAfterSend(created);
      if (typeof playAppSound === "function") playAppSound("send");
    } catch (error) {
      showStatus(error.message);
    } finally {
      setThreadComposerBusy(false);
    }
  }

  function uploadKind(file, requested = null) {
    if (requested) return requested;
    const type = String(file.type || "").toLowerCase();
    if (type === "image/gif") return "gif";
    if (type.startsWith("image/")) return "image";
    if (type.startsWith("video/")) return "video";
    if (type.startsWith("audio/")) return requested === "voice" ? "voice" : "file";
    return "file";
  }

  function parseApiError(payload, fallback) {
    if (typeof payload?.message === "string") return payload.message;
    if (typeof payload?.error === "string") return payload.error;
    if (typeof payload?.message?.message === "string") return payload.message.message;
    return fallback;
  }

  function imageSize(file) {
    if (!String(file.type || "").startsWith("image/")) return Promise.resolve({});
    return new Promise((resolve) => {
      const image = new Image();
      const url = URL.createObjectURL(file);
      image.onload = () => {
        const result = { width: image.naturalWidth || undefined, height: image.naturalHeight || undefined };
        URL.revokeObjectURL(url);
        resolve(result);
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({});
      };
      image.src = url;
    });
  }

  async function uploadThreadComment(file, options = {}) {
    const data = community2.thread;
    if (!data) throw new Error("Обсуждение не открыто");
    const dimensions = await imageSize(file);
    const form = new FormData();
    form.append("file", file, file.name || options.fileName || "file");
    form.append("kind", uploadKind(file, options.kind));
    form.append("replyToId", options.replyToId || composerReplyToId());
    if (options.text) form.append("text", options.text);
    if (options.durationMs) form.append("durationMs", String(options.durationMs));
    if (Array.isArray(options.waveform)) form.append("waveform", JSON.stringify(options.waveform));
    if (dimensions.width) form.append("width", String(dimensions.width));
    if (dimensions.height) form.append("height", String(dimensions.height));

    const response = await fetch(`/api/channel-posts/${encodeURIComponent(data.channelMessageId)}/comments/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${state.token}` },
      body: form,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(parseApiError(payload, `Ошибка загрузки: HTTP ${response.status}`));
    return payload;
  }

  async function handleThreadFiles(event) {
    const input = event.currentTarget;
    const files = Array.from(input.files || []);
    input.value = "";
    if (!files.length || community2.composerBusy) return;
    if (community2.threadEditMessage) {
      showStatus("Сначала завершите редактирование сообщения.");
      return;
    }

    const replyToId = composerReplyToId();
    const caption = byId("community2ThreadInput").value.trim();
    setThreadComposerBusy(true, files.length > 1 ? `Загружаем файлы: 0/${files.length}` : `Загружаем ${files[0].name}…`);
    closeThreadEmojiPanel();
    let lastCreated = null;

    try {
      for (let index = 0; index < files.length; index += 1) {
        showStatus(files.length > 1 ? `Загружаем файлы: ${index + 1}/${files.length}` : `Загружаем ${files[index].name}…`);
        lastCreated = await uploadThreadComment(files[index], {
          replyToId,
          text: index === 0 ? caption : "",
          kind: community2.attachmentMode === "audio" ? "file" : null,
        });
      }
      byId("community2ThreadInput").value = "";
      resizeThreadInput();
      clearThreadReply();
      await refreshThreadAfterSend(lastCreated);
      if (typeof playAppSound === "function") playAppSound("send");
    } catch (error) {
      showStatus(error.message);
    } finally {
      setThreadComposerBusy(false);
    }
  }

  function formatVoiceTimer(milliseconds) {
    const seconds = Math.max(0, Math.floor(milliseconds / 1000));
    return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  }

  function supportedVoiceMimeType() {
    const candidates = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/webm"];
    return candidates.find((type) => window.MediaRecorder?.isTypeSupported?.(type)) || "";
  }

  async function startVoiceRecording() {
    if (community2.composerBusy || community2.voice || community2.threadEditMessage) return;
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      showStatus("Запись голосовых не поддерживается этим браузером.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = supportedVoiceMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 256000 } : undefined);
      const chunks = [];
      const waveform = [];
      const startedAt = Date.now();
      let audioContext = null;
      let analyser = null;
      let source = null;
      try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
      } catch {
        audioContext = null;
      }

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data?.size) chunks.push(event.data);
      });
      let shouldSend = true;
      recorder.addEventListener("stop", () => {
        if (!shouldSend) return;
        finishVoiceRecording({
          chunks,
          mimeType: recorder.mimeType || mimeType || "audio/webm",
          durationMs: Date.now() - startedAt,
          waveform,
        });
      });
      recorder.start(250);

      const timer = setInterval(() => {
        const elapsed = Date.now() - startedAt;
        const timerNode = byId("community2VoiceTimer");
        if (timerNode) timerNode.textContent = formatVoiceTimer(elapsed);
        if (analyser && waveform.length < 100) {
          const values = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteTimeDomainData(values);
          const average = values.reduce((sum, value) => sum + Math.abs(value - 128), 0) / values.length;
          waveform.push(Math.max(1, Math.min(31, Math.round(average / 2.6))));
        }
      }, 180);

      community2.voice = {
        recorder, stream, timer, audioContext, source, startedAt,
        cancel: () => { shouldSend = false; },
      };
      byId("community2ThreadForm")?.classList.add("is-recording");
      byId("community2VoiceTimer")?.classList.remove("hidden");
      byId("community2ThreadInput").placeholder = "Идёт запись голосового…";
      byId("community2ThreadInput").disabled = true;
      closeThreadEmojiPanel();
      updateThreadComposerAction();
    } catch (error) {
      showStatus(error?.name === "NotAllowedError" ? "Разрешите доступ к микрофону." : "Не удалось начать запись голосового.");
    }
  }

  function stopVoiceRecording() {
    const voice = community2.voice;
    if (!voice?.recorder || voice.recorder.state !== "recording") return;
    clearInterval(voice.timer);
    voice.recorder.stop();
    voice.stream.getTracks().forEach((track) => track.stop());
    voice.audioContext?.close?.().catch(() => {});
    community2.voice = null;
    byId("community2ThreadForm")?.classList.remove("is-recording");
    byId("community2VoiceTimer")?.classList.add("hidden");
    byId("community2ThreadInput").placeholder = "Введите сообщение";
    byId("community2ThreadInput").disabled = false;
    updateThreadComposerAction();
  }

  function cancelVoiceRecording() {
    const voice = community2.voice;
    if (!voice) return;
    clearInterval(voice.timer);
    voice.cancel?.();
    try {
      if (voice.recorder.state === "recording") voice.recorder.stop();
    } catch {}
    voice.stream?.getTracks?.().forEach((track) => track.stop());
    voice.audioContext?.close?.().catch(() => {});
    community2.voice = null;
    byId("community2ThreadForm")?.classList.remove("is-recording");
    byId("community2VoiceTimer")?.classList.add("hidden");
    const input = byId("community2ThreadInput");
    if (input) {
      input.placeholder = "Введите сообщение";
      input.disabled = community2.thread?.canComment !== true;
    }
    updateThreadComposerAction();
  }

  async function finishVoiceRecording(recording) {
    if (!recording.chunks.length) {
      showStatus("Голосовое сообщение не записалось.");
      return;
    }
    const extension = recording.mimeType.includes("ogg") ? "ogg" : "webm";
    const blob = new Blob(recording.chunks, { type: recording.mimeType });
    const file = new File([blob], `voice-${Date.now()}.${extension}`, { type: recording.mimeType });
    setThreadComposerBusy(true, "Отправляем голосовое…");
    try {
      const created = await uploadThreadComment(file, {
        kind: "voice",
        durationMs: recording.durationMs,
        waveform: recording.waveform,
      });
      clearThreadReply();
      await refreshThreadAfterSend(created);
      if (typeof playAppSound === "function") playAppSound("send");
    } catch (error) {
      showStatus(error.message);
    } finally {
      setThreadComposerBusy(false);
    }
  }

  function handleThreadAction() {
    const action = byId("community2ThreadAction");
    if (!action || community2.composerBusy) return;
    if (action.dataset.mode === "stop") {
      stopVoiceRecording();
    } else if (action.dataset.mode === "send") {
      byId("community2ThreadForm").requestSubmit();
    } else {
      startVoiceRecording();
    }
  }

  function commentButtonText(count) {
    const value = Number(count || 0);
    return value > 0 ? `${value} ${pluralComments(value)}` : "Прокомментировать";
  }

  function decorateChannelDiscussionMessage(row, message) {
    if (!row || !message || isDeletedForEveryone(message)) return;
    const bubble = row.querySelector(".message-bubble");
    if (!bubble) return;

    const meta = threadMeta(message);
    const active = state.activeChat;
    const linkedChannelSource =
      active?.type === "channel" &&
      Boolean(active?.linked_chat_id) &&
      (!meta || meta.autoForwarded !== true);

    if (linkedChannelSource) {
      let bar = bubble.querySelector(".channel-comment-bar");
      if (!bar) {
        bar = document.createElement("div");
        bar.className = "channel-comment-bar";
        bar.innerHTML = `
          <button type="button" class="channel-comment-button">
            <span class="channel-comment-main">
              <span class="community2-comment-empty-avatar" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M5 5.5h14v10H9l-4 3v-13Z"/></svg>
              </span>
              <span class="community2-channel-repliers" data-channel-repliers></span>
              <span data-channel-comment-label></span>
              <span class="channel-comment-dot" aria-hidden="true"></span>
            </span>
            <span class="channel-comment-arrow" aria-hidden="true">›</span>
          </button>
        `;
        bubble.appendChild(bar);
        bar.querySelector("button").addEventListener("click", () => openThread(message.id));
      }
      bar.dataset.channelMessageId = message.id;
      const initialCount = Number(meta?.replyCount || 0);
      bar.dataset.commentCount = String(initialCount);
      bar.classList.toggle("has-comments", initialCount > 0);
      bar.querySelector("[data-channel-comment-label]").textContent = commentButtonText(initialCount);
      const repliers = bar.querySelector("[data-channel-repliers]");
      const recent = meta?.recentRepliers || [];
      if (repliers) repliers.innerHTML = recentRepliersMarkup(recent);
      bar.classList.toggle("has-repliers", Array.isArray(recent) && recent.length > 0);
    }

    if (message.auto_forwarded === true || meta?.autoForwarded === true) {
      let origin = bubble.querySelector(".channel-origin-card");
      if (!origin) {
        origin = document.createElement("div");
        origin.className = "channel-origin-card";
        origin.innerHTML = `
          <div>
            <strong data-channel-origin-title>Переслано из канала</strong>
            <span data-channel-root-count></span>
          </div>
          <button type="button">Открыть публикацию</button>
        `;
        bubble.prepend(origin);
        origin.querySelector("button").addEventListener("click", () => {
          openSearchMessageResult(meta.channelId, meta.channelMessageId);
        });
      }
      origin.querySelector("[data-channel-origin-title]").textContent = meta?.channelTitle ? `Переслано из ${meta.channelTitle}` : "Переслано из канала";
      origin.querySelector("[data-channel-root-count]").textContent = commentButtonText(meta?.replyCount || 0);
    }
  }

  function updateThreadCountEverywhere(channelMessageId, count, details = null) {
    const normalized = Number(count || 0);
    const activeMessage = state.activeMessages.find(
      (item) => item.id === channelMessageId || threadMeta(item)?.channelMessageId === channelMessageId,
    );

    if (activeMessage) {
      const current = threadMeta(activeMessage) || {};
      activeMessage.metadata = {
        ...(activeMessage.metadata || {}),
        telegramDiscussion: {
          ...current,
          ...(details || {}),
          channelMessageId,
          replyCount: normalized,
          recentRepliers: details?.recentRepliers || current.recentRepliers || [],
        },
      };
    }

    document.querySelectorAll(`.channel-comment-bar[data-channel-message-id="${CSS.escape(channelMessageId)}"]`).forEach((bar) => {
      bar.dataset.commentCount = String(normalized);
      bar.classList.toggle("has-comments", normalized > 0);
      const label = bar.querySelector("[data-channel-comment-label]");
      if (label) label.textContent = commentButtonText(normalized);
      const repliers = bar.querySelector("[data-channel-repliers]");
      if (repliers && details?.recentRepliers) repliers.innerHTML = recentRepliersMarkup(details.recentRepliers);
      const recent = details?.recentRepliers || [];
      if (details?.recentRepliers) bar.classList.toggle("has-repliers", recent.length > 0);
    });
  }

  function repliesShortcutMarkup() {
    const unread = Number(community2.unreadReplies || 0);
    return `
      <button id="community2RepliesShortcut" type="button" class="chat-item community2-replies-shortcut ${unread ? "has-unread" : ""}">
        <span class="community2-replies-icon" aria-hidden="true">↩</span>
        <span class="chat-item-content">
          <span class="chat-item-line"><strong class="chat-name">Ответы</strong></span>
          <span class="chat-preview-line">
            <span class="chat-preview">Прямые ответы в обсуждениях</span>
            ${unread ? `<span class="chat-unread-badge">${unread > 99 ? "99+" : unread}</span>` : ""}
          </span>
        </span>
      </button>
    `;
  }

  function renderRepliesShortcut() {
    if (!chatList || state.sidebarMode !== "chats") return;
    chatList.querySelector("#community2RepliesShortcutRow")?.remove();
    const row = document.createElement("div");
    row.id = "community2RepliesShortcutRow";
    row.className = "sidebar-list-row community2-replies-row";
    row.innerHTML = repliesShortcutMarkup();
    chatList.prepend(row);
    row.querySelector("#community2RepliesShortcut").addEventListener("click", openReplies);
  }

  function quotedReplyMarkup(item) {
    const quote = shortText(
      item.quotedText || item.quotedFileName || ({ image: "Фото", video: "Видео", voice: "Голосовое сообщение", file: "Файл" }[item.quotedKind]) || "Ваш комментарий",
      180,
    );
    return `
      <div class="community2-reply-quote">
        <strong>${escapeHtml(item.quotedSenderName || "Ваш комментарий")}</strong>
        <span>${escapeHtml(quote)}</span>
      </div>
    `;
  }

  function replyItemMarkup(item) {
    const role = formatRole(item.senderRole);
    const preview = shortText(item.text || item.fileName || textPreview(item), 260);
    const source = shortText(item.sourceText || "Публикация канала", 150);
    return `
      <article class="community2-reply-item ${item.unread ? "unread" : ""}" data-community2-reply-id="${item.id}">
        <div class="community2-reply-head">
          <div class="community2-comment-author">
            ${avatarMarkup(item.senderAvatarKey, item.senderName)}
            <strong>${escapeHtml(item.senderName || "Пользователь")}</strong>
            ${role ? `<span>${escapeHtml(role)}</span>` : ""}
          </div>
          <time>${escapeHtml(formatTime(item.createdAt))}</time>
        </div>
        ${quotedReplyMarkup(item)}
        <div class="community2-reply-text">${escapeHtml(preview)}</div>
        <div class="community2-reply-source">
          <strong>${escapeHtml(item.channelTitle || "Канал")}</strong>
          <span>${escapeHtml(source)}</span>
        </div>
        <button type="button" class="community2-view-thread">Посмотреть в чате</button>
      </article>
    `;
  }

  function renderReplies() {
    const body = byId("community2WorkspaceBody");
    if (!body) return;
    byId("community2WorkspaceTitle").textContent = "Ответы";
    byId("community2WorkspaceSubtitle").textContent = "Прямые ответы на ваши комментарии";
    byId("community2WorkspaceSource").classList.add("hidden");
    setComposerVisible(false);
    showStatus();

    if (!community2.replies.length) {
      body.innerHTML = '<div class="community2-empty"><strong>Ответов пока нет</strong><span>Здесь появятся прямые ответы на ваши комментарии под публикациями каналов.</span></div>';
      return;
    }

    body.innerHTML = `<div class="community2-replies-list">${community2.replies.map(replyItemMarkup).join("")}</div>`;
    body.querySelectorAll("[data-community2-reply-id]").forEach((row) => {
      const item = community2.replies.find((entry) => entry.id === row.dataset.community2ReplyId);
      if (!item) return;
      row.querySelector(".community2-view-thread").addEventListener("click", () => openThread(item.channelMessageId, item.id));
    });
  }

  async function loadReplies({ markRead = false } = {}) {
    if (!state.token) return;
    try {
      const result = await request("/replies?limit=100");
      community2.replies = Array.isArray(result.items) ? result.items : [];
      community2.unreadReplies = Number(result.unreadCount || 0);
      renderRepliesShortcut();
      if (community2.mode === "replies") renderReplies();

      if (markRead && community2.unreadReplies > 0) {
        const readResult = await request("/replies/read", {
          method: "POST",
          body: JSON.stringify({
            replyMessageIds: community2.replies.filter((item) => item.unread).map((item) => item.id),
          }),
        });
        community2.unreadReplies = Number(readResult.unreadCount || 0);
        community2.replies = community2.replies.map((item) => ({ ...item, unread: false }));
        renderRepliesShortcut();
        if (community2.mode === "replies") renderReplies();
      }
    } catch (error) {
      console.warn("Unable to load thread replies", error);
    }
  }

  async function openReplies() {
    showWorkspace("replies");
    byId("community2WorkspaceTitle").textContent = "Ответы";
    byId("community2WorkspaceSubtitle").textContent = "Загружаем…";
    byId("community2WorkspaceSource").classList.add("hidden");
    setComposerVisible(false);
    showStatus();
    byId("community2WorkspaceBody").innerHTML = '<div class="community2-loading">Загружаем ответы…</div>';
    await loadReplies({ markRead: true });
    renderReplies();
  }

  async function loadDiscussionSpaces(force = false) {
    if (!state.token) return;
    if (community2.spacesLoading && !force) return community2.spacesLoading;
    if (community2.spacesLoaded && !force) return;

    community2.spacesLoading = (async () => {
      try {
        const result = await request("/discussion-spaces");
        community2.spaces = new Map(
          (Array.isArray(result.items) ? result.items : []).map((item) => [item.discussionChatId, item]),
        );
        community2.spacesLoaded = true;
        removeHiddenDiscussionRows();
      } catch (error) {
        console.warn("Unable to load discussion spaces", error);
      } finally {
        community2.spacesLoading = null;
      }
    })();
    return community2.spacesLoading;
  }

  function hiddenDiscussionIds() {
    return new Set(
      [...community2.spaces.values()].filter((item) => item.hidden).map((item) => item.discussionChatId),
    );
  }

  function removeHiddenDiscussionRows() {
    if (!chatList) return;
    const hiddenIds = hiddenDiscussionIds();
    if (!hiddenIds.size) return;

    chatList.querySelectorAll("[data-chat-id]").forEach((element) => {
      if (!hiddenIds.has(element.dataset.chatId)) return;
      const row = element.closest(".sidebar-list-row, .chat-list-item, li") || element;
      row.remove();
    });
  }

  function renderChatsWithoutHiddenGroups(original, context, args) {
    const chats = Array.isArray(state.chats) ? state.chats : null;
    if (!community2.spacesLoaded) {
      const result = original.apply(context, args);
      removeHiddenDiscussionRows();
      return result;
    }

    const hidden = hiddenDiscussionIds();
    const filteredArgs = [...args];
    if (Array.isArray(filteredArgs[0])) {
      filteredArgs[0] = filteredArgs[0].filter((chat) => !hidden.has(chat.id));
    }

    if (!chats) {
      const result = original.apply(context, filteredArgs);
      removeHiddenDiscussionRows();
      return result;
    }

    state.chats = chats.filter((chat) => !hidden.has(chat.id));
    try {
      return original.apply(context, filteredArgs);
    } finally {
      state.chats = chats;
      removeHiddenDiscussionRows();
    }
  }

  function isHiddenDiscussionChat(chat) {
    return Boolean(chat?.id && community2.spaces.get(chat.id)?.hidden);
  }

  function scheduleRepliesRefresh() {
    clearTimeout(community2.refreshRepliesTimer);
    community2.refreshRepliesTimer = setTimeout(() => loadReplies(), 120);
  }

  function bindSocket() {
    const socket = state.socket;
    if (!socket || community2.socket === socket) return;
    community2.socket = socket;

    socket.on("telegram.thread.updated", (payload) => {
      updateThreadCountEverywhere(payload.channelMessageId, payload.replyCount, payload);
      if (community2.thread?.channelMessageId === payload.channelMessageId && !community2.threadLoading) {
        clearTimeout(community2.threadRefreshTimer);
        community2.threadRefreshTimer = setTimeout(async () => {
          try {
            community2.thread = await request(`/channel-posts/${payload.channelMessageId}/discussion`);
            renderThread();
          } catch {
            // Keep the current messenger screen available if refresh fails.
          }
        }, 120);
      }
    });

    socket.on("telegram.reply.new", (payload) => {
      const existing = community2.replies.findIndex((item) => item.id === payload.id);
      if (existing >= 0) community2.replies[existing] = payload;
      else community2.replies.unshift(payload);
      community2.unreadReplies += payload.unread ? 1 : 0;
      renderRepliesShortcut();
      if (community2.mode === "replies") renderReplies();
    });

    socket.on("message.deleted", ({ messageId }) => {
      if (community2.thread?.comments?.some((comment) => comment.id === messageId)) {
        openThread(community2.thread.channelMessageId);
      }
      scheduleRepliesRefresh();
    });

    socket.on("message.edited", (payload) => {
      const messageId = payload?.messageId || payload?.message?.id;
      if (community2.thread?.comments?.some((comment) => comment.id === messageId)) {
        openThread(community2.thread.channelMessageId, messageId);
      }
      scheduleRepliesRefresh();
    });

    socket.on("message.restored", (payload) => {
      const messageId = payload?.messageId || payload?.message?.id;
      if (community2.thread?.comments?.some((comment) => comment.id === messageId)) {
        openThread(community2.thread.channelMessageId, messageId);
      }
      scheduleRepliesRefresh();
    });

    socket.on("message.reaction", ({ messageId, reactions }) => {
      const comment = findThreadComment(messageId);
      if (!comment) return;
      comment.reactions = reactions;
      if (community2.mode === "thread") renderThread();
    });

    socket.on("message.receipt", ({ messageIds, status }) => {
      if (!Array.isArray(messageIds) || !community2.thread?.comments) return;
      let changed = false;
      community2.thread.comments.forEach((comment) => {
        if (messageIds.includes(comment.id)) {
          comment.receipt_status = advancedReceiptStatus(comment.receipt_status, status);
          changed = true;
        }
      });
      if (changed && community2.mode === "thread") renderThread();
    });

    socket.on("discussion.settings", () => {
      if (community2.thread?.channelMessageId) openThread(community2.thread.channelMessageId);
    });
  }

  async function openThreadDeepLink() {
    const query = new URLSearchParams(location.search);
    const postId = query.get("post");
    const commentId = query.get("comment");
    if (!postId) return false;
    try {
      await openThread(postId, commentId || null);
      history.replaceState({}, "", location.pathname || "/");
      return true;
    } catch { return false; }
  }

  function initialize() {
    ensureDom();
    bindSocket();
    loadDiscussionSpaces().then(() => {
      if (typeof renderChats === "function") renderChats();
      renderRepliesShortcut();
    });
    loadReplies();
    renderRepliesShortcut();
    setTimeout(() => openThreadDeepLink().catch(() => {}), 350);
    setInterval(() => {
      if (community2.mode === "thread" && community2.thread?.comments?.some(isDeletedComment)) {
        renderThread();
      }
    }, 1000);
    community2.initialized = true;
  }

  const originalShowMessenger = showMessenger;
  showMessenger = function community2ShowMessenger(...args) {
    const result = originalShowMessenger.apply(this, args);
    initialize();
    return result;
  };

  const originalConnectSocket = connectSocket;
  connectSocket = function community2ConnectSocket(...args) {
    const result = originalConnectSocket.apply(this, args);
    bindSocket();
    return result;
  };

  const originalRenderChats = renderChats;
  renderChats = function community2RenderChats(...args) {
    const result = renderChatsWithoutHiddenGroups(originalRenderChats, this, args);
    renderRepliesShortcut();
    return result;
  };

  const originalAppendMessage = appendMessage;
  appendMessage = function community2AppendMessage(message) {
    const result = originalAppendMessage(message);
    const row = messageArea.querySelector(`[data-message-id="${CSS.escape(message.id)}"]`);
    decorateChannelDiscussionMessage(row, message);
    return result;
  };

  const originalOpenChat = openChat;
  openChat = async function community2OpenChat(chat) {
    if (isHiddenDiscussionChat(chat)) return;
    closeWorkspace();
    return originalOpenChat(chat);
  };

  document.addEventListener("click", (event) => {
    if (!event.target.closest("#community2ThreadContextMenu, .community2-thread-message .message-menu-trigger")) {
      closeThreadContextMenu();
    }
    if (!event.target.closest("#community2ThreadEmojiPanel, #community2ThreadEmoji")) {
      closeThreadEmojiPanel();
    }
    if (!event.target.closest("#community2ThreadAttachmentMenu, #community2ThreadAttach")) {
      closeThreadAttachmentMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (community2.threadEditMessage) {
      clearThreadEdit();
      return;
    }
    if (!byId("community2ThreadEmojiPanel")?.classList.contains("hidden")) {
      closeThreadEmojiPanel();
      return;
    }
    if (community2.mode) closeWorkspace();
  });

  window.MeetusTelegramDiscussions = {
    openThread,
    openReplies,
    refreshReplies: loadReplies,
    refreshSpaces: () => loadDiscussionSpaces(true),
    openThreadDeepLink,
  };
})();
