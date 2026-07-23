/* MEETUS 0.6.25.2 COMMUNITY2-TG11-WORKSPACE4 — reliable pins, message links and rich text */
(() => {
  'use strict';

  const VERSION = '0.6.25.2-community2tg11workspace4';
  const fix = {
    lastContextMessage: null,
    lastSelection: null,
    deepLinkRunning: false,
    hooked: false,
  };

  const $ = (id) => document.getElementById(id);

  function workspaceApi(path, method = 'GET', body) {
    if (typeof request !== 'function') return Promise.reject(new Error('API Meetus ещё не загружено'));
    return request(`/workspace${path}`, {
      method,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  function notify(message, error = false) {
    try {
      if (typeof setUploadStatus === 'function') {
        setUploadStatus(message, error);
        setTimeout(() => setUploadStatus(''), error ? 4200 : 1800);
        return;
      }
    } catch {}
    console[error ? 'error' : 'log'](message);
  }

  function normalizedRole(chat) {
    return String(
      chat?.role ?? chat?.member_role ?? chat?.my_role ?? chat?.current_user_role ?? '',
    ).toLowerCase();
  }

  function isOwnerOrAdmin(chat) {
    if (!chat) return false;
    if (chat.type === 'private') return true;
    if (['owner', 'admin', 'creator'].includes(normalizedRole(chat))) return true;
    const userId = typeof state !== 'undefined' ? state.user?.id : null;
    return Boolean(
      userId && [chat.owner_id, chat.ownerId, chat.created_by, chat.createdBy, chat.creator_id, chat.creatorId]
        .filter(Boolean)
        .includes(userId),
    );
  }

  function messageChatId(message) {
    return message?.chat_id || message?.chatId || (typeof state !== 'undefined' ? state.activeChat?.id : null);
  }

  function canCopyMessageLink(message) {
    const chat = typeof state !== 'undefined' ? state.activeChat : null;
    return Boolean(message && chat && chat.type !== 'private' && isOwnerOrAdmin(chat));
  }

  function canPinMessage(message) {
    const chat = typeof state !== 'undefined' ? state.activeChat : null;
    return Boolean(message && chat && isOwnerOrAdmin(chat));
  }

  function currentPinnedId() {
    return window.MeetusWorkspace?.ws?.pinnedMessage?.id || null;
  }

  function actionSvg(kind) {
    if (kind === 'pin') {
      return '<svg viewBox="0 0 24 24"><path d="M9 4h6v5l3 3-5 1v6l-2 2v-8l-5-1 3-3V4Z"/></svg>';
    }
    return '<svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1"/></svg>';
  }

  function ensureContextActions() {
    const menu = $('messageContextMenu');
    if (!menu) return;

    menu.querySelectorAll('[data-workspace-message-action]').forEach((node) => node.remove());
    if (menu.querySelector('.workspace4-context-actions')) return;

    const info = menu.querySelector('[data-message-action="info"]');
    const divider = menu.querySelector('.message-context-divider');
    const anchor = divider || info?.nextSibling || null;
    const holder = document.createElement('div');
    holder.className = 'workspace4-context-actions';
    holder.innerHTML = `
      <button id="workspace4PinMessageAction" type="button" data-workspace4-message-action="pin">
        ${actionSvg('pin')}<span>Закрепить сообщение</span>
      </button>
      <button id="workspace4CopyLinkAction" type="button" data-workspace4-message-action="copy-link">
        ${actionSvg('link')}<span>Копировать ссылку на сообщение</span>
      </button>
    `;
    menu.insertBefore(holder, anchor);
  }

  function refreshContextActions(message) {
    ensureContextActions();
    const pin = $('workspace4PinMessageAction');
    const link = $('workspace4CopyLinkAction');
    if (pin) {
      pin.classList.toggle('hidden', !canPinMessage(message));
      const label = pin.querySelector('span');
      if (label) label.textContent = currentPinnedId() === message?.id ? 'Открепить сообщение' : 'Закрепить сообщение';
    }
    if (link) link.classList.toggle('hidden', !canCopyMessageLink(message));
  }

  async function copyText(value) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(value);
        return true;
      } catch {}
    }
    const field = document.createElement('textarea');
    field.value = value;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.left = '-9999px';
    field.style.top = '0';
    document.body.appendChild(field);
    field.focus();
    field.select();
    field.setSelectionRange(0, field.value.length);
    let copied = false;
    try { copied = document.execCommand('copy'); } catch {}
    field.remove();
    return copied;
  }

  function ensureCopyFallbackModal() {
    if ($('workspace4CopyModal')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <div id="workspace4CopyModal" class="workspace4-modal hidden" role="dialog" aria-modal="true">
        <div class="workspace4-card">
          <div class="workspace4-card-head"><strong>Ссылка на сообщение</strong><button type="button" data-workspace4-close>×</button></div>
          <input id="workspace4CopyValue" type="text" readonly>
          <div class="workspace4-card-actions"><button type="button" data-workspace4-close>Закрыть</button><button id="workspace4CopyAgain" type="button" class="primary">Копировать</button></div>
        </div>
      </div>
    `);
    const modal = $('workspace4CopyModal');
    modal.addEventListener('click', (event) => {
      if (event.target === modal || event.target.closest('[data-workspace4-close]')) modal.classList.add('hidden');
    });
    $('workspace4CopyAgain').addEventListener('click', async () => {
      const input = $('workspace4CopyValue');
      input.select();
      const ok = await copyText(input.value);
      notify(ok ? 'Ссылка скопирована' : 'Выделите ссылку и нажмите Ctrl+C', !ok);
    });
  }

  async function copyMessageLink(message) {
    const chat = typeof state !== 'undefined' ? state.activeChat : null;
    if (!canCopyMessageLink(message)) {
      notify('Ссылка доступна владельцу или администратору группы/канала', true);
      return;
    }
    const chatId = messageChatId(message);
    if (!chatId || !message?.id) return notify('Не удалось определить сообщение', true);
    const url = new URL(location.origin + (location.pathname || '/'));
    url.searchParams.set('chat', chatId);
    url.searchParams.set('message', message.id);
    const value = url.toString();
    const ok = await copyText(value);
    if (ok) {
      notify('Ссылка на сообщение скопирована');
      return;
    }
    ensureCopyFallbackModal();
    $('workspace4CopyValue').value = value;
    $('workspace4CopyModal').classList.remove('hidden');
    requestAnimationFrame(() => {
      $('workspace4CopyValue').focus();
      $('workspace4CopyValue').select();
    });
  }

  async function pinMessage(message) {
    const chat = typeof state !== 'undefined' ? state.activeChat : null;
    if (!canPinMessage(message)) {
      notify('Закреплять сообщения здесь может только владелец или администратор', true);
      return;
    }
    const chatId = messageChatId(message);
    if (!chatId || !message?.id) return notify('Не удалось определить сообщение', true);
    const unpin = currentPinnedId() === message.id;
    try {
      const result = await workspaceApi(`/chats/${encodeURIComponent(chatId)}/pinned-message`, 'POST', {
        messageId: unpin ? null : message.id,
      });
      if (window.MeetusWorkspace?.ws) window.MeetusWorkspace.ws.pinnedMessage = result?.message || null;
      if (typeof window.MeetusWorkspace?.loadPinnedMessage === 'function' && state.activeChat?.id === chatId) {
        await window.MeetusWorkspace.loadPinnedMessage();
      }
      notify(unpin ? 'Сообщение откреплено' : 'Сообщение закреплено');
    } catch (error) {
      notify(error?.message || 'Не удалось закрепить сообщение', true);
    }
  }

  function rememberMessage(message) {
    fix.lastContextMessage = message || null;
    refreshContextActions(message);
  }

  function installContextMenuHook() {
    if (fix.hooked || typeof openMessageContextMenu !== 'function') return;
    fix.hooked = true;
    const original = openMessageContextMenu;
    openMessageContextMenu = function workspace4OpenContext(message, trigger) {
      fix.lastContextMessage = message;
      const result = original.call(this, message, trigger);
      refreshContextActions(message);
      requestAnimationFrame(() => refreshContextActions(message));
      return result;
    };

    document.addEventListener('pointerdown', (event) => {
      const action = event.target.closest?.('[data-workspace4-message-action]');
      if (!action) return;
      const message = fix.lastContextMessage || (typeof state !== 'undefined' ? state.contextMessage : null);
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      try { if (typeof closeMessageContextMenu === 'function') closeMessageContextMenu(); } catch {}
      if (!message) return notify('Сообщение не выбрано', true);
      if (action.dataset.workspace4MessageAction === 'pin') void pinMessage(message);
      if (action.dataset.workspace4MessageAction === 'copy-link') void copyMessageLink(message);
    }, true);
  }

  function formatMarkers(action) {
    return {
      bold: ['**', '**'],
      italic: ['__', '__'],
      underline: ['++', '++'],
    }[action] || null;
  }

  function activeTextInput(preferred = null) {
    if (preferred && document.contains(preferred)) return preferred;
    const active = document.activeElement;
    if (active?.matches?.('#messageInput,#community2ThreadInput')) return active;
    return $('messageInput') || $('community2ThreadInput');
  }

  function applyFormat(action, target = null) {
    const input = activeTextInput(target);
    if (!input) return;
    const markers = formatMarkers(action);
    if (!markers) return;
    const start = Number.isInteger(input.selectionStart) ? input.selectionStart : input.value.length;
    const end = Number.isInteger(input.selectionEnd) ? input.selectionEnd : start;
    const selected = input.value.slice(start, end);
    const replacement = `${markers[0]}${selected || 'текст'}${markers[1]}`;
    input.setRangeText(replacement, start, end, 'end');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.focus();
    if (!selected) input.setSelectionRange(start + markers[0].length, start + markers[0].length + 4);
  }

  function ensureLinkEditor() {
    if ($('workspace4LinkModal')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <div id="workspace4LinkModal" class="workspace4-modal hidden" role="dialog" aria-modal="true">
        <div class="workspace4-card">
          <div class="workspace4-card-head"><strong>Вставить ссылку в текст</strong><button type="button" data-workspace4-link-close>×</button></div>
          <label>Текст ссылки<input id="workspace4LinkText" type="text" autocomplete="off"></label>
          <label>Адрес ссылки<input id="workspace4LinkUrl" type="url" value="https://" autocomplete="off"></label>
          <div class="workspace4-card-actions"><button type="button" data-workspace4-link-close>Отмена</button><button id="workspace4LinkApply" type="button" class="primary">Вставить</button></div>
        </div>
      </div>
    `);
    const modal = $('workspace4LinkModal');
    modal.addEventListener('click', (event) => {
      if (event.target === modal || event.target.closest('[data-workspace4-link-close]')) modal.classList.add('hidden');
    });
    $('workspace4LinkApply').addEventListener('click', () => {
      const selection = fix.lastSelection;
      const input = activeTextInput(selection?.input);
      if (!input) return;
      const label = $('workspace4LinkText').value.trim() || 'ссылка';
      let href = $('workspace4LinkUrl').value.trim();
      if (!/^https?:\/\//i.test(href)) href = `https://${href}`;
      if (!/^https?:\/\/[^\s]+$/i.test(href)) return notify('Введите корректную ссылку', true);
      const start = selection?.start ?? input.selectionStart ?? input.value.length;
      const end = selection?.end ?? input.selectionEnd ?? start;
      input.setRangeText(`[${label}](${href})`, start, end, 'end');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      modal.classList.add('hidden');
      input.focus();
    });
  }

  function openLinkEditor(target = null) {
    const input = activeTextInput(target);
    if (!input) return;
    ensureLinkEditor();
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    fix.lastSelection = { input, start, end };
    $('workspace4LinkText').value = input.value.slice(start, end);
    $('workspace4LinkUrl').value = 'https://';
    $('workspace4LinkModal').classList.remove('hidden');
    requestAnimationFrame(() => $('workspace4LinkUrl').focus());
  }

  function createFormatControls(target, compact = false) {
    const root = document.createElement('div');
    root.className = `workspace4-format-controls${compact ? ' compact' : ''}`;
    root.innerHTML = `
      <button type="button" class="workspace4-format-toggle" title="Форматирование">Aa</button>
      <div class="workspace4-format-menu hidden">
        <button type="button" data-workspace4-format="bold" title="Жирный"><b>B</b></button>
        <button type="button" data-workspace4-format="italic" title="Курсив"><i>I</i></button>
        <button type="button" data-workspace4-format="underline" title="Подчёркнутый"><u>U</u></button>
        <button type="button" data-workspace4-format="link" title="Вставить ссылку">🔗</button>
      </div>
    `;
    const toggle = root.querySelector('.workspace4-format-toggle');
    const menu = root.querySelector('.workspace4-format-menu');
    toggle.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      menu.classList.toggle('hidden');
      target.focus();
    });
    root.addEventListener('mousedown', (event) => event.preventDefault());
    root.addEventListener('click', (event) => {
      const action = event.target.closest('[data-workspace4-format]')?.dataset.workspace4Format;
      if (!action) return;
      event.preventDefault();
      event.stopPropagation();
      if (action === 'link') openLinkEditor(target);
      else applyFormat(action, target);
      menu.classList.add('hidden');
    });
    return root;
  }

  function ensureMainFormatControls() {
    const form = $('composer');
    const input = $('messageInput');
    if (!form || !input) return;
    $('workspaceFormatBar')?.remove();
    if ($('workspace4MainFormat')) return;
    const controls = createFormatControls(input);
    controls.id = 'workspace4MainFormat';
    const emoji = $('emojiButton');
    if (emoji) emoji.insertAdjacentElement('afterend', controls);
    else form.insertBefore(controls, form.firstChild);
  }

  function ensureThreadFormatControls() {
    const input = $('community2ThreadInput');
    if (!input || $('workspace4ThreadFormat')) return;
    const controls = createFormatControls(input, true);
    controls.id = 'workspace4ThreadFormat';
    const emoji = $('community2ThreadEmoji');
    if (emoji) emoji.insertAdjacentElement('afterend', controls);
    else input.parentElement?.insertBefore(controls, input);
  }

  function installKeyboardFormatting() {
    document.addEventListener('keydown', (event) => {
      const input = event.target?.matches?.('#messageInput,#community2ThreadInput') ? event.target : null;
      if (!input || !(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      const action = { b: 'bold', i: 'italic', u: 'underline' }[key];
      if (action) {
        event.preventDefault();
        applyFormat(action, input);
      }
      if (key === 'k') {
        event.preventDefault();
        openLinkEditor(input);
      }
    });
  }

  async function openDeepLinkReliably() {
    if (fix.deepLinkRunning) return;
    const params = new URLSearchParams(location.search);
    const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
    const chatId = params.get('chat') || hash.get('chat');
    const messageId = params.get('message') || hash.get('message');
    if (!chatId || !messageId) return;
    if (typeof state === 'undefined' || !state.user) return;
    fix.deepLinkRunning = true;
    try {
      if (typeof openSearchMessageResult === 'function') {
        await openSearchMessageResult(chatId, messageId);
        const target = $('messageArea')?.querySelector(`[data-message-id="${CSS.escape(messageId)}"]`);
        if (!target) throw new Error('Сообщение не найдено или нет доступа');
        target.classList.add('workspace4-deep-link-target');
        setTimeout(() => target.classList.remove('workspace4-deep-link-target'), 3000);
        history.replaceState({}, '', location.pathname || '/');
      }
    } catch (error) {
      notify(error?.message || 'Не удалось открыть сообщение по ссылке', true);
    } finally {
      fix.deepLinkRunning = false;
    }
  }

  function boot() {
    ensureContextActions();
    installContextMenuHook();
    ensureMainFormatControls();
    ensureThreadFormatControls();
    ensureLinkEditor();
    ensureCopyFallbackModal();
    installKeyboardFormatting();

    const observer = new MutationObserver(() => {
      ensureContextActions();
      ensureMainFormatControls();
      ensureThreadFormatControls();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const timer = setInterval(() => {
      ensureContextActions();
      ensureMainFormatControls();
      ensureThreadFormatControls();
      if (typeof state !== 'undefined' && state.user) {
        void openDeepLinkReliably();
        if (!location.search.includes('message=') && !location.hash.includes('message=')) clearInterval(timer);
      }
    }, 400);

    window.addEventListener('popstate', () => void openDeepLinkReliably());
    window.addEventListener('hashchange', () => void openDeepLinkReliably());
    document.addEventListener('click', (event) => {
      if (!event.target.closest('.workspace4-format-controls')) {
        document.querySelectorAll('.workspace4-format-menu').forEach((menu) => menu.classList.add('hidden'));
      }
    });
  }

  boot();
  window.MeetusWorkspace4 = {
    VERSION,
    refreshContextActions,
    copyMessageLink,
    pinMessage,
    openDeepLinkReliably,
    ensureMainFormatControls,
  };
})();
