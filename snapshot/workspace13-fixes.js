/* MEETUS 0.6.25.2 COMMUNITY2-TG11-WORKSPACE13
 * Realtime multi-pin board, channel/group profile editing, compact origin cards,
 * stronger action arrows and mobile-safe uploaded audio.
 */
(() => {
  'use strict';

  /* MEETUS_WORKSPACE13_CROP_AND_PIN_MODAL15 */

  /* MEETUS_WORKSPACE13_BRIDGE14 */
  try { if (!window.state && typeof state !== 'undefined') window.state = state; } catch {}

  const VERSION = '0.6.25.2-community2tg11workspace13';
  const rt = {
    installed: false,
    openWrapped: false,
    contextWrapped: false,
    socketBound: false,
    pins: [],
    activePinIndex: 0,
    profileFile: null,
    profileObjectUrl: null,
  };

  const byId = (id) => document.getElementById(id);
  const esc = (value = '') => String(value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');

  function api(path, method = 'GET', body) {
    if (typeof request !== 'function') return Promise.reject(new Error('API пока не готово'));
    return request(`/workspace${path}`, {
      method,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  function notice(message, error = false) {
    try {
      if (typeof setUploadStatus === 'function') {
        setUploadStatus(message, error);
        window.setTimeout(() => setUploadStatus(''), error ? 4200 : 2200);
        return;
      }
    } catch {}
    console[error ? 'error' : 'log'](message);
  }

  function canManage() {
    const chat = window.state?.activeChat;
    if (!chat) return false;
    return chat.type === 'private' || ['owner', 'admin'].includes(chat.role);
  }

  function pinPreview(pin) {
    const raw = String(pin?.title || pin?.text || pin?.file_name || '').trim();
    if (raw) {
      if (typeof window.meetusWorkspace15CleanText === 'function') return window.meetusWorkspace15CleanText(raw) || 'Сообщение';
      return raw
        .replace(/\[([^\]\n]{1,500})\]\((https?:\/\/[^\s)]+)\)/gi, '$1')
        .replace(/\*\*([^*\n]+)\*\*/g, '$1')
        .replace(/__([^_\n]+)__/g, '$1')
        .replace(/\+\+([^+\n]+)\+\+/g, '$1')
        .trim();
    }
    return ({ image: 'Фото', video: 'Видео', voice: 'Голосовое сообщение', file: 'Файл' }[pin?.kind]) || 'Сообщение';
  }

  function injectUi() {
    if (!byId('workspace13PinsModal')) {
      document.body.insertAdjacentHTML('beforeend', `
        <div id="workspace13PinsModal" class="workspace13-modal hidden" role="dialog" aria-modal="true">
          <section class="workspace13-card workspace13-pins-card">
            <header><div><h3>Закреплённые сообщения</h3><small id="workspace13PinsSubtitle"></small></div><button type="button" data-workspace13-close="pins">×</button></header>
            <div id="workspace13PinsList" class="workspace13-pins-list"></div>
          </section>
        </div>
        <div id="workspace13ProfileModal" class="workspace13-modal hidden" role="dialog" aria-modal="true">
          <section class="workspace13-card workspace13-profile-card">
            <header><div><h3 id="workspace13ProfileTitle">Редактировать чат</h3><small>Видят все участники</small></div><button type="button" data-workspace13-close="profile">×</button></header>
            <div class="workspace13-profile-body">
              <div class="workspace13-avatar-editor">
                <div id="workspace13AvatarPreview" class="workspace13-avatar-preview"><span>Г</span></div>
                <div><button id="workspace13AvatarChoose" type="button">Выбрать аватарку</button><button id="workspace13AvatarRemove" type="button" class="danger-soft">Удалить</button></div>
                <input id="workspace13AvatarInput" type="file" accept="image/*" hidden>
              </div>
              <label class="workspace13-field"><span>Описание</span><textarea id="workspace13Description" maxlength="1000" rows="6" placeholder="Расскажите о канале или группе"></textarea><small><b id="workspace13DescriptionCount">0</b>/1000</small></label>
            </div>
            <footer><button type="button" data-workspace13-close="profile">Отмена</button><button id="workspace13ProfileSave" type="button" class="primary">Сохранить</button></footer>
          </section>
        </div>`);

      document.addEventListener('click', (event) => {
        const close = event.target.closest('[data-workspace13-close]');
        if (close) closeModal(close.dataset.workspace13Close);
        if (event.target.id === 'workspace13PinsModal') closeModal('pins');
        if (event.target.id === 'workspace13ProfileModal') closeModal('profile');
      });
      byId('workspace13AvatarChoose')?.addEventListener('click', () => byId('workspace13AvatarInput')?.click());
      byId('workspace13AvatarRemove')?.addEventListener('click', () => setProfileAvatar(null));
      byId('workspace13AvatarInput')?.addEventListener('change', async (event) => {
        event.stopPropagation();
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        try {
          const prepared = typeof window.meetusWorkspace15CropAvatar === 'function'
            ? await window.meetusWorkspace15CropAvatar(file)
            : file;
          if (prepared) setProfileAvatar(prepared);
        } catch (error) {
          notice(error?.message || 'Не удалось обработать аватарку', true);
        }
      });
      byId('workspace13Description')?.addEventListener('input', (event) => {
        byId('workspace13DescriptionCount').textContent = String(event.target.value.length);
      });
      byId('workspace13ProfileSave')?.addEventListener('click', saveProfile);
    }
    installHeaderProfileAction();
    takeOverPinnedBanner();
  }

  function closeModal(which) {
    if (which === 'pins') byId('workspace13PinsModal')?.classList.add('hidden');
    if (which === 'profile') {
      byId('workspace13ProfileModal')?.classList.add('hidden');
      if (rt.profileObjectUrl) URL.revokeObjectURL(rt.profileObjectUrl);
      rt.profileObjectUrl = null;
      rt.profileFile = null;
    }
  }

  function installHeaderProfileAction() {
    const menu = byId('chatHeaderMenu');
    if (!menu || menu.querySelector('[data-workspace13-action="profile"]')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.workspace13Action = 'profile';
    button.className = 'hidden';
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c.8-5 3.5-8 8-8s7.2 3 8 8"/><path d="m16.5 4.5 3 3"/></svg><span>Изменить аватарку и описание</span>';
    const divider = menu.querySelector('.chat-header-menu-divider');
    menu.insertBefore(button, divider || menu.firstChild);
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      openProfileEditor().catch((error) => notice(error?.message || 'Не удалось открыть настройки', true));
      menu.classList.add('hidden');
    });
    refreshProfileAction();
  }

  function refreshProfileAction() {
    const action = document.querySelector('[data-workspace13-action="profile"]');
    const chat = window.state?.activeChat;
    const visible = chat && chat.type !== 'private' && ['owner', 'admin'].includes(chat.role);
    action?.classList.toggle('hidden', !visible);
  }

  function profileAvatarUrl(key) {
    return key ? `/api/media/${encodeURIComponent(key)}` : '';
  }

  function setProfileAvatar(fileOrNull) {
    const preview = byId('workspace13AvatarPreview');
    if (!preview) return;
    if (rt.profileObjectUrl) URL.revokeObjectURL(rt.profileObjectUrl);
    rt.profileObjectUrl = null;
    rt.profileFile = fileOrNull;
    preview.innerHTML = '';
    if (fileOrNull instanceof File) {
      rt.profileObjectUrl = URL.createObjectURL(fileOrNull);
      preview.innerHTML = `<img src="${esc(rt.profileObjectUrl)}" alt="Новая аватарка">`;
      preview.dataset.avatarKey = '';
      preview.dataset.removeAvatar = '0';
    } else {
      preview.innerHTML = '<span>×</span>';
      preview.dataset.avatarKey = '';
      preview.dataset.removeAvatar = '1';
    }
  }

  async function openProfileEditor() {
    const chat = window.state?.activeChat;
    if (!chat || chat.type === 'private' || !['owner', 'admin'].includes(chat.role)) return;
    const profile = await api(`/chats/${encodeURIComponent(chat.id)}/profile`);
    rt.profileFile = null;
    if (rt.profileObjectUrl) URL.revokeObjectURL(rt.profileObjectUrl);
    rt.profileObjectUrl = null;
    const preview = byId('workspace13AvatarPreview');
    const letter = String(profile.title || chat.title || (profile.type === 'channel' ? 'К' : 'Г')).trim().charAt(0).toUpperCase() || 'Г';
    preview.dataset.avatarKey = profile.avatar_key || '';
    preview.dataset.removeAvatar = '0';
    preview.innerHTML = profile.avatar_key
      ? `<img src="${esc(profileAvatarUrl(profile.avatar_key))}" alt="Аватарка">`
      : `<span>${esc(letter)}</span>`;
    byId('workspace13ProfileTitle').textContent = profile.type === 'channel' ? 'Редактировать канал' : 'Редактировать группу';
    byId('workspace13Description').value = profile.description || '';
    byId('workspace13DescriptionCount').textContent = String((profile.description || '').length);
    byId('workspace13ProfileModal').classList.remove('hidden');
  }

  function uploadAvatar(file) {
    return new Promise((resolve, reject) => {
      const form = new FormData();
      form.append('file', file, file.name || 'avatar.jpg');
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${typeof API === 'string' ? API : '/api'}/media/upload`, true);
      xhr.withCredentials = true;
      xhr.timeout = 120000;
      if (window.state?.token) xhr.setRequestHeader('Authorization', `Bearer ${state.token}`);
      xhr.onload = () => {
        let payload = null;
        try { payload = JSON.parse(xhr.responseText || 'null'); } catch {}
        if (xhr.status >= 200 && xhr.status < 300 && payload?.key) resolve(payload.key);
        else reject(new Error(payload?.message || `Ошибка загрузки ${xhr.status}`));
      };
      xhr.onerror = () => reject(new Error('Не удалось загрузить аватарку'));
      xhr.ontimeout = () => reject(new Error('Загрузка аватарки заняла слишком много времени'));
      xhr.send(form);
    });
  }

  async function saveProfile() {
    const chat = window.state?.activeChat;
    if (!chat) return;
    const save = byId('workspace13ProfileSave');
    save.disabled = true;
    save.textContent = 'Сохраняем…';
    try {
      const preview = byId('workspace13AvatarPreview');
      let avatarKey = preview.dataset.removeAvatar === '1' ? null : (preview.dataset.avatarKey || null);
      if (rt.profileFile) avatarKey = await uploadAvatar(rt.profileFile);
      const profile = await api(`/chats/${encodeURIComponent(chat.id)}/profile`, 'PATCH', {
        description: byId('workspace13Description').value,
        avatarKey,
      });
      applyProfile(chat.id, profile);
      closeModal('profile');
      notice('Аватарка и описание сохранены');
    } finally {
      save.disabled = false;
      save.textContent = 'Сохранить';
    }
  }

  function applyProfile(chatId, profile) {
    const chats = Array.isArray(window.state?.chats) ? state.chats : [];
    const chat = chats.find((item) => item.id === chatId);
    if (chat) {
      chat.description = profile.description || '';
      chat.avatar_key = profile.avatar_key || null;
      chat.avatarKey = profile.avatar_key || null;
    }
    if (window.state?.activeChat?.id === chatId) {
      state.activeChat.description = profile.description || '';
      state.activeChat.avatar_key = profile.avatar_key || null;
      state.activeChat.avatarKey = profile.avatar_key || null;
    }
    try { if (typeof renderChats === 'function') renderChats(); } catch {}
    const headerAvatar = document.querySelector('#chatHeader .avatar, .chat-header .avatar, #chatHeaderAvatar');
    if (state?.activeChat?.id === chatId && headerAvatar) {
      const title = state.activeChat.title || 'Чат';
      headerAvatar.innerHTML = profile.avatar_key
        ? `<img src="${esc(profileAvatarUrl(profile.avatar_key))}" alt="${esc(title)}">`
        : esc(String(title).charAt(0).toUpperCase());
    }
  }

  function takeOverPinnedBanner() {
    const banner = byId('workspacePinnedBanner');
    if (!banner || banner.dataset.workspace13Taken === '1') return;
    banner.dataset.workspace13Taken = '1';
    const oldOpen = byId('workspacePinnedOpen');
    const oldRemove = byId('workspacePinnedRemove');
    if (oldOpen) {
      const fresh = oldOpen.cloneNode(true);
      oldOpen.replaceWith(fresh);
      fresh.addEventListener('click', () => openPinsModal());
    }
    if (oldRemove) {
      const fresh = oldRemove.cloneNode(true);
      oldRemove.replaceWith(fresh);
      fresh.addEventListener('click', async (event) => {
        event.stopPropagation();
        const current = rt.pins[rt.activePinIndex] || rt.pins[0];
        if (!current || !canManage()) return;
        await deletePin(current.id);
      });
    }
  }

  function renderPinsBanner() {
    takeOverPinnedBanner();
    const banner = byId('workspacePinnedBanner');
    if (!banner) return;
    const pins = rt.pins || [];
    if (!pins.length) {
      banner.classList.add('hidden');
      return;
    }
    if (rt.activePinIndex >= pins.length) rt.activePinIndex = 0;
    const pin = pins[rt.activePinIndex];
    const strong = banner.querySelector('strong');
    const small = byId('workspacePinnedText') || banner.querySelector('small');
    if (strong) strong.textContent = pins.length > 1 ? `Закреплённые сообщения · ${rt.activePinIndex + 1}/${pins.length}` : 'Закреплённое сообщение';
    if (small) small.textContent = `${pin.sender_name || 'Пользователь'}: ${pinPreview(pin)}`;
    byId('workspacePinnedRemove')?.classList.toggle('hidden', !canManage());
    banner.classList.remove('hidden');
  }

  async function loadPins() {
    const chat = window.state?.activeChat;
    if (!chat) {
      rt.pins = [];
      renderPinsBanner();
      return;
    }
    const expected = chat.id;
    const pins = await api(`/chats/${encodeURIComponent(expected)}/pinned-messages`);
    if (window.state?.activeChat?.id !== expected) return;
    rt.pins = Array.isArray(pins) ? pins : [];
    rt.activePinIndex = 0;
    renderPinsBanner();
  }

  function openPinsModal() {
    if (!rt.pins.length) return;
    renderPinsList();
    byId('workspace13PinsModal')?.classList.remove('hidden');
  }

  function renderPinsList() {
    const list = byId('workspace13PinsList');
    if (!list) return;
    const manageable = canManage();
    byId('workspace13PinsSubtitle').textContent = rt.pins.length === 1 ? '1 сообщение' : `${rt.pins.length} сообщений`;
    list.innerHTML = rt.pins.map((pin, index) => `
      <article class="workspace13-pin-row" data-pin-id="${esc(pin.id)}">
        <button class="workspace13-pin-open" type="button" data-pin-open="${esc(pin.message_id)}">
          <span class="workspace13-pin-number">${index + 1}</span>
          <span><strong>${esc(pinPreview(pin))}</strong><small>${esc(pin.sender_name || 'Пользователь')} · ${esc(pinPreview(pin))}</small></span>
        </button>
        ${manageable ? `<div class="workspace13-pin-actions">
          <button type="button" data-pin-move="up" title="Поднять" ${index === 0 ? 'disabled' : ''}>↑</button>
          <button type="button" data-pin-move="down" title="Опустить" ${index === rt.pins.length - 1 ? 'disabled' : ''}>↓</button>
          <button type="button" data-pin-title title="Заголовок">✎</button>
          <button type="button" data-pin-delete title="Удалить">×</button>
        </div>` : ''}
      </article>`).join('');

    list.querySelectorAll('[data-pin-open]').forEach((button) => button.addEventListener('click', () => {
      closeModal('pins');
      jumpToMessage(button.dataset.pinOpen);
    }));
    list.querySelectorAll('[data-pin-delete]').forEach((button) => button.addEventListener('click', () => {
      const row = button.closest('[data-pin-id]');
      if (row) deletePin(row.dataset.pinId);
    }));
    list.querySelectorAll('[data-pin-title]').forEach((button) => button.addEventListener('click', () => editPinTitle(button.closest('[data-pin-id]')?.dataset.pinId)));
    list.querySelectorAll('[data-pin-move]').forEach((button) => button.addEventListener('click', () => movePin(button.closest('[data-pin-id]')?.dataset.pinId, button.dataset.pinMove)));
  }

  async function jumpToMessage(messageId) {
    const chatId = window.state?.activeChat?.id;
    if (!chatId || !messageId) return;
    try {
      if (typeof openSearchMessageResult === 'function') await openSearchMessageResult(chatId, messageId);
      else if (typeof scrollToMessage === 'function') scrollToMessage(messageId);
    } catch (error) {
      notice(error?.message || 'Не удалось открыть сообщение', true);
    }
  }

  async function deletePin(pinId) {
    const chat = window.state?.activeChat;
    if (!chat || !pinId) return;
    await api(`/chats/${encodeURIComponent(chat.id)}/pinned-messages/${encodeURIComponent(pinId)}`, 'DELETE');
    rt.pins = rt.pins.filter((pin) => pin.id !== pinId);
    renderPinsBanner();
    renderPinsList();
  }

  async function editPinTitle(pinId) {
    const chat = window.state?.activeChat;
    const pin = rt.pins.find((item) => item.id === pinId);
    if (!chat || !pin) return;
    const title = typeof window.meetusWorkspace15PromptPinTitle === 'function'
      ? await window.meetusWorkspace15PromptPinTitle(pin.title || pinPreview(pin))
      : window.prompt('Заголовок закреплённого сообщения', pin.title || pinPreview(pin));
    if (title === null) return;
    const updated = await api(`/chats/${encodeURIComponent(chat.id)}/pinned-messages/${encodeURIComponent(pinId)}`, 'PATCH', { title });
    Object.assign(pin, updated);
    renderPinsBanner();
    renderPinsList();
  }

  async function movePin(pinId, direction) {
    const chat = window.state?.activeChat;
    const index = rt.pins.findIndex((item) => item.id === pinId);
    const next = direction === 'up' ? index - 1 : index + 1;
    if (!chat || index < 0 || next < 0 || next >= rt.pins.length) return;
    [rt.pins[index], rt.pins[next]] = [rt.pins[next], rt.pins[index]];
    renderPinsBanner();
    renderPinsList();
    const result = await api(`/chats/${encodeURIComponent(chat.id)}/pinned-messages/reorder`, 'POST', { pinIds: rt.pins.map((pin) => pin.id) });
    if (Array.isArray(result)) rt.pins = result;
    renderPinsBanner();
    renderPinsList();
  }

  async function toggleContextPin() {
    const chat = window.state?.activeChat;
    const message = window.state?.contextMessage;
    if (!chat || !message || !canManage()) return;
    const existing = rt.pins.find((pin) => pin.message_id === message.id);
    if (existing) await deletePin(existing.id);
    else {
      const pin = await api(`/chats/${encodeURIComponent(chat.id)}/pinned-messages`, 'POST', { messageId: message.id });
      if (pin?.id && !rt.pins.some((item) => item.id === pin.id)) rt.pins.push(pin);
      renderPinsBanner();
    }
    try { byId('messageContextMenu')?.classList.add('hidden'); } catch {}
  }

  function refreshPinMenuLabel(message) {
    const label = byId('workspacePinMessageLabel');
    if (!label || !message) return;
    label.textContent = rt.pins.some((pin) => pin.message_id === message.id) ? 'Открепить сообщение' : 'Закрепить сообщение';
  }

  function installPinCapture() {
    if (document.documentElement.dataset.workspace13PinCapture === '1') return;
    document.documentElement.dataset.workspace13PinCapture = '1';
    document.addEventListener('click', (event) => {
      const action = event.target.closest('[data-workspace-message-action="pin"]');
      if (!action) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      toggleContextPin().catch((error) => notice(error?.message || 'Не удалось изменить закрепление', true));
    }, true);
  }

  function wrapHooks() {
    if (!rt.openWrapped && typeof openChat === 'function') {
      rt.openWrapped = true;
      const base = openChat;
      openChat = async function workspace13OpenChat(...args) {
        const result = await base.apply(this, args);
        refreshProfileAction();
        await loadPins().catch((error) => console.warn('WORKSPACE13 pins load', error));
        return result;
      };
    }
    if (!rt.contextWrapped && typeof openMessageContextMenu === 'function') {
      rt.contextWrapped = true;
      const base = openMessageContextMenu;
      openMessageContextMenu = function workspace13Context(message, trigger) {
        const result = base.call(this, message, trigger);
        refreshPinMenuLabel(message);
        return result;
      };
    }
  }

  function bindSocket() {
    if (rt.socketBound || typeof socket === 'undefined' || !socket?.on) return;
    rt.socketBound = true;
    socket.on('workspace.pins.changed', (payload) => {
      if (payload?.chatId !== window.state?.activeChat?.id) return;
      rt.pins = Array.isArray(payload.pins) ? payload.pins : [];
      rt.activePinIndex = 0;
      renderPinsBanner();
      if (!byId('workspace13PinsModal')?.classList.contains('hidden')) renderPinsList();
    });
    socket.on('workspace.chat-profile.changed', (payload) => {
      if (payload?.chatId && payload?.profile) applyProfile(payload.chatId, payload.profile);
    });
  }

  function install() {
    if (rt.installed) return;
    rt.installed = true;
    document.documentElement.dataset.meetusWorkspace13 = '1';
    injectUi();
    installPinCapture();
    wrapHooks();
    bindSocket();
    if (window.state?.activeChat) loadPins().catch(() => {});

    const interval = window.setInterval(() => {
      injectUi();
      wrapHooks();
      bindSocket();
      refreshProfileAction();
    }, 700);
    window.setTimeout(() => window.clearInterval(interval), 30000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();

  window.meetusWorkspace13 = Object.assign(window.meetusWorkspace13 || {}, {
    version: VERSION,
    loadPins,
    openPinsModal,
    openProfileEditor,
    refreshProfileAction,
    renderPinsBanner,
    getPins: () => [...rt.pins],
  });
  window.meetusWorkspace13Version = VERSION;
})();
