/* MEETUS 0.6.25.2 COMMUNITY2-TG11-WORKSPACE14
 * Community avatars on creation, owner/admin profile editing from info panel,
 * a dedicated pinned-messages button in the chat header and compact uploaded audio.
 */
(() => {
  'use strict';

  /* MEETUS_WORKSPACE14_CREATE_CROP15 */

  const VERSION = '0.6.25.2-community2tg11workspace14';
  const runtime = {
    installed: false,
    createAvatarFile: null,
    createAvatarUrl: null,
    createMode: 'group',
    communityOpenWrapped: false,
    communitySubmitWrapped: false,
    communityInfoWrapped: false,
    chatOpenWrapped: false,
    pinObserver: null,
    socketBound: false,
  };

  const byId = (id) => document.getElementById(id);
  const esc = (value = '') => String(value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');

  function bridgeState() {
    try {
      if (!window.state && typeof state !== 'undefined') window.state = state;
      if (!window.meetusState && typeof state !== 'undefined') window.meetusState = state;
    } catch {}
  }

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
        window.setTimeout(() => setUploadStatus(''), error ? 4500 : 2400);
        return;
      }
    } catch {}
    console[error ? 'error' : 'log'](message);
  }

  function revokeCreateAvatarUrl() {
    if (runtime.createAvatarUrl) URL.revokeObjectURL(runtime.createAvatarUrl);
    runtime.createAvatarUrl = null;
  }

  function currentCreateLetter() {
    const title = String(byId('communityTitleInput')?.value || '').trim();
    if (title) return title.charAt(0).toUpperCase();
    return runtime.createMode === 'channel' || runtime.createMode === 'linked' ? 'К' : 'Г';
  }

  function renderCreateAvatar() {
    const preview = byId('workspace14CreateAvatarPreview');
    const remove = byId('workspace14CreateAvatarRemove');
    if (!preview) return;
    preview.innerHTML = '';
    if (runtime.createAvatarFile) {
      if (!runtime.createAvatarUrl) runtime.createAvatarUrl = URL.createObjectURL(runtime.createAvatarFile);
      preview.innerHTML = `<img src="${esc(runtime.createAvatarUrl)}" alt="Аватар сообщества">`;
      remove?.classList.remove('hidden');
    } else {
      preview.innerHTML = `<span>${esc(currentCreateLetter())}</span><i aria-hidden="true">＋</i>`;
      remove?.classList.add('hidden');
    }
  }

  function resetCreateAvatar(mode = runtime.createMode) {
    runtime.createMode = mode || 'group';
    runtime.createAvatarFile = null;
    revokeCreateAvatarUrl();
    const input = byId('workspace14CreateAvatarInput');
    if (input) input.value = '';
    renderCreateAvatar();
    const label = byId('workspace14CreateAvatarLabel');
    if (label) label.textContent = runtime.createMode === 'linked' ? 'Аватар канала и группы' : 'Аватар';
  }

  function ensureCreateAvatarUi() {
    const form = byId('communityForm');
    const titleInput = byId('communityTitleInput');
    if (!form || !titleInput) return;
    if (!byId('workspace14CreateAvatarField')) {
      const titleField = titleInput.closest('.settings-field');
      const shell = document.createElement('section');
      shell.id = 'workspace14CreateAvatarField';
      shell.className = 'workspace14-create-avatar-field';
      shell.innerHTML = `
        <button id="workspace14CreateAvatarPreview" type="button" class="workspace14-create-avatar-preview" aria-label="Выбрать аватар"><span>Г</span><i aria-hidden="true">＋</i></button>
        <div class="workspace14-create-avatar-copy">
          <strong id="workspace14CreateAvatarLabel">Аватар</strong>
          <small>Можно добавить сейчас или изменить позже</small>
          <div><button id="workspace14CreateAvatarChoose" type="button">Выбрать фото</button><button id="workspace14CreateAvatarRemove" type="button" class="hidden">Убрать</button></div>
        </div>
        <input id="workspace14CreateAvatarInput" type="file" accept="image/*" hidden>`;
      form.insertBefore(shell, titleField || form.firstChild);

      const choose = () => byId('workspace14CreateAvatarInput')?.click();
      byId('workspace14CreateAvatarPreview')?.addEventListener('click', choose);
      byId('workspace14CreateAvatarChoose')?.addEventListener('click', choose);
      byId('workspace14CreateAvatarRemove')?.addEventListener('click', () => resetCreateAvatar(runtime.createMode));
      byId('workspace14CreateAvatarInput')?.addEventListener('change', async (event) => {
        event.stopPropagation();
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        if (!String(file.type || '').startsWith('image/')) {
          notice('Для аватарки выберите изображение', true);
          return;
        }
        if (file.size > 12 * 1024 * 1024) {
          notice('Аватарка слишком большая. Максимум 12 МБ.', true);
          return;
        }
        try {
          const prepared = typeof window.meetusWorkspace15CropAvatar === 'function'
            ? await window.meetusWorkspace15CropAvatar(file)
            : file;
          if (!prepared) return;
          runtime.createAvatarFile = prepared;
          revokeCreateAvatarUrl();
          renderCreateAvatar();
        } catch (error) {
          notice(error?.message || 'Не удалось обработать аватарку', true);
        }
      });
      titleInput.addEventListener('input', () => {
        if (!runtime.createAvatarFile) renderCreateAvatar();
      });
    }
    renderCreateAvatar();
  }

  function uploadAvatar(file) {
    return new Promise((resolve, reject) => {
      const form = new FormData();
      form.append('file', file, file.name || 'community-avatar.jpg');
      const xhr = new XMLHttpRequest();
      const apiBase = typeof API === 'string' ? API : '/api';
      xhr.open('POST', `${apiBase}/media/upload`, true);
      xhr.withCredentials = true;
      xhr.timeout = 120000;
      try {
        if (typeof state !== 'undefined' && state?.token) xhr.setRequestHeader('Authorization', `Bearer ${state.token}`);
      } catch {}
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

  async function setAvatarKeepingDescription(chatId, avatarKey) {
    const profile = await api(`/chats/${encodeURIComponent(chatId)}/profile`);
    return api(`/chats/${encodeURIComponent(chatId)}/profile`, 'PATCH', {
      description: profile?.description || '',
      avatarKey,
    });
  }

  function findCreatedChat(beforeIds) {
    try {
      if (state?.activeChat?.id && !beforeIds.has(state.activeChat.id)) return state.activeChat;
      const created = Array.isArray(state?.chats)
        ? state.chats.filter((chat) => chat?.id && !beforeIds.has(chat.id)).at(-1)
        : null;
      return created || null;
    } catch {
      return null;
    }
  }

  function wrapCommunityCreation() {
    if (!runtime.communityOpenWrapped && typeof openCommunityModal === 'function') {
      runtime.communityOpenWrapped = true;
      const baseOpen = openCommunityModal;
      openCommunityModal = function workspace14OpenCommunity(mode, ...args) {
        const result = baseOpen.call(this, mode, ...args);
        ensureCreateAvatarUi();
        resetCreateAvatar(mode);
        return result;
      };
    }

    if (!runtime.communitySubmitWrapped && typeof submitCommunity === 'function') {
      runtime.communitySubmitWrapped = true;
      const baseSubmit = submitCommunity;
      submitCommunity = async function workspace14SubmitCommunity(...args) {
        bridgeState();
        const selectedFile = runtime.createAvatarFile;
        const mode = runtime.createMode;
        const beforeIds = new Set(Array.isArray(state?.chats) ? state.chats.map((chat) => chat.id) : []);
        const result = await baseSubmit.apply(this, args);
        if (!selectedFile) return result;

        const created = findCreatedChat(beforeIds);
        if (!created?.id || !byId('communityModal')?.classList.contains('hidden')) return result;

        try {
          notice('Сохраняем аватар сообщества…');
          const avatarKey = await uploadAvatar(selectedFile);
          await setAvatarKeepingDescription(created.id, avatarKey);

          if (mode === 'linked') {
            try {
              const info = await request(`/chats/${encodeURIComponent(created.id)}/community`);
              const linkedId = info?.linked_chat_id || info?.linkedChatId;
              if (linkedId && linkedId !== created.id) await setAvatarKeepingDescription(linkedId, avatarKey);
            } catch (error) {
              console.warn('WORKSPACE14 linked discussion avatar', error);
            }
          }
          notice('Аватар сообщества сохранён');
        } catch (error) {
          notice(error?.message || 'Сообщество создано, но аватар не сохранился', true);
        } finally {
          resetCreateAvatar(mode);
        }
        return result;
      };
    }
  }

  function ensureCommunityEditCard() {
    const hero = document.querySelector('#communityManageModal .telegram-profile-hero');
    if (!hero || byId('workspace14CommunityEditCard')) return;
    const card = document.createElement('section');
    card.id = 'workspace14CommunityEditCard';
    card.className = 'telegram-settings-card workspace14-community-edit-card hidden';
    card.innerHTML = `
      <div><strong>Оформление сообщества</strong><small>Аватар и описание видят все участники</small></div>
      <button id="workspace14CommunityEditButton" type="button" class="telegram-primary-button">Изменить аватар и описание</button>`;
    hero.insertAdjacentElement('afterend', card);
    byId('workspace14CommunityEditButton')?.addEventListener('click', async () => {
      bridgeState();
      const managed = state?.managedCommunity;
      if (managed?.id && state?.activeChat?.id !== managed.id && typeof openChat === 'function') await openChat(managed);
      const feature = window.meetusWorkspace13;
      if (feature?.openProfileEditor) {
        await feature.openProfileEditor();
        return;
      }
      const action = document.querySelector('[data-workspace13-action="profile"]');
      if (action) {
        action.classList.remove('hidden');
        action.click();
      } else {
        notice('Редактор оформления пока не загрузился. Обновите страницу.', true);
      }
    });
  }

  function applyManagedPermissions(info) {
    const canEdit = Boolean(info?.canEditSettings || info?.canManage || ['owner', 'admin'].includes(info?.viewer_role));
    const card = byId('workspace14CommunityEditCard');
    card?.classList.toggle('hidden', !canEdit);
    const avatar = byId('communityManageAvatar');
    avatar?.classList.toggle('workspace14-editable-avatar', canEdit);
    if (avatar) avatar.title = canEdit ? 'Изменить аватар' : '';

    try {
      const managed = state?.managedCommunity;
      if (managed && info?.viewer_role) managed.role = info.viewer_role;
      if (state?.activeChat?.id === managed?.id && info?.viewer_role) state.activeChat.role = info.viewer_role;
    } catch {}

    const action = document.querySelector('[data-workspace13-action="profile"]');
    if (action) action.classList.toggle('hidden', !canEdit);
    try { window.meetusWorkspace13?.refreshProfileAction?.(); } catch {}
  }

  function wrapCommunityInfo() {
    ensureCommunityEditCard();
    if (!runtime.communityInfoWrapped && typeof applyCommunityInfo === 'function') {
      runtime.communityInfoWrapped = true;
      const baseApply = applyCommunityInfo;
      applyCommunityInfo = function workspace14ApplyCommunityInfo(info) {
        const result = baseApply.call(this, info);
        ensureCommunityEditCard();
        applyManagedPermissions(info);
        return result;
      };
    }
    const avatar = byId('communityManageAvatar');
    if (avatar && avatar.dataset.workspace14Click !== '1') {
      avatar.dataset.workspace14Click = '1';
      avatar.addEventListener('click', () => {
        if (!avatar.classList.contains('workspace14-editable-avatar')) return;
        byId('workspace14CommunityEditButton')?.click();
      });
    }
  }

  function ensurePinsButton() {
    const actions = document.querySelector('.chat-header-actions');
    const search = byId('chatSearchButton');
    if (!actions || !search) return;
    let button = byId('workspace14PinsButton');
    if (!button) {
      button = document.createElement('button');
      button.id = 'workspace14PinsButton';
      button.type = 'button';
      button.className = 'icon-button hidden';
      button.title = 'Закреплённые сообщения';
      button.setAttribute('aria-label', 'Закреплённые сообщения');
      button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 4 8 0-1 5 3 3v2H6v-2l3-3zM12 14v7"/></svg><span id="workspace14PinsBadge" class="workspace14-pins-badge hidden">0</span>';
      const call = byId('callButton') || actions.querySelector('button[title="Звонок"],button[title="Видеозвонок"]');
      if (call?.nextSibling) actions.insertBefore(button, call.nextSibling);
      else actions.insertBefore(button, search);
      button.addEventListener('click', async () => {
        try {
          await window.meetusWorkspace13?.loadPins?.();
          window.meetusWorkspace13?.openPinsModal?.();
        } catch (error) {
          notice(error?.message || 'Не удалось открыть закреплённые сообщения', true);
        }
      });
    }
    syncPinsButton();
  }

  function syncPinsButton() {
    const button = byId('workspace14PinsButton');
    const banner = byId('workspacePinnedBanner');
    if (!button) return;
    const pins = window.meetusWorkspace13?.getPins?.() || [];
    const visible = Boolean(state?.activeChat && (pins.length || (banner && !banner.classList.contains('hidden'))));
    button.classList.toggle('hidden', !visible);
    const badge = byId('workspace14PinsBadge');
    const count = pins.length;
    if (badge) {
      badge.textContent = count > 9 ? '9+' : String(count || '');
      badge.classList.toggle('hidden', count < 2);
    }
  }

  function observePinsBanner() {
    const banner = byId('workspacePinnedBanner');
    if (!banner || runtime.pinObserver) return;
    runtime.pinObserver = new MutationObserver(() => syncPinsButton());
    runtime.pinObserver.observe(banner, { attributes: true, childList: true, subtree: true, characterData: true });
  }

  function wrapOpenChat() {
    if (runtime.chatOpenWrapped || typeof openChat !== 'function') return;
    runtime.chatOpenWrapped = true;
    const base = openChat;
    openChat = async function workspace14OpenChat(...args) {
      const result = await base.apply(this, args);
      ensurePinsButton();
      try { await window.meetusWorkspace13?.loadPins?.(); } catch {}
      syncPinsButton();
      return result;
    };
  }

  function bindSocket() {
    if (runtime.socketBound || typeof socket === 'undefined' || !socket?.on) return;
    runtime.socketBound = true;
    socket.on('workspace.pins.changed', () => window.setTimeout(syncPinsButton, 0));
    socket.on('workspace.chat-profile.changed', (payload) => {
      try {
        if (payload?.chatId === state?.managedCommunity?.id && payload?.profile) {
          if (state.managedCommunityInfo) {
            state.managedCommunityInfo.description = payload.profile.description || '';
            state.managedCommunityInfo.avatar_key = payload.profile.avatar_key || null;
          }
          const description = byId('communityManageDescription');
          if (description) description.textContent = payload.profile.description || 'Описание не заполнено';
          if (typeof setAvatarElement === 'function') {
            setAvatarElement(byId('communityManageAvatar'), state.managedCommunity?.title || payload.profile.title || 'Сообщество', payload.profile.avatar_key);
          }
        }
      } catch {}
    });
  }

  function install() {
    if (runtime.installed) return;
    runtime.installed = true;
    bridgeState();
    document.documentElement.dataset.meetusWorkspace14 = '1';
    ensureCreateAvatarUi();
    wrapCommunityCreation();
    wrapCommunityInfo();
    ensurePinsButton();
    observePinsBanner();
    wrapOpenChat();
    bindSocket();

    window.setTimeout(async () => {
      try { await window.meetusWorkspace13?.loadPins?.(); } catch {}
      syncPinsButton();
    }, 250);

    const timer = window.setInterval(() => {
      bridgeState();
      ensureCreateAvatarUi();
      wrapCommunityCreation();
      wrapCommunityInfo();
      ensurePinsButton();
      observePinsBanner();
      wrapOpenChat();
      bindSocket();
      syncPinsButton();
    }, 700);
    window.setTimeout(() => window.clearInterval(timer), 30000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();

  window.meetusWorkspace14Version = VERSION;
})();
