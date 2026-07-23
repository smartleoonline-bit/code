/* MEETUS 0.6.25.2 COMMUNITY2-TG11-WORKSPACE3 */
(() => {
  'use strict';

  const VERSION = '0.6.25.2-community2tg11workspace3';
  const ws = {
    loaded: false,
    pinnedChatIds: new Set(),
    pinnedChatOrder: [],
    folders: [],
    memberCache: [],
    commentSettings: new Map(),
    selectedFolderId: 'all',
    pinnedMessage: null,
    contentProtected: false,
    contextCommentsEnabled: true,
    uploadSeq: 0,
  };

  const icon = {
    pin: '<svg viewBox="0 0 24 24"><path d="m9 4 6 0 0 5 3 3-5 1 0 6-2 2v-8l-5-1 3-3z"/></svg>',
    folder: '<svg viewBox="0 0 24 24"><path d="M3 6h7l2 2h9v11H3z"/></svg>',
    lock: '<svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
    users: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2"/><path d="M3 20c0-4 2-7 6-7s6 3 6 7M15 14c3 0 5 2 5 5"/></svg>',
  };

  function byId(id) { return document.getElementById(id); }
  function api(path, method = 'GET', body) {
    return request(`/workspace${path}`, {
      method,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  function toast(message, error = false) {
    if (typeof setUploadStatus === 'function') {
      setUploadStatus(message, error);
      setTimeout(() => setUploadStatus(''), 3000);
      return;
    }
    console[error ? 'error' : 'log'](message);
  }

  function canManageActiveChat() {
    const chat = state.activeChat;
    if (!chat) return false;
    return chat.type === 'private' || ['owner', 'admin'].includes(chat.role);
  }

  function injectUi() {
    if (byId('workspaceFolderBar')) return;
    const chatListNode = byId('chatList');
    if (!chatListNode) return;

    const bar = document.createElement('div');
    bar.id = 'workspaceFolderBar';
    bar.className = 'workspace-folder-bar';
    chatListNode.insertAdjacentElement('beforebegin', bar);

    document.body.insertAdjacentHTML('beforeend', `
      <div id="workspaceModal" class="workspace-modal hidden">
        <div class="workspace-card">
          <div class="workspace-card-head"><h3 id="workspaceModalTitle">Папка</h3><button id="workspaceModalClose" type="button">×</button></div>
          <div id="workspaceModalBody" class="workspace-card-body"></div>
          <div id="workspaceModalActions" class="workspace-card-actions"></div>
        </div>
      </div>
      <div id="workspacePinnedBanner" class="workspace-pinned-banner hidden">
        <button id="workspacePinnedOpen" type="button"><span class="workspace-pinned-icon">${icon.pin}</span><span><strong>Закреплённое сообщение</strong><small id="workspacePinnedText"></small></span></button>
        <button id="workspacePinnedRemove" type="button" title="Открепить">×</button>
      </div>
      <div id="workspaceFolderBackdrop" class="workspace-folder-backdrop hidden"></div>
      <aside id="workspaceFolderDrawer" class="workspace-folder-drawer hidden" aria-label="Папки чатов">
        <div class="workspace-folder-drawer-head"><strong>Папки</strong><button id="workspaceFolderDrawerClose" type="button">×</button></div>
        <div id="workspaceFolderDrawerList" class="workspace-folder-drawer-list"></div>
      </aside>
      <div id="workspaceMemberModal" class="workspace-modal hidden">
        <div class="workspace-card workspace-members-card">
          <div class="workspace-card-head"><div><h3>Участники</h3><small id="workspaceMemberSubtitle"></small></div><button id="workspaceMemberClose" type="button">×</button></div>
          <div class="workspace-member-search"><span>⌕</span><input id="workspaceMemberSearch" type="search" autocomplete="off" placeholder="Поиск по имени, @username или номеру"></div>
          <div id="workspaceMemberList" class="workspace-member-list"></div>
        </div>
      </div>
      <div id="workspaceLinkModal" class="workspace-modal hidden">
        <div class="workspace-card workspace-link-card">
          <div class="workspace-card-head"><h3>Добавить ссылку</h3><button id="workspaceLinkClose" type="button">×</button></div>
          <div class="workspace-card-body">
            <label>Текст<input id="workspaceLinkText" type="text" autocomplete="off"></label>
            <label>Ссылка<input id="workspaceLinkUrl" type="url" placeholder="https://" autocomplete="off"></label>
          </div>
          <div class="workspace-card-actions"><button id="workspaceLinkCancel" type="button">Отмена</button><button id="workspaceLinkApply" class="primary" type="button">Вставить</button></div>
        </div>
      </div>
      <div id="workspaceDropOverlay" class="workspace-drop-overlay hidden"><div><strong>Перетащите файлы сюда</strong><span>Фото, видео, аудио или документы</span></div></div>
    `);

    ensurePinnedBannerPlacement();

    injectComposerToolbar();
    injectHeaderActions();
    injectContextActions();

    const setFolderVisibility = (visible) => bar.classList.toggle('hidden', !visible);
    byId('chatsTabButton')?.addEventListener('click', () => setFolderVisibility(true));
    ['contactsTabButton', 'requestsTabButton', 'callsTabButton'].forEach((id) => byId(id)?.addEventListener('click', () => setFolderVisibility(false)));

    byId('workspaceFolderDrawerClose').addEventListener('click', closeFolderDrawer);
    byId('workspaceFolderBackdrop').addEventListener('click', closeFolderDrawer);
    byId('workspaceMemberSearch').addEventListener('input', (event) => renderMemberList(event.target.value));
    byId('workspaceModalClose').addEventListener('click', closeWorkspaceModal);
    byId('workspaceModal').addEventListener('click', (e) => { if (e.target.id === 'workspaceModal') closeWorkspaceModal(); });
    byId('workspaceMemberClose').addEventListener('click', () => byId('workspaceMemberModal').classList.add('hidden'));
    byId('workspaceMemberModal').addEventListener('click', (e) => { if (e.target.id === 'workspaceMemberModal') e.currentTarget.classList.add('hidden'); });
    byId('workspacePinnedOpen').addEventListener('click', () => {
      if (ws.pinnedMessage?.id && typeof scrollToMessage === 'function') scrollToMessage(ws.pinnedMessage.id);
    });
    byId('workspacePinnedRemove').addEventListener('click', async () => {
      if (!state.activeChat || !canManageActiveChat()) return;
      await api(`/chats/${state.activeChat.id}/pinned-message`, 'POST', { messageId: null });
      ws.pinnedMessage = null;
      renderPinnedBanner();
    });
    setupLinkModal();
    setupDragDrop();
  }

  function injectComposerToolbar() {
    if (byId('workspaceFormatBar') || typeof composer === 'undefined') return;
    const bar = document.createElement('div');
    bar.id = 'workspaceFormatBar';
    bar.className = 'workspace-format-bar';
    bar.innerHTML = `
      <button type="button" data-format="bold" title="Жирный"><b>B</b></button>
      <button type="button" data-format="italic" title="Курсив"><i>I</i></button>
      <button type="button" data-format="underline" title="Подчёркнутый"><u>U</u></button>
      <button type="button" data-format="link" title="Ссылка">↗</button>
    `;
    composer.insertAdjacentElement('beforebegin', bar);
    bar.addEventListener('click', (event) => {
      const action = event.target.closest('[data-format]')?.dataset.format;
      if (!action) return;
      if (action === 'link') return openLinkModal();
      const markers = { bold: ['**', '**'], italic: ['__', '__'], underline: ['++', '++'] }[action];
      applyTextWrapper(markers[0], markers[1]);
    });
  }

  function applyTextWrapper(before, after) {
    const start = messageInput.selectionStart ?? messageInput.value.length;
    const end = messageInput.selectionEnd ?? start;
    const selected = messageInput.value.slice(start, end);
    messageInput.setRangeText(`${before}${selected || 'текст'}${after}`, start, end, 'end');
    messageInput.dispatchEvent(new Event('input', { bubbles: true }));
    messageInput.focus();
  }

  function setupLinkModal() {
    const close = () => byId('workspaceLinkModal').classList.add('hidden');
    byId('workspaceLinkClose').addEventListener('click', close);
    byId('workspaceLinkCancel').addEventListener('click', close);
    byId('workspaceLinkModal').addEventListener('click', (e) => { if (e.target.id === 'workspaceLinkModal') close(); });
    byId('workspaceLinkApply').addEventListener('click', () => {
      const text = byId('workspaceLinkText').value.trim() || 'ссылка';
      let url = byId('workspaceLinkUrl').value.trim();
      if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
      if (!/^https?:\/\/[^\s]+$/i.test(url)) return toast('Введите корректную ссылку', true);
      const start = messageInput.selectionStart ?? messageInput.value.length;
      const end = messageInput.selectionEnd ?? start;
      messageInput.setRangeText(`[${text}](${url})`, start, end, 'end');
      messageInput.dispatchEvent(new Event('input', { bubbles: true }));
      close();
      messageInput.focus();
    });
  }

  function openLinkModal() {
    const start = messageInput.selectionStart ?? 0;
    const end = messageInput.selectionEnd ?? start;
    byId('workspaceLinkText').value = messageInput.value.slice(start, end) || '';
    byId('workspaceLinkUrl').value = 'https://';
    byId('workspaceLinkModal').classList.remove('hidden');
    requestAnimationFrame(() => byId('workspaceLinkUrl').focus());
  }

  function injectHeaderActions() {
    const menu = byId('chatHeaderMenu');
    if (!menu || menu.querySelector('[data-workspace-action]')) return;
    const divider = menu.querySelector('.chat-header-menu-divider');
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <button type="button" data-workspace-action="members">${icon.users}<span>Данные участников</span></button>
      <button type="button" data-workspace-action="protection">${icon.lock}<span id="workspaceProtectionLabel">Защита контента</span></button>
    `;
    [...wrapper.children].reverse().forEach((node) => menu.insertBefore(node, divider));
    menu.addEventListener('click', async (event) => {
      const action = event.target.closest('[data-workspace-action]')?.dataset.workspaceAction;
      if (!action) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (action === 'members') await openMemberInfo();
      if (action === 'protection') await toggleContentProtection();
      if (typeof closeChatHeaderMenu === 'function') closeChatHeaderMenu();
    }, true);
  }

  function injectContextActions() {
    const menu = typeof messageContextMenu !== 'undefined' ? messageContextMenu : null;
    if (!menu || menu.querySelector('[data-workspace-message-action]')) return;
    menu.insertAdjacentHTML('beforeend', `
      <button type="button" data-workspace-message-action="pin">${icon.pin}<span id="workspacePinMessageLabel">Закрепить сообщение</span></button>
      <button type="button" data-workspace-message-action="message-link">↗<span>Копировать ссылку на сообщение</span></button>
      <button type="button" data-workspace-message-action="comments">☑<span id="workspaceCommentsLabel">Комментарии к сообщению</span></button>
    `);
    menu.addEventListener('click', async (event) => {
      const action = event.target.closest('[data-workspace-message-action]')?.dataset.workspaceMessageAction;
      if (!action || !state.contextMessage) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (typeof closeMessageContextMenu === 'function') closeMessageContextMenu();
      if (action === 'pin') await pinContextMessage();
      if (action === 'message-link') await copyContextMessageLink();
      if (action === 'comments') await toggleContextComments();
    }, true);
  }

  async function loadWorkspaceState() {
    if (!state.user) return;
    try {
      const data = await api('/state');
      ws.pinnedChatOrder = Array.isArray(data.pinnedChatIds) ? [...data.pinnedChatIds] : [];
      ws.pinnedChatIds = new Set(ws.pinnedChatOrder);
      ws.folders = Array.isArray(data.folders) ? data.folders : [];
      ws.loaded = true;
      renderFolderBar();
      renderChats();
    } catch (error) {
      console.warn('Workspace state unavailable', error);
    }
  }

  function currentFolderName() {
    if (ws.selectedFolderId === 'all') return 'Все';
    return ws.folders.find((item) => item.id === ws.selectedFolderId)?.name || 'Все';
  }

  function renderFolderBar() {
    const bar = byId('workspaceFolderBar');
    if (!bar) return;
    bar.innerHTML = `
      <button type="button" class="workspace-folder-launch" data-workspace-folder-launch>
        <span>${icon.folder}<strong>Папки</strong></span>
        <small>${escapeHtml(currentFolderName())}</small>
        <b>›</b>
      </button>
    `;
    bar.querySelector('[data-workspace-folder-launch]')?.addEventListener('click', openFolderDrawer);
    renderFolderDrawer();
  }

  function renderFolderDrawer() {
    const root = byId('workspaceFolderDrawerList');
    if (!root) return;
    const folders = ws.folders.map((folder) => `
      <button type="button" class="${ws.selectedFolderId === folder.id ? 'active' : ''}" data-workspace-folder="${escapeHtml(folder.id)}">
        <span>${icon.folder}</span><strong>${escapeHtml(folder.name)}</strong><small>${Number(folder.chatIds?.length || 0)}</small>
      </button>
    `).join('');
    root.innerHTML = `
      <button type="button" class="${ws.selectedFolderId === 'all' ? 'active' : ''}" data-workspace-folder="all"><span>◉</span><strong>Все</strong><small>${state.chats?.length || 0}</small></button>
      ${folders}
      <button type="button" class="workspace-folder-create" data-workspace-folder-add><span>＋</span><strong>Создать папку</strong></button>
    `;
    root.querySelectorAll('[data-workspace-folder]').forEach((button) => button.addEventListener('click', () => {
      ws.selectedFolderId = button.dataset.workspaceFolder;
      renderFolderBar();
      renderChats();
      closeFolderDrawer();
    }));
    root.querySelector('[data-workspace-folder-add]')?.addEventListener('click', () => {
      closeFolderDrawer();
      openCreateFolder();
    });
  }

  function openFolderDrawer() {
    const drawer = byId('workspaceFolderDrawer');
    const backdrop = byId('workspaceFolderBackdrop');
    if (!drawer || !backdrop) return;
    renderFolderDrawer();
    const sidebar = byId('sidebar');
    if (sidebar && window.innerWidth > 700) {
      const rect = sidebar.getBoundingClientRect();
      drawer.style.left = `${Math.round(rect.right + 8)}px`;
      drawer.style.top = `${Math.round(Math.max(8, rect.top))}px`;
      drawer.style.height = `${Math.round(Math.min(window.innerHeight - Math.max(8, rect.top) - 8, rect.height))}px`;
    } else {
      drawer.style.removeProperty('left');
      drawer.style.removeProperty('top');
      drawer.style.removeProperty('height');
    }
    drawer.classList.remove('hidden');
    backdrop.classList.remove('hidden');
    requestAnimationFrame(() => drawer.classList.add('open'));
  }

  function closeFolderDrawer() {
    const drawer = byId('workspaceFolderDrawer');
    const backdrop = byId('workspaceFolderBackdrop');
    drawer?.classList.remove('open');
    backdrop?.classList.add('hidden');
    setTimeout(() => drawer?.classList.add('hidden'), 180);
  }

  function filteredChats(source) {
    let chats = [...source];
    if (ws.selectedFolderId !== 'all') {
      const folder = ws.folders.find((item) => item.id === ws.selectedFolderId);
      const allowed = new Set(folder?.chatIds || []);
      chats = chats.filter((chat) => allowed.has(chat.id));
    }
    const pinRank = new Map(ws.pinnedChatOrder.map((id, index) => [id, index]));
    return chats.sort((a, b) => {
      const aPinned = ws.pinnedChatIds.has(a.id);
      const bPinned = ws.pinnedChatIds.has(b.id);
      if (aPinned !== bPinned) return bPinned - aPinned;
      if (aPinned && bPinned) return (pinRank.get(a.id) ?? 9999) - (pinRank.get(b.id) ?? 9999);
      return new Date(b.last_message_at || b.updated_at || 0) - new Date(a.last_message_at || a.updated_at || 0);
    });
  }

  function enforcePinnedChatOrder() {
    if (!chatList) return;
    const rows = [...chatList.querySelectorAll('.chat-sidebar-row')];
    if (!rows.length) return;
    const rank = new Map(ws.pinnedChatOrder.map((id, index) => [id, index]));
    rows.sort((a, b) => {
      const aId = a.querySelector('.chat-item[data-chat-id]')?.dataset.chatId;
      const bId = b.querySelector('.chat-item[data-chat-id]')?.dataset.chatId;
      const aPinned = ws.pinnedChatIds.has(aId);
      const bPinned = ws.pinnedChatIds.has(bId);
      if (aPinned !== bPinned) return bPinned - aPinned;
      if (aPinned && bPinned) return (rank.get(aId) ?? 9999) - (rank.get(bId) ?? 9999);
      return 0;
    });
    rows.forEach((row) => chatList.append(row));
  }

  function enhanceChatRows() {
    chatList.querySelectorAll('.chat-item[data-chat-id]').forEach((button) => {
      const chatId = button.dataset.chatId;
      if (ws.pinnedChatIds.has(chatId) && !button.querySelector('.workspace-chat-pin')) {
        button.querySelector('.chat-name')?.insertAdjacentHTML('afterbegin', '<span class="workspace-chat-pin">📌</span>');
      }
      const menu = chatList.querySelector(`[data-chat-menu="${CSS.escape(chatId)}"]`);
      if (!menu || menu.querySelector('[data-workspace-chat-action]')) return;
      menu.insertAdjacentHTML('afterbegin', `
        <button type="button" data-workspace-chat-action="pin" data-workspace-chat-id="${escapeHtml(chatId)}">${ws.pinnedChatIds.has(chatId) ? 'Открепить чат' : 'Закрепить чат'}</button>
        <button type="button" data-workspace-chat-action="folder" data-workspace-chat-id="${escapeHtml(chatId)}">Добавить в папку</button>
      `);
    });
    enforcePinnedChatOrder();
  }

  function openCreateFolder() {
    openWorkspaceModal('Новая папка', `
      <label class="workspace-field">Название<input id="workspaceFolderName" maxlength="64" autocomplete="off" placeholder="Например: Работа"></label>
    `, [
      { text: 'Отмена', action: closeWorkspaceModal },
      { text: 'Создать', primary: true, action: async () => {
        const folder = await api('/folders', 'POST', { name: byId('workspaceFolderName').value });
        ws.folders.push(folder);
        ws.selectedFolderId = folder.id;
        closeWorkspaceModal();
        renderFolderBar();
        renderFolderDrawer();
        renderChats();
      } },
    ]);
    requestAnimationFrame(() => byId('workspaceFolderName').focus());
  }

  function openFolderAssignment(chatId) {
    const chat = state.chats.find((item) => item.id === chatId);
    const body = ws.folders.length ? ws.folders.map((folder) => `
      <label class="workspace-folder-check"><input type="checkbox" data-folder-id="${escapeHtml(folder.id)}" ${folder.chatIds?.includes(chatId) ? 'checked' : ''}><span>${escapeHtml(folder.name)}</span></label>
    `).join('') : '<div class="empty-list">Сначала создайте папку</div>';
    openWorkspaceModal(`Папки: ${chatTitleValue(chat)}`, body, [
      { text: 'Закрыть', action: closeWorkspaceModal },
      { text: 'Сохранить', primary: true, action: async () => {
        const checks = [...byId('workspaceModalBody').querySelectorAll('[data-folder-id]')];
        for (const input of checks) {
          const folder = ws.folders.find((item) => item.id === input.dataset.folderId);
          const current = folder?.chatIds?.includes(chatId) || false;
          if (current === input.checked) continue;
          await api(`/folders/${input.dataset.folderId}/chats/${chatId}`, 'POST', { added: input.checked });
          folder.chatIds = folder.chatIds || [];
          if (input.checked) folder.chatIds.push(chatId);
          else folder.chatIds = folder.chatIds.filter((id) => id !== chatId);
        }
        closeWorkspaceModal();
        renderChats();
      } },
    ]);
  }

  function openWorkspaceModal(title, bodyHtml, actions) {
    byId('workspaceModalTitle').textContent = title;
    byId('workspaceModalBody').innerHTML = bodyHtml;
    const root = byId('workspaceModalActions');
    root.innerHTML = '';
    actions.forEach((item) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = item.text;
      if (item.primary) button.className = 'primary';
      button.addEventListener('click', async () => {
        button.disabled = true;
        try { await item.action(); } catch (error) { toast(error.message, true); }
        finally { button.disabled = false; }
      });
      root.append(button);
    });
    byId('workspaceModal').classList.remove('hidden');
  }

  function closeWorkspaceModal() { byId('workspaceModal').classList.add('hidden'); }

  async function writeClipboard(value) {
    try { await navigator.clipboard.writeText(value); return; } catch {}
    const field = document.createElement('textarea');
    field.value = value;
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.append(field);
    field.select();
    document.execCommand('copy');
    field.remove();
  }

  async function copyContextMessageLink() {
    if (!state.activeChat || !state.contextMessage) return;
    const canLink = ['group', 'channel'].includes(state.activeChat.type) && ['owner', 'admin'].includes(state.activeChat.role);
    if (!canLink) return toast('Ссылку на сообщение может копировать администратор или владелец', true);
    const url = new URL(location.origin + '/');
    url.searchParams.set('chat', state.activeChat.id);
    url.searchParams.set('message', state.contextMessage.id);
    await writeClipboard(url.toString());
    toast('Ссылка на сообщение скопирована');
  }

  function ensurePinnedBannerPlacement() {
    const banner = byId('workspacePinnedBanner');
    const header = document.querySelector('.chat-header');
    if (!banner || !header) return;
    if (header.nextElementSibling !== banner) header.insertAdjacentElement('afterend', banner);
  }

  async function pinContextMessage() {
    if (!state.activeChat || !state.contextMessage) return;
    if (!canManageActiveChat()) return toast('Закреплять сообщения здесь может только владелец или администратор', true);
    const current = ws.pinnedMessage?.id === state.contextMessage.id;
    try {
      const result = await api(`/chats/${state.activeChat.id}/pinned-message`, 'POST', { messageId: current ? null : state.contextMessage.id });
      ws.pinnedMessage = result.message || null;
      renderPinnedBanner();
      toast(current ? 'Сообщение откреплено' : 'Сообщение закреплено');
    } catch (error) {
      toast(error.message || 'Не удалось закрепить сообщение', true);
    }
  }

  async function loadPinnedMessage() {
    if (!state.activeChat) return;
    try { ws.pinnedMessage = await api(`/chats/${state.activeChat.id}/pinned-message`); }
    catch { ws.pinnedMessage = null; }
    renderPinnedBanner();
  }

  function renderPinnedBanner() {
    ensurePinnedBannerPlacement();
    const banner = byId('workspacePinnedBanner');
    if (!banner) return;
    banner.classList.toggle('hidden', !ws.pinnedMessage);
    if (!ws.pinnedMessage) return;
    const preview = ws.pinnedMessage.text || ws.pinnedMessage.file_name || ({ image: 'Фото', video: 'Видео', voice: 'Голосовое сообщение', file: 'Файл' }[ws.pinnedMessage.kind]) || 'Сообщение';
    byId('workspacePinnedText').textContent = `${ws.pinnedMessage.sender_name || 'Пользователь'}: ${preview}`;
    byId('workspacePinnedRemove').classList.toggle('hidden', !canManageActiveChat());
  }

  async function readCommentsSetting(messageId, force = false) {
    if (!force && ws.commentSettings.has(messageId)) return ws.commentSettings.get(messageId);
    const setting = await api(`/messages/${messageId}/comments`);
    const enabled = setting.commentsEnabled !== false;
    ws.commentSettings.set(messageId, enabled);
    return enabled;
  }

  async function toggleContextComments() {
    const message = state.contextMessage;
    const canComments = state.activeChat?.type === 'channel' && ['owner', 'admin'].includes(state.activeChat?.role);
    if (!message || !canComments) return;
    const current = await readCommentsSetting(message.id, true);
    const result = await api(`/messages/${message.id}/comments`, 'POST', { commentsEnabled: !current });
    const enabled = result.commentsEnabled !== false;
    ws.commentSettings.set(message.id, enabled);
    applyCommentStateToRow(message.id, enabled);
    toast(enabled ? 'Комментарии включены' : 'Комментарии отключены');
  }

  function applyCommentStateToRow(messageId, enabled) {
    ws.commentSettings.set(messageId, enabled);
    const row = messageArea.querySelector(`[data-message-id="${CSS.escape(messageId)}"]`);
    if (!row) return;
    row.dataset.commentsEnabled = enabled ? '1' : '0';
    row.classList.toggle('workspace-comments-disabled', !enabled);
    const commentSelectors = '[data-community2-open-thread],[data-open-thread],.community2-comment-button,.community2-channel-comment-row,.telegram-comment-row,.channel-comment-button';
    row.querySelectorAll(commentSelectors).forEach((node) => node.classList.toggle('hidden', !enabled));
    if (!enabled && !row.querySelector('.workspace-comments-off')) {
      row.querySelector('.message-bubble')?.insertAdjacentHTML('beforeend', '<span class="workspace-comments-off">Комментарии отключены</span>');
    }
    if (enabled) row.querySelector('.workspace-comments-off')?.remove();
    const canManage = state.activeChat?.type === 'channel' && ['owner', 'admin'].includes(state.activeChat?.role);
    if (canManage) {
      let toggle = row.querySelector('.workspace-comment-toggle-chip');
      if (!toggle) {
        toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'workspace-comment-toggle-chip';
        row.querySelector('.message-bubble')?.append(toggle);
        toggle.addEventListener('click', async (event) => {
          event.preventDefault();
          event.stopPropagation();
          const currentValue = ws.commentSettings.get(messageId) !== false;
          try {
            const result = await api(`/messages/${messageId}/comments`, 'POST', { commentsEnabled: !currentValue });
            applyCommentStateToRow(messageId, result.commentsEnabled !== false);
          } catch (error) { toast(error.message, true); }
        });
      }
      toggle.textContent = enabled ? '☑ Комментарии включены' : '☐ Комментарии отключены';
      toggle.title = enabled ? 'Отключить комментарии к публикации' : 'Включить комментарии к публикации';
    }
  }

  async function refreshContextActions(message) {
    const pinButton = messageContextMenu.querySelector('[data-workspace-message-action="pin"]');
    const linkButton = messageContextMenu.querySelector('[data-workspace-message-action="message-link"]');
    const commentsButton = messageContextMenu.querySelector('[data-workspace-message-action="comments"]');
    const canPin = Boolean(state.activeChat) && (state.activeChat.type === 'private' || ['owner', 'admin'].includes(state.activeChat.role));
    const canLink = ['group', 'channel'].includes(state.activeChat?.type) && ['owner', 'admin'].includes(state.activeChat?.role);
    const canComments = state.activeChat?.type === 'channel' && ['owner', 'admin'].includes(state.activeChat?.role);
    pinButton?.classList.toggle('hidden', !canPin);
    linkButton?.classList.toggle('hidden', !canLink);
    commentsButton?.classList.toggle('hidden', !canComments);
    if (pinButton) byId('workspacePinMessageLabel').textContent = ws.pinnedMessage?.id === message.id ? 'Открепить сообщение' : 'Закрепить сообщение';
    if (canComments) {
      try {
        const enabled = await readCommentsSetting(message.id, true);
        byId('workspaceCommentsLabel').textContent = enabled ? 'Отключить комментарии' : 'Включить комментарии';
      } catch (error) { console.warn('Comments setting unavailable', error); }
    }
  }

  async function loadContentProtection() {
    if (!state.activeChat) return;
    try {
      const value = await api(`/chats/${state.activeChat.id}/content-protection`);
      ws.contentProtected = Boolean(value.protectContent);
    } catch { ws.contentProtected = false; }
    applyContentProtection();
  }

  function hardenProtectedMedia(root = document) {
    if (!ws.contentProtected || !root) return;
    root.querySelectorAll('img,video,audio').forEach((media) => {
      media.draggable = false;
      media.setAttribute('draggable', 'false');
      media.setAttribute('controlsList', 'nodownload noremoteplayback');
      if (media.tagName === 'VIDEO') media.disablePictureInPicture = true;
    });
    root.querySelectorAll('a[download],.file-download,[data-message-action="download"],#viewerDownload,.viewer-download').forEach((node) => node.classList.add('workspace-protected-hidden'));
  }

  function applyContentProtection() {
    document.body.classList.toggle('workspace-content-protected', ws.contentProtected);
    messageArea?.classList.toggle('workspace-content-protected-area', ws.contentProtected);
    const label = byId('workspaceProtectionLabel');
    if (label) label.textContent = ws.contentProtected ? 'Отключить защиту контента' : 'Включить защиту контента';
    const action = byId('chatHeaderMenu')?.querySelector('[data-workspace-action="protection"]');
    action?.classList.toggle('hidden', !state.activeChat || state.activeChat.type === 'private' || !['owner', 'admin'].includes(state.activeChat.role));
    byId('chatHeaderMenu')?.querySelector('[data-workspace-action="members"]')?.classList.toggle('hidden', !state.activeChat || state.activeChat.type === 'private' || !['owner', 'admin'].includes(state.activeChat.role));
    if (typeof viewerDownload !== 'undefined') viewerDownload.classList.toggle('workspace-protected-hidden', ws.contentProtected);
    hardenProtectedMedia(messageArea);
    if (typeof mediaViewer !== 'undefined') hardenProtectedMedia(mediaViewer);
  }

  async function toggleContentProtection() {
    if (!state.activeChat) return;
    const result = await api(`/chats/${state.activeChat.id}/content-protection`, 'POST', { protectContent: !ws.contentProtected });
    ws.contentProtected = result.protectContent;
    applyContentProtection();
    toast(ws.contentProtected ? 'Защита контента включена' : 'Защита контента отключена');
  }

  function memberSearchText(member) {
    return [member.display_name, member.username, member.phone, member.role].filter(Boolean).join(' ').toLocaleLowerCase('ru-RU');
  }

  function renderMemberList(query = '') {
    const root = byId('workspaceMemberList');
    if (!root) return;
    const normalized = String(query || '').trim().toLocaleLowerCase('ru-RU');
    const members = normalized ? ws.memberCache.filter((member) => memberSearchText(member).includes(normalized)) : ws.memberCache;
    root.innerHTML = members.map((member) => {
      const source = {
        admin: member.added_by_name ? `Добавил: ${member.added_by_name}` : 'Добавлен администратором',
        invite_link: 'Вступил по ссылке',
        linked_discussion: 'Вступил через связанный канал/обсуждение',
        request: 'Вступил после одобрения запроса',
        existing: 'Участник до включения журнала',
        unknown: 'Способ вступления не зафиксирован',
      }[member.join_source] || 'Способ вступления не зафиксирован';
      return `<div class="workspace-member-row">
        ${avatarMarkup(member.display_name, member.avatar_key, 'avatar')}
        <div><strong>${escapeHtml(member.display_name)}</strong><span>${escapeHtml(member.username ? `@${member.username}` : member.phone || '')}</span><small>${escapeHtml(new Date(member.joined_at).toLocaleString('ru-RU'))} • ${escapeHtml(source)}</small></div>
        <span class="workspace-member-role">${escapeHtml(member.role)}</span>
      </div>`;
    }).join('') || '<div class="empty-list">Совпадений не найдено</div>';
  }

  async function openMemberInfo() {
    const canView = state.activeChat && state.activeChat.type !== 'private' && ['owner', 'admin'].includes(state.activeChat.role);
    if (!canView) return toast('Данные участников доступны владельцу и администраторам', true);
    const root = byId('workspaceMemberList');
    root.innerHTML = '<div class="loading">Загружаем участников…</div>';
    byId('workspaceMemberSubtitle').textContent = chatTitleValue(state.activeChat);
    byId('workspaceMemberSearch').value = '';
    byId('workspaceMemberModal').classList.remove('hidden');
    try {
      ws.memberCache = await api(`/chats/${state.activeChat.id}/members`);
      renderMemberList();
      requestAnimationFrame(() => byId('workspaceMemberSearch').focus());
    } catch (error) { root.innerHTML = `<div class="empty-list">${escapeHtml(error.message)}</div>`; }
  }

  async function uploadDroppedFiles(fileList) {
    const files = [...fileList].slice(0, 10);
    if (!files.length || !state.activeChat) return;
    for (const file of files) {
      const mime = String(file.type || '').toLowerCase();
      const kind = mime.startsWith('image/') ? 'image' : mime.startsWith('video/') ? 'video' : 'file';
      try {
        await uploadBlob(file, file.name || `file-${Date.now()}`, kind, undefined, null, '', state.replyToMessage?.id, kind === 'file');
      } catch (error) {
        toast(`${file.name || 'Файл'}: ${error.message}`, true);
      }
    }
    if (typeof clearReplyMessage === 'function') clearReplyMessage();
  }

  function setupDragDrop() {
    const overlay = byId('workspaceDropOverlay');
    let depth = 0;
    const hasFiles = (event) => Array.from(event.dataTransfer?.types || []).includes('Files');
    const filesFromTransfer = (transfer) => {
      const items = Array.from(transfer?.items || [])
        .filter((item) => item.kind === 'file')
        .map((item) => item.getAsFile())
        .filter(Boolean);
      return items.length ? items : Array.from(transfer?.files || []);
    };
    document.addEventListener('dragenter', (event) => {
      if (!hasFiles(event) || !state.activeChat) return;
      event.preventDefault();
      depth += 1;
      overlay.classList.remove('hidden');
    }, true);
    document.addEventListener('dragleave', (event) => {
      if (!hasFiles(event)) return;
      depth = Math.max(0, depth - 1);
      if (!depth) overlay.classList.add('hidden');
    }, true);
    document.addEventListener('dragover', (event) => {
      if (!hasFiles(event) || !state.activeChat) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
      overlay.classList.remove('hidden');
    }, true);
    document.addEventListener('drop', (event) => {
      if (!hasFiles(event) || !state.activeChat) return;
      const files = filesFromTransfer(event.dataTransfer);
      if (!files.length) return;
      event.preventDefault();
      event.stopPropagation();
      depth = 0;
      overlay.classList.add('hidden');
      uploadDroppedFiles(files);
    }, true);
    window.addEventListener('blur', () => { depth = 0; overlay.classList.add('hidden'); });
  }

  function addUploadPlaceholder(fileName, kind) {
    const id = `workspace-upload-${++ws.uploadSeq}`;
    const row = document.createElement('div');
    row.id = id;
    row.className = 'message-row mine workspace-upload-row';
    row.innerHTML = `<div class="message-bubble has-media"><div class="workspace-upload-preview"><span class="workspace-upload-spinner"></span><div><strong>${escapeHtml(fileName || 'Файл')}</strong><small>${kind === 'voice' ? 'Отправляем аудио…' : 'Загружаем файл…'}</small></div></div><div class="workspace-upload-progress"><i></i></div></div>`;
    messageArea.append(row);
    scrollMessages();
    return row;
  }

  function audioFileMarkup(message, url, fileName) {
    return `<div class="workspace-audio-file"><button type="button" class="workspace-audio-play">▶</button><div class="workspace-audio-main"><strong>${fileName}</strong><input type="range" min="0" max="1000" value="0"><small><span>0:00</span><span>${escapeHtml(formatBytes(message.file_size) || 'Аудио')}</span></small></div><audio preload="metadata" src="${url}"></audio></div>`;
  }

  function setupAudioFiles(root = messageArea) {
    root.querySelectorAll('.workspace-audio-file:not([data-ready])').forEach((node) => {
      node.dataset.ready = '1';
      const audio = node.querySelector('audio');
      const play = node.querySelector('.workspace-audio-play');
      const range = node.querySelector('input');
      const current = node.querySelector('small span');
      play.addEventListener('click', async () => {
        document.querySelectorAll('.workspace-audio-file audio').forEach((other) => { if (other !== audio) other.pause(); });
        if (audio.paused) await audio.play(); else audio.pause();
      });
      audio.addEventListener('play', () => play.textContent = '❚❚');
      audio.addEventListener('pause', () => play.textContent = '▶');
      audio.addEventListener('timeupdate', () => {
        if (Number.isFinite(audio.duration) && audio.duration > 0) range.value = String(Math.round(audio.currentTime / audio.duration * 1000));
        current.textContent = formatDuration(audio.currentTime * 1000);
      });
      range.addEventListener('input', () => { if (Number.isFinite(audio.duration)) audio.currentTime = Number(range.value) / 1000 * audio.duration; });
    });
  }

  function richText(value = '') {
    const tokens = [];
    let source = String(value).replace(/\[([^\]\n]{1,200})\]\((https?:\/\/[^\s)]+)\)/gi, (_, label, href) => {
      const token = `\u0000L${tokens.length}\u0000`;
      tokens.push(`<a class="message-link" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`);
      return token;
    });
    source = escapeHtml(source);
    source = source
      .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^_\n]+)__/g, '<em>$1</em>')
      .replace(/\+\+([^+\n]+)\+\+/g, '<u>$1</u>');
    const pattern = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;
    source = source.replace(pattern, (full) => {
      const href = full.toLowerCase().startsWith('www.') ? `https://${full}` : full;
      return `<a class="message-link" href="${href}" target="_blank" rel="noopener noreferrer">${full}</a>`;
    });
    source = source.replace(/\u0000L(\d+)\u0000/g, (_, index) => tokens[Number(index)] || '');
    return source.replace(/\r?\n/g, '<br>');
  }

  function installHooks() {
    const baseRenderChats = renderChats;
    renderChats = function workspaceRenderChats(...args) {
      const all = state.chats;
      state.chats = filteredChats(all);
      try { return baseRenderChats.apply(this, args); }
      finally { state.chats = all; enhanceChatRows(); enforcePinnedChatOrder(); renderFolderBar(); }
    };

    const baseOpenChat = openChat;
    openChat = async function workspaceOpenChat(chat, ...args) {
      const result = await baseOpenChat.call(this, chat, ...args);
      ensurePinnedBannerPlacement();
      await Promise.all([loadPinnedMessage(), loadContentProtection()]);
      hardenProtectedMedia(messageArea);
      return result;
    };

    const baseOpenContext = openMessageContextMenu;
    openMessageContextMenu = function workspaceMessageMenu(message, trigger) {
      const result = baseOpenContext.call(this, message, trigger);
      refreshContextActions(message);
      if (ws.contentProtected) messageDownloadAction?.classList.add('hidden');
      return result;
    };

    const baseUploadBlob = uploadBlob;
    uploadBlob = async function workspaceUploadBlob(blob, fileName, kind, ...rest) {
      const row = addUploadPlaceholder(fileName, kind);
      try { return await baseUploadBlob.call(this, blob, fileName, kind, ...rest); }
      finally { row.remove(); }
    };

    const baseMediaMarkup = mediaMarkup;
    mediaMarkup = function workspaceMediaMarkup(message) {
      const mime = String(message?.mime_type || '').toLowerCase();
      if (message?.media_key && mime.startsWith('audio/') && message.kind !== 'voice') {
        const url = `/api/media/${encodeURIComponent(message.media_key)}`;
        return audioFileMarkup(message, url, escapeHtml(message.file_name || 'Аудио'));
      }
      return baseMediaMarkup.call(this, message);
    };

    const baseAppendMessage = appendMessage;
    appendMessage = function workspaceAppendMessage(message) {
      const result = baseAppendMessage.call(this, message);
      setupAudioFiles();
      hardenProtectedMedia(messageArea);
      if (state.activeChat?.type === 'channel') {
        readCommentsSetting(message.id, true).then((enabled) => applyCommentStateToRow(message.id, enabled)).catch(() => {});
      }
      return result;
    };

    linkifyMessageText = richText;

    const baseInvite = inviteUserToCommunity;
    inviteUserToCommunity = async function workspaceInviteUser(userId) {
      const chatId = state.managedCommunity?.id;
      const result = await baseInvite.call(this, userId);
      if (chatId) api(`/chats/${chatId}/members/${userId}/audit`, 'POST', { source: 'admin' }).catch(() => {});
      return result;
    };

    const baseDownload = downloadMessageMedia;
    downloadMessageMedia = function workspaceDownload(message) {
      if (ws.contentProtected) throw new Error('В этом чате включена защита контента');
      return baseDownload.call(this, message);
    };

    const baseOpenMediaViewer = openMediaViewer;
    openMediaViewer = function workspaceOpenMediaViewer(...args) {
      const result = baseOpenMediaViewer.apply(this, args);
      requestAnimationFrame(() => applyContentProtection());
      return result;
    };

    const baseCopyMessageContent = copyMessageContent;
    copyMessageContent = function workspaceCopyMessageContent(message) {
      if (ws.contentProtected && message?.media_key && !message?.text?.trim()) throw new Error('Копирование медиа отключено защитой контента');
      return baseCopyMessageContent.call(this, message);
    };

    document.addEventListener('click', async (event) => {
      const action = event.target.closest('[data-workspace-chat-action]');
      if (!action) return;
      event.preventDefault();
      event.stopPropagation();
      const chatId = action.dataset.workspaceChatId;
      if (action.dataset.workspaceChatAction === 'pin') {
        const pinned = !ws.pinnedChatIds.has(chatId);
        await api(`/chats/${chatId}/pin`, 'POST', { pinned });
        if (pinned) { ws.pinnedChatIds.add(chatId); ws.pinnedChatOrder = [chatId, ...ws.pinnedChatOrder.filter((id) => id !== chatId)]; }
        else { ws.pinnedChatIds.delete(chatId); ws.pinnedChatOrder = ws.pinnedChatOrder.filter((id) => id !== chatId); }
        renderChats();
      } else {
        openFolderAssignment(chatId);
      }
    }, true);

    const protectedTarget = (target) => target?.closest?.('img,video,audio,.message-file,.media-image-button,.media-video-button,[download],[data-message-action="download"]');
    document.addEventListener('contextmenu', (event) => {
      if (ws.contentProtected && protectedTarget(event.target)) { event.preventDefault(); event.stopPropagation(); }
    }, true);
    document.addEventListener('dragstart', (event) => {
      if (ws.contentProtected && protectedTarget(event.target)) { event.preventDefault(); event.stopPropagation(); }
    }, true);
    document.addEventListener('click', (event) => {
      if (!ws.contentProtected) return;
      const download = event.target.closest('a[download],.message-file,[data-message-action="download"],#viewerDownload,.viewer-download');
      if (download) {
        event.preventDefault();
        event.stopImmediatePropagation();
        toast('Скачивание отключено защитой контента', true);
      }
    }, true);
    document.addEventListener('copy', (event) => {
      if (ws.contentProtected && (messageArea?.contains(event.target) || mediaViewer?.contains(event.target))) {
        event.preventDefault();
        toast('Копирование отключено защитой контента', true);
      }
    }, true);
    document.addEventListener('keydown', (event) => {
      if (!ws.contentProtected) return;
      if ((event.ctrlKey || event.metaKey) && ['s', 'p'].includes(event.key.toLowerCase())) {
        event.preventDefault();
        toast('Сохранение отключено защитой контента', true);
      }
    }, true);
    messageArea.addEventListener('click', (event) => {
      const commentButton = event.target.closest('[data-community2-open-thread],[data-open-thread],.community2-comment-button,.community2-channel-comment-row,.telegram-comment-row,.channel-comment-button');
      const row = commentButton?.closest('[data-message-id]');
      if (commentButton && row && ws.commentSettings.get(row.dataset.messageId) === false) {
        event.preventDefault();
        event.stopImmediatePropagation();
        toast('Комментарии к этой публикации отключены', true);
      }
    }, true);
  }

  function boot() {
    injectUi();
    installHooks();
    const wait = setInterval(() => {
      injectUi();
      ensurePinnedBannerPlacement();
      if (state.user && !ws.loaded) loadWorkspaceState();
      if (ws.loaded) {
        clearInterval(wait);
        renderFolderBar();
        renderChats();
        openDeepLinkedMessage().catch(() => {});
      }
    }, 500);
  }

  async function openDeepLinkedMessage() {
    const query = new URLSearchParams(location.search);
    const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
    const chatId = query.get('chat') || hash.get('chat');
    const messageId = query.get('message') || hash.get('message');
    if (!chatId || !messageId) return false;
    ws.selectedFolderId = 'all';
    renderFolderBar();
    try {
      if (typeof openSearchMessageResult === 'function') {
        await openSearchMessageResult(chatId, messageId);
      } else {
        let chat = state.chats.find((item) => item.id === chatId);
        if (!chat && typeof loadChats === 'function') {
          await loadChats(false);
          chat = state.chats.find((item) => item.id === chatId);
        }
        if (!chat) throw new Error('Нет доступа к этому каналу или группе');
        await openChat(chat);
        const context = await request(`/chats/${chatId}/messages/${messageId}/context?limit=100`);
        state.activeMessages = context;
        state.searchContextActive = true;
        messageArea.innerHTML = '';
        context.forEach(appendMessage);
        requestAnimationFrame(() => scrollToMessage(messageId));
      }
      const target = messageArea?.querySelector(`[data-message-id="${CSS.escape(messageId)}"]`);
      if (target) {
        target.classList.add('message-search-target');
        setTimeout(() => target.classList.remove('message-search-target'), 2600);
      }
      history.replaceState({}, '', location.pathname || '/');
      return true;
    } catch (error) {
      toast(error.message || 'Не удалось открыть сообщение', true);
      return false;
    }
  }


  boot();
  window.addEventListener('popstate', () => openDeepLinkedMessage().catch(() => {}));
  window.addEventListener('hashchange', () => openDeepLinkedMessage().catch(() => {}));
  window.MeetusWorkspace = { ws, loadWorkspaceState, renderFolderBar, loadPinnedMessage, openFolderDrawer, closeFolderDrawer, applyContentProtection, openDeepLinkedMessage, api };
})();
