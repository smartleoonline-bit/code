/* MEETUS 0.6.25.2 COMMUNITY2-TG11-WORKSPACE1 — STABLE CAMERA QUALITY */
(() => {
  "use strict";

  const LK = window.LivekitClient;
  if (!LK) {
    console.error("LiveKit client is not loaded");
    return;
  }

  const callState = {
    room: null,
    call: null,
    role: null,
    canPublish: false,
    muted: false,
    camera: false,
    screen: false,
    hand: false,
    minimized: false,
    sideTab: null,
    boundSocket: null,
    ringTimer: null,
    ringAudio: null,
    ringGapTimer: null,
    terminalTimer: null,
    noAnswerTimer: null,
    activeCheck: 0,
    cameraQualityTier: null,
    cameraAdaptTimer: null,
    networkQuality: "unknown",
    primaryMediaKey: null,
    primaryUserSelected: false,
    pipPosition: null,
    chatOrderHooked: false,
    chatMessages: [],
    history: [],
    historyLoading: false,
    sidebarInjected: false,
    groupGalleryMode: true,
    endingLocally: false,
    inviteLoading: false,
    inviteContacts: [],
    inviteQuery: "",
    manualCameraTier: "auto",
    lastAutoDowngradeAt: 0,
  };

  const svg = {
    phone: '<svg viewBox="0 0 24 24"><path d="M7 3h3l2 5-2 2a15 15 0 0 0 4 4l2-2 5 2v3a3 3 0 0 1-3 3C10 19 5 14 4 6a3 3 0 0 1 3-3Z"/></svg>',
    video: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3z"/></svg>',
    mic: '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/></svg>',
    screen: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 22h8M12 18v4M8 10l4-4 4 4M12 6v8"/></svg>',
    users: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="10" r="2.5"/><path d="M3 20a6 6 0 0 1 12 0M14 20a5 5 0 0 1 7 0"/></svg>',
    chat: '<svg viewBox="0 0 24 24"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></svg>',
    hand: '<svg viewBox="0 0 24 24"><path d="M6 12V6a2 2 0 0 1 4 0v5M10 10V4a2 2 0 0 1 4 0v7M14 10V5a2 2 0 0 1 4 0v8M18 11a2 2 0 0 1 4 0v4c0 4-3 7-7 7h-2c-3 0-5-1-7-4l-3-4a2 2 0 0 1 3-2Z"/></svg>',
    end: '<svg viewBox="0 0 24 24"><path d="M4 15c4-4 12-4 16 0M7 12l-2 5M17 12l2 5"/></svg>',
    minimize: '<svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg>',
    expand: '<svg viewBox="0 0 24 24"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="m7 7 10 10M17 7 7 17"/></svg>',
    send: '<svg viewBox="0 0 24 24"><path d="m3 11 18-8-8 18-2-8-8-2Z"/></svg>',
    fullscreen: '<svg viewBox="0 0 24 24"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/></svg>',
    incoming: '<svg viewBox="0 0 24 24"><path d="M7 17 17 7M10 7h7v7"/></svg>',
    outgoing: '<svg viewBox="0 0 24 24"><path d="M17 7 7 17M7 10v7h7"/></svg>',
    missed: '<svg viewBox="0 0 24 24"><path d="M7 7l10 10M17 7 7 17"/></svg>',
    grid: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    addUser: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M18 8v6M15 11h6"/></svg>',
  };

  function api(path, method = "GET", body) {
    return request(path, {
      method,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  }

  function currentUserId() {
    return state.user?.id || state.user?.sub;
  }

  function initials(name) {
    return String(name || "?")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "?";
  }

  function displayNameFromCall(call) {
    if (call?.chat?.type === "private" || call?.mode === "private") {
      const peer = privatePeerFromCall(call);
      return peer?.displayName || "Звонок";
    }
    return call?.chat?.title || (call?.mode === "stage" ? "Трансляция" : "Групповой звонок");
  }

  function normalizeCallPerson(person) {
    if (!person) return null;
    return {
      id: person.id || person.user_id || null,
      displayName: person.displayName || person.display_name || person.name || "Участник",
      avatarKey: person.avatarKey || person.avatar_key || null,
      role: person.role || "participant",
    };
  }

  function privatePeerFromCall(call) {
    if (!call) return null;
    const participant = (call.participants || []).find((item) => (item.user_id || item.id) !== currentUserId());
    if (participant) return normalizeCallPerson(participant);
    if (call.creator && call.creator.id !== currentUserId()) return normalizeCallPerson(call.creator);
    const activePeer = state.activeChat?.peer;
    if (activePeer) return normalizeCallPerson(activePeer);
    return null;
  }

  function callAvatarUrl(key) {
    if (!key) return "";
    if (typeof window.avatarUrl === "function") return window.avatarUrl(key);
    if (typeof avatarUrl === "function") return avatarUrl(key);
    return `/api/media/${encodeURIComponent(key)}`;
  }

  function avatarInner(name, key) {
    const letters = `<span>${escapeHtml(initials(name))}</span>`;
    if (!key) return letters;
    return `${letters}<img src="${escapeHtml(callAvatarUrl(key))}" alt="${escapeHtml(name || "Пользователь")}" loading="eager">`;
  }

  function setCallAvatarElement(element, name, key) {
    if (!element) return;
    element.innerHTML = avatarInner(name, key);
    element.classList.toggle("has-avatar-image", Boolean(key));
    const image = element.querySelector("img");
    image?.addEventListener("error", () => {
      image.remove();
      element.classList.remove("has-avatar-image");
    }, { once: true });
  }

  function callParticipantRecord(userId) {
    return (callState.call?.participants || []).find((item) => (item.user_id || item.id) === userId) || null;
  }

  function ensurePrivatePeerTile(call) {
    if (!call || (call.mode !== "private" && call.chat?.type !== "private")) return null;
    const peer = privatePeerFromCall(call);
    if (!peer?.id) return null;
    return ensureMediaTile(peer.id, peer.displayName, peer.role, false, "camera", peer.avatarKey);
  }

  function toast(text) {
    document.querySelector(".meetus-call-toast")?.remove();
    const node = document.createElement("div");
    node.className = "meetus-call-toast";
    node.textContent = text;
    document.body.append(node);
    setTimeout(() => node.remove(), 3200);
  }

  function injectDom() {
    if (document.getElementById("meetusCallShell")) return;
    document.body.insertAdjacentHTML("beforeend", `
      <div id="meetusCallChooser" class="meetus-call-modal meetus-call-hidden">
        <div class="meetus-call-card">
          <div class="meetus-call-card-head"><h3 id="meetusCallChooserTitle">Начать звонок</h3><p id="meetusCallChooserText"></p></div>
          <div id="meetusCallChoices" class="meetus-call-choice-list"></div>
          <button id="meetusCallChooserClose" class="meetus-call-card-close" type="button">Отмена</button>
        </div>
      </div>
      <div id="meetusCallInviteModal" class="meetus-call-modal meetus-call-hidden">
        <div class="meetus-call-card meetus-call-invite-card">
          <div class="meetus-call-card-head"><h3>Добавить участников</h3><p>Выберите контакты, которых нужно пригласить в текущий звонок.</p></div>
          <label class="meetus-call-invite-search">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></svg>
            <input id="meetusCallInviteSearch" type="search" autocomplete="off" placeholder="Поиск по имени, @username или номеру">
          </label>
          <div id="meetusCallInviteCount" class="meetus-call-invite-count"></div>
          <div id="meetusCallInviteList" class="meetus-call-invite-list"></div>
          <div class="meetus-call-invite-actions">
            <button id="meetusCallInviteClose" class="meetus-call-card-close" type="button">Отмена</button>
            <button id="meetusCallInviteSubmit" class="meetus-call-invite-submit" type="button">Позвать</button>
          </div>
        </div>
      </div>
      <div id="meetusIncomingCall" class="meetus-incoming-call meetus-call-hidden">
        <div id="meetusIncomingAvatar" class="avatar">M</div>
        <div class="meetus-incoming-main"><strong id="meetusIncomingName"></strong><span id="meetusIncomingType">Входящий звонок</span></div>
        <div class="meetus-incoming-actions">
          <button id="meetusIncomingDecline" class="meetus-incoming-decline" type="button" title="Отклонить">${svg.end}</button>
          <button id="meetusIncomingAccept" class="meetus-incoming-accept" type="button" title="Ответить">${svg.phone}</button>
        </div>
      </div>
      <section id="meetusCallShell" class="meetus-call-shell meetus-call-hidden">
        <header class="meetus-call-top">
          <div id="meetusCallTopAvatar" class="avatar">M</div>
          <div class="meetus-call-top-info"><strong id="meetusCallTitle">Звонок</strong><span id="meetusCallStatus">Подключение…</span></div>
          <button id="meetusCallGridReset" class="meetus-call-hidden" type="button" title="Вернуться к сетке">${svg.grid}</button>
          <button id="meetusCallInviteButton" type="button" title="Добавить участников">${svg.addUser}</button>
          <button id="meetusCallSideButton" type="button" title="Участники">${svg.users}</button>
          <label class="meetus-call-quality" title="Качество камеры">
            <span>Качество</span>
            <select id="meetusCallQuality">
              <option value="auto">Авто</option>
              <option value="high">720p</option>
              <option value="medium">480p</option>
              <option value="low">360p</option>
            </select>
          </label>
          <button id="meetusCallMinimize" type="button" title="Свернуть">${svg.minimize}</button>
        </header>
        <div class="meetus-call-body">
          <main class="meetus-call-stage"><div id="meetusCallGrid" class="meetus-call-grid"></div></main>
          <aside id="meetusCallSide" class="meetus-call-side meetus-call-hidden">
            <div class="meetus-call-tabs"><button data-call-tab="participants" class="active">Участники</button><button data-call-tab="chat">Чат</button></div>
            <div id="meetusCallParticipants" class="meetus-call-side-content meetus-call-participants"></div>
            <div id="meetusCallChat" class="meetus-call-side-content meetus-call-chat meetus-call-hidden">
              <div id="meetusCallChatList" class="meetus-call-chat-list"></div>
              <form id="meetusCallChatForm" class="meetus-call-chat-compose"><input id="meetusCallChatInput" placeholder="Сообщение" autocomplete="off"><button type="submit">${svg.send}</button></form>
            </div>
          </aside>
        </div>
        <footer class="meetus-call-controls">
          <button id="meetusCallMic" class="meetus-call-control" type="button">${svg.mic}<span class="meetus-call-control-label">Микрофон</span></button>
          <button id="meetusCallCamera" class="meetus-call-control" type="button">${svg.video}<span class="meetus-call-control-label">Камера</span></button>
          <button id="meetusCallScreen" class="meetus-call-control" type="button">${svg.screen}<span class="meetus-call-control-label">Экран</span></button>
          <button id="meetusCallHand" class="meetus-call-control meetus-call-hidden" type="button">${svg.hand}<span class="meetus-call-control-label">Поднять руку</span></button>
          <button id="meetusCallChatButton" class="meetus-call-control" type="button">${svg.chat}<span class="meetus-call-control-label">Чат</span></button>
          <button id="meetusCallEnd" class="meetus-call-control end" type="button">${svg.end}<span class="meetus-call-control-label">Завершить</span></button>
        </footer>
      </section>
    `);

    $("meetusCallChooserClose").addEventListener("click", closeChooser);
    $("meetusCallChooser").addEventListener("click", (event) => {
      if (event.target.id === "meetusCallChooser") closeChooser();
    });
    $("meetusCallInviteButton").addEventListener("click", openInviteModal);
    $("meetusCallInviteSearch").addEventListener("input", (event) => {
      callState.inviteQuery = event.target.value || "";
      renderInviteContacts();
    });
    $("meetusCallInviteClose").addEventListener("click", closeInviteModal);
    $("meetusCallInviteSubmit").addEventListener("click", inviteSelectedContacts);
    $("meetusCallInviteModal").addEventListener("click", (event) => {
      if (event.target.id === "meetusCallInviteModal") closeInviteModal();
    });
    $("meetusIncomingAccept").addEventListener("click", acceptIncoming);
    $("meetusIncomingDecline").addEventListener("click", declineIncoming);
    $("meetusCallMic").addEventListener("click", toggleMic);
    $("meetusCallCamera").addEventListener("click", toggleCamera);
    $("meetusCallScreen").addEventListener("click", toggleScreen);
    $("meetusCallHand").addEventListener("click", toggleHand);
    $("meetusCallEnd").addEventListener("click", leaveOrEnd);
    $("meetusCallMinimize").addEventListener("click", toggleMinimize);
    $("meetusCallGridReset").addEventListener("click", resetGroupLayout);
    $("meetusCallSideButton").addEventListener("click", () => toggleSide("participants"));
    $("meetusCallQuality").addEventListener("change", changeCameraQuality);
    $("meetusCallChatButton").addEventListener("click", () => toggleSide("chat"));
    $("meetusCallChatForm").addEventListener("submit", sendCallChatMessage);
    document.querySelectorAll("[data-call-tab]").forEach((button) => {
      button.addEventListener("click", () => showSideTab(button.dataset.callTab));
    });
    injectCallsSidebar();
  }

  function callButton() {
    return document.getElementById("callButton") || document.querySelector('.chat-header-actions button[title="Звонок"], .chat-header-actions button[title="Видеозвонок"]');
  }

  function bindCallButton() {
    let button = callButton();
    if (!button || button.dataset.callsBound) return;
    const clean = button.cloneNode(true);
    clean.id = "callButton";
    clean.title = "Звонок";
    clean.dataset.callsBound = "1";
    button.replaceWith(clean);
    button = clean;
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!isActivePrivateContact()) {
        toast("Звонить можно только пользователям из контактов");
        return;
      }
      openCallChooser();
    });
    syncCallButtonAvailability();
  }

  function isActivePrivateContact() {
    const chat = state.activeChat;
    if (!chat || chat.type !== "private") return true;
    const peerId = chat.peer?.id;
    if (!peerId) return false;
    return Array.isArray(state.contacts) && state.contacts.some((item) =>
      (item.user_id || item.contact_user_id || item.id) === peerId
    );
  }

  function syncCallButtonAvailability() {
    const button = callButton();
    if (!button) return;
    const allowed = isActivePrivateContact();
    button.classList.toggle("meetus-call-contact-only-hidden", !allowed);
    button.disabled = !allowed;
    button.title = allowed ? "Звонок" : "Добавьте пользователя в контакты, чтобы позвонить";
  }

  async function openCallChooser() {
    const chat = state.activeChat;
    if (!chat) return;
    try {
      const active = await api(`/calls/chat/${chat.id}/active`);
      if (active) {
        await joinCall(active.id);
        return;
      }
    } catch (error) {
      toast(error.message);
      return;
    }

    const choices = $("meetusCallChoices");
    choices.innerHTML = "";
    $("meetusCallChooserTitle").textContent = chat.peer?.displayName || chat.title || "Звонок";
    $("meetusCallChooserText").textContent = chat.type === "private"
      ? "Начать личный звонок"
      : chat.type === "channel" ? "Запустить трансляцию" : "Начать групповой звонок или трибуну";

    if (chat.type === "private") {
      addChoice("Аудиозвонок", "Камеру можно включить во время разговора", svg.phone, "primary", () => startPrivate(false));
      addChoice("Видеозвонок", "Сразу включить камеру", svg.video, "", () => startPrivate(true));
    } else if (chat.type === "group") {
      addChoice("Групповой звонок", "Участники могут говорить, включать видео и экран", svg.users, "primary", () => startGroup(false));
      addChoice("Групповой видеозвонок", "Начать сразу с камерой", svg.video, "", () => startGroup(true));
      if (["owner", "admin"].includes(chat.role)) {
        addChoice("Трибуна / стрим", "Слушатели поднимают руку, ведущий выдаёт слово", svg.hand, "stage", () => startStage(false));
      }
    } else if (chat.type === "channel") {
      if (["owner", "admin"].includes(chat.role)) {
        addChoice("Начать трансляцию", "Эфир для подписчиков с чатом и поднятием руки", svg.mic, "stage", () => startStage(false));
        addChoice("Начать видеотрансляцию", "Камера ведущего включится сразу", svg.video, "stage", () => startStage(true));
      } else {
        choices.innerHTML = '<div class="empty-list">Сейчас активной трансляции нет</div>';
      }
    }
    $("meetusCallChooser").classList.remove("meetus-call-hidden");
  }

  function addChoice(title, description, icon, className, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `meetus-call-choice ${className || ""}`;
    button.innerHTML = `${icon}<div><strong>${escapeHtml(title)}</strong><span>${escapeHtml(description)}</span></div>`;
    button.addEventListener("click", async () => {
      closeChooser();
      try { await handler(); } catch (error) { toast(error.message); }
    });
    $("meetusCallChoices").append(button);
  }

  function closeChooser() {
    $("meetusCallChooser").classList.add("meetus-call-hidden");
  }

  function contactRecord(contact) {
    if (!contact) return null;
    const source = contact.user || contact.contact || contact;
    const phone = source.phone || contact.phone || contact.contact_phone || "";
    return {
      id: source.user_id || source.contact_user_id || source.id || contact.user_id || contact.contact_user_id || contact.id || null,
      displayName: source.display_name || source.displayName || source.name || contact.display_name || contact.displayName || contact.name || source.username || "Контакт",
      username: source.username || contact.username || "",
      phone,
      avatarKey: source.avatar_key || source.avatarKey || contact.avatar_key || contact.avatarKey || null,
    };
  }

  function normalizedContactSearch(value) {
    return String(value || "").toLocaleLowerCase("ru-RU").replace(/^@/, "").trim();
  }

  function contactMatchesQuery(contact, query) {
    if (!query) return true;
    const normalized = normalizedContactSearch(query);
    const digits = normalized.replace(/\D/g, "");
    const haystack = [contact.displayName, contact.username, contact.phone]
      .map((value) => String(value || "").toLocaleLowerCase("ru-RU"));
    if (haystack.some((value) => value.includes(normalized))) return true;
    return Boolean(digits && String(contact.phone || "").replace(/\D/g, "").includes(digits));
  }

  function renderInviteContacts() {
    const root = $("meetusCallInviteList");
    if (!root) return;
    const selected = new Set([...root.querySelectorAll('input[type="checkbox"]:checked')].map((input) => input.value));
    const visible = callState.inviteContacts.filter((contact) => contactMatchesQuery(contact, callState.inviteQuery));
    root.innerHTML = visible.length ? visible.map((contact) => `
      <label class="meetus-call-invite-person">
        <input type="checkbox" value="${escapeHtml(contact.id)}" ${selected.has(contact.id) ? "checked" : ""}>
        <span class="meetus-call-invite-avatar">${avatarInner(contact.displayName, contact.avatarKey)}</span>
        <span class="meetus-call-invite-name">
          <strong>${escapeHtml(contact.displayName)}</strong>
          <small>${[contact.username ? `@${contact.username}` : "", contact.phone || ""].filter(Boolean).map(escapeHtml).join(" • ") || "Контакт"}</small>
        </span>
        <span class="meetus-call-invite-check">✓</span>
      </label>`).join("") : `<div class="empty-list">${callState.inviteContacts.length ? "Ничего не найдено" : "Все ваши контакты уже участвуют в звонке"}</div>`;
    const count = $("meetusCallInviteCount");
    if (count) count.textContent = callState.inviteContacts.length ? `Контактов: ${callState.inviteContacts.length}${visible.length !== callState.inviteContacts.length ? ` • найдено: ${visible.length}` : ""}` : "";
    $("meetusCallInviteSubmit").disabled = !callState.inviteContacts.length;
  }

  async function openInviteModal() {
    if (!callState.call || !callState.room) return toast("Сначала подключитесь к звонку");
    if (typeof loadContacts === "function") {
      try { await loadContacts(); } catch {}
    }
    const participantIds = new Set((callState.call.participants || [])
      .filter((item) => ["invited", "ringing", "joined"].includes(item.state))
      .map((item) => item.user_id || item.id));
    callState.inviteContacts = (state.contacts || [])
      .map(contactRecord)
      .filter((item) => item?.id && !participantIds.has(item.id))
      .sort((a, b) => a.displayName.localeCompare(b.displayName, "ru"));
    callState.inviteQuery = "";
    $("meetusCallInviteSearch").value = "";
    renderInviteContacts();
    $("meetusCallInviteModal").classList.remove("meetus-call-hidden");
    setTimeout(() => $("meetusCallInviteSearch")?.focus(), 80);
  }

  function closeInviteModal() {
    if (callState.inviteLoading) return;
    $("meetusCallInviteModal").classList.add("meetus-call-hidden");
  }

  async function inviteSelectedContacts() {
    if (!callState.call || callState.inviteLoading) return;
    const ids = [...$("meetusCallInviteList").querySelectorAll('input[type="checkbox"]:checked')].map((input) => input.value);
    if (!ids.length) return toast("Выберите хотя бы один контакт");
    callState.inviteLoading = true;
    const button = $("meetusCallInviteSubmit");
    button.disabled = true;
    button.textContent = "Приглашаем…";
    try {
      const response = await api(`/calls/${callState.call.id}/invite`, "POST", { userIds: ids });
      if (response?.call) callState.call = { ...callState.call, ...response.call };
      const results = response?.results || [];
      const invited = results.filter((item) => item.status === "invited").length;
      const busy = results.filter((item) => item.status === "busy").length;
      const offline = results.filter((item) => item.status === "offline").length;
      const already = results.filter((item) => item.status === "already_joined" || item.status === "already_invited").length;
      const summary = [
        invited ? `приглашено: ${invited}` : "",
        busy ? `занято: ${busy}` : "",
        offline ? `не в сети: ${offline}` : "",
        already ? `уже в звонке: ${already}` : "",
      ].filter(Boolean).join(" • ");
      toast(summary || "Приглашения обработаны");
      renderParticipants();
      $("meetusCallInviteModal").classList.add("meetus-call-hidden");
    } catch (error) {
      toast(error.message);
    } finally {
      callState.inviteLoading = false;
      button.disabled = false;
      button.textContent = "Позвать";
    }
  }

  function callWantsVideo(call) {
    return Boolean(call?.videoEnabled ?? call?.video_enabled ?? call?.video ?? false);
  }

  async function startPrivate(video) {
    const call = await api(`/calls/private/${state.activeChat.id}/start`, "POST", { video });
    callState.call = call;
    showOutgoing(call);
  }

  async function startGroup(video) {
    const payload = await api(`/calls/group/${state.activeChat.id}/start`, "POST", { video });
    await connectToRoom(payload, video);
  }

  async function startStage(video) {
    const payload = await api(`/calls/stage/${state.activeChat.id}/start`, "POST", { video });
    await connectToRoom(payload, video);
  }

  function showOutgoing(call) {
    callState.call = call;
    const reason = call?.endReason || call?.end_reason;
    if (reason === "busy") {
      showCallShell(call, "Линия занята");
      ensurePrivatePeerTile(call);
      setControlsEnabled(false);
      startBusyTone();
      scheduleTerminalClose(20_000);
      return;
    }
    if (reason === "offline") {
      showCallShell(call, "Без доступа к сети");
      ensurePrivatePeerTile(call);
      setControlsEnabled(false);
      scheduleTerminalClose(6_000);
      return;
    }
    showCallShell(call, "Соединение…");
    startRing(false);
    ensurePrivatePeerTile(call);
    setControlsEnabled(false);
    scheduleNoAnswerClose();
  }

  function showIncoming(call) {
    callState.call = call;
    const peer = privatePeerFromCall(call) || normalizeCallPerson(call.creator);
    const peerName = peer?.displayName || displayNameFromCall(call);
    $("meetusIncomingName").textContent = peerName;
    $("meetusIncomingType").textContent = call.status === "active"
      ? "Приглашение в текущий звонок"
      : (callWantsVideo(call) ? "Входящий видеозвонок" : "Входящий аудиозвонок");
    setCallAvatarElement($("meetusIncomingAvatar"), peerName, peer?.avatarKey);
    $("meetusIncomingCall").classList.remove("meetus-call-hidden");
    startRing(true, call);
  }

  async function acceptIncoming() {
    const call = callState.call;
    if (!call) return;
    stopRing();
    $("meetusIncomingCall").classList.add("meetus-call-hidden");
    try {
      const payload = await api(`/calls/${call.id}/accept`, "POST", {});
      await connectToRoom(payload, callWantsVideo(call) || callWantsVideo(payload));
    } catch (error) { toast(error.message); }
  }

  async function declineIncoming() {
    const call = callState.call;
    stopRing();
    $("meetusIncomingCall").classList.add("meetus-call-hidden");
    callState.call = null;
    if (!call) return;
    try { await api(`/calls/${call.id}/decline`, "POST", {}); } catch (error) { toast(error.message); }
    clearCallTimers();
  }

  async function joinCall(callId, reconnect = false) {
    const payload = await api(`/calls/${callId}/join`, "POST", {});
    await connectToRoom(payload, reconnect ? callState.camera : callWantsVideo(payload));
  }

  async function connectToRoom(payload, initialVideo) {
    initialVideo = Boolean(initialVideo || callWantsVideo(payload));
    stopRing();
    $("meetusIncomingCall").classList.add("meetus-call-hidden");
    if (callState.room) await disconnectRoom(false);
    callState.call = payload;
    callState.role = payload.role || payload.viewer?.role || "participant";
    callState.canPublish = Boolean(payload.canPublish);
    callState.muted = false;
    callState.camera = false;
    callState.screen = false;
    callState.hand = Boolean(payload.viewer?.hand_raised_at);
    showCallShell(payload, "Подключение…");
    ensurePrivatePeerTile(payload);
    renderParticipants();

    clearCallTimers();
    const room = new LK.Room({
      adaptiveStream: true,
      dynacast: true,
      disconnectOnPageLeave: true,
      audioCaptureDefaults: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
      videoCaptureDefaults: cameraCaptureOptions(initialNetworkTier()),
      publishDefaults: {
        videoCodec: "vp8",
        simulcast: true,
        dtx: true,
        red: true,
        videoEncoding: { maxBitrate: 2_500_000, maxFramerate: 30 },
      },
    });
    callState.room = room;
    bindRoom(room);
    await room.connect(payload.url, payload.token, { autoSubscribe: true });
    $("meetusCallStatus").textContent = payload.mode === "stage" ? "В эфире" : "Соединено";
    ensureParticipantTile(room.localParticipant, true);
    ensurePrivatePeerTile(payload);
    syncParticipantPublishedTracks(room.localParticipant, true);
    room.remoteParticipants.forEach((participant) => syncParticipantPublishedTracks(participant, false));

    if (callState.canPublish) {
      await room.localParticipant.setMicrophoneEnabled(true, {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      });
      if (initialVideo) {
        const tier = initialNetworkTier();
        await room.localParticipant.setCameraEnabled(true, cameraCaptureOptions(tier));
        callState.cameraQualityTier = tier;
        setTimeout(() => {
          syncParticipantPublishedTracks(room.localParticipant, true);
          updateMediaLayout();
        }, 350);
      }
      callState.camera = Boolean(initialVideo);
      syncParticipantPublishedTracks(room.localParticipant, true);
    }
    updateControls();
    renderParticipants();
    if (payload.textChatId) loadCallChat();
  }

  function bindRoom(room) {
    room.on(LK.RoomEvent.ParticipantConnected, (participant) => {
      syncParticipantPublishedTracks(participant, false);
      renderParticipants();
    });
    room.on(LK.RoomEvent.ParticipantDisconnected, (participant) => {
      removeParticipantTile(participant.identity);
      renderParticipants();
    });
    room.on(LK.RoomEvent.TrackSubscribed, (track, publication, participant) => {
      attachTrack(track, publication, participant);
      ensureParticipantTile(participant, false);
    });
    room.on(LK.RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
      track.detach().forEach((element) => element.remove());
      cleanupMediaTile(participant?.identity, publication?.source || track.source);
    });
    room.on(LK.RoomEvent.LocalTrackPublished, (publication, participant) => {
      const owner = participant || room.localParticipant;
      const track = publication.track;
      if (track) attachTrack(track, publication, owner, true);
      syncParticipantPublishedTracks(owner, true);
    });
    room.on(LK.RoomEvent.LocalTrackUnpublished, (publication) => {
      publication.track?.detach().forEach((element) => element.remove());
      cleanupMediaTile(room.localParticipant.identity, publication.source || publication.track?.source);
    });
    room.on(LK.RoomEvent.ActiveSpeakersChanged, (speakers) => {
      document.querySelectorAll(".meetus-call-tile.speaking").forEach((node) => node.classList.remove("speaking"));
      speakers.forEach((participant) => tilesFor(participant.identity).forEach((tile) => tile.classList.add("speaking")));
    });
    const qualityEvent = LK.RoomEvent.ConnectionQualityChanged;
    if (qualityEvent) {
      room.on(qualityEvent, (quality, participant) => {
        const identity = participant?.identity;
        const normalized = String(quality || participant?.connectionQuality || "unknown").toLowerCase();
        tilesFor(identity || "").forEach((tile) => {
          tile.dataset.connectionQuality = normalized;
        });
        if (!participant || participant.isLocal || identity === room.localParticipant.identity) {
          handleLocalConnectionQuality(normalized);
        }
      });
    }
    room.on(LK.RoomEvent.Disconnected, () => {
      if (callState.endingLocally) return;
      if (callState.call && !$("meetusCallShell").classList.contains("meetus-call-hidden")) {
        $("meetusCallStatus").textContent = navigator.onLine ? "Соединение завершено" : "Без доступа к сети";
        scheduleTerminalClose(4_000);
      }
    });
    room.on(LK.RoomEvent.Reconnecting, () => $("meetusCallStatus").textContent = "Соединение…");
    room.on(LK.RoomEvent.Reconnected, () => {
      $("meetusCallStatus").textContent = "Соединено";
      syncParticipantPublishedTracks(room.localParticipant, true);
      room.remoteParticipants.forEach((participant) => syncParticipantPublishedTracks(participant, false));
    });
  }

  function initialNetworkTier() {
    if (callState.manualCameraTier && callState.manualCameraTier !== "auto") return callState.manualCameraTier;
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection?.saveData) return "low";
    const type = String(connection?.effectiveType || "").toLowerCase();
    if (type.includes("2g")) return "low";
    if (type === "3g") return "medium";
    return "high";
  }

  function cameraCaptureOptions(tier) {
    if (tier === "low") return { resolution: { width: 640, height: 360, frameRate: 15 }, facingMode: "user" };
    if (tier === "medium") return { resolution: { width: 854, height: 480, frameRate: 24 }, facingMode: "user" };
    return { resolution: { width: 1280, height: 720, frameRate: 30 }, facingMode: "user" };
  }

  function qualityTier(quality) {
    if (callState.manualCameraTier && callState.manualCameraTier !== "auto") return callState.manualCameraTier;
    if (["lost", "poor"].includes(quality)) return "low";
    if (["good"].includes(quality)) return "medium";
    return callState.cameraQualityTier || initialNetworkTier();
  }

  function tierRank(tier) {
    return ({ low: 1, medium: 2, high: 3 })[tier] || 0;
  }

  function handleLocalConnectionQuality(quality) {
    callState.networkQuality = quality;
    if (quality === "lost") $("meetusCallStatus").textContent = "Без доступа к сети";
    else if (quality === "poor") $("meetusCallStatus").textContent = "Слабое соединение";
    else if (callState.room) $("meetusCallStatus").textContent = "Соединено";

    if (callState.manualCameraTier !== "auto" || !callState.camera) return;
    const current = callState.cameraQualityTier || initialNetworkTier();
    const target = qualityTier(quality);
    // Автоматически только понижаем качество. Назад вверх камера не прыгает:
    // пользователь может выбрать качество вручную в шапке звонка.
    if (tierRank(target) >= tierRank(current)) return;
    clearTimeout(callState.cameraAdaptTimer);
    callState.cameraAdaptTimer = setTimeout(() => {
      if (!callState.camera || callState.manualCameraTier !== "auto") return;
      callState.lastAutoDowngradeAt = Date.now();
      adaptLocalCamera(target);
    }, 8000);
  }

  async function changeCameraQuality(event) {
    const value = String(event?.target?.value || "auto");
    callState.manualCameraTier = ["auto", "high", "medium", "low"].includes(value) ? value : "auto";
    clearTimeout(callState.cameraAdaptTimer);
    if (!callState.camera) return;
    const tier = callState.manualCameraTier === "auto"
      ? (callState.cameraQualityTier || initialNetworkTier())
      : callState.manualCameraTier;
    await adaptLocalCamera(tier);
    toast(callState.manualCameraTier === "auto" ? "Автокачество: только понижение при слабой сети" : `Качество камеры: ${{high:"720p",medium:"480p",low:"360p"}[tier]}`);
  }

  async function adaptLocalCamera(tier) {
    if (!callState.room || !callState.camera || tier === callState.cameraQualityTier) return;
    const publication = callState.room.localParticipant.getTrackPublication?.(LK.Track.Source.Camera);
    const track = publication?.track;
    try {
      if (track?.restartTrack) await track.restartTrack(cameraCaptureOptions(tier));
      callState.cameraQualityTier = tier;
    } catch (error) {
      console.warn("Unable to adapt camera quality", error);
    }
  }

  function participantMetadata(participant) {
    try { return JSON.parse(participant.metadata || "{}"); } catch { return {}; }
  }

  function mediaKey(identity, source) {
    return `${identity}::${source}`;
  }

  function ensureMediaLayout() {
    const grid = $("meetusCallGrid");
    if (!grid) return null;
    let main = $("meetusCallMainSlot");
    let filmstrip = $("meetusCallFilmstrip");
    let pipLayer = $("meetusCallPipLayer");
    if (!main || !filmstrip || !pipLayer) {
      grid.innerHTML = `
        <div id="meetusCallMainSlot" class="meetus-call-main-slot"></div>
        <div id="meetusCallFilmstrip" class="meetus-call-filmstrip"></div>
        <div id="meetusCallPipLayer" class="meetus-call-pip-layer"></div>
      `;
      main = $("meetusCallMainSlot");
      filmstrip = $("meetusCallFilmstrip");
      pipLayer = $("meetusCallPipLayer");
    }
    return { grid, main, filmstrip, pipLayer };
  }

  function allMediaTiles() {
    return [...($("meetusCallGrid")?.querySelectorAll(".meetus-call-tile[data-participant-id]") || [])];
  }

  function tileKey(tile) {
    return mediaKey(tile?.dataset.participantId || "", tile?.dataset.mediaSource || "camera");
  }

  function chooseDefaultPrimary(tiles) {
    const screen = tiles.find((tile) => tile.dataset.mediaSource === "screen" && tile.classList.contains("has-video"));
    if (screen) return screen;
    const remoteVideo = tiles.find((tile) => tile.dataset.mediaSource === "camera" && tile.dataset.local !== "1" && tile.classList.contains("has-video"));
    if (remoteVideo) return remoteVideo;
    const remote = tiles.find((tile) => tile.dataset.mediaSource === "camera" && tile.dataset.local !== "1");
    if (remote) return remote;
    return tiles.find((tile) => tile.dataset.mediaSource === "camera") || tiles[0] || null;
  }

  function screenPrimaryTile(tiles) {
    return tiles.find((tile) => tile.dataset.mediaSource === "screen" && tile.classList.contains("has-video"))
      || tiles.find((tile) => tile.dataset.mediaSource === "screen")
      || null;
  }

  function clampPipPosition(tile) {
    const layout = ensureMediaLayout();
    if (!layout || !tile) return;
    const host = layout.grid.getBoundingClientRect();
    const rect = tile.getBoundingClientRect();
    const margin = 12;
    let x = Number(callState.pipPosition?.x);
    let y = Number(callState.pipPosition?.y);
    if (!Number.isFinite(x)) x = Math.max(margin, host.width - rect.width - margin);
    if (!Number.isFinite(y)) y = Math.max(margin, host.height - rect.height - margin);
    x = Math.max(margin, Math.min(x, Math.max(margin, host.width - rect.width - margin)));
    y = Math.max(margin, Math.min(y, Math.max(margin, host.height - rect.height - margin)));
    callState.pipPosition = { x, y };
    tile.style.left = `${x}px`;
    tile.style.top = `${y}px`;
    tile.style.right = "auto";
    tile.style.bottom = "auto";
  }

  function setPrimaryTile(tile, userSelected = true) {
    if (!tile) return;
    callState.primaryMediaKey = tileKey(tile);
    callState.primaryUserSelected = userSelected;
    updateMediaLayout();
  }

  function bindTileInteraction(tile) {
    if (!tile || tile.dataset.calls3Bound === "1") return;
    tile.dataset.calls3Bound = "1";
    tile.addEventListener("click", (event) => {
      if (event.target.closest("button") || tile.dataset.dragMoved === "1") return;
      if (tile.classList.contains("meetus-call-pip") || tile.classList.contains("meetus-call-thumbnail") || tile.classList.contains("meetus-call-gallery-tile")) {
        setPrimaryTile(tile, true);
      }
    });
    tile.addEventListener("pointerdown", (event) => {
      if (!tile.classList.contains("meetus-call-pip") || event.target.closest("button")) return;
      event.preventDefault();
      tile.setPointerCapture?.(event.pointerId);
      const startX = event.clientX;
      const startY = event.clientY;
      const start = {
        x: Number.parseFloat(tile.style.left) || tile.offsetLeft,
        y: Number.parseFloat(tile.style.top) || tile.offsetTop,
      };
      let moved = false;
      const move = (moveEvent) => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        if (Math.abs(dx) + Math.abs(dy) > 5) moved = true;
        callState.pipPosition = { x: start.x + dx, y: start.y + dy };
        clampPipPosition(tile);
      };
      const end = () => {
        tile.removeEventListener("pointermove", move);
        tile.removeEventListener("pointerup", end);
        tile.removeEventListener("pointercancel", end);
        if (moved) {
          tile.dataset.dragMoved = "1";
          setTimeout(() => delete tile.dataset.dragMoved, 120);
        }
      };
      tile.addEventListener("pointermove", move);
      tile.addEventListener("pointerup", end);
      tile.addEventListener("pointercancel", end);
    });
  }

  function resetGroupLayout() {
    callState.primaryMediaKey = null;
    callState.primaryUserSelected = false;
    callState.groupGalleryMode = true;
    updateMediaLayout();
  }

  function updateMediaLayout() {
    const layout = ensureMediaLayout();
    if (!layout) return;
    const tiles = allMediaTiles();
    const shell = $("meetusCallShell");
    const isPrivate = shell?.classList.contains("meetus-call-private");
    const screenTiles = tiles.filter((tile) => tile.dataset.mediaSource === "screen");
    const hasScreen = screenTiles.length > 0;
    const resetButton = $("meetusCallGridReset");

    shell?.classList.toggle("meetus-call-has-screen", hasScreen);
    layout.grid.classList.toggle("meetus-call-layout-screen", hasScreen);

    layout.main.classList.remove("meetus-call-gallery");
    delete layout.main.dataset.tileCount;
    resetButton?.classList.add("meetus-call-hidden");

    if (!tiles.length) {
      shell?.classList.remove("meetus-call-has-screen");
      layout.filmstrip.classList.add("meetus-call-hidden");
      layout.pipLayer.innerHTML = "";
      return;
    }

    tiles.forEach((tile) => {
      tile.classList.remove("meetus-call-primary", "meetus-call-pip", "meetus-call-thumbnail", "meetus-call-gallery-tile");
      tile.style.removeProperty("left");
      tile.style.removeProperty("top");
      tile.style.removeProperty("right");
      tile.style.removeProperty("bottom");
    });

    if (!isPrivate && !hasScreen && !callState.primaryUserSelected) {
      callState.groupGalleryMode = true;
      callState.primaryMediaKey = null;
      const galleryTiles = tiles.filter((tile) => tile.dataset.mediaSource === "camera");
      layout.main.classList.add("meetus-call-gallery");
      layout.main.dataset.tileCount = String(galleryTiles.length);
      galleryTiles.forEach((tile) => {
        tile.classList.add("meetus-call-gallery-tile");
        layout.main.append(tile);
      });
      layout.filmstrip.classList.add("meetus-call-hidden");
      return;
    }

    callState.groupGalleryMode = false;
    let primary = tiles.find((tile) => tileKey(tile) === callState.primaryMediaKey);
    if (!primary) {
      primary = hasScreen ? screenPrimaryTile(screenTiles) : chooseDefaultPrimary(tiles);
      callState.primaryMediaKey = primary ? tileKey(primary) : null;
      callState.primaryUserSelected = false;
    }
    if (hasScreen && primary?.dataset.mediaSource !== "screen" && !callState.primaryUserSelected) {
      primary = screenPrimaryTile(screenTiles) || primary;
      callState.primaryMediaKey = primary ? tileKey(primary) : null;
    }

    if (primary) {
      primary.classList.add("meetus-call-primary");
      layout.main.append(primary);
    }

    if (hasScreen) {
      const remainder = tiles.filter((tile) => tile !== primary);
      const ordered = [
        ...remainder.filter((tile) => tile.dataset.mediaSource === "screen"),
        ...remainder.filter((tile) => tile.dataset.mediaSource === "camera" && tile.dataset.local === "1"),
        ...remainder.filter((tile) => tile.dataset.mediaSource === "camera" && tile.dataset.local !== "1" && tile.classList.contains("has-video")),
        ...remainder.filter((tile) => tile.dataset.mediaSource === "camera" && tile.dataset.local !== "1" && !tile.classList.contains("has-video")),
        ...remainder.filter((tile) => tile.dataset.mediaSource !== "camera" && tile.dataset.mediaSource !== "screen"),
      ];
      ordered.forEach((tile) => {
        tile.classList.add("meetus-call-thumbnail");
        layout.filmstrip.append(tile);
      });
      layout.filmstrip.classList.toggle("meetus-call-hidden", !layout.filmstrip.children.length);
      if (callState.primaryUserSelected) resetButton?.classList.remove("meetus-call-hidden");
      return;
    }

    const cameraTiles = tiles.filter((tile) => tile !== primary && tile.dataset.mediaSource === "camera");
    const otherTiles = tiles.filter((tile) => tile !== primary && tile.dataset.mediaSource !== "camera");
    let pip = null;
    if (isPrivate && primary?.dataset.mediaSource !== "screen") {
      if (primary?.dataset.local === "1") pip = cameraTiles.find((tile) => tile.dataset.local !== "1") || null;
      else pip = cameraTiles.find((tile) => tile.dataset.local === "1") || cameraTiles[0] || null;
    }

    if (pip) {
      pip.classList.add("meetus-call-pip");
      layout.pipLayer.append(pip);
      requestAnimationFrame(() => clampPipPosition(pip));
    }

    [...cameraTiles.filter((tile) => tile !== pip), ...otherTiles].forEach((tile) => {
      tile.classList.add("meetus-call-thumbnail");
      layout.filmstrip.append(tile);
    });
    layout.filmstrip.classList.toggle("meetus-call-hidden", !layout.filmstrip.children.length);
    if (!isPrivate && callState.primaryUserSelected) resetButton?.classList.remove("meetus-call-hidden");
  }

  function participantPublications(participant) {
    const publications = participant?.trackPublications;
    if (!publications) return [];
    if (typeof publications.values === "function") return [...publications.values()];
    return Object.values(publications);
  }

  function syncParticipantPublishedTracks(participant, local) {
    if (!participant) return;
    ensureParticipantTile(participant, local);
    participantPublications(participant).forEach((publication) => {
      const track = publication?.track;
      if (!track) return;
      if (!local && publication.isSubscribed === false) return;
      attachTrack(track, publication, participant, local);
    });
    updateMediaLayout();
  }

  function ensureParticipantTile(participant, local) {
    const metadata = participantMetadata(participant);
    const record = callParticipantRecord(participant.identity);
    return ensureMediaTile(
      participant.identity,
      local ? (state.user?.display_name || state.user?.displayName || participant.name || "Вы") : (participant.name || record?.display_name || "Участник"),
      metadata.role || (local ? callState.role : participantRole(participant.identity)),
      local,
      "camera",
      metadata.avatarKey || record?.avatar_key || record?.avatarKey || (local ? (state.user?.avatar_key || state.user?.avatarKey) : null),
    );
  }

  function ensureMediaTile(identity, name, role, local, source = "camera", avatarKey = null) {
    let tile = tileFor(identity, source);
    if (!tile) {
      tile = document.createElement("article");
      tile.className = `meetus-call-tile ${source === "screen" ? "screen" : "camera"}`;
      tile.dataset.participantId = identity;
      tile.dataset.mediaSource = source;
      tile.dataset.local = local ? "1" : "0";
      tile.innerHTML = `<div class="meetus-call-avatar">${avatarInner(name, avatarKey)}</div>
        <button class="meetus-call-fullscreen" type="button" title="На весь экран">${svg.fullscreen}</button>
        <div class="meetus-call-tile-label"><span>${source === "screen" ? "Экран • " : ""}${escapeHtml(name)}${local ? " (вы)" : ""}</span><span class="meetus-call-role">${escapeHtml(roleLabel(role))}</span></div>`;
      tile.querySelector(".meetus-call-fullscreen")?.addEventListener("click", () => openTileFullscreen(tile));
      bindTileInteraction(tile);
      const layout = ensureMediaLayout();
      (layout?.filmstrip || $("meetusCallGrid")).append(tile);
      updateMediaLayout();
    }
    const avatar = tile.querySelector(".meetus-call-avatar");
    if (avatar && (avatarKey || !avatar.textContent.trim())) setCallAvatarElement(avatar, name, avatarKey);
    return tile;
  }

  function tileFor(identity, source = "camera") {
    return $("meetusCallGrid")?.querySelector(`[data-participant-id="${CSS.escape(identity)}"][data-media-source="${source}"]`);
  }

  function tilesFor(identity) {
    return [...($("meetusCallGrid")?.querySelectorAll(`[data-participant-id="${CSS.escape(identity)}"]`) || [])];
  }

  function removeParticipantTile(identity) {
    tilesFor(identity).forEach((tile) => tile.remove());
    if (callState.primaryMediaKey?.startsWith(`${identity}::`)) callState.primaryMediaKey = null;
    updateMediaLayout();
  }

  function attachTrack(track, publication, participant, local = false) {
    if (track.kind === LK.Track.Kind.Audio) {
      // Никогда не воспроизводим собственный микрофон локально: это и было причиной эха «из трубы».
      if (local || participant.identity === callState.room?.localParticipant?.identity) return;
      document.querySelectorAll(`audio[data-call-audio="${CSS.escape(participant.identity)}"]`).forEach((node) => node.remove());
      const element = track.attach();
      element.autoplay = true;
      element.playsInline = true;
      element.dataset.callAudio = participant.identity;
      document.body.append(element);
      element.play?.().catch(() => {});
      return;
    }

    const sourceValue = publication.source || track.source;
    const isScreen = sourceValue === LK.Track.Source.ScreenShare || sourceValue === LK.Track.Source.ScreenShareAudio;
    const source = isScreen ? "screen" : "camera";
    const metadata = participantMetadata(participant);
    const name = local
      ? (state.user?.display_name || state.user?.displayName || participant.name || "Вы")
      : (participant.name || "Участник");
    const role = metadata.role || (local ? callState.role : participantRole(participant.identity));
    const record = callParticipantRecord(participant.identity);
    const tile = ensureMediaTile(participant.identity, name, role, local, source, metadata.avatarKey || record?.avatar_key || record?.avatarKey || null);
    let video = tile.querySelector(`video[data-source="${source}"]`);
    if (!video) {
      video = document.createElement("video");
      video.autoplay = true;
      video.playsInline = true;
      video.muted = local;
      video.dataset.source = source;
      tile.prepend(video);
    }
    const trackId = publication?.trackSid || publication?.sid || track.sid || track.mediaStreamTrack?.id || "";
    if (!trackId || video.dataset.trackId !== String(trackId)) {
      track.attach(video);
      video.dataset.trackId = String(trackId);
    }
    video.play?.().catch(() => {});
    tile.classList.add("has-video");
    if (source === "screen") {
      callState.primaryMediaKey = tileKey(tile);
      callState.primaryUserSelected = false;
    }
    updateMediaLayout();
  }

  function cleanupMediaTile(identity, sourceValue) {
    if (!identity) return;
    const isScreen = sourceValue === LK.Track.Source.ScreenShare || sourceValue === LK.Track.Source.ScreenShareAudio || sourceValue === "screen_share";
    const source = isScreen ? "screen" : "camera";
    const tile = tileFor(identity, source);
    if (!tile) return;
    if (source === "screen") {
      const wasPrimary = tileKey(tile) === callState.primaryMediaKey;
      tile.remove();
      if (wasPrimary) callState.primaryMediaKey = null;
      updateMediaLayout();
      return;
    }
    tile.querySelectorAll("video").forEach((node) => node.remove());
    tile.classList.remove("has-video");
    updateMediaLayout();
  }

  async function openTileFullscreen(tile) {
    const video = tile.querySelector("video");
    const target = video || tile;
    try {
      if (target.requestFullscreen) await target.requestFullscreen();
      else if (target.webkitEnterFullscreen && video) target.webkitEnterFullscreen();
      else tile.classList.toggle("meetus-call-tile-focused");
    } catch {
      tile.classList.toggle("meetus-call-tile-focused");
    }
  }

  function participantRole(userId) {
    return callState.call?.participants?.find((p) => p.user_id === userId)?.role || "participant";
  }

  function roleLabel(role) {
    return ({ host: "ведущий", speaker: "спикер", listener: "слушатель", participant: "участник" })[role] || role;
  }

  function showCallShell(call, status) {
    injectDom();
    callState.minimized = false;
    const shell = $("meetusCallShell");
    shell.classList.remove("meetus-call-hidden", "minimized");
    const title = displayNameFromCall(call);
    const peer = privatePeerFromCall(call);
    $("meetusCallTitle").textContent = title;
    $("meetusCallStatus").textContent = status;
    if ($("meetusCallQuality")) $("meetusCallQuality").value = callState.manualCameraTier || "auto";
    setCallAvatarElement($("meetusCallTopAvatar"), title, peer?.avatarKey || call.chat?.avatarKey);
    shell.classList.toggle("meetus-call-private", call.mode === "private" || call.chat?.type === "private");
    shell.classList.toggle("meetus-call-video-requested", callWantsVideo(call));
    $("meetusCallGrid").innerHTML = "";
    callState.primaryMediaKey = null;
    callState.primaryUserSelected = false;
    callState.groupGalleryMode = true;
    callState.pipPosition = null;
    ensureMediaLayout();
    $("meetusCallHand").classList.toggle("meetus-call-hidden", call.mode !== "stage");
    $("meetusCallInviteButton").disabled = true;
    document.body.classList.add("meetus-call-active");
  }

  function setControlsEnabled(enabled) {
    ["meetusCallMic", "meetusCallCamera", "meetusCallScreen"].forEach((id) => { $(id).disabled = !enabled; });
  }

  function updateControls() {
    setControlsEnabled(callState.canPublish);
    $("meetusCallMic").classList.toggle("off", callState.muted);
    $("meetusCallCamera").classList.toggle("active", callState.camera);
    $("meetusCallScreen").classList.toggle("active", callState.screen);
    $("meetusCallHand").classList.toggle("meetus-call-hand-raised", callState.hand);
    $("meetusCallHand").title = callState.hand ? "Опустить руку" : "Поднять руку";
    $("meetusCallInviteButton").disabled = !callState.room || !callState.call || !["ringing", "active"].includes(callState.call.status);
  }

  async function toggleMic() {
    if (!callState.room || !callState.canPublish) return;
    callState.muted = !callState.muted;
    try {
      await callState.room.localParticipant.setMicrophoneEnabled(!callState.muted, {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      });
    } catch (error) { callState.muted = !callState.muted; toast(error.message); }
    updateControls();
  }

  async function toggleCamera() {
    if (!callState.room || !callState.canPublish) return;
    const next = !callState.camera;
    try {
      const tier = qualityTier(callState.networkQuality);
      await callState.room.localParticipant.setCameraEnabled(next, next ? cameraCaptureOptions(tier) : undefined);
      callState.camera = next;
      callState.cameraQualityTier = next ? tier : null;
      syncParticipantPublishedTracks(callState.room.localParticipant, true);
      setTimeout(() => syncParticipantPublishedTracks(callState.room?.localParticipant, true), 250);
    } catch (error) { toast(error.message); }
    updateControls();
  }

  async function toggleScreen() {
    if (!callState.room || !callState.canPublish) return;
    const next = !callState.screen;
    try {
      await callState.room.localParticipant.setScreenShareEnabled(next, { audio: true });
      callState.screen = next;
      syncParticipantPublishedTracks(callState.room.localParticipant, true);
      setTimeout(() => syncParticipantPublishedTracks(callState.room?.localParticipant, true), 250);
    } catch (error) { toast(error.message); }
    updateControls();
  }

  async function toggleHand() {
    if (!callState.call || callState.call.mode !== "stage") return;
    const next = !callState.hand;
    try { await api(`/calls/${callState.call.id}/hand`, "POST", { raised: next }); callState.hand = next; updateControls(); } catch (error) { toast(error.message); }
  }

  async function leaveOrEnd() {
    const call = callState.call;
    const activeSession = Boolean(callState.room || call?.status === "active");
    callState.endingLocally = true;
    if (!call || ["ended", "cancelled"].includes(call.status)) return closeCallUi();
    const moderator = call.createdBy === currentUserId() || ["owner", "admin"].includes(state.activeChat?.role);
    const joinedCount = (call.participants || []).filter((item) => item.state === "joined").length;
    const shouldEndPrivate = call.mode === "private" && (call.createdBy === currentUserId() || joinedCount <= 2);
    try {
      if (shouldEndPrivate || (call.mode !== "private" && moderator)) await api(`/calls/${call.id}/end`, "POST", {});
      else await api(`/calls/${call.id}/leave`, "POST", {});
    } catch (error) { toast(error.message); }
    if (activeSession) playEndTone();
    await disconnectRoom(true);
  }

  async function disconnectRoom(closeUi = true) {
    const room = callState.room;
    clearCallTimers();
    callState.room = null;
    if (room) {
      try { await room.disconnect(); } catch {}
    }
    document.querySelectorAll("audio[data-call-audio]").forEach((node) => node.remove());
    if (closeUi) closeCallUi();
    setTimeout(() => { callState.endingLocally = false; }, 250);
  }

  function closeCallUi() {
    stopRing();
    clearCallTimers();
    callState.call = null;
    callState.endingLocally = false;
    callState.networkQuality = "unknown";
    callState.cameraQualityTier = null;
    callState.role = null;
    callState.canPublish = false;
    callState.sideTab = null;
    $("meetusCallShell").classList.add("meetus-call-hidden");
    $("meetusIncomingCall").classList.add("meetus-call-hidden");
    $("meetusCallInviteModal").classList.add("meetus-call-hidden");
    document.body.classList.remove("meetus-call-active");
    removeCallBanner();
  }

  function toggleMinimize() {
    callState.minimized = !callState.minimized;
    $("meetusCallShell").classList.toggle("minimized", callState.minimized);
    $("meetusCallMinimize").innerHTML = callState.minimized ? svg.expand : svg.minimize;
  }

  function toggleSide(tab) {
    if (callState.sideTab === tab && !$("meetusCallSide").classList.contains("meetus-call-hidden")) {
      callState.sideTab = null;
      $("meetusCallSide").classList.add("meetus-call-hidden");
      return;
    }
    callState.sideTab = tab;
    $("meetusCallSide").classList.remove("meetus-call-hidden");
    showSideTab(tab);
  }

  function showSideTab(tab) {
    callState.sideTab = tab;
    document.querySelectorAll("[data-call-tab]").forEach((button) => button.classList.toggle("active", button.dataset.callTab === tab));
    $("meetusCallParticipants").classList.toggle("meetus-call-hidden", tab !== "participants");
    $("meetusCallChat").classList.toggle("meetus-call-hidden", tab !== "chat");
    if (tab === "participants") renderParticipants();
    if (tab === "chat") loadCallChat();
  }

  function liveIdentitySet() {
    const set = new Set();
    if (callState.room) {
      set.add(callState.room.localParticipant.identity);
      callState.room.remoteParticipants.forEach((p) => set.add(p.identity));
    }
    return set;
  }

  function renderParticipants() {
    const root = $("meetusCallParticipants");
    if (!root || !callState.call) return;
    const participants = [...(callState.call.participants || [])];
    const live = liveIdentitySet();
    const moderator = callState.call.createdBy === currentUserId() || ["owner", "admin"].includes(state.activeChat?.role);
    participants.sort((a, b) => Number(Boolean(b.hand_raised_at)) - Number(Boolean(a.hand_raised_at)));
    root.innerHTML = participants.map((participant) => {
      const online = live.has(participant.user_id);
      const canManage = moderator && callState.call.mode === "stage" && participant.user_id !== currentUserId() && participant.role !== "host";
      const nextRole = participant.role === "speaker" ? "listener" : "speaker";
      return `<div class="meetus-call-person" data-call-person="${escapeHtml(participant.user_id)}">
        <div class="avatar">${escapeHtml(initials(participant.display_name))}</div>
        <div class="meetus-call-person-main"><strong>${escapeHtml(participant.display_name)}</strong><span>${escapeHtml(roleLabel(participant.role))}${online ? " • в эфире" : ""}</span></div>
        ${participant.hand_raised_at ? '<span class="meetus-call-hand">✋</span>' : ""}
        ${canManage ? `<button class="meetus-call-role-action" data-call-role-user="${escapeHtml(participant.user_id)}" data-call-role="${nextRole}">${nextRole === "speaker" ? "Дать слово" : "В слушатели"}</button>` : ""}
      </div>`;
    }).join("") || '<div class="empty-list">Участников пока нет</div>';
    root.querySelectorAll("[data-call-role-user]").forEach((button) => {
      button.addEventListener("click", () => changeRole(button.dataset.callRoleUser, button.dataset.callRole));
    });
  }

  async function changeRole(userId, role) {
    try {
      await api(`/calls/${callState.call.id}/participants/${userId}/role`, "POST", { role });
    } catch (error) { toast(error.message); }
  }

  async function loadCallChat() {
    const callId = callState.call?.id;
    if (!callId) return;
    try {
      const messages = await api(`/calls/${callId}/chat`);
      callState.chatMessages = messages.slice(-100);
      renderCallChat();
    } catch (error) {
      $("meetusCallChatList").innerHTML = `<div class="empty-list">${escapeHtml(error.message)}</div>`;
    }
  }

  function renderCallChat() {
    const root = $("meetusCallChatList");
    if (!root) return;
    root.innerHTML = callState.chatMessages
      .filter((message) => message.text)
      .map((message) => `<div class="meetus-call-chat-message"><strong>${escapeHtml(message.display_name || "Участник")}</strong>${escapeHtml(message.text)}</div>`)
      .join("") || '<div class="empty-list">Сообщений пока нет</div>';
    root.scrollTop = root.scrollHeight;
  }

  async function sendCallChatMessage(event) {
    event.preventDefault();
    const input = $("meetusCallChatInput");
    const text = input.value.trim();
    const callId = callState.call?.id;
    if (!text || !callId) return;
    input.value = "";
    try {
      const message = await api(`/calls/${callId}/chat`, "POST", { text });
      if (!callState.chatMessages.some((item) => item.id === message.id)) callState.chatMessages.push(message);
      renderCallChat();
    } catch (error) { input.value = text; toast(error.message); }
  }

  function showCallBanner(call) {
    if (state.activeChat?.id !== call.chatId || call.status === "ended" || call.status === "cancelled") return;
    removeCallBanner();
    const banner = document.createElement("div");
    banner.id = "meetusCallBanner";
    banner.className = "meetus-call-banner";
    banner.innerHTML = `<div class="meetus-call-banner-main"><strong>${call.mode === "stage" ? "Идёт трансляция" : "Идёт групповой звонок"}</strong><span>${escapeHtml(call.creator?.displayName || "Участники уже подключены")}</span></div><button type="button">Присоединиться</button>`;
    banner.querySelector("button").addEventListener("click", () => joinCall(call.id).catch((error) => toast(error.message)));
    document.querySelector(".chat-header")?.insertAdjacentElement("afterend", banner);
  }

  function removeCallBanner() {
    document.getElementById("meetusCallBanner")?.remove();
  }

  async function refreshActiveForChat() {
    const chat = state.activeChat;
    removeCallBanner();
    if (!chat) return;
    const seq = ++callState.activeCheck;
    try {
      const call = await api(`/calls/chat/${chat.id}/active`);
      if (seq !== callState.activeCheck) return;
      if (call && call.mode !== "private") showCallBanner(call);
    } catch {}
  }

  function injectCallsSidebar() {
    if (document.getElementById("callsTabButton")) return;
    const tabs = document.querySelector(".sidebar-mode-tabs");
    const requestsButton = document.getElementById("requestsTabButton");
    const contactListNode = document.getElementById("contactList");
    if (!tabs || !requestsButton || !contactListNode) return;

    tabs.classList.add("meetus-sidebar-four-tabs");
    const button = document.createElement("button");
    button.id = "callsTabButton";
    button.type = "button";
    button.textContent = "Звонки";
    tabs.insertBefore(button, requestsButton);

    const list = document.createElement("div");
    list.id = "callHistoryList";
    list.className = "chat-list meetus-call-history-list hidden";
    contactListNode.insertAdjacentElement("afterend", list);

    button.addEventListener("click", openCallsSidebar);
    ["chatsTabButton", "contactsTabButton", "requestsTabButton"].forEach((id) => {
      document.getElementById(id)?.addEventListener("click", closeCallsSidebarView);
    });
    callState.sidebarInjected = true;
  }

  function closeCallsSidebarView() {
    document.getElementById("callsTabButton")?.classList.remove("active");
    document.getElementById("callHistoryList")?.classList.add("hidden");
    document.querySelector(".sidebar-search-block")?.classList.remove("meetus-call-search-hidden");
  }

  async function openCallsSidebar() {
    injectCallsSidebar();
    state.sidebarMode = "calls";
    ["chatsTabButton", "contactsTabButton", "requestsTabButton"].forEach((id) => document.getElementById(id)?.classList.remove("active"));
    document.getElementById("callsTabButton")?.classList.add("active");
    ["chatList", "contactList", "requestList", "searchResults"].forEach((id) => document.getElementById(id)?.classList.add("hidden"));
    document.getElementById("callHistoryList")?.classList.remove("hidden");
    document.querySelector(".sidebar-search-block")?.classList.add("meetus-call-search-hidden");
    await loadCallHistory();
  }

  async function loadCallHistory(force = false) {
    if (callState.historyLoading) return;
    const root = document.getElementById("callHistoryList");
    if (!root) return;
    callState.historyLoading = true;
    if (!callState.history.length || force) root.innerHTML = '<div class="loading">Загружаем журнал звонков…</div>';
    try {
      callState.history = await api("/calls/history");
      renderCallHistory();
    } catch (error) {
      root.innerHTML = `<div class="empty-list">${escapeHtml(error.message || "Не удалось загрузить звонки")}</div>`;
    } finally {
      callState.historyLoading = false;
    }
  }

  function formatCallDuration(seconds) {
    const value = Math.max(0, Number(seconds) || 0);
    if (!value) return "";
    const hours = Math.floor(value / 3600);
    const minutes = Math.floor((value % 3600) / 60);
    const secs = value % 60;
    return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}` : `${minutes}:${String(secs).padStart(2, "0")}`;
  }

  function formatCallTime(value) {
    const date = new Date(value);
    const today = new Date();
    const sameDay = date.toDateString() === today.toDateString();
    return sameDay
      ? date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
      : date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  function callOutcomeText(item) {
    if (item.outcome === "busy") return "Линия занята";
    if (item.outcome === "offline") return "Без доступа к сети";
    if (item.outcome === "no_answer") return "Не взяли трубку";
    if (item.outcome === "caller_cancelled") return "Вы отменили звонок";
    if (item.outcome === "cancelled_by_peer") return "Пользователь отменил звонок";
    if (item.outcome === "declined_by_me") return "Вы отклонили звонок";
    if (item.outcome === "network_lost") return "Соединение потеряно";
    if (item.outcome === "missed") return "Пропущенный звонок";
    if (item.outcome === "declined") return "Вызов отклонён";
    if (item.outcome === "cancelled") return "Отменённый звонок";
    if (item.outcome === "ringing") return "Вызов…";
    if (item.outcome === "active") return "Идёт звонок";
    if (item.mode === "stage") return "Трансляция";
    if (item.mode === "group") return "Групповой звонок";
    return item.videoEnabled ? "Видеозвонок" : "Аудиозвонок";
  }

  function renderCallHistory() {
    const root = document.getElementById("callHistoryList");
    if (!root) return;
    if (!callState.history.length) {
      root.innerHTML = '<div class="empty-list">История звонков пока пустая</div>';
      return;
    }
    root.innerHTML = callState.history.map((item) => {
      const name = item.peer?.displayName || item.chat?.title || "Звонок";
      const duration = formatCallDuration(item.durationSeconds);
      const missed = item.outcome === "missed";
      const icon = missed ? svg.missed : (item.direction === "outgoing" ? svg.outgoing : svg.incoming);
      return `<button type="button" class="meetus-call-history-item ${missed ? "missed" : ""}" data-call-history-chat="${escapeHtml(item.chatId)}">
        <div class="avatar">${escapeHtml(initials(name))}</div>
        <div class="meetus-call-history-main"><strong>${escapeHtml(name)}</strong><span class="meetus-call-history-meta">${icon}${escapeHtml(callOutcomeText(item))}${duration ? ` • ${escapeHtml(duration)}` : ""}</span></div>
        <time>${escapeHtml(formatCallTime(item.createdAt))}</time>
        <span class="meetus-call-history-phone">${svg.phone}</span>
      </button>`;
    }).join("");
    root.querySelectorAll("[data-call-history-chat]").forEach((button) => {
      button.addEventListener("click", async () => {
        const chatId = button.dataset.callHistoryChat;
        let chat = state.chats?.find((item) => item.id === chatId);
        if (!chat) {
          await loadChats(false);
          chat = state.chats?.find((item) => item.id === chatId);
        }
        if (!chat) return toast("Чат для этого звонка не найден");
        await openChat(chat);
      });
    });
  }

  function bindSocket() {
    const socket = state.socket;
    if (!socket || socket === callState.boundSocket) return;
    callState.boundSocket = socket;
    socket.on("call.incoming", (call) => { showIncoming(call); loadCallHistory(true).catch(() => {}); });
    socket.on("call.outgoing", (call) => { if (!callState.call) showOutgoing(call); loadCallHistory(true).catch(() => {}); });
    socket.on("call.accepted", (call) => {
      if (callState.call?.id === call.id && !callState.room) joinCall(call.id).catch((error) => toast(error.message));
    });
    socket.on("call.available", (call) => showCallBanner(call));
    socket.on("call.ended", (call) => {
      if (callState.call?.id === call.id) handleCallEnded(call);
      if (state.activeChat?.id === call.chatId) removeCallBanner();
      loadCallHistory(true).catch(() => {});
    });
    socket.on("call.participant", ({ callId, participant, userId, action }) => {
      if (callState.call?.id !== callId) return;
      const id = participant?.user_id || userId;
      const list = callState.call.participants || (callState.call.participants = []);
      const index = list.findIndex((item) => item.user_id === id);
      if (participant && index >= 0) list[index] = { ...list[index], ...participant };
      else if (participant) list.push(participant);
      if (action === "left" && index >= 0) list[index].state = "left";
      renderParticipants();
    });
    socket.on("call.hand", ({ callId, userId, raised, participant }) => {
      if (callState.call?.id !== callId) return;
      const list = callState.call.participants || [];
      const index = list.findIndex((item) => item.user_id === userId);
      if (index >= 0) list[index] = { ...list[index], ...participant, hand_raised_at: raised ? (participant?.hand_raised_at || new Date().toISOString()) : null };
      if (userId === currentUserId()) { callState.hand = raised; updateControls(); }
      renderParticipants();
    });
    socket.on("call.role", ({ callId, userId, role, participant, reconnect }) => {
      if (callState.call?.id !== callId) return;
      const list = callState.call.participants || [];
      const index = list.findIndex((item) => item.user_id === userId);
      if (index >= 0) list[index] = { ...list[index], ...participant, role };
      if (userId === currentUserId()) {
        callState.role = role;
        callState.canPublish = role === "speaker" || role === "host";
        if (reconnect) joinCall(callId, true).catch((error) => toast(error.message));
      }
      renderParticipants();
      updateControls();
    });
    socket.on("call.chat", ({ callId, message }) => {
      if (!callState.call || callState.call.id !== callId) return;
      if (!callState.chatMessages.some((item) => item.id === message.id)) callState.chatMessages.push(message);
      renderCallChat();
    });
  }

  function isCallSoundMuted(call, respectChatMute = true) {
    try {
      if (typeof isAppMuted === "function" && isAppMuted()) return true;
    } catch {}
    if (!respectChatMute) return false;
    const chatId = call?.chatId || call?.chat_id || call?.chat?.id;
    if (!chatId) return false;
    try {
      if (typeof activeChatMuteStatus === "function" && activeChatMuteStatus(chatId)) return true;
    } catch {}
    const chat = (state.chats || []).find((item) => item.id === chatId);
    if (!chat?.is_muted) return false;
    if (!chat.muted_until) return true;
    const until = new Date(chat.muted_until).getTime();
    return Number.isFinite(until) && until > Date.now();
  }

  function fallbackRing(incoming) {
    if (isCallSoundMuted(callState.call, incoming)) return;
    const beep = () => {
      try {
        const context = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.frequency.value = incoming ? 720 : 510;
        gain.gain.setValueAtTime(.0001, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(.08, context.currentTime + .02);
        gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + .34);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(); oscillator.stop(context.currentTime + .36);
        oscillator.onended = () => context.close();
      } catch {}
    };
    beep();
    callState.ringTimer = setInterval(beep, incoming ? 1500 : 3000);
  }

  function playToneWithGap(url, gapMs, volume) {
    stopRing();
    const audio = new Audio(`${url}?v=0.6.25.2-community2tg10calls6`);
    audio.loop = false;
    audio.preload = "auto";
    audio.volume = volume;
    callState.ringAudio = audio;
    const replay = () => {
      if (callState.ringAudio !== audio) return;
      clearTimeout(callState.ringGapTimer);
      callState.ringGapTimer = setTimeout(() => {
        if (callState.ringAudio !== audio) return;
        try { audio.currentTime = 0; } catch {}
        audio.play().catch(() => fallbackRing(false));
      }, gapMs);
    };
    audio.addEventListener("ended", replay);
    audio.play().catch(() => fallbackRing(false));
  }

  function playEndTone() {
    if (isCallSoundMuted(callState.call, true)) return;
    const audio = new Audio(`/sounds/off.mp3?v=0.6.25.2-community2tg10calls7`);
    audio.preload = "auto";
    audio.volume = .72;
    audio.play().catch(() => {});
  }

  function startRing(incoming, call = callState.call) {
    stopRing();
    if (isCallSoundMuted(call, true)) return;
    if (incoming) {
      const audio = new Audio(`/sounds/zvonok.mp3?v=0.6.25.2-community2tg10calls6`);
      audio.loop = true;
      audio.preload = "auto";
      audio.volume = .9;
      callState.ringAudio = audio;
      audio.play().catch(() => fallbackRing(true));
      return;
    }
    playToneWithGap("/sounds/gudki.mp3", 1500, .18);
  }

  function startBusyTone() {
    stopRing();
    if (isCallSoundMuted(callState.call, true)) return;
    const audio = new Audio(`/sounds/zanyt.mp3?v=0.6.25.2-community2tg10calls6`);
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = .82;
    callState.ringAudio = audio;
    audio.play().catch(() => fallbackRing(false));
  }

  function clearCallTimers() {
    clearTimeout(callState.terminalTimer);
    clearTimeout(callState.noAnswerTimer);
    clearTimeout(callState.cameraAdaptTimer);
    callState.terminalTimer = null;
    callState.noAnswerTimer = null;
    callState.cameraAdaptTimer = null;
  }

  function scheduleTerminalClose(delay) {
    clearTimeout(callState.terminalTimer);
    callState.terminalTimer = setTimeout(() => {
      if (callState.room) disconnectRoom(true);
      else closeCallUi();
    }, delay);
  }

  function scheduleNoAnswerClose() {
    clearTimeout(callState.noAnswerTimer);
    callState.noAnswerTimer = setTimeout(() => {
      if (!callState.room && callState.call) {
        $("meetusCallStatus").textContent = "Не взяли трубку";
        stopRing();
        scheduleTerminalClose(2500);
      }
    }, 120_000);
  }

  function handleCallEnded(call) {
    stopRing();
    clearCallTimers();
    const wasActive = Boolean(callState.room || callState.call?.status === "active" || call?.status === "active" || call?.status === "ended");
    callState.call = { ...(callState.call || {}), ...call };
    const reason = call?.endReason || call?.end_reason;
    const isCaller = call?.createdBy === currentUserId() || call?.created_by === currentUserId();
    const labels = {
      busy: "Линия занята",
      offline: "Без доступа к сети",
      no_answer: isCaller ? "Не взяли трубку" : "Пропущенный звонок",
      caller_cancelled: isCaller ? "Вы отменили звонок" : "Пользователь отменил звонок",
      declined: isCaller ? "Вызов отклонён" : "Вы отклонили звонок",
      network_lost: "Соединение потеряно",
    };
    if (reason && labels[reason]) {
      $("meetusCallStatus").textContent = labels[reason];
      if (reason === "busy") startBusyTone();
      scheduleTerminalClose(reason === "busy" ? 20_000 : 3000);
      return;
    }
    if (wasActive && !callState.endingLocally) playEndTone();
    disconnectRoom(true);
  }

  function stopRing() {
    if (callState.ringTimer) clearInterval(callState.ringTimer);
    if (callState.ringGapTimer) clearTimeout(callState.ringGapTimer);
    callState.ringTimer = null;
    callState.ringGapTimer = null;
    if (callState.ringAudio) {
      callState.ringAudio.pause();
      try { callState.ringAudio.currentTime = 0; } catch {}
    }
    callState.ringAudio = null;
  }

  function chatActivityTime(chat) {
    const value = chat?.last_message_at || chat?.updated_at || chat?.created_at || 0;
    const time = new Date(value).getTime();
    return Number.isFinite(time) ? time : 0;
  }

  function installChatOrderHook() {
    if (callState.chatOrderHooked || typeof renderChats !== "function") return;
    callState.chatOrderHooked = true;
    const originalRenderChats = renderChats;
    renderChats = function calls3RenderChats(...args) {
      const activeId = state.activeChat?.id;
      const rows = [...(document.querySelectorAll("#chatList .chat-item[data-chat-id]") || [])];
      const previousIndex = activeId ? rows.findIndex((row) => row.dataset.chatId === activeId) : -1;
      const originalIndex = new Map((state.chats || []).map((chat, index) => [chat.id, index]));
      state.chats.sort((a, b) => {
        const delta = chatActivityTime(b) - chatActivityTime(a);
        return delta || ((originalIndex.get(a.id) || 0) - (originalIndex.get(b.id) || 0));
      });
      if (activeId && previousIndex >= 0) {
        const currentIndex = state.chats.findIndex((chat) => chat.id === activeId);
        if (currentIndex > previousIndex) {
          const [activeChat] = state.chats.splice(currentIndex, 1);
          state.chats.splice(Math.min(previousIndex, state.chats.length), 0, activeChat);
        }
      }
      return originalRenderChats.apply(this, args);
    };
  }

  function installHooks() {
    injectDom();
    injectCallsSidebar();
    installChatOrderHook();
    bindCallButton();
    bindSocket();
    const originalConnectSocket = connectSocket;
    connectSocket = function callsConnectSocket(...args) {
      const result = originalConnectSocket.apply(this, args);
      queueMicrotask(bindSocket);
      setTimeout(bindSocket, 300);
      return result;
    };
    const originalOpenChat = openChat;
    openChat = async function callsOpenChat(chat) {
      const result = await originalOpenChat.call(this, chat);
      bindCallButton();
      syncCallButtonAvailability();
      refreshActiveForChat();
      return result;
    };
    setInterval(() => { bindSocket(); injectCallsSidebar(); bindCallButton(); syncCallButtonAvailability(); installChatOrderHook(); }, 1000);
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    connection?.addEventListener?.("change", () => {
      if (callState.camera) handleLocalConnectionQuality(callState.networkQuality);
    });
    window.addEventListener("offline", () => {
      if (callState.call) $("meetusCallStatus").textContent = "Без доступа к сети";
    });
    window.addEventListener("online", () => {
      if (callState.room) $("meetusCallStatus").textContent = "Соединение…";
    });
    window.addEventListener("resize", () => {
      const pip = document.querySelector(".meetus-call-tile.meetus-call-pip");
      if (pip) requestAnimationFrame(() => clampPipPosition(pip));
    });
    window.addEventListener("beforeunload", () => {
      if (callState.call && callState.room) api(`/calls/${callState.call.id}/leave`, "POST", {}).catch(() => {});
    });
  }

  installHooks();
  window.MeetusCalls = { callState, joinCall, refreshActiveForChat, loadCallHistory, updateMediaLayout, resetGroupLayout, adaptLocalCamera };
})();
