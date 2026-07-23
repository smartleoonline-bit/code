/* MEETUS 0.6.25.2 COMMUNITY2-TG11-WORKSPACE7 — stable post-call sidebar and exact search jumps */
(() => {
  'use strict';

  const VERSION = '0.6.25.2-community2tg11workspace7';
  const runtime = {
    installed: false,
    sidebarHooked: false,
    jumpSequence: 0,
    activeJump: null,
    callObserver: null,
  };

  const byId = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function notify(message, error = false) {
    try {
      if (typeof setUploadStatus === 'function') {
        setUploadStatus(message, error);
        setTimeout(() => setUploadStatus(''), error ? 4200 : 1800);
        return;
      }
      if (typeof toast === 'function') return toast(message);
    } catch {}
    console[error ? 'error' : 'log'](message);
  }

  function normalizeSidebarMode(mode = null) {
    const resolved = mode || (typeof state !== 'undefined' ? state.sidebarMode : null) ||
      (byId('callsTabButton')?.classList.contains('active') ? 'calls' :
        byId('contactsTabButton')?.classList.contains('active') ? 'contacts' :
          byId('requestsTabButton')?.classList.contains('active') ? 'requests' : 'chats');

    const isCalls = resolved === 'calls';
    const callsButton = byId('callsTabButton');
    const callsList = byId('callHistoryList');
    const chatList = byId('chatList');
    const contactList = byId('contactList');
    const requestList = byId('requestList');
    const searchResults = byId('searchResults');
    const searchBlock = document.querySelector('.sidebar-search-block');

    callsButton?.classList.toggle('active', isCalls);
    callsList?.classList.toggle('hidden', !isCalls);
    chatList?.classList.toggle('hidden', resolved !== 'chats');
    contactList?.classList.toggle('hidden', resolved !== 'contacts');
    requestList?.classList.toggle('hidden', resolved !== 'requests');
    if (isCalls) searchResults?.classList.add('hidden');
    searchBlock?.classList.toggle('meetus-call-search-hidden', isCalls);

    document.documentElement.dataset.meetusSidebarMode = resolved;
    if (typeof state !== 'undefined') state.sidebarMode = resolved;

    const folderBar = byId('workspaceFolderBar');
    if (folderBar) {
      const showFolders = resolved === 'chats';
      folderBar.classList.toggle('hidden', !showFolders);
      folderBar.hidden = !showFolders;
      folderBar.setAttribute('aria-hidden', showFolders ? 'false' : 'true');
    }
  }

  function hookSidebarMode() {
    if (runtime.sidebarHooked || typeof setSidebarMode !== 'function') return;
    runtime.sidebarHooked = true;
    const base = setSidebarMode;
    setSidebarMode = function workspace7SidebarMode(mode, ...args) {
      const result = base.call(this, mode, ...args);
      queueMicrotask(() => normalizeSidebarMode(mode));
      requestAnimationFrame(() => normalizeSidebarMode(mode));
      setTimeout(() => normalizeSidebarMode(mode), 80);
      return result;
    };
  }

  function watchCallClose() {
    if (runtime.callObserver) return;
    let callWasActive = document.body.classList.contains('meetus-call-active');
    runtime.callObserver = new MutationObserver(() => {
      const active = document.body.classList.contains('meetus-call-active');
      const shellVisible = !byId('meetusCallShell')?.classList.contains('meetus-call-hidden');
      if (callWasActive && !active && !shellVisible) {
        [0, 80, 220].forEach((delay) => setTimeout(() => normalizeSidebarMode(), delay));
      }
      callWasActive = active;
    });
    runtime.callObserver.observe(document.body, { attributes: true, attributeFilter: ['class'], childList: true, subtree: false });
  }

  function findChat(chatId) {
    return typeof state !== 'undefined' && Array.isArray(state.chats)
      ? state.chats.find((item) => item.id === chatId)
      : null;
  }

  async function resolveChat(chatId) {
    let chat = findChat(chatId);
    if (!chat && typeof loadChats === 'function') {
      await loadChats(false);
      chat = findChat(chatId);
    }
    return chat || null;
  }

  function normalizeContext(result) {
    if (Array.isArray(result)) return result;
    return [
      ...(Array.isArray(result?.before) ? result.before : []),
      ...(Array.isArray(result?.messages) ? result.messages : []),
      ...(result?.target ? [result.target] : []),
      ...(result?.message ? [result.message] : []),
      ...(Array.isArray(result?.after) ? result.after : []),
      ...(Array.isArray(result?.items) ? result.items : []),
    ];
  }

  function messageTime(message, fallback) {
    const raw = message?.created_at || message?.createdAt || message?.timestamp;
    const value = raw ? new Date(raw).getTime() : NaN;
    return Number.isFinite(value) ? value : fallback;
  }

  function mergeMessages(...sets) {
    const map = new Map();
    let index = 0;
    sets.flat().filter(Boolean).forEach((message) => {
      const id = message?.id || message?.message_id;
      if (!id) return;
      const old = map.get(id);
      map.set(id, { ...(old || {}), ...message, __workspace7Index: old?.__workspace7Index ?? index++ });
    });
    return [...map.values()]
      .sort((a, b) => messageTime(a, a.__workspace7Index) - messageTime(b, b.__workspace7Index) || a.__workspace7Index - b.__workspace7Index)
      .map(({ __workspace7Index, ...message }) => message);
  }

  function escapedId(value) {
    return typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(value) : String(value).replace(/["\\]/g, '\\$&');
  }

  function findMessage(messageId) {
    const id = escapedId(messageId);
    return document.querySelector(`[data-message-id="${id}"], [data-id="${id}"].message, #message-${id}`);
  }

  async function waitForMessage(messageId, timeout = 6000) {
    const started = performance.now();
    while (performance.now() - started < timeout) {
      const target = findMessage(messageId);
      if (target) return target;
      await sleep(40);
    }
    return null;
  }

  function scrollParent(target) {
    let node = target?.parentElement;
    while (node && node !== document.body) {
      const style = getComputedStyle(node);
      if (/(auto|scroll|overlay)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 3) return node;
      node = node.parentElement;
    }
    return byId('messageArea') || document.scrollingElement;
  }

  function exactTop(scroller, target) {
    if (!scroller || !target) return 0;
    if (scroller === document.scrollingElement || scroller === document.documentElement || scroller === document.body) {
      const desired = window.scrollY + target.getBoundingClientRect().top - Math.max(88, window.innerHeight * .24);
      return Math.max(0, desired);
    }
    const sr = scroller.getBoundingClientRect();
    const tr = target.getBoundingClientRect();
    const desired = scroller.scrollTop + tr.top - sr.top - Math.max(72, scroller.clientHeight * .24);
    return Math.max(0, Math.min(scroller.scrollHeight - scroller.clientHeight, desired));
  }

  function applyExactPosition(scroller, target) {
    const top = exactTop(scroller, target);
    if (scroller === document.scrollingElement || scroller === document.documentElement || scroller === document.body) {
      window.scrollTo({ top, behavior: 'auto' });
    } else {
      scroller.scrollTop = top;
    }
  }

  function stopActiveJump() {
    const jump = runtime.activeJump;
    if (!jump) return;
    jump.cancelled = true;
    jump.cleanup?.();
    runtime.activeJump = null;
  }

  async function stabilizeExactMessage(messageId, sequence) {
    const target = await waitForMessage(messageId);
    if (!target || sequence !== runtime.jumpSequence) throw new Error('Сообщение не найдено или было удалено');
    const scroller = scrollParent(target);
    if (!scroller) throw new Error('Не найден контейнер сообщений');

    stopActiveJump();
    const jump = { cancelled: false, cleanup: null };
    runtime.activeJump = jump;

    const cancelByUser = () => {
      jump.cancelled = true;
      jump.cleanup?.();
      if (runtime.activeJump === jump) runtime.activeJump = null;
    };
    const options = { passive: true, once: true };
    scroller.addEventListener('wheel', cancelByUser, options);
    scroller.addEventListener('touchstart', cancelByUser, options);
    scroller.addEventListener('pointerdown', cancelByUser, options);
    window.addEventListener('keydown', cancelByUser, { once: true });

    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        if (!jump.cancelled && sequence === runtime.jumpSequence) applyExactPosition(scroller, findMessage(messageId) || target);
      });
      resizeObserver.observe(target);
      resizeObserver.observe(scroller);
    }

    jump.cleanup = () => {
      resizeObserver?.disconnect();
      scroller.removeEventListener('wheel', cancelByUser);
      scroller.removeEventListener('touchstart', cancelByUser);
      scroller.removeEventListener('pointerdown', cancelByUser);
      window.removeEventListener('keydown', cancelByUser);
    };

    applyExactPosition(scroller, target);
    [70, 170, 340, 620].forEach((delay) => {
      setTimeout(() => {
        if (jump.cancelled || sequence !== runtime.jumpSequence) return;
        applyExactPosition(scroller, findMessage(messageId) || target);
      }, delay);
    });

    const finalTarget = findMessage(messageId) || target;
    document.querySelectorAll('.workspace7-search-hit,.workspace6-search-hit').forEach((node) => node.classList.remove('workspace7-search-hit', 'workspace6-search-hit'));
    finalTarget.classList.add('workspace7-search-hit');
    setTimeout(() => finalTarget?.classList.remove('workspace7-search-hit'), 2600);

    setTimeout(() => {
      if (runtime.activeJump === jump) {
        jump.cleanup?.();
        runtime.activeJump = null;
      }
    }, 900);
    return finalTarget;
  }

  function showJumpOverlay() {
    const area = byId('messageArea');
    const host = area?.parentElement;
    if (!area || !host) return () => {};
    host.classList.add('workspace7-jump-host');
    let overlay = byId('workspace7JumpOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'workspace7JumpOverlay';
      overlay.className = 'workspace7-jump-overlay';
      overlay.innerHTML = '<span class="workspace7-jump-spinner"></span><span>Открываем сообщение…</span>';
      host.append(overlay);
    }
    area.classList.add('workspace7-message-area-hidden');
    overlay.classList.remove('hidden');
    return () => {
      area.classList.remove('workspace7-message-area-hidden');
      overlay.classList.add('hidden');
    };
  }

  async function workspace7OpenMessage(chatId, messageId, options = {}) {
    if (!chatId || !messageId) throw new Error('Некорректная ссылка на сообщение');
    const sequence = ++runtime.jumpSequence;
    stopActiveJump();

    normalizeSidebarMode('chats');
    const chat = await resolveChat(chatId);
    if (!chat) throw new Error('Чат не найден или нет доступа');

    const dialogQuery = options.dialogQuery ?? byId('chatSearchInput')?.value ?? '';
    await openChat(chat);
    if (sequence !== runtime.jumpSequence) return null;

    const hideOverlay = showJumpOverlay();
    try {
      const latest = Array.isArray(state.activeMessages) ? [...state.activeMessages] : [];
      const contextPromise = request(`/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}/context?limit=200`)
        .then(normalizeContext)
        .catch((error) => {
          if (findMessage(messageId)) return [];
          throw error;
        });

      // openChat() deliberately pins the chat to bottom several times for 760 ms.
      // Wait until those native timers are fully finished before placing search context.
      const [context] = await Promise.all([contextPromise, sleep(860)]);
      if (sequence !== runtime.jumpSequence) return null;

      const merged = mergeMessages(context, latest);
      const area = byId('messageArea');
      if (merged.length && area && typeof appendMessage === 'function') {
        state.activeMessages = merged;
        state.searchContextActive = true;
        area.innerHTML = '';
        merged.forEach((message) => appendMessage(message));
      }

      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const target = await stabilizeExactMessage(messageId, sequence);
      hideOverlay();

      if (options.fromDialogSearch) {
        const panel = byId('chatSearchPanel');
        const results = byId('chatSearchResults');
        const input = byId('chatSearchInput');
        const count = byId('chatSearchCount');
        state.dialogSearchChatId = chatId;
        panel?.classList.remove('hidden');
        results?.classList.add('hidden');
        if (input) input.value = dialogQuery;
        if (count) count.textContent = 'Сообщение открыто';
      } else {
        byId('searchResults')?.classList.add('hidden');
        const input = byId('searchInput');
        if (input) input.value = '';
      }
      return target;
    } finally {
      hideOverlay();
    }
  }

  function captureSearchClicks() {
    document.addEventListener('click', (event) => {
      const dialogButton = event.target.closest?.('[data-workspace6-dialog-message]');
      const globalButton = event.target.closest?.('[data-workspace6-message]');
      const button = dialogButton || globalButton;
      if (!button) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const chatId = dialogButton
        ? dialogButton.dataset.workspace6DialogChat
        : globalButton.dataset.workspace6MessageChat;
      const messageId = dialogButton
        ? dialogButton.dataset.workspace6DialogMessage
        : globalButton.dataset.workspace6Message;
      const dialogQuery = dialogButton ? byId('chatSearchInput')?.value || '' : '';

      void workspace7OpenMessage(chatId, messageId, {
        fromDialogSearch: Boolean(dialogButton),
        dialogQuery,
      }).catch((error) => notify(error?.message || 'Не удалось открыть сообщение', true));
    }, true);
  }

  function installOverrides() {
    try { openSearchMessageResult = workspace7OpenMessage; } catch {}
    if (window.MeetusWorkspace6) window.MeetusWorkspace6.workspace6OpenMessage = workspace7OpenMessage;
    window.MeetusWorkspace7 = { VERSION, workspace7OpenMessage, normalizeSidebarMode };
  }

  function install() {
    if (runtime.installed) return;
    if (typeof state === 'undefined' || typeof request !== 'function' || typeof openChat !== 'function') return;
    runtime.installed = true;
    hookSidebarMode();
    normalizeSidebarMode();
    watchCallClose();
    captureSearchClicks();
    installOverrides();

    document.addEventListener('click', (event) => {
      const tab = event.target.closest?.('#chatsTabButton,#contactsTabButton,#requestsTabButton,#callsTabButton');
      if (!tab) return;
      [0, 40, 120].forEach((delay) => setTimeout(() => normalizeSidebarMode(), delay));
    }, true);

    setInterval(() => {
      hookSidebarMode();
      if (!document.body.classList.contains('meetus-call-active')) normalizeSidebarMode();
    }, 1200);
  }

  const timer = setInterval(() => {
    install();
    if (runtime.installed) clearInterval(timer);
  }, 100);
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', install, { once: true }) : install();
})();
