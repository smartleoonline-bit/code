/* MEETUS 0.6.25.2 COMMUNITY2-TG11-WORKSPACE5-FIX4 — auth recovery and reliable composer clearing */
(() => {
  'use strict';

  const VERSION = '0.6.25.2-community2tg11workspace5fix4';
  const initialDeepLink = (() => {
    const query = new URLSearchParams(location.search);
    const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
    const chatId = query.get('chat') || hash.get('chat');
    const messageId = query.get('message') || hash.get('message');
    return chatId && messageId ? { chatId, messageId } : null;
  })();
  const richEditors = new Map();
  const runtime = {
    selection: null,
    deepLink: initialDeepLink,
    openingDeepLink: false,
    sidebarHooked: false,
    searchHooked: false,
    internalLinksHooked: false,
    deepLinkSequence: 0,
    authHooked: false,
    authRefreshPromise: null,
  };

  const byId = (id) => document.getElementById(id);
  const escapeHtmlLocal = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  function notify(message, error = false) {
    try {
      if (typeof setUploadStatus === 'function') {
        setUploadStatus(message, error);
        setTimeout(() => setUploadStatus(''), error ? 4200 : 1900);
        return;
      }
    } catch {}
    console[error ? 'error' : 'log'](message);
  }

  function afterFrames(count = 2) {
    return new Promise((resolve) => {
      const step = () => {
        if (count-- <= 0) return resolve();
        requestAnimationFrame(step);
      };
      step();
    });
  }

  function decodeTokenPayload(token) {
    try {
      const part = String(token || '').split('.')[1];
      if (!part) return null;
      const normalized = part.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
      return JSON.parse(decodeURIComponent(atob(padded).split('').map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`).join('')));
    } catch {
      return null;
    }
  }

  function sessionExists() {
    try {
      if (typeof state !== 'undefined' && (state.user || state.token)) return true;
      if (typeof hasSessionHint === 'function' && hasSessionHint()) return true;
      return localStorage.getItem('meetus_session_hint') === '1' || Boolean(localStorage.getItem('messenger_user'));
    } catch {
      return false;
    }
  }

  function accessTokenNeedsRefresh() {
    if (typeof state === 'undefined' || !sessionExists()) return false;
    const token = state.token;
    if (!token) return true;
    const payload = decodeTokenPayload(token);
    if (!payload?.exp) return false;
    return Number(payload.exp) * 1000 <= Date.now() + 45000;
  }

  async function refreshAccessTokenOnce(force = false) {
    if (!force && !accessTokenNeedsRefresh()) return true;
    if (runtime.authRefreshPromise) return runtime.authRefreshPromise;
    runtime.authRefreshPromise = (async () => {
      try {
        if (typeof refreshAccessToken !== 'function') return false;
        const status = await refreshAccessToken();
        return status === 'ok';
      } catch (error) {
        console.warn('WORKSPACE5-FIX4 auth refresh failed', error);
        return false;
      }
    })();
    try {
      return await runtime.authRefreshPromise;
    } finally {
      runtime.authRefreshPromise = null;
    }
  }

  function installAuthRecovery() {
    if (runtime.authHooked || typeof request !== 'function') return;
    runtime.authHooked = true;
    const baseRequest = request;
    request = async function workspace5AuthenticatedRequest(path, options = {}) {
      if (options.auth !== false && accessTokenNeedsRefresh()) {
        await refreshAccessTokenOnce();
      }
      try {
        return await baseRequest(path, options);
      } catch (error) {
        if (error?.status !== 401 || options.auth === false || options.retryAuth === false) throw error;
        const refreshed = await refreshAccessTokenOnce(true);
        if (!refreshed) throw error;
        return baseRequest(path, { ...options, retryAuth: false });
      }
    };
  }

  function markdownToHtml(markdown = '') {
    const tokens = [];
    let source = String(markdown).replace(/\[([^\]\n]{1,500})\]\((https?:\/\/[^\s)]+)\)/gi, (_, label, href) => {
      const token = `\u0000WS5L${tokens.length}\u0000`;
      tokens.push(`<a href="${escapeHtmlLocal(href)}" class="workspace5-editor-link" data-workspace5-link="1" target="_self" rel="noopener">${escapeHtmlLocal(label)}</a>`);
      return token;
    });
    source = escapeHtmlLocal(source)
      .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^_\n]+)__/g, '<em>$1</em>')
      .replace(/\+\+([^+\n]+)\+\+/g, '<u>$1</u>')
      .replace(/\r?\n/g, '<br>');
    return source.replace(/\u0000WS5L(\d+)\u0000/g, (_, index) => tokens[Number(index)] || '');
  }

  function serializeChildren(node) {
    return [...node.childNodes].map(serializeNode).join('');
  }

  function serializeNode(node) {
    if (node.nodeType === Node.TEXT_NODE) return String(node.nodeValue || '').replace(/\u200B/g, '');
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const tag = node.tagName.toLowerCase();
    if (tag === 'br') return '\n';
    if (tag === 'a') {
      const label = String(node.textContent || '').replace(/\u200B/g, '').trim() || 'ссылка';
      const href = node.getAttribute('href') || '';
      return href ? `[${label}](${href})` : label;
    }
    const content = serializeChildren(node);
    if (tag === 'strong' || tag === 'b') return `**${content}**`;
    if (tag === 'em' || tag === 'i') return `__${content}__`;
    if (tag === 'u') return `++${content}++`;
    if (tag === 'div' || tag === 'p') return `${content}\n`;
    return content;
  }

  function editorMarkdown(editor) {
    return serializeChildren(editor)
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\n$/, '');
  }

  function syncEditorToSource(binding) {
    if (!binding || binding.syncing) return;
    binding.syncing = true;
    const value = editorMarkdown(binding.editor);
    binding.lastMarkdown = value;
    binding.source.value = value;
    try {
      binding.source.setSelectionRange(value.length, value.length);
    } catch {}
    binding.source.dispatchEvent(new Event('input', { bubbles: true }));
    binding.syncing = false;
  }

  function renderSourceIntoEditor(binding, force = false) {
    if (!binding || binding.syncing) return;
    const value = String(binding.source.value || '');
    if (!force && value === binding.lastMarkdown) return;
    binding.syncing = true;
    binding.editor.innerHTML = markdownToHtml(value);
    binding.lastMarkdown = value;
    binding.syncing = false;
  }

  function sanitizeEditor(editor) {
    editor.querySelectorAll('*').forEach((node) => {
      const tag = node.tagName.toLowerCase();
      if (!['a', 'strong', 'b', 'em', 'i', 'u', 'br', 'div', 'p'].includes(tag)) {
        node.replaceWith(...node.childNodes);
        return;
      }
      [...node.attributes].forEach((attribute) => {
        if (tag === 'a' && ['href', 'class', 'data-workspace5-link', 'target', 'rel'].includes(attribute.name)) return;
        node.removeAttribute(attribute.name);
      });
      if (tag === 'a') {
        node.className = 'workspace5-editor-link';
        node.dataset.workspace5Link = '1';
        try {
          const url = new URL(node.getAttribute('href') || '', location.href);
          node.target = url.origin === location.origin ? '_self' : '_blank';
          node.rel = url.origin === location.origin ? 'noopener' : 'noopener noreferrer';
        } catch {
          node.target = '_self';
          node.rel = 'noopener';
        }
      }
    });
  }

  function insertPlainText(text) {
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    selection.deleteFromDocument();
    const lines = String(text).replace(/\r/g, '').split('\n');
    const fragment = document.createDocumentFragment();
    lines.forEach((line, index) => {
      if (index) fragment.append(document.createElement('br'));
      fragment.append(document.createTextNode(line));
    });
    const range = selection.getRangeAt(0);
    range.insertNode(fragment);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function isRangeInsideEditor(range, editor) {
    const container = range?.commonAncestorContainer;
    const element = container?.nodeType === Node.ELEMENT_NODE ? container : container?.parentElement;
    return Boolean(element && editor.contains(element));
  }

  function ensureSelectionToolbar() {
    if (byId('workspace5SelectionToolbar')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <div id="workspace5SelectionToolbar" class="workspace5-selection-toolbar hidden" role="toolbar" aria-label="Форматирование выделенного текста">
        <button type="button" data-workspace5-format="bold" title="Жирный"><b>B</b></button>
        <button type="button" data-workspace5-format="italic" title="Курсив"><i>I</i></button>
        <button type="button" data-workspace5-format="underline" title="Подчёркнутый"><u>U</u></button>
        <button type="button" data-workspace5-format="link" title="Вставить ссылку">🔗</button>
      </div>
      <div id="workspace5LinkModal" class="workspace5-modal hidden" role="dialog" aria-modal="true">
        <div class="workspace5-modal-card">
          <div class="workspace5-modal-head"><strong>Ссылка для выделенного текста</strong><button type="button" data-workspace5-link-close>×</button></div>
          <div id="workspace5LinkPreview" class="workspace5-link-preview"></div>
          <label>Адрес ссылки<input id="workspace5LinkUrl" type="url" value="https://" autocomplete="off"></label>
          <div class="workspace5-modal-actions"><button type="button" data-workspace5-link-close>Отмена</button><button id="workspace5LinkApply" type="button" class="primary">Применить</button></div>
        </div>
      </div>
      <div id="workspace5FolderRenameModal" class="workspace5-modal hidden" role="dialog" aria-modal="true">
        <div class="workspace5-modal-card">
          <div class="workspace5-modal-head"><strong>Изменить название папки</strong><button type="button" data-workspace5-folder-close>×</button></div>
          <label>Название<input id="workspace5FolderRenameInput" maxlength="64" autocomplete="off"></label>
          <div class="workspace5-modal-actions"><button type="button" data-workspace5-folder-close>Отмена</button><button id="workspace5FolderRenameApply" type="button" class="primary">Сохранить</button></div>
        </div>
      </div>
    `);

    const toolbar = byId('workspace5SelectionToolbar');
    toolbar.addEventListener('mousedown', (event) => event.preventDefault());
    toolbar.addEventListener('click', (event) => {
      const action = event.target.closest('[data-workspace5-format]')?.dataset.workspace5Format;
      if (!action || !runtime.selection) return;
      event.preventDefault();
      event.stopPropagation();
      restoreSelection();
      if (action === 'link') return openVisualLinkModal();
      const command = { bold: 'bold', italic: 'italic', underline: 'underline' }[action];
      if (command) document.execCommand(command, false);
      const binding = richEditors.get(runtime.selection.editor.dataset.workspace5SourceId);
      if (binding) {
        sanitizeEditor(binding.editor);
        syncEditorToSource(binding);
      }
      updateSelectionToolbar();
    });

    const linkModal = byId('workspace5LinkModal');
    linkModal.addEventListener('click', (event) => {
      if (event.target === linkModal || event.target.closest('[data-workspace5-link-close]')) closeVisualLinkModal();
    });
    byId('workspace5LinkApply').addEventListener('click', applyVisualLink);

    const folderModal = byId('workspace5FolderRenameModal');
    folderModal.addEventListener('click', (event) => {
      if (event.target === folderModal || event.target.closest('[data-workspace5-folder-close]')) closeFolderRenameModal();
    });
    byId('workspace5FolderRenameApply').addEventListener('click', applyFolderRename);
  }

  function restoreSelection() {
    const saved = runtime.selection;
    if (!saved?.range || !saved.editor?.isConnected) return false;
    saved.editor.focus();
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(saved.range.cloneRange());
    return true;
  }

  function updateSelectionToolbar() {
    const toolbar = byId('workspace5SelectionToolbar');
    if (!toolbar) return;
    const selection = window.getSelection();
    if (!selection?.rangeCount || selection.isCollapsed) {
      toolbar.classList.add('hidden');
      return;
    }
    const range = selection.getRangeAt(0);
    const editor = [...richEditors.values()].map((item) => item.editor).find((item) => isRangeInsideEditor(range, item));
    if (!editor || !String(selection.toString()).trim()) {
      toolbar.classList.add('hidden');
      return;
    }
    const rect = range.getBoundingClientRect();
    if (!rect.width && !rect.height) {
      toolbar.classList.add('hidden');
      return;
    }
    runtime.selection = { editor, range: range.cloneRange(), text: selection.toString() };
    toolbar.classList.remove('hidden');
    const width = toolbar.offsetWidth || 174;
    const height = toolbar.offsetHeight || 42;
    const left = Math.min(window.innerWidth - width - 8, Math.max(8, rect.left + rect.width / 2 - width / 2));
    const above = rect.top - height - 9;
    const top = above >= 8 ? above : Math.min(window.innerHeight - height - 8, rect.bottom + 9);
    toolbar.style.left = `${Math.round(left)}px`;
    toolbar.style.top = `${Math.round(top)}px`;
  }

  function closeVisualLinkModal() {
    byId('workspace5LinkModal')?.classList.add('hidden');
  }

  function closestSelectedAnchor() {
    const saved = runtime.selection;
    if (!saved?.range) return null;
    const node = saved.range.commonAncestorContainer;
    const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    return element?.closest?.('a.workspace5-editor-link') || null;
  }

  function openVisualLinkModal() {
    if (!runtime.selection?.text?.trim()) return notify('Сначала выделите текст', true);
    const anchor = closestSelectedAnchor();
    byId('workspace5LinkPreview').textContent = runtime.selection.text;
    byId('workspace5LinkUrl').value = anchor?.getAttribute('href') || 'https://';
    byId('workspace5LinkModal').classList.remove('hidden');
    byId('workspace5SelectionToolbar').classList.add('hidden');
    requestAnimationFrame(() => {
      const input = byId('workspace5LinkUrl');
      input.focus();
      input.select();
    });
  }

  function applyVisualLink() {
    let href = String(byId('workspace5LinkUrl').value || '').trim();
    if (!/^https?:\/\//i.test(href)) href = `https://${href}`;
    if (!/^https?:\/\/[^\s]+$/i.test(href)) return notify('Введите корректную ссылку', true);
    if (!restoreSelection()) return closeVisualLinkModal();
    document.execCommand('createLink', false, href);
    const selection = window.getSelection();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    const editor = runtime.selection?.editor;
    editor?.querySelectorAll('a').forEach((anchor) => {
      if (anchor.getAttribute('href') !== href && anchor.href !== href) return;
      anchor.className = 'workspace5-editor-link';
      anchor.dataset.workspace5Link = '1';
      try {
        const url = new URL(href, location.href);
        anchor.target = url.origin === location.origin ? '_self' : '_blank';
        anchor.rel = url.origin === location.origin ? 'noopener' : 'noopener noreferrer';
      } catch {
        anchor.target = '_self';
        anchor.rel = 'noopener';
      }
    });
    if (range && editor && isRangeInsideEditor(range, editor)) runtime.selection.range = range.cloneRange();
    const binding = editor ? richEditors.get(editor.dataset.workspace5SourceId) : null;
    if (binding) {
      sanitizeEditor(binding.editor);
      syncEditorToSource(binding);
    }
    closeVisualLinkModal();
    editor?.focus();
  }

  function nativeValueDescriptor(source) {
    let proto = source;
    while (proto) {
      const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
      if (descriptor?.get && descriptor?.set) return descriptor;
      proto = Object.getPrototypeOf(proto);
    }
    return null;
  }

  function watchProgrammaticSourceValue(binding) {
    const source = binding?.source;
    if (!source || source.dataset.workspace5ValueWatched === '1') return;
    const descriptor = nativeValueDescriptor(source);
    if (!descriptor) return;
    source.dataset.workspace5ValueWatched = '1';
    Object.defineProperty(source, 'value', {
      configurable: true,
      enumerable: descriptor.enumerable,
      get() {
        return descriptor.get.call(source);
      },
      set(value) {
        descriptor.set.call(source, value);
        if (binding.syncing) return;
        queueMicrotask(() => {
          if (!binding.editor?.isConnected) return;
          renderSourceIntoEditor(binding, true);
          binding.editor.dispatchEvent(new Event('workspace5-source-synced'));
        });
      },
    });
  }

  function syncComposerEditorsFromSources(force = false) {
    richEditors.forEach((binding) => renderSourceIntoEditor(binding, force));
  }

  function installComposerClearHooks() {
    const schedule = () => {
      queueMicrotask(() => syncComposerEditorsFromSources(true));
      setTimeout(() => syncComposerEditorsFromSources(true), 30);
      setTimeout(() => syncComposerEditorsFromSources(true), 260);
    };
    const form = byId('composer');
    if (form && form.dataset.workspace5ClearHook !== '1') {
      form.dataset.workspace5ClearHook = '1';
      form.addEventListener('submit', schedule);
    }
    const action = byId('actionButton');
    if (action && action.dataset.workspace5ClearHook !== '1') {
      action.dataset.workspace5ClearHook = '1';
      action.addEventListener('click', schedule);
    }
    const threadForm = byId('community2ThreadForm');
    if (threadForm && threadForm.dataset.workspace5ClearHook !== '1') {
      threadForm.dataset.workspace5ClearHook = '1';
      threadForm.addEventListener('submit', schedule);
    }
  }

  function createRichEditor(source) {
    if (!source || source.dataset.workspace5RichReady === '1') return;
    const parent = source.parentElement;
    if (!parent) return;
    source.dataset.workspace5RichReady = '1';
    const editor = document.createElement('div');
    editor.className = 'workspace5-rich-editor';
    editor.contentEditable = source.disabled ? 'false' : 'true';
    editor.dataset.placeholder = source.placeholder || 'Введите сообщение';
    editor.dataset.workspace5SourceId = source.id;
    editor.setAttribute('role', 'textbox');
    editor.setAttribute('aria-multiline', 'true');
    editor.setAttribute('spellcheck', 'true');
    source.classList.add('workspace5-source-input');
    source.insertAdjacentElement('beforebegin', editor);

    const binding = { source, editor, syncing: false, lastMarkdown: null };
    richEditors.set(source.id, binding);
    watchProgrammaticSourceValue(binding);
    renderSourceIntoEditor(binding, true);

    const nativeFocus = source.focus.bind(source);
    source.dataset.workspace5NativeFocus = '1';
    source.focus = () => editor.focus();
    binding.nativeFocus = nativeFocus;

    editor.addEventListener('input', () => {
      sanitizeEditor(editor);
      syncEditorToSource(binding);
      updateSelectionToolbar();
    });
    editor.addEventListener('paste', (event) => {
      event.preventDefault();
      insertPlainText(event.clipboardData?.getData('text/plain') || '');
      syncEditorToSource(binding);
    });
    editor.addEventListener('click', (event) => {
      if (event.target.closest('a')) event.preventDefault();
    });
    editor.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && ['b', 'i', 'u', 'k'].includes(event.key.toLowerCase())) {
        event.preventDefault();
        const key = event.key.toLowerCase();
        if (key === 'k') {
          updateSelectionToolbar();
          if (runtime.selection?.editor === editor) openVisualLinkModal();
          return;
        }
        document.execCommand({ b: 'bold', i: 'italic', u: 'underline' }[key], false);
        sanitizeEditor(editor);
        syncEditorToSource(binding);
        return;
      }
      if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        syncEditorToSource(binding);
        if (source.id === 'messageInput') byId('composer')?.requestSubmit();
        if (source.id === 'community2ThreadInput') byId('community2ThreadForm')?.requestSubmit();
      }
    });
    editor.addEventListener('focus', () => {
      try { binding.source.dispatchEvent(new FocusEvent('focus')); } catch {}
    });
    editor.addEventListener('blur', () => {
      try { binding.source.dispatchEvent(new FocusEvent('blur')); } catch {}
      setTimeout(() => {
        if (!byId('workspace5SelectionToolbar')?.matches(':hover') && byId('workspace5LinkModal')?.classList.contains('hidden')) {
          byId('workspace5SelectionToolbar')?.classList.add('hidden');
        }
      }, 120);
    });
  }

  function ensureRichEditors() {
    /* MEETUS_WORKSPACE5_DESCRIPTION_EDITOR15 */
    createRichEditor(byId('messageInput'));
    createRichEditor(byId('community2ThreadInput'));
    createRichEditor(byId('communityDescriptionInput'));
    createRichEditor(byId('workspace13Description'));
    installComposerClearHooks();
    richEditors.forEach((binding) => {
      binding.editor.contentEditable = binding.source.disabled ? 'false' : 'true';
      binding.editor.classList.toggle('disabled', binding.source.disabled);
      binding.editor.dataset.placeholder = binding.source.placeholder || 'Введите сообщение';
      renderSourceIntoEditor(binding);
    });
    // WORKSPACE5-FIX1: старые панели скрываются CSS, но не удаляются из DOM.
    // WORKSPACE4 восстанавливает их своим observer; удаление здесь создавало бесконечный mutation-loop.
  }

  function detectedSidebarMode() {
    if (byId('callsTabButton')?.classList.contains('active')) return 'calls';
    if (byId('contactsTabButton')?.classList.contains('active')) return 'contacts';
    if (byId('requestsTabButton')?.classList.contains('active')) return 'requests';
    if (byId('chatsTabButton')?.classList.contains('active')) return 'chats';
    return typeof state !== 'undefined' ? state.sidebarMode || 'chats' : 'chats';
  }

  function syncFolderVisibility() {
    const bar = byId('workspaceFolderBar');
    if (!bar) return;
    const mode = detectedSidebarMode();
    document.documentElement.dataset.meetusSidebarMode = mode;
    const chatsActive = mode === 'chats';
    bar.classList.toggle('hidden', !chatsActive);
    bar.hidden = !chatsActive;
    bar.setAttribute('aria-hidden', chatsActive ? 'false' : 'true');
    if (!chatsActive) window.MeetusWorkspace?.closeFolderDrawer?.();
  }

  function hookSidebarTabClicks() {
    document.addEventListener('click', (event) => {
      const tab = event.target.closest?.('#chatsTabButton,#contactsTabButton,#requestsTabButton,#callsTabButton');
      if (!tab) return;
      requestAnimationFrame(() => requestAnimationFrame(syncFolderVisibility));
    }, true);
  }

  function hookSidebarMode() {
    if (runtime.sidebarHooked || typeof setSidebarMode !== 'function') return;
    runtime.sidebarHooked = true;
    const base = setSidebarMode;
    setSidebarMode = function workspace5SidebarMode(mode, ...args) {
      const result = base.call(this, mode, ...args);
      requestAnimationFrame(syncFolderVisibility);
      return result;
    };
  }

  function enhanceFolderDrawer() {
    const root = byId('workspaceFolderDrawerList');
    const folders = window.MeetusWorkspace?.ws?.folders || [];
    if (!root || !folders.length) return;
    root.querySelectorAll('[data-workspace-folder]').forEach((button) => {
      const folderId = button.dataset.workspaceFolder;
      if (!folderId || folderId === 'all' || button.querySelector('[data-workspace5-folder-edit]')) return;
      const edit = document.createElement('span');
      edit.className = 'workspace5-folder-edit';
      edit.dataset.workspace5FolderEdit = folderId;
      edit.title = 'Переименовать папку';
      edit.setAttribute('role', 'button');
      edit.setAttribute('aria-label', 'Переименовать папку');
      edit.textContent = '✎';
      button.append(edit);
    });
  }

  function openFolderRenameModal(folderId) {
    const folder = window.MeetusWorkspace?.ws?.folders?.find((item) => item.id === folderId);
    if (!folder) return;
    runtime.folderToRename = folderId;
    byId('workspace5FolderRenameInput').value = folder.name || '';
    byId('workspace5FolderRenameModal').classList.remove('hidden');
    requestAnimationFrame(() => {
      const input = byId('workspace5FolderRenameInput');
      input.focus();
      input.select();
    });
  }

  function closeFolderRenameModal() {
    runtime.folderToRename = null;
    byId('workspace5FolderRenameModal')?.classList.add('hidden');
  }

  async function applyFolderRename() {
    const folderId = runtime.folderToRename;
    const name = String(byId('workspace5FolderRenameInput').value || '').trim();
    if (!folderId) return closeFolderRenameModal();
    if (!name) return notify('Введите название папки', true);
    try {
      const updated = await window.MeetusWorkspace.api(`/folders/${encodeURIComponent(folderId)}`, 'PATCH', { name });
      const folder = window.MeetusWorkspace.ws.folders.find((item) => item.id === folderId);
      if (folder) folder.name = updated?.name || name;
      closeFolderRenameModal();
      window.MeetusWorkspace.renderFolderBar();
      window.MeetusWorkspace.openFolderDrawer();
      requestAnimationFrame(enhanceFolderDrawer);
      notify('Название папки изменено');
    } catch (error) {
      notify(error?.message || 'Не удалось переименовать папку', true);
    }
  }

  function findMessageTarget(messageId) {
    const escaped = window.CSS?.escape ? CSS.escape(messageId) : messageId.replace(/["\\]/g, '\\$&');
    return byId('messageArea')?.querySelector(`[data-message-id="${escaped}"]`)
      || byId('community2WorkspaceBody')?.querySelector(`[data-community2-comment-id="${escaped}"],[data-message-id="${escaped}"]`)
      || null;
  }

  async function waitForMessageTarget(messageId, timeoutMs = 5500) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const target = findMessageTarget(messageId);
      if (target) return target;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return null;
  }

  function messageTimeValue(message, fallback = 0) {
    const raw = message?.created_at || message?.createdAt || message?.sent_at || message?.timestamp || message?.updated_at;
    const parsed = raw ? new Date(raw).getTime() : NaN;
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function mergeMessageSets(...sets) {
    const map = new Map();
    let order = 0;
    sets.flat().filter(Boolean).forEach((message) => {
      const id = message?.id || message?.message_id;
      if (!id) return;
      const existing = map.get(id);
      map.set(id, { ...(existing || {}), ...message, __ws5order: existing?.__ws5order ?? order++ });
    });
    return [...map.values()].sort((a, b) => {
      const time = messageTimeValue(a, a.__ws5order) - messageTimeValue(b, b.__ws5order);
      return time || a.__ws5order - b.__ws5order;
    }).map(({ __ws5order, ...message }) => message);
  }

  function setDeepLinkLoading(active) {
    const area = byId('messageArea');
    if (!area) return;
    area.classList.toggle('workspace5-deep-link-loading', active);
    area.setAttribute('aria-busy', active ? 'true' : 'false');
  }

  function isScrollableElement(element) {
    if (!element || element === document.body || element === document.documentElement) return false;
    const style = getComputedStyle(element);
    const overflowY = style.overflowY || '';
    return element.scrollHeight > element.clientHeight + 4 && /(auto|scroll|overlay)/i.test(overflowY);
  }

  function findMessageScroller(target) {
    let node = target?.parentElement || null;
    let fallback = null;
    while (node && node !== document.body && node !== document.documentElement) {
      if (!fallback && node.scrollHeight > node.clientHeight + 4) fallback = node;
      if (isScrollableElement(node)) return node;
      node = node.parentElement;
    }
    const area = byId('messageArea');
    if (area && area.scrollHeight > area.clientHeight + 4) return area;
    return fallback || area || document.scrollingElement || document.documentElement;
  }

  function targetViewportOffset(scroller) {
    const height = scroller === document.scrollingElement || scroller === document.documentElement
      ? window.innerHeight
      : scroller.clientHeight;
    return Math.min(250, Math.max(76, height * 0.24));
  }

  function placeMessageAtStablePosition(target) {
    if (!target) return false;
    const scroller = findMessageScroller(target);
    if (!scroller) return false;
    const desiredTop = targetViewportOffset(scroller);
    if (scroller === document.scrollingElement || scroller === document.documentElement || scroller === document.body) {
      const absoluteTop = window.scrollY + target.getBoundingClientRect().top;
      window.scrollTo({ top: Math.max(0, absoluteTop - desiredTop), behavior: 'auto' });
      return true;
    }
    const scrollerRect = scroller.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const nextTop = scroller.scrollTop + targetRect.top - scrollerRect.top - desiredTop;
    const previousBehavior = scroller.style.scrollBehavior;
    scroller.style.scrollBehavior = 'auto';
    scroller.scrollTop = Math.max(0, Math.min(nextTop, scroller.scrollHeight - scroller.clientHeight));
    scroller.style.scrollBehavior = previousBehavior;
    return true;
  }

  async function focusExactMessage(target, messageId) {
    if (!target) return false;
    target.classList.remove('workspace5-deep-link-target', 'message-search-target', 'message-highlight');
    for (let attempt = 0; attempt < 6; attempt += 1) {
      placeMessageAtStablePosition(target);
      await afterFrames(1);
      target = findMessageTarget(messageId) || target;
    }
    const scroller = findMessageScroller(target);
    if (scroller && typeof ResizeObserver === 'function') {
      await new Promise((resolve) => {
        let timer = null;
        const finish = () => {
          clearTimeout(timer);
          observer.disconnect();
          placeMessageAtStablePosition(findMessageTarget(messageId) || target);
          resolve();
        };
        const observer = new ResizeObserver(() => {
          placeMessageAtStablePosition(findMessageTarget(messageId) || target);
          clearTimeout(timer);
          timer = setTimeout(finish, 90);
        });
        observer.observe(scroller);
        observer.observe(target);
        timer = setTimeout(finish, 420);
      });
    }
    placeMessageAtStablePosition(findMessageTarget(messageId) || target);
    return true;
  }

  async function settleDeepLinkLayout(container, target) {
    try { await document.fonts?.ready; } catch {}
    await afterFrames(3);
    const media = [...(container?.querySelectorAll('img:not([complete]),video:not([data-workspace5-metadata-ready])') || [])].slice(0, 16);
    if (media.length) {
      await Promise.race([
        Promise.allSettled(media.map((node) => new Promise((resolve) => {
          const done = () => {
            node.dataset.workspace5MetadataReady = '1';
            resolve();
          };
          node.addEventListener(node.tagName === 'VIDEO' ? 'loadedmetadata' : 'load', done, { once: true });
          node.addEventListener('error', done, { once: true });
          setTimeout(done, 260);
        }))),
        new Promise((resolve) => setTimeout(resolve, 320)),
      ]);
    }
    await afterFrames(2);
    return target;
  }

  async function robustOpenSearchMessageResult(chatId, messageId, options = {}) {
    if (!chatId || !messageId) throw new Error('Некорректная ссылка на сообщение');
    const sequence = ++runtime.deepLinkSequence;
    if (window.MeetusWorkspace?.ws) {
      window.MeetusWorkspace.ws.selectedFolderId = 'all';
      window.MeetusWorkspace.renderFolderBar?.();
    }
    if (typeof setSidebarMode === 'function') setSidebarMode('chats');
    syncFolderVisibility();

    let chat = state.chats?.find((item) => item.id === chatId);
    if (!chat && typeof loadChats === 'function') {
      await loadChats(false);
      chat = state.chats?.find((item) => item.id === chatId);
    }
    if (!chat) throw new Error('Нет доступа к этому каналу или группе');

    setDeepLinkLoading(true);
    try {
      if (typeof openChat === 'function') await openChat(chat);
      if (sequence !== runtime.deepLinkSequence) return null;
      const latest = Array.isArray(state.activeMessages) ? [...state.activeMessages] : [];
      let context = [];
      try {
        const result = await request(`/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}/context?limit=200`);
        context = Array.isArray(result)
          ? result
          : mergeMessageSets(
              Array.isArray(result?.before) ? result.before : [],
              Array.isArray(result?.messages) ? result.messages : [],
              result?.target || result?.message || null,
              Array.isArray(result?.after) ? result.after : [],
              Array.isArray(result?.items) ? result.items : [],
            );
      } catch (error) {
        if (!findMessageTarget(messageId)) throw error;
      }

      const merged = mergeMessageSets(context, latest);
      if (merged.length && typeof messageArea !== 'undefined' && messageArea) {
        state.activeMessages = merged;
        state.searchContextActive = true;
        messageArea.innerHTML = '';
        merged.forEach((message) => appendMessage(message));
      }

      await afterFrames(2);
      let target = await waitForMessageTarget(messageId, 6500);
      if (!target) throw new Error('Сообщение не найдено или было удалено');
      await settleDeepLinkLayout(byId('messageArea'), target);
      target = findMessageTarget(messageId) || target;
      await focusExactMessage(target, messageId);
      await afterFrames(1);
      if (options.updateHistory !== false) {
        const url = new URL(location.href);
        url.pathname = '/';
        url.search = '';
        url.hash = new URLSearchParams({ chat: chatId, message: messageId }).toString();
        history.pushState({ meetusMessageLink: true, chatId, messageId }, '', url);
      }
      return target;
    } finally {
      if (sequence === runtime.deepLinkSequence) {
        await afterFrames(1);
        setDeepLinkLoading(false);
      }
    }
  }

  function parseMessageLink(url) {
    if (!url || url.origin !== location.origin) return null;
    const query = url.searchParams;
    const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
    const chatId = query.get('chat') || hash.get('chat');
    const messageId = query.get('message') || hash.get('message');
    return chatId && messageId ? { chatId, messageId } : null;
  }

  function normalizeSameOriginLinks(root = document) {
    root.querySelectorAll?.('a[href]').forEach((anchor) => {
      try {
        const url = new URL(anchor.getAttribute('href'), location.href);
        if (url.origin === location.origin) {
          anchor.target = '_self';
          anchor.rel = 'noopener';
          anchor.dataset.meetusSameTab = '1';
        }
      } catch {}
    });
  }

  function hookSameOriginNavigation() {
    if (runtime.internalLinksHooked) return;
    runtime.internalLinksHooked = true;
    normalizeSameOriginLinks();
    const nativeOpen = window.open.bind(window);
    window.open = function meetusSameTabOpen(url, target, features) {
      try {
        const resolved = new URL(url, location.href);
        if (resolved.origin === location.origin) {
          const messageLink = parseMessageLink(resolved);
          if (messageLink) {
            void robustOpenSearchMessageResult(messageLink.chatId, messageLink.messageId, { updateHistory: true }).catch((error) => notify(error?.message || 'Не удалось открыть сообщение', true));
            return window;
          }
          location.assign(resolved.href);
          return window;
        }
      } catch {}
      return nativeOpen(url, target, features);
    };
    document.addEventListener('click', (event) => {
      const anchor = event.target.closest?.('a[href]');
      if (!anchor || anchor.closest('.workspace5-rich-editor,[contenteditable="true"]') || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      let url;
      try { url = new URL(anchor.href, location.href); } catch { return; }
      if (url.origin !== location.origin) return;
      event.preventDefault();
      event.stopPropagation();
      const messageLink = parseMessageLink(url);
      if (messageLink) {
        void robustOpenSearchMessageResult(messageLink.chatId, messageLink.messageId, { updateHistory: true }).catch((error) => notify(error?.message || 'Не удалось открыть сообщение', true));
        return;
      }
      location.assign(url.href);
    }, true);
  }

  function hookMessageSearch() {
    if (runtime.searchHooked || typeof openSearchMessageResult !== 'function') return;
    runtime.searchHooked = true;
    openSearchMessageResult = robustOpenSearchMessageResult;
  }

  async function openInitialDeepLink() {
    if (!runtime.deepLink || runtime.openingDeepLink || typeof state === 'undefined' || !state.user) return;
    runtime.openingDeepLink = true;
    const { chatId, messageId } = runtime.deepLink;
    try {
      await robustOpenSearchMessageResult(chatId, messageId, { updateHistory: false });
      runtime.deepLink = null;
    } catch (error) {
      notify(error?.message || 'Не удалось перейти к сообщению', true);
    } finally {
      runtime.openingDeepLink = false;
    }
  }

  function installGlobalHandlers() {
    document.addEventListener('selectionchange', () => requestAnimationFrame(updateSelectionToolbar));
    window.addEventListener('resize', () => requestAnimationFrame(updateSelectionToolbar));
    document.addEventListener('click', (event) => {
      const edit = event.target.closest?.('[data-workspace5-folder-edit]');
      if (edit) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        openFolderRenameModal(edit.dataset.workspace5FolderEdit);
      }
    }, true);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        byId('workspace5SelectionToolbar')?.classList.add('hidden');
        closeVisualLinkModal();
        closeFolderRenameModal();
      }
      if (event.key === 'Enter' && byId('workspace5FolderRenameModal') && !byId('workspace5FolderRenameModal').classList.contains('hidden') && event.target === byId('workspace5FolderRenameInput')) {
        event.preventDefault();
        void applyFolderRename();
      }
      if (event.key === 'Enter' && byId('workspace5LinkModal') && !byId('workspace5LinkModal').classList.contains('hidden') && event.target === byId('workspace5LinkUrl')) {
        event.preventDefault();
        applyVisualLink();
      }
    });
  }


    window.addEventListener('popstate', (event) => {
      const url = new URL(location.href);
      const link = parseMessageLink(url);
      if (link) void robustOpenSearchMessageResult(link.chatId, link.messageId, { updateHistory: false }).catch(() => {});
    });

  function boot() {
    installAuthRecovery();
    void refreshAccessTokenOnce();
    ensureSelectionToolbar();
    installGlobalHandlers();
    hookSidebarMode();
    hookMessageSearch();
    hookSameOriginNavigation();
    hookSidebarTabClicks();
    ensureRichEditors();
    syncFolderVisibility();
    enhanceFolderDrawer();

    let observerQueued = false;
    const observer = new MutationObserver(() => {
      if (observerQueued) return;
      observerQueued = true;
      requestAnimationFrame(() => {
        observerQueued = false;
        ensureRichEditors();
        syncFolderVisibility();
        enhanceFolderDrawer();
        normalizeSameOriginLinks();
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    setInterval(() => {
      installAuthRecovery();
      if (accessTokenNeedsRefresh()) void refreshAccessTokenOnce();
      hookSidebarMode();
      hookMessageSearch();
      hookSameOriginNavigation();
      ensureRichEditors();
      syncFolderVisibility();
      enhanceFolderDrawer();
      normalizeSameOriginLinks();
      void openInitialDeepLink();
    }, 1000);
  }

  // Install authentication recovery immediately, before deferred UI boot.
  installAuthRecovery();
  if (accessTokenNeedsRefresh()) void refreshAccessTokenOnce();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 0), { once: true });
  } else {
    setTimeout(boot, 0);
  }
  window.MeetusWorkspace5 = {
    VERSION,
    robustOpenSearchMessageResult,
    syncFolderVisibility,
    ensureRichEditors,
    enhanceFolderDrawer,
    refreshAccessTokenOnce,
    syncComposerEditorsFromSources,
  };
})();
