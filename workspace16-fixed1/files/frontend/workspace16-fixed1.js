/* MEETUS 0.6.25.2 COMMUNITY2-TG11-WORKSPACE16-FIX1
 * Targeted frontend-only patch over WORKSPACE15:
 * - immediate community profile refresh;
 * - stable avatar edit pencil;
 * - video quality selector without a video editor;
 * - Telegram-like multi-message forwarding to one or more contacts.
 */
(() => {
  'use strict';

  const VERSION = '0.6.25.2-community2tg11workspace16fix1';
  const runtime = {
    installed: false,
    requestWrapped: false,
    contextWrapped: false,
    mediaPreviewWrapped: false,
    selectedMessages: new Map(),
    selectedRecipients: new Set(),
    selectionMode: false,
    contactQuery: '',
    forwarding: false,
    observerQueued: false,
  };

  const byId = (id) => document.getElementById(id);
  const all = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const esc = (value = '') => String(value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  const normalize = (value = '') => String(value).replace(/\s+/g, ' ').trim();

  function bridgeState() {
    try {
      if (!window.state && typeof state !== 'undefined') window.state = state;
      return window.state || (typeof state !== 'undefined' ? state : null);
    } catch {
      return window.state || null;
    }
  }

  function notice(message, error = false, timeout = 2800) {
    try {
      if (typeof setUploadStatus === 'function') {
        setUploadStatus(message, error);
        if (message) window.setTimeout(() => setUploadStatus(''), timeout);
        return;
      }
    } catch {}
    console[error ? 'error' : 'log'](message);
  }

  function avatarUrl(key) {
    return key ? `/api/media/${encodeURIComponent(key)}` : '';
  }

  function initials(name = '') {
    const words = normalize(name).split(' ').filter(Boolean);
    return (words.length > 1 ? words[0][0] + words[1][0] : words[0]?.slice(0, 2) || 'К').toUpperCase();
  }

  function avatarMarkup(name, key) {
    const letters = esc(initials(name));
    return `<span>${letters}</span>${key ? `<img src="${esc(avatarUrl(key))}" alt="${esc(name)}">` : ''}`;
  }

  function currentChatId() {
    const app = bridgeState();
    return app?.activeChat?.id || app?.managedCommunity?.id || null;
  }

  function applyCommunityProfileImmediately(chatId, profile) {
    if (!chatId || !profile) return;
    const app = bridgeState();
    if (!app) return;

    const description = String(profile.description ?? profile.about ?? '');
    const avatarKey = profile.avatar_key ?? profile.avatarKey ?? null;
    const title = profile.title || app.managedCommunity?.title || app.activeChat?.title || 'Сообщество';

    const patchChat = (chat) => {
      if (!chat || String(chat.id || '') !== String(chatId)) return;
      chat.description = description;
      chat.avatar_key = avatarKey;
      chat.avatarKey = avatarKey;
    };

    if (Array.isArray(app.chats)) app.chats.forEach(patchChat);
    patchChat(app.activeChat);
    patchChat(app.managedCommunity);

    if (app.managedCommunityInfo && String(app.managedCommunity?.id || '') === String(chatId)) {
      app.managedCommunityInfo.description = description;
      app.managedCommunityInfo.avatar_key = avatarKey;
      app.managedCommunityInfo.avatarKey = avatarKey;
      if (profile.title) app.managedCommunityInfo.title = profile.title;
    }

    try { if (typeof renderChats === 'function') renderChats(); } catch {}

    const managedOpen = !byId('communityManageModal')?.classList.contains('hidden') &&
      String(app.managedCommunity?.id || '') === String(chatId);

    if (managedOpen) {
      try {
        if (typeof applyCommunityInfo === 'function' && app.managedCommunityInfo) {
          applyCommunityInfo(app.managedCommunityInfo);
        }
      } catch (error) {
        console.warn('WORKSPACE16-FIX1 applyCommunityInfo', error);
      }

      const descriptionNode = byId('communityManageDescription');
      if (descriptionNode && typeof applyCommunityInfo !== 'function') {
        descriptionNode.textContent = description || 'Описание не заполнено';
      }

      try {
        if (typeof setAvatarElement === 'function') {
          setAvatarElement(byId('communityManageAvatar'), title, avatarKey);
        } else {
          const avatar = byId('communityManageAvatar');
          if (avatar) avatar.innerHTML = avatarMarkup(title, avatarKey);
        }
      } catch {}
    }

    try {
      const header = byId('chatAvatar') || document.querySelector('#chatHeader .avatar,.chat-header .avatar');
      if (header && String(app.activeChat?.id || '') === String(chatId)) {
        if (typeof setAvatarElement === 'function') setAvatarElement(header, title, avatarKey);
        else header.innerHTML = avatarMarkup(title, avatarKey);
      }
    } catch {}

    const detail = { chatId, profile: { ...profile, description, avatar_key: avatarKey } };
    window.dispatchEvent(new CustomEvent('meetus:community-profile-immediate', { detail }));
  }

  function wrapRequest() {
    if (runtime.requestWrapped || typeof request !== 'function') return;
    runtime.requestWrapped = true;
    const base = request;

    request = async function workspace16FixRequest(path, options = {}) {
      const result = await base.apply(this, arguments);
      const method = String(options?.method || 'GET').toUpperCase();
      const match = String(path || '').match(/^\/workspace\/chats\/([^/]+)\/profile(?:\?.*)?$/i);
      if (match && method === 'PATCH' && result) {
        const chatId = decodeURIComponent(match[1]);
        applyCommunityProfileImmediately(chatId, result);
        [60, 220, 650].forEach((delay) => window.setTimeout(() => applyCommunityProfileImmediately(chatId, result), delay));
      }
      return result;
    };
  }

  function messageDeleted(message) {
    return Boolean(message?.metadata?.deletedForEveryone);
  }

  function selectedMessagesInOrder() {
    const app = bridgeState();
    const active = Array.isArray(app?.activeMessages) ? app.activeMessages : [];
    const ordered = active.filter((item) => runtime.selectedMessages.has(String(item.id)));
    const missing = [...runtime.selectedMessages.values()].filter((item) => !ordered.some((row) => String(row.id) === String(item.id)));
    return [...ordered, ...missing].filter((item) => item?.id && !messageDeleted(item));
  }

  function injectUi() {
    if (!byId('workspace16ForwardSelectionBar')) {
      document.body.insertAdjacentHTML('beforeend', `
        <div id="workspace16ForwardSelectionBar" class="workspace16-forward-selection hidden" role="toolbar" aria-label="Выбранные сообщения">
          <button type="button" class="workspace16-selection-close" data-workspace16-selection-cancel aria-label="Отменить">×</button>
          <div><strong id="workspace16SelectionCount">0</strong><span>выбрано</span></div>
          <button id="workspace16SelectionNext" type="button" class="workspace16-selection-next">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 3 9 15M21 3l-7 18-5-6-6-5z"/></svg>
            <span>Переслать</span>
          </button>
        </div>
        <div id="workspace16ForwardModal" class="workspace16-forward-backdrop hidden" role="dialog" aria-modal="true" aria-labelledby="workspace16ForwardTitle">
          <section class="workspace16-forward-card">
            <header>
              <div><h3 id="workspace16ForwardTitle">Переслать сообщения</h3><small id="workspace16ForwardSubtitle">Выберите получателей</small></div>
              <button type="button" data-workspace16-forward-close aria-label="Закрыть">×</button>
            </header>
            <label class="workspace16-forward-search">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
              <input id="workspace16ForwardSearch" type="search" autocomplete="off" placeholder="Поиск по имени, номеру или @username">
            </label>
            <div id="workspace16ForwardContacts" class="workspace16-forward-contacts"></div>
            <footer>
              <span id="workspace16RecipientCount">Получатели не выбраны</span>
              <div>
                <button type="button" data-workspace16-forward-close>Отмена</button>
                <button id="workspace16ForwardSend" type="button" class="primary" disabled>Переслать</button>
              </div>
            </footer>
          </section>
        </div>`);

      byId('workspace16SelectionNext')?.addEventListener('click', openForwardModal);
      all('[data-workspace16-selection-cancel]').forEach((button) => button.addEventListener('click', stopSelection));
      all('[data-workspace16-forward-close]').forEach((button) => button.addEventListener('click', closeForwardModal));
      byId('workspace16ForwardModal')?.addEventListener('click', (event) => {
        if (event.target === byId('workspace16ForwardModal')) closeForwardModal();
      });
      byId('workspace16ForwardSearch')?.addEventListener('input', (event) => {
        runtime.contactQuery = String(event.target.value || '');
        renderForwardContacts();
      });
      byId('workspace16ForwardContacts')?.addEventListener('change', (event) => {
        const input = event.target.closest('input[data-workspace16-recipient]');
        if (!input) return;
        if (input.checked) runtime.selectedRecipients.add(String(input.value));
        else runtime.selectedRecipients.delete(String(input.value));
        syncRecipientCount();
      });
      byId('workspace16ForwardSend')?.addEventListener('click', sendForwardedMessages);
    }

    ensureForwardContextAction();
    ensureVideoQualityUi();
  }

  function ensureForwardContextAction() {
    const menu = byId('messageContextMenu');
    if (!menu || menu.querySelector('[data-workspace16-message-action="forward"]')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.workspace16MessageAction = 'forward';
    button.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5l7 7-7 7v-4H9c-3.5 0-5.8 1.2-7 4 0-6.5 3.4-10 10-10h2V5Z"/></svg>
      <span>Переслать</span>`;
    const info = menu.querySelector('[data-message-action="info"]');
    if (info?.nextSibling) menu.insertBefore(button, info.nextSibling);
    else menu.appendChild(button);
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const app = bridgeState();
      const message = app?.contextMessage;
      try { if (typeof closeMessageContextMenu === 'function') closeMessageContextMenu(); } catch {}
      if (!message || messageDeleted(message)) return notice('Это сообщение нельзя переслать', true);
      startSelection(message);
    });
  }

  function wrapContextMenu() {
    if (runtime.contextWrapped || typeof openMessageContextMenu !== 'function') return;
    runtime.contextWrapped = true;
    const base = openMessageContextMenu;
    openMessageContextMenu = function workspace16FixContext(message, trigger) {
      const result = base.apply(this, arguments);
      ensureForwardContextAction();
      const action = document.querySelector('[data-workspace16-message-action="forward"]');
      action?.classList.toggle('hidden', !message || messageDeleted(message));
      return result;
    };
  }

  function startSelection(message) {
    runtime.selectionMode = true;
    runtime.selectedMessages.clear();
    runtime.selectedMessages.set(String(message.id), message);
    document.body.classList.add('workspace16-message-selecting');
    byId('workspace16ForwardSelectionBar')?.classList.remove('hidden');
    syncSelectionRows();
  }

  function stopSelection() {
    runtime.selectionMode = false;
    runtime.selectedMessages.clear();
    document.body.classList.remove('workspace16-message-selecting');
    byId('workspace16ForwardSelectionBar')?.classList.add('hidden');
    all('.message-row.workspace16-selected-message,.message-row.workspace16-selectable-message').forEach((row) => {
      row.classList.remove('workspace16-selected-message', 'workspace16-selectable-message');
      row.querySelector('.workspace16-message-check')?.remove();
    });
  }

  function toggleSelectedMessage(messageId) {
    const app = bridgeState();
    const id = String(messageId || '');
    const message = app?.activeMessages?.find((item) => String(item.id) === id);
    if (!message || messageDeleted(message)) return;
    if (runtime.selectedMessages.has(id)) runtime.selectedMessages.delete(id);
    else runtime.selectedMessages.set(id, message);
    if (!runtime.selectedMessages.size) {
      stopSelection();
      return;
    }
    syncSelectionRows();
  }

  function syncSelectionRows() {
    const area = byId('messageArea');
    if (!area) return;
    all('.message-row[data-message-id]', area).forEach((row) => {
      const id = String(row.dataset.messageId || '');
      const selected = runtime.selectedMessages.has(id);
      row.classList.toggle('workspace16-selectable-message', runtime.selectionMode);
      row.classList.toggle('workspace16-selected-message', selected);
      let check = row.querySelector('.workspace16-message-check');
      if (runtime.selectionMode && !check) {
        check = document.createElement('button');
        check.type = 'button';
        check.className = 'workspace16-message-check';
        check.setAttribute('aria-label', 'Выбрать сообщение');
        check.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 12 4 4 8-9"/></svg>';
        row.prepend(check);
      }
      if (!runtime.selectionMode) check?.remove();
      check?.classList.toggle('active', selected);
    });
    const count = byId('workspace16SelectionCount');
    if (count) count.textContent = String(runtime.selectedMessages.size);
  }

  function normalizedContact(contact) {
    const source = contact?.user || contact?.contact || contact || {};
    return {
      id: String(source.user_id || source.contact_user_id || source.id || contact?.user_id || contact?.contact_user_id || contact?.id || ''),
      name: source.custom_name || contact?.custom_name || source.display_name || source.displayName || source.name || contact?.display_name || contact?.displayName || contact?.name || source.username || 'Контакт',
      username: source.username || contact?.username || '',
      phone: source.phone || contact?.phone || contact?.contact_phone || '',
      email: source.email || contact?.email || '',
      avatarKey: source.avatar_key || source.avatarKey || contact?.avatar_key || contact?.avatarKey || null,
    };
  }

  function contactMatches(contact, query) {
    const clean = normalize(query).toLocaleLowerCase('ru-RU').replace(/^@/, '');
    if (!clean) return true;
    return [contact.name, contact.username, contact.phone, contact.email]
      .some((value) => String(value || '').toLocaleLowerCase('ru-RU').replace(/^@/, '').includes(clean));
  }

  async function openForwardModal() {
    if (!runtime.selectedMessages.size) return;
    injectUi();
    runtime.selectedRecipients.clear();
    runtime.contactQuery = '';
    const search = byId('workspace16ForwardSearch');
    if (search) search.value = '';
    const subtitle = byId('workspace16ForwardSubtitle');
    if (subtitle) subtitle.textContent = `${runtime.selectedMessages.size} ${runtime.selectedMessages.size === 1 ? 'сообщение' : 'сообщения'} · выберите получателей`;
    byId('workspace16ForwardModal')?.classList.remove('hidden');
    document.body.classList.add('workspace16-forward-open');
    byId('workspace16ForwardContacts').innerHTML = '<div class="workspace16-forward-loading">Загружаем контакты…</div>';
    try {
      if (typeof loadContactsData === 'function') await loadContactsData();
    } catch (error) {
      console.warn('WORKSPACE16-FIX1 contacts', error);
    }
    renderForwardContacts();
    requestAnimationFrame(() => search?.focus());
  }

  function closeForwardModal() {
    if (runtime.forwarding) return;
    byId('workspace16ForwardModal')?.classList.add('hidden');
    document.body.classList.remove('workspace16-forward-open');
    runtime.selectedRecipients.clear();
    syncRecipientCount();
  }

  function renderForwardContacts() {
    const root = byId('workspace16ForwardContacts');
    if (!root) return;
    const app = bridgeState();
    const contacts = (Array.isArray(app?.contacts) ? app.contacts : [])
      .map(normalizedContact)
      .filter((item) => item.id && contactMatches(item, runtime.contactQuery));

    root.innerHTML = contacts.length ? contacts.map((contact) => `
      <label class="workspace16-forward-contact">
        <input type="checkbox" data-workspace16-recipient value="${esc(contact.id)}" ${runtime.selectedRecipients.has(contact.id) ? 'checked' : ''}>
        <span class="workspace16-forward-avatar">${avatarMarkup(contact.name, contact.avatarKey)}</span>
        <span class="workspace16-forward-name">
          <strong>${esc(contact.name)}</strong>
          <small>${esc([contact.username ? `@${contact.username}` : '', contact.phone, contact.email].filter(Boolean).join(' · ') || 'Контакт')}</small>
        </span>
        <span class="workspace16-forward-tick">✓</span>
      </label>`).join('') : `<div class="workspace16-forward-empty">${runtime.contactQuery ? 'Ничего не найдено' : 'Контактов пока нет'}</div>`;
    syncRecipientCount();
  }

  function syncRecipientCount() {
    const count = runtime.selectedRecipients.size;
    const label = byId('workspace16RecipientCount');
    if (label) label.textContent = count ? `Получателей: ${count}` : 'Получатели не выбраны';
    const send = byId('workspace16ForwardSend');
    if (send) send.disabled = !count || runtime.forwarding;
  }

  function forwardedPayload(message) {
    const kind = String(message?.kind || 'text');
    const body = { kind };
    if (message?.text) body.text = message.text;
    if (message?.media_key) body.mediaKey = message.media_key;
    if (message?.mime_type) body.mimeType = message.mime_type;
    if (message?.file_name) body.fileName = message.file_name;
    if (Number.isFinite(Number(message?.file_size))) body.fileSize = Number(message.file_size);
    if (Number.isFinite(Number(message?.duration_ms))) body.durationMs = Number(message.duration_ms);
    if (kind === 'voice' && Array.isArray(message?.waveform)) body.waveform = message.waveform;
    return body;
  }

  async function sendForwardedMessages() {
    if (runtime.forwarding) return;
    const messages = selectedMessagesInOrder();
    const recipients = [...runtime.selectedRecipients];
    if (!messages.length || !recipients.length) return;

    runtime.forwarding = true;
    syncRecipientCount();
    const send = byId('workspace16ForwardSend');
    const oldLabel = send?.textContent || 'Переслать';
    let completed = 0;
    const failures = [];

    try {
      for (const userId of recipients) {
        try {
          if (send) send.textContent = `Отправляем ${completed + 1}/${recipients.length}…`;
          const chat = await request('/chats/private', {
            method: 'POST',
            body: JSON.stringify({ otherUserId: userId }),
          });
          if (!chat?.id) throw new Error('Не удалось открыть чат получателя');
          for (const message of messages) {
            await request(`/chats/${encodeURIComponent(chat.id)}/messages`, {
              method: 'POST',
              body: JSON.stringify(forwardedPayload(message)),
            });
          }
          completed += 1;
        } catch (error) {
          failures.push(error?.message || 'Ошибка отправки');
        }
      }

      try { if (typeof loadChats === 'function') await loadChats(false); } catch {}
      if (completed) {
        notice(`Переслано: ${messages.length} сообщ. · получателей: ${completed}`, false, 3500);
        runtime.forwarding = false;
        closeForwardModal();
        stopSelection();
      }
      if (failures.length) notice(`Не удалось отправить ${failures.length} получател${failures.length === 1 ? 'ю' : 'ям'}`, true, 4500);
    } finally {
      runtime.forwarding = false;
      if (send) send.textContent = oldLabel;
      syncRecipientCount();
    }
  }

  function ensureVideoQualityUi() {
    const modal = byId('mediaPreviewModal');
    const footer = modal?.querySelector('.media-preview-footer,footer');
    if (!modal || !footer || byId('workspace16VideoQuality')) return;
    const panel = document.createElement('div');
    panel.id = 'workspace16VideoQuality';
    panel.className = 'workspace16-video-quality hidden';
    panel.innerHTML = `
      <span>Качество видео</span>
      <div role="radiogroup" aria-label="Качество видео">
        <button type="button" data-workspace16-video-quality="auto">Авто</button>
        <button type="button" data-workspace16-video-quality="480">480p</button>
        <button type="button" data-workspace16-video-quality="720">720p</button>
        <button type="button" data-workspace16-video-quality="original">Оригинал</button>
      </div>`;
    footer.insertBefore(panel, footer.firstChild);
    panel.addEventListener('click', (event) => {
      const button = event.target.closest('[data-workspace16-video-quality]');
      if (!button) return;
      const value = button.dataset.workspace16VideoQuality || 'auto';
      localStorage.setItem('meetus_video_upload_quality', value);
      window.__meetusVideoUploadQuality = value;
      syncVideoQualityUi();
    });
  }

  function syncVideoQualityUi() {
    ensureVideoQualityUi();
    const app = bridgeState();
    const file = app?.pendingMediaFiles?.[app.pendingMediaIndex || 0];
    const isVideo = Boolean(file && (String(file.type || '').startsWith('video/') || /\.(mp4|mov|m4v|webm|avi|mkv)$/i.test(file.name || '')));
    const panel = byId('workspace16VideoQuality');
    panel?.classList.toggle('hidden', !isVideo);
    const edit = byId('mediaPreviewEdit');
    if (edit && isVideo) edit.classList.add('hidden');
    const current = localStorage.getItem('meetus_video_upload_quality') || 'auto';
    window.__meetusVideoUploadQuality = current;
    panel?.querySelectorAll('[data-workspace16-video-quality]').forEach((button) => {
      const active = button.dataset.workspace16VideoQuality === current;
      button.classList.toggle('active', active);
      button.setAttribute('aria-checked', active ? 'true' : 'false');
    });
  }

  function wrapMediaPreview() {
    if (runtime.mediaPreviewWrapped || typeof renderMediaPreview !== 'function') return;
    runtime.mediaPreviewWrapped = true;
    const base = renderMediaPreview;
    renderMediaPreview = function workspace16FixMediaPreview() {
      const result = base.apply(this, arguments);
      queueMicrotask(syncVideoQualityUi);
      return result;
    };
  }

  function scan() {
    runtime.observerQueued = false;
    bridgeState();
    injectUi();
    wrapRequest();
    wrapContextMenu();
    wrapMediaPreview();
    syncVideoQualityUi();
    if (runtime.selectionMode) syncSelectionRows();
  }

  function installEvents() {
    document.addEventListener('click', (event) => {
      if (!runtime.selectionMode) return;
      if (event.target.closest('#workspace16ForwardSelectionBar,#workspace16ForwardModal,#messageContextMenu')) return;
      const row = event.target.closest('.message-row[data-message-id]');
      if (!row || !byId('messageArea')?.contains(row)) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      toggleSelectedMessage(row.dataset.messageId);
    }, true);

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      if (!byId('workspace16ForwardModal')?.classList.contains('hidden')) closeForwardModal();
      else if (runtime.selectionMode) stopSelection();
    });

    window.addEventListener('meetus:community-profile-immediate', () => {
      window.setTimeout(() => {
        try {
          const app = bridgeState();
          if (app?.managedCommunityInfo && typeof applyCommunityInfo === 'function') applyCommunityInfo(app.managedCommunityInfo);
        } catch {}
      }, 0);
    });
  }

  function install() {
    if (runtime.installed) return;
    runtime.installed = true;
    document.documentElement.dataset.meetusWorkspace16Fix1 = '1';
    bridgeState();
    injectUi();
    wrapRequest();
    wrapContextMenu();
    wrapMediaPreview();
    installEvents();
    scan();

    const observer = new MutationObserver(() => {
      if (runtime.observerQueued) return;
      runtime.observerQueued = true;
      requestAnimationFrame(scan);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    window.setInterval(() => {
      wrapRequest();
      wrapContextMenu();
      wrapMediaPreview();
      ensureForwardContextAction();
      syncVideoQualityUi();
    }, 1200);

    window.MeetusWorkspace16Fix1 = {
      version: VERSION,
      applyCommunityProfileImmediately,
      startSelection,
      stopSelection,
      openForwardModal,
    };
    console.info(`[Meetus] ${VERSION} loaded`);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
