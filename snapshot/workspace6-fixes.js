/* MEETUS 0.6.25.2 COMMUNITY2-TG11-WORKSPACE6 — reliable search and call journal */
(() => {
  'use strict';

  const VERSION = '0.6.25.2-community2tg11workspace6';
  const runtime = {
    installed: false,
    globalSearchSeq: 0,
    dialogSearchSeq: 0,
    historyRendering: false,
    historyObserver: null,
  };

  const byId = (id) => document.getElementById(id);
  const escapeLocal = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

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

  function escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function highlighted(value, query) {
    const text = String(value ?? '');
    const clean = String(query ?? '').trim();
    if (!clean) return escapeLocal(text);
    const parts = clean.split(/\s+/).filter(Boolean).sort((a, b) => b.length - a.length);
    if (!parts.length) return escapeLocal(text);
    const regex = new RegExp(`(${parts.map(escapeRegex).join('|')})`, 'gi');
    return escapeLocal(text).replace(regex, '<mark class="workspace6-search-mark">$1</mark>');
  }

  function resultDate(value) {
    try {
      if (typeof searchResultDate === 'function') return searchResultDate(value);
    } catch {}
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const now = new Date();
    return date.toDateString() === now.toDateString()
      ? date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      : date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric' });
  }

  function messagePreview(message) {
    try {
      if (typeof searchMessageText === 'function') return searchMessageText(message);
    } catch {}
    return message?.text || message?.file_name || message?.kind || 'Сообщение';
  }

  function chatTitle(chat) {
    try {
      if (typeof searchChatTitle === 'function') return searchChatTitle(chat);
      if (typeof chatTitleValue === 'function') return chatTitleValue(chat);
    } catch {}
    return chat?.peer?.displayName || chat?.title || 'Чат';
  }

  function avatarHtml(name, key, extra = '') {
    try {
      if (typeof avatarMarkup === 'function') return avatarMarkup(name, key, `avatar ${extra}`.trim());
    } catch {}
    const initialsValue = String(name || '?').trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase() || '?';
    return `<span class="avatar ${extra}">${escapeLocal(initialsValue)}</span>`;
  }

  function searchSection(title, content, count, type) {
    return `<section class="global-search-section workspace6-search-section" data-workspace6-search-section="${type}">
      <div class="global-search-heading"><strong>${escapeLocal(title)}</strong><span>${Number(count) || 0}</span></div>
      ${content}
    </section>`;
  }

  function normalizeSearchPayload(payload) {
    return {
      chats: Array.isArray(payload?.chats) ? payload.chats : [],
      messages: Array.isArray(payload?.messages) ? payload.messages : [],
    };
  }

  async function workspace6PerformSearch(value) {
    const input = byId('searchInput');
    const root = byId('searchResults');
    if (!input || !root) return;
    const query = String(value ?? input.value ?? '').trim();
    const sequence = ++runtime.globalSearchSeq;
    if (query.length < 2) {
      root.classList.add('hidden');
      root.innerHTML = '';
      return;
    }
    root.classList.remove('hidden');
    root.innerHTML = '<div class="search-loading">Ищем в чатах и сообщениях…</div>';
    try {
      const [searchPayload, usersPayload] = await Promise.all([
        request(`/search?q=${encodeURIComponent(query)}`),
        request(`/users/search?q=${encodeURIComponent(query)}`),
      ]);
      if (sequence !== runtime.globalSearchSeq || String(input.value).trim() !== query) return;
      const { chats, messages } = normalizeSearchPayload(searchPayload);
      const users = Array.isArray(usersPayload) ? usersPayload : [];
      const chatMarkup = chats.length ? chats.map((chat) => {
        const title = chatTitle(chat);
        const sub = chat.type === 'channel' ? 'Канал' : chat.type === 'group' ? 'Группа' : chat.peer?.username ? `@${chat.peer.username}` : 'Личный чат';
        return `<button type="button" class="global-search-row" data-workspace6-chat="${escapeLocal(chat.id)}">
          ${avatarHtml(title, chat.avatar_key || chat.peer?.avatarKey, 'global-search-avatar')}
          <span class="global-search-row-content"><strong>${highlighted(title, query)}</strong><small>${highlighted(sub, query)}</small></span>
        </button>`;
      }).join('') : '<div class="search-section-empty">Совпадений по чатам нет</div>';
      const messageMarkup = messages.length ? messages.map((message) => {
        const title = chatTitle(message.chat || {});
        return `<button type="button" class="global-search-row message-search-row" data-workspace6-message="${escapeLocal(message.id)}" data-workspace6-message-chat="${escapeLocal(message.chat_id)}">
          ${avatarHtml(title, message.chat?.avatar_key || message.chat?.peer?.avatarKey, 'global-search-avatar')}
          <span class="global-search-row-content"><span class="global-search-title-line"><strong>${highlighted(title, query)}</strong><time>${escapeLocal(resultDate(message.created_at))}</time></span><small>${highlighted(messagePreview(message), query)}</small></span>
        </button>`;
      }).join('') : '<div class="search-section-empty">Сообщения не найдены</div>';
      const peopleMarkup = users.length ? users.map((user) => {
        const sub = user.username ? `@${user.username}` : user.email || user.phone || 'Пользователь';
        return `<button type="button" class="global-search-row" data-workspace6-user="${escapeLocal(user.id)}">
          ${avatarHtml(user.display_name, user.avatar_key, 'global-search-avatar')}
          <span class="global-search-row-content"><strong>${highlighted(user.display_name, query)}</strong><small>${highlighted(sub, query)}</small></span>
        </button>`;
      }).join('') : '<div class="search-section-empty">Новых пользователей не найдено</div>';
      root.innerHTML = `<div class="global-search-tabs workspace6-search-tabs">
          <button type="button" class="active" data-workspace6-search-tab="all">Все</button>
          <button type="button" data-workspace6-search-tab="chats">Чаты</button>
          <button type="button" data-workspace6-search-tab="messages">Сообщения</button>
        </div>
        ${searchSection('Чаты и каналы', chatMarkup, chats.length, 'chats')}
        ${searchSection('Сообщения', messageMarkup, messages.length, 'messages')}
        ${searchSection('Пользователи', peopleMarkup, users.length, 'people')}`;
    } catch (error) {
      if (sequence !== runtime.globalSearchSeq) return;
      root.innerHTML = `<div class="empty-list">${escapeLocal(error?.message || 'Не удалось выполнить поиск')}</div>`;
    }
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

  function messageStamp(message, fallback) {
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
      map.set(id, { ...(old || {}), ...message, __ws6: old?.__ws6 ?? index++ });
    });
    return [...map.values()].sort((a, b) => messageStamp(a, a.__ws6) - messageStamp(b, b.__ws6) || a.__ws6 - b.__ws6).map(({ __ws6, ...message }) => message);
  }

  function findMessage(messageId) {
    const escaped = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(messageId) : messageId.replace(/["\\]/g, '\\$&');
    return document.querySelector(`[data-message-id="${escaped}"], [data-id="${escaped}"].message, #message-${escaped}`);
  }

  function scrollContainer(target) {
    let node = target?.parentElement;
    while (node && node !== document.body) {
      const style = getComputedStyle(node);
      if (/(auto|scroll|overlay)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 4) return node;
      node = node.parentElement;
    }
    return byId('messageArea') || document.scrollingElement;
  }

  async function waitTarget(messageId, timeout = 5000) {
    const started = performance.now();
    while (performance.now() - started < timeout) {
      const target = findMessage(messageId);
      if (target) return target;
      await new Promise((resolve) => setTimeout(resolve, 45));
    }
    return null;
  }

  async function focusSearchMessage(messageId) {
    let target = await waitTarget(messageId);
    if (!target) throw new Error('Сообщение не найдено или было удалено');
    const position = () => {
      target = findMessage(messageId) || target;
      const scroller = scrollContainer(target);
      if (!scroller) return;
      if (scroller === document.scrollingElement || scroller === document.documentElement) {
        const top = window.scrollY + target.getBoundingClientRect().top - Math.max(100, window.innerHeight * .28);
        window.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
      } else {
        const sr = scroller.getBoundingClientRect();
        const tr = target.getBoundingClientRect();
        scroller.scrollTop = Math.max(0, Math.min(scroller.scrollHeight - scroller.clientHeight, scroller.scrollTop + tr.top - sr.top - Math.max(80, scroller.clientHeight * .28)));
      }
    };
    position();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    position();
    const media = [...target.querySelectorAll('img,video')];
    if (media.length) {
      await Promise.race([
        Promise.allSettled(media.map((node) => node.complete || node.readyState >= 1 ? Promise.resolve() : new Promise((resolve) => {
          node.addEventListener(node.tagName === 'VIDEO' ? 'loadedmetadata' : 'load', resolve, { once: true });
          node.addEventListener('error', resolve, { once: true });
        }))),
        new Promise((resolve) => setTimeout(resolve, 500)),
      ]);
      position();
    }
    document.querySelectorAll('.workspace6-search-hit').forEach((node) => node.classList.remove('workspace6-search-hit'));
    target.classList.add('workspace6-search-hit');
    setTimeout(() => target?.classList.remove('workspace6-search-hit'), 3000);
    return target;
  }

  async function workspace6OpenMessage(chatId, messageId) {
    if (!chatId || !messageId) return;
    let chat = state.chats?.find((item) => item.id === chatId);
    if (!chat && typeof loadChats === 'function') {
      await loadChats(false);
      chat = state.chats?.find((item) => item.id === chatId);
    }
    if (!chat) throw new Error('Чат не найден или нет доступа');
    if (typeof setSidebarMode === 'function') setSidebarMode('chats');
    await openChat(chat);
    const latest = Array.isArray(state.activeMessages) ? [...state.activeMessages] : [];
    let context = [];
    try {
      context = normalizeContext(await request(`/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}/context?limit=200`));
    } catch (error) {
      if (!findMessage(messageId)) throw error;
    }
    const merged = mergeMessages(context, latest);
    const area = byId('messageArea');
    if (merged.length && area && typeof appendMessage === 'function') {
      state.activeMessages = merged;
      state.searchContextActive = true;
      area.innerHTML = '';
      merged.forEach((message) => appendMessage(message));
    }
    return focusSearchMessage(messageId);
  }

  async function workspace6PerformDialogSearch(value) {
    const input = byId('chatSearchInput');
    const root = byId('chatSearchResults');
    const count = byId('chatSearchCount');
    const chat = state.activeChat;
    const chatId = state.dialogSearchChatId || chat?.id;
    const query = String(value ?? input?.value ?? '').trim();
    const sequence = ++runtime.dialogSearchSeq;
    if (!input || !root || !count || !chat || !chatId || chat.id !== chatId || query.length < 2) {
      if (root) { root.classList.add('hidden'); root.innerHTML = ''; }
      if (count) count.textContent = '';
      state.dialogSearchResults = [];
      return;
    }
    root.classList.remove('hidden');
    root.innerHTML = '<div class="search-loading">Ищем сообщения…</div>';
    try {
      const payload = await request(`/chats/${encodeURIComponent(chatId)}/search?q=${encodeURIComponent(query)}&limit=100`);
      if (sequence !== runtime.dialogSearchSeq || state.activeChat?.id !== chatId || String(input.value).trim() !== query) return;
      const results = Array.isArray(payload) ? payload : [];
      state.dialogSearchResults = results;
      count.textContent = results.length ? `Найдено: ${results.length}` : 'В этом чате ничего не найдено';
      root.innerHTML = results.length ? results.map((message) => `<button type="button" class="dialog-search-result" data-workspace6-dialog-message="${escapeLocal(message.id)}" data-workspace6-dialog-chat="${escapeLocal(chatId)}">
        ${avatarHtml(message.sender_name || 'Пользователь', message.sender_avatar_key, 'dialog-search-avatar')}
        <span><span class="global-search-title-line"><strong>${highlighted(message.sender_name || 'Пользователь', query)}</strong><time>${escapeLocal(resultDate(message.created_at))}</time></span><small>${highlighted(messagePreview(message), query)}</small></span>
      </button>`).join('') : '<div class="search-section-empty">Совпадений в этом диалоге нет</div>';
    } catch (error) {
      if (sequence !== runtime.dialogSearchSeq) return;
      root.innerHTML = `<div class="empty-list">${escapeLocal(error?.message || 'Не удалось выполнить поиск')}</div>`;
    }
  }

  async function findChat(chatId) {
    let chat = state.chats?.find((item) => item.id === chatId);
    if (!chat && typeof loadChats === 'function') {
      await loadChats(false);
      chat = state.chats?.find((item) => item.id === chatId);
    }
    return chat || null;
  }

  function callParticipantNames(item) {
    const rows = Array.isArray(item.participants) ? item.participants : [];
    return rows.map((person) => person?.displayName || person?.display_name).filter(Boolean);
  }

  function callDisplayName(item) {
    if (item.mode === 'private') return item.peer?.displayName || item.peer?.display_name || item.chat?.title || 'Контакт';
    return item.chat?.title || (item.mode === 'stage' ? 'Трансляция' : 'Групповой звонок');
  }

  function callOutcome(item) {
    const map = {
      busy: 'Линия занята', offline: 'Без доступа к сети', no_answer: 'Не взяли трубку', caller_cancelled: 'Вы отменили звонок',
      cancelled_by_peer: 'Пользователь отменил звонок', declined_by_me: 'Вы отклонили звонок', network_lost: 'Соединение потеряно',
      missed: 'Пропущенный', declined: 'Вызов отклонён', cancelled: 'Отменённый звонок', ringing: 'Вызов…', active: 'Идёт звонок',
    };
    if (map[item.outcome]) return map[item.outcome];
    if (item.mode === 'stage') return 'Трансляция';
    if (item.mode === 'group') return 'Групповой звонок';
    return item.videoEnabled ? 'Видеозвонок' : 'Аудиозвонок';
  }

  function durationText(seconds) {
    const total = Math.max(0, Number(seconds) || 0);
    if (!total) return '';
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
  }

  function callTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const today = new Date();
    return date.toDateString() === today.toDateString()
      ? date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      : date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function historyGroupKey(item) {
    const day = new Date(item.createdAt || 0).toDateString();
    return [item.chatId, item.mode, item.outcome, item.direction, day].join('|');
  }

  function groupedHistory(items) {
    const output = [];
    for (const item of items || []) {
      const key = historyGroupKey(item);
      const previous = output[output.length - 1];
      if (previous?.key === key) previous.items.push(item);
      else output.push({ key, items: [item] });
    }
    return output;
  }

  function callAvatarStack(item) {
    const people = callParticipantNames(item).slice(0, 2);
    if (item.mode !== 'private' && people.length) {
      return `<span class="workspace6-call-avatar-stack">${people.map((name, index) => `<span class="workspace6-call-mini-avatar" style="--i:${index}">${escapeLocal(String(name).trim().split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase())}</span>`).join('')}</span>`;
    }
    const name = callDisplayName(item);
    return avatarHtml(name, item.peer?.avatarKey || item.chat?.avatarKey, 'workspace6-call-avatar');
  }

  function renderEnhancedCallHistory() {
    const root = byId('callHistoryList');
    const calls = window.MeetusCalls?.callState?.history;
    if (!root || !Array.isArray(calls) || runtime.historyRendering) return;
    const signature = calls.map((item) => [item.id, item.status, item.outcome, item.durationSeconds, item.participantCount].join(':')).join('|');
    const alreadyRendered = calls.length ? Boolean(root.querySelector('.workspace6-call-history-item')) : Boolean(root.querySelector('.empty-list'));
    if (root.dataset.workspace6Signature === signature && alreadyRendered) return;
    runtime.historyRendering = true;
    try {
      if (!calls.length) {
        root.innerHTML = '<div class="empty-list">История звонков пока пустая</div>';
        root.dataset.workspace6Signature = signature;
        return;
      }
      root.innerHTML = groupedHistory(calls).map((group) => {
        const item = group.items[0];
        const name = callDisplayName(item);
        const count = group.items.length;
        const participants = callParticipantNames(item);
        const peopleText = item.mode !== 'private' && participants.length
          ? participants.slice(0, 3).join(', ') + (participants.length > 3 ? ` и ещё ${participants.length - 3}` : '')
          : '';
        const meta = [callOutcome(item) + (count > 1 ? ` (${count})` : ''), durationText(item.durationSeconds), peopleText].filter(Boolean).join(' • ');
        const missed = item.outcome === 'missed';
        return `<div class="workspace6-call-history-item ${missed ? 'missed' : ''}" data-workspace6-call-row="${escapeLocal(item.id)}">
          <button type="button" class="workspace6-call-history-main-button" data-workspace6-open-call-chat="${escapeLocal(item.chatId)}">
            ${callAvatarStack(item)}
            <span class="workspace6-call-history-copy"><strong>${escapeLocal(name)}</strong><small>${escapeLocal(meta)}</small></span>
            <time>${escapeLocal(callTime(item.createdAt))}</time>
          </button>
          <button type="button" class="workspace6-call-phone" title="Позвонить" data-workspace6-call-now="${escapeLocal(item.chatId)}" data-workspace6-call-mode="${escapeLocal(item.mode)}">☎</button>
          <button type="button" class="workspace6-call-menu-button" title="Действия" data-workspace6-call-menu="${escapeLocal(item.id)}">⋮</button>
          <div class="workspace6-call-menu hidden" data-workspace6-call-menu-panel="${escapeLocal(item.id)}">
            <button type="button" class="danger" data-workspace6-delete-call="${group.items.map((row) => escapeLocal(row.id)).join(',')}">Удалить из журнала</button>
          </div>
        </div>`;
      }).join('');
      root.dataset.workspace6Enhanced = '1';
      root.dataset.workspace6Signature = signature;
    } finally {
      runtime.historyRendering = false;
    }
  }

  async function openCallChat(chatId) {
    const chat = await findChat(chatId);
    if (!chat) throw new Error('Чат для звонка не найден');
    if (typeof setSidebarMode === 'function') setSidebarMode('chats');
    await openChat(chat);
    return chat;
  }

  async function callFromHistory(chatId, mode) {
    await openCallChat(chatId);
    const button = byId('callButton') || document.querySelector('.chat-header-actions button[title="Звонок"]');
    if (!button || button.disabled) throw new Error('Для этого чата звонок недоступен');
    button.click();
    const started = performance.now();
    while (performance.now() - started < 2500) {
      const chooser = byId('meetusCallChooser');
      if (chooser && !chooser.classList.contains('meetus-call-hidden')) {
        const choices = [...chooser.querySelectorAll('.meetus-call-choice')];
        const preferred = choices.find((choice) => {
          const text = choice.textContent || '';
          if (mode === 'private') return text.includes('Аудиозвонок');
          if (mode === 'group') return text.includes('Групповой звонок') && !text.includes('видео');
          return text.includes('Начать трансляцию') && !text.includes('видео');
        }) || choices[0];
        if (!preferred) throw new Error('Не удалось открыть выбор звонка');
        preferred.click();
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  async function deleteCallHistory(ids) {
    const callIds = String(ids || '').split(',').filter(Boolean);
    if (!callIds.length) return;
    for (const id of callIds) await request(`/calls/history/${encodeURIComponent(id)}`, { method: 'DELETE' });
    const stateCalls = window.MeetusCalls?.callState;
    if (stateCalls) stateCalls.history = (stateCalls.history || []).filter((item) => !callIds.includes(item.id));
    renderEnhancedCallHistory();
    notify('Звонок удалён из журнала');
  }

  function bindDelegatedEvents() {
    const globalRoot = byId('searchResults');
    if (globalRoot && !globalRoot.dataset.workspace6Bound) {
      globalRoot.dataset.workspace6Bound = '1';
      globalRoot.addEventListener('click', async (event) => {
        const tab = event.target.closest('[data-workspace6-search-tab]');
        if (tab) {
          const type = tab.dataset.workspace6SearchTab;
          globalRoot.querySelectorAll('[data-workspace6-search-tab]').forEach((button) => button.classList.toggle('active', button === tab));
          globalRoot.querySelectorAll('[data-workspace6-search-section]').forEach((section) => {
            const sectionType = section.dataset.workspace6SearchSection;
            section.classList.toggle('hidden', type !== 'all' && sectionType !== type && !(type === 'chats' && sectionType === 'people'));
          });
          return;
        }
        const message = event.target.closest('[data-workspace6-message]');
        if (message) {
          try { await workspace6OpenMessage(message.dataset.workspace6MessageChat, message.dataset.workspace6Message); }
          catch (error) { notify(error?.message || 'Не удалось открыть сообщение', true); }
          return;
        }
        const chatButton = event.target.closest('[data-workspace6-chat]');
        if (chatButton) {
          try { await openCallChat(chatButton.dataset.workspace6Chat); }
          catch (error) { notify(error?.message || 'Не удалось открыть чат', true); }
          return;
        }
        const userButton = event.target.closest('[data-workspace6-user]');
        if (userButton && typeof createChat === 'function') void createChat(userButton.dataset.workspace6User);
      });
    }

    const dialogRoot = byId('chatSearchResults');
    if (dialogRoot && !dialogRoot.dataset.workspace6Bound) {
      dialogRoot.dataset.workspace6Bound = '1';
      dialogRoot.addEventListener('click', async (event) => {
        const button = event.target.closest('[data-workspace6-dialog-message]');
        if (!button) return;
        dialogRoot.querySelectorAll('.dialog-search-result').forEach((row) => row.classList.toggle('active', row === button));
        try {
          await workspace6OpenMessage(button.dataset.workspace6DialogChat, button.dataset.workspace6DialogMessage);
          byId('chatSearchPanel')?.classList.remove('hidden');
          dialogRoot.classList.remove('hidden');
        } catch (error) {
          notify(error?.message || 'Не удалось открыть сообщение', true);
        }
      });
    }

    const callRoot = byId('callHistoryList');
    if (callRoot && !callRoot.dataset.workspace6Bound) {
      callRoot.dataset.workspace6Bound = '1';
      callRoot.addEventListener('click', async (event) => {
        const menuButton = event.target.closest('[data-workspace6-call-menu]');
        if (menuButton) {
          event.stopPropagation();
          const id = menuButton.dataset.workspace6CallMenu;
          callRoot.querySelectorAll('[data-workspace6-call-menu-panel]').forEach((panel) => panel.classList.toggle('hidden', panel.dataset.workspace6CallMenuPanel !== id || !panel.classList.contains('hidden')));
          return;
        }
        const deleteButton = event.target.closest('[data-workspace6-delete-call]');
        if (deleteButton) {
          event.stopPropagation();
          try { await deleteCallHistory(deleteButton.dataset.workspace6DeleteCall); }
          catch (error) { notify(error?.message || 'Не удалось удалить звонок', true); }
          return;
        }
        const phone = event.target.closest('[data-workspace6-call-now]');
        if (phone) {
          event.stopPropagation();
          try { await callFromHistory(phone.dataset.workspace6CallNow, phone.dataset.workspace6CallMode); }
          catch (error) { notify(error?.message || 'Не удалось начать звонок', true); }
          return;
        }
        const open = event.target.closest('[data-workspace6-open-call-chat]');
        if (open) {
          try { await openCallChat(open.dataset.workspace6OpenCallChat); }
          catch (error) { notify(error?.message || 'Не удалось открыть чат', true); }
        }
      });
    }
  }

  function installHistoryEnhancer() {
    const root = byId('callHistoryList');
    if (!root) return;
    bindDelegatedEvents();
    if (!runtime.historyObserver) {
      runtime.historyObserver = new MutationObserver(() => {
        if (runtime.historyRendering) return;
        queueMicrotask(renderEnhancedCallHistory);
      });
      runtime.historyObserver.observe(root, { childList: true });
    }
    renderEnhancedCallHistory();
  }

  function installOverrides() {
    try { performSearch = workspace6PerformSearch; } catch {}
    try { performDialogSearch = workspace6PerformDialogSearch; } catch {}
    try { openSearchMessageResult = workspace6OpenMessage; } catch {}
    window.MeetusWorkspace6 = { workspace6PerformSearch, workspace6PerformDialogSearch, workspace6OpenMessage, renderEnhancedCallHistory };
  }

  function install() {
    if (runtime.installed) return;
    if (typeof state === 'undefined' || typeof request !== 'function' || !byId('searchInput')) return;
    runtime.installed = true;
    installOverrides();
    bindDelegatedEvents();
    installHistoryEnhancer();
    document.addEventListener('click', (event) => {
      if (!event.target.closest('.workspace6-call-history-item')) document.querySelectorAll('.workspace6-call-menu').forEach((menu) => menu.classList.add('hidden'));
    });
    setInterval(() => {
      bindDelegatedEvents();
      installHistoryEnhancer();
    }, 900);
  }

  const timer = setInterval(() => {
    install();
    if (runtime.installed) clearInterval(timer);
  }, 100);
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', install, { once: true }) : install();
})();
