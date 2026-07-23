/* MEETUS 0.6.25.2 COMMUNITY2-TG11-WORKSPACE9 — stable media upload, hidden linked discussions, audio comments, folder delete, rich media captions, mobile pins */
(() => {
  'use strict';

  const VERSION = '0.6.25.2-community2tg11workspace9';
  const runtime = {
    installed: false,
    renderChatsWrapped: false,
    hiddenDiscussionIds: new Set(),
    spacesLoaded: false,
    mediaObserver: null,
    resizeFrame: 0,
    folderDeleteId: null,
    caption: null,
    captionRange: null,
  };

  const byId = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
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
        setTimeout(() => setUploadStatus(''), error ? 4200 : 2200);
        return;
      }
    } catch {}
    console[error ? 'error' : 'log'](message);
  }

  /* CALL VIEWPORT: kept from WORKSPACE8 without the self-triggering preview observer. */
  function updateCallViewport() {
    cancelAnimationFrame(runtime.resizeFrame);
    runtime.resizeFrame = requestAnimationFrame(() => {
      const viewport = window.visualViewport;
      const height = Math.max(320, Math.round(viewport?.height || window.innerHeight || document.documentElement.clientHeight));
      const width = Math.max(280, Math.round(viewport?.width || window.innerWidth || document.documentElement.clientWidth));
      document.documentElement.style.setProperty('--meetus-call-vh', `${height}px`);
      document.documentElement.style.setProperty('--meetus-call-vw', `${width}px`);
    });
  }

  function mediaRatio(media) {
    if (media instanceof HTMLImageElement) {
      if (!media.naturalWidth || !media.naturalHeight) return 0;
      return media.naturalWidth / media.naturalHeight;
    }
    if (media instanceof HTMLVideoElement) {
      if (!media.videoWidth || !media.videoHeight) return 0;
      return media.videoWidth / media.videoHeight;
    }
    return 0;
  }

  function applyMediaShape(bubble, media) {
    const ratio = mediaRatio(media);
    if (!ratio) return;
    bubble.classList.remove('workspace8-media-portrait', 'workspace8-media-landscape', 'workspace8-media-square');
    bubble.classList.add(ratio < 0.82 ? 'workspace8-media-portrait' : ratio > 1.28 ? 'workspace8-media-landscape' : 'workspace8-media-square');
    bubble.style.setProperty('--workspace8-media-ratio', String(Math.max(0.45, Math.min(2.2, ratio))));
  }

  function decorateMediaBubble(bubble) {
    if (!(bubble instanceof HTMLElement)) return;
    const media = bubble.querySelector('.message-image, .message-video-preview');
    if (!media) return;
    if (bubble.dataset.workspace9Media !== '1') {
      bubble.dataset.workspace9Media = '1';
      const hasText = Boolean(bubble.querySelector('.message-text'));
      const hasReply = Boolean(bubble.querySelector('.reply-preview, .message-reply-preview, .quoted-message'));
      bubble.classList.toggle('workspace8-media-only', !hasText && !hasReply);
    }
    applyMediaShape(bubble, media);
  }

  function scanMedia(root = document) {
    if (root instanceof Element && root.matches('.message-bubble.visual-media-bubble')) decorateMediaBubble(root);
    root.querySelectorAll?.('.message-bubble.visual-media-bubble').forEach(decorateMediaBubble);
    bindUploadedAudio(root);
    enhanceFolderDrawer(root);
  }

  /* LINKED CHANNEL + GROUP: regular users use the discussion only as a thread space. */
  function chatRole(chat) {
    return String(chat?.role || chat?.member_role || '').toLowerCase();
  }

  function isLinkedDiscussion(chat) {
    if (!chat?.id || chat?.type !== 'group') return false;
    return runtime.hiddenDiscussionIds.has(chat.id)
      || Boolean(chat.linked_chat_id || chat.linkedChatId || chat.linked_channel_id || chat.linkedChannelId);
  }

  function shouldHideDiscussion(chat) {
    return isLinkedDiscussion(chat) && !['owner', 'admin'].includes(chatRole(chat));
  }

  function removeHiddenDiscussionRows() {
    const list = byId('chatList');
    if (!list) return;
    list.querySelectorAll('.chat-item[data-chat-id],[data-chat-id].chat-item').forEach((item) => {
      const chat = (typeof state !== 'undefined' && Array.isArray(state.chats))
        ? state.chats.find((entry) => entry.id === item.dataset.chatId)
        : null;
      if (!chat || !shouldHideDiscussion(chat)) return;
      const row = item.closest('.chat-sidebar-row,.sidebar-list-row,.chat-list-item,li') || item;
      row.remove();
    });
  }

  async function loadDiscussionSpaces() {
    if (typeof request !== 'function') return;
    try {
      const payload = await request('/discussion-spaces');
      const items = Array.isArray(payload?.items) ? payload.items : [];
      runtime.hiddenDiscussionIds = new Set(items.map((item) => item?.discussionChatId || item?.discussion_chat_id).filter(Boolean));
      runtime.spacesLoaded = true;
      if (typeof renderChats === 'function') renderChats();
      removeHiddenDiscussionRows();
    } catch (error) {
      console.warn('WORKSPACE9: discussion spaces unavailable', error);
    }
  }

  function wrapRenderChats() {
    if (runtime.renderChatsWrapped || typeof renderChats !== 'function') return;
    runtime.renderChatsWrapped = true;
    const base = renderChats;
    renderChats = function workspace9RenderChats(...args) {
      const original = Array.isArray(state?.chats) ? state.chats : null;
      if (original) state.chats = original.filter((chat) => !shouldHideDiscussion(chat));
      try {
        return base.apply(this, args);
      } finally {
        if (original) state.chats = original;
        queueMicrotask(removeHiddenDiscussionRows);
      }
    };
  }

  /* Uploaded audio inside comments/replies. */
  function audioDuration(seconds) {
    const value = Number.isFinite(seconds) && seconds >= 0 ? seconds : 0;
    const minutes = Math.floor(value / 60);
    return `${minutes}:${String(Math.floor(value % 60)).padStart(2, '0')}`;
  }

  function bindAudioNode(node) {
    if (!(node instanceof HTMLElement) || node.dataset.workspace9Audio === '1') return;
    const audio = node.querySelector('audio');
    const play = node.querySelector('.workspace-audio-play');
    const range = node.querySelector('input[type="range"]');
    const current = node.querySelector('small span');
    if (!audio || !play || !range) return;
    node.dataset.workspace9Audio = '1';

    const sync = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        range.value = String(Math.round((audio.currentTime / audio.duration) * 1000));
      }
      if (current) current.textContent = audioDuration(audio.currentTime);
    };
    play.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      document.querySelectorAll('.workspace-audio-file audio').forEach((other) => {
        if (other !== audio && !other.paused) other.pause();
      });
      try {
        if (audio.paused) await audio.play();
        else audio.pause();
      } catch (error) {
        notify('Не удалось воспроизвести аудио', true);
      }
    });
    audio.addEventListener('play', () => { play.textContent = '❚❚'; });
    audio.addEventListener('pause', () => { play.textContent = '▶'; });
    audio.addEventListener('ended', () => { play.textContent = '▶'; range.value = '0'; });
    audio.addEventListener('timeupdate', sync);
    audio.addEventListener('loadedmetadata', sync);
    range.addEventListener('input', () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) audio.currentTime = Number(range.value) / 1000 * audio.duration;
    });
  }

  function bindUploadedAudio(root = document) {
    if (root instanceof Element && root.matches('.workspace-audio-file')) bindAudioNode(root);
    root.querySelectorAll?.('.workspace-audio-file').forEach(bindAudioNode);
  }

  /* Folder deletion, using the backend route already present since WORKSPACE1. */
  function ensureFolderDeleteModal() {
    if (byId('workspace9FolderDeleteModal')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <div id="workspace9FolderDeleteModal" class="workspace9-modal hidden" role="dialog" aria-modal="true">
        <div class="workspace9-modal-card">
          <div class="workspace9-modal-head"><strong>Удалить папку?</strong><button type="button" data-workspace9-folder-delete-close>×</button></div>
          <p>Чаты останутся в Meetus. Удалится только сама папка и её список.</p>
          <div class="workspace9-modal-actions"><button type="button" data-workspace9-folder-delete-close>Отмена</button><button id="workspace9FolderDeleteApply" type="button" class="danger">Удалить</button></div>
        </div>
      </div>
    `);
    const modal = byId('workspace9FolderDeleteModal');
    modal.addEventListener('click', (event) => {
      if (event.target === modal || event.target.closest('[data-workspace9-folder-delete-close]')) closeFolderDeleteModal();
    });
    byId('workspace9FolderDeleteApply').addEventListener('click', () => void deleteSelectedFolder());
  }

  function enhanceFolderDrawer(root = document) {
    const drawer = root.id === 'workspaceFolderDrawerList' ? root : byId('workspaceFolderDrawerList');
    if (!drawer) return;
    drawer.querySelectorAll('[data-workspace-folder]').forEach((button) => {
      const folderId = button.dataset.workspaceFolder;
      if (!folderId || folderId === 'all' || button.querySelector('[data-workspace9-folder-delete]')) return;
      const remove = document.createElement('span');
      remove.className = 'workspace9-folder-delete';
      remove.dataset.workspace9FolderDelete = folderId;
      remove.title = 'Удалить папку';
      remove.setAttribute('role', 'button');
      remove.setAttribute('aria-label', 'Удалить папку');
      remove.textContent = '×';
      button.append(remove);
    });
  }

  function openFolderDeleteModal(folderId) {
    ensureFolderDeleteModal();
    runtime.folderDeleteId = folderId;
    byId('workspace9FolderDeleteModal').classList.remove('hidden');
  }

  function closeFolderDeleteModal() {
    runtime.folderDeleteId = null;
    byId('workspace9FolderDeleteModal')?.classList.add('hidden');
  }

  async function deleteSelectedFolder() {
    const folderId = runtime.folderDeleteId;
    if (!folderId || !window.MeetusWorkspace?.api) return closeFolderDeleteModal();
    const button = byId('workspace9FolderDeleteApply');
    button.disabled = true;
    try {
      await window.MeetusWorkspace.api(`/folders/${encodeURIComponent(folderId)}`, 'DELETE');
      const workspace = window.MeetusWorkspace;
      workspace.ws.folders = (workspace.ws.folders || []).filter((folder) => folder.id !== folderId);
      if (workspace.ws.selectedFolderId === folderId) workspace.ws.selectedFolderId = 'all';
      closeFolderDeleteModal();
      workspace.renderFolderBar?.();
      if (typeof renderChats === 'function') renderChats();
      workspace.openFolderDrawer?.();
      requestAnimationFrame(() => enhanceFolderDrawer());
      notify('Папка удалена');
    } catch (error) {
      notify(error?.message || 'Не удалось удалить папку', true);
    } finally {
      button.disabled = false;
    }
  }

  /* Rich text / link editor for captions below photos and videos. */
  function markdownToHtml(markdown = '') {
    const tokens = [];
    let source = String(markdown).replace(/\[([^\]\n]{1,500})\]\((https?:\/\/[^\s)]+)\)/gi, (_, label, href) => {
      const token = `\u0000W9L${tokens.length}\u0000`;
      tokens.push(`<a href="${escapeHtmlLocal(href)}" class="workspace9-caption-link" target="_self" rel="noopener">${escapeHtmlLocal(label)}</a>`);
      return token;
    });
    source = escapeHtmlLocal(source)
      .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^_\n]+)__/g, '<em>$1</em>')
      .replace(/\+\+([^+\n]+)\+\+/g, '<u>$1</u>')
      .replace(/\r?\n/g, '<br>');
    return source.replace(/\u0000W9L(\d+)\u0000/g, (_, index) => tokens[Number(index)] || '');
  }

  function serializeCaptionNode(node) {
    if (node.nodeType === Node.TEXT_NODE) return String(node.nodeValue || '').replace(/\u200B/g, '');
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const tag = node.tagName.toLowerCase();
    if (tag === 'br') return '\n';
    if (tag === 'a') {
      const label = String(node.textContent || '').replace(/\u200B/g, '').trim() || 'ссылка';
      const href = node.getAttribute('href') || '';
      return href ? `[${label}](${href})` : label;
    }
    const content = [...node.childNodes].map(serializeCaptionNode).join('');
    if (tag === 'strong' || tag === 'b') return `**${content}**`;
    if (tag === 'em' || tag === 'i') return `__${content}__`;
    if (tag === 'u') return `++${content}++`;
    if (tag === 'div' || tag === 'p') return `${content}\n`;
    return content;
  }

  function sanitizeCaptionEditor(editor) {
    editor.querySelectorAll('*').forEach((node) => {
      const tag = node.tagName.toLowerCase();
      if (!['a', 'strong', 'b', 'em', 'i', 'u', 'br', 'div', 'p'].includes(tag)) {
        node.replaceWith(...node.childNodes);
        return;
      }
      [...node.attributes].forEach((attribute) => {
        if (tag === 'a' && ['href', 'class', 'target', 'rel'].includes(attribute.name)) return;
        node.removeAttribute(attribute.name);
      });
      if (tag === 'a') {
        node.className = 'workspace9-caption-link';
        node.target = '_self';
        node.rel = 'noopener';
      }
    });
  }

  function captionMarkdown() {
    return [...runtime.caption.editor.childNodes].map(serializeCaptionNode).join('').replace(/\n{3,}/g, '\n\n').replace(/\n$/, '');
  }

  function syncCaptionToSource() {
    if (!runtime.caption || runtime.caption.syncing) return;
    runtime.caption.syncing = true;
    sanitizeCaptionEditor(runtime.caption.editor);
    const value = captionMarkdown();
    runtime.caption.lastValue = value;
    runtime.caption.source.value = value;
    try { runtime.caption.source.setSelectionRange(value.length, value.length); } catch {}
    runtime.caption.source.dispatchEvent(new Event('input', { bubbles: true }));
    runtime.caption.syncing = false;
  }

  function syncCaptionFromSource(force = false) {
    if (!runtime.caption || runtime.caption.syncing) return;
    const value = String(runtime.caption.source.value || '');
    if (!force && value === runtime.caption.lastValue) return;
    runtime.caption.syncing = true;
    runtime.caption.editor.innerHTML = markdownToHtml(value);
    runtime.caption.lastValue = value;
    runtime.caption.syncing = false;
  }

  function ensureCaptionUi() {
    const source = byId('mediaPreviewCaption');
    if (!source || runtime.caption) return;
    const row = source.closest('.media-preview-caption-row');
    if (!row) return;
    const editor = document.createElement('div');
    editor.id = 'workspace9MediaCaptionEditor';
    editor.className = 'workspace9-media-caption-editor';
    editor.contentEditable = 'true';
    editor.dataset.placeholder = source.placeholder || 'Добавить подпись';
    editor.setAttribute('role', 'textbox');
    editor.setAttribute('aria-multiline', 'true');
    source.classList.add('workspace9-caption-source');
    source.insertAdjacentElement('beforebegin', editor);

    document.body.insertAdjacentHTML('beforeend', `
      <div id="workspace9CaptionToolbar" class="workspace9-caption-toolbar hidden" role="toolbar">
        <button type="button" data-workspace9-caption-format="bold"><b>B</b></button>
        <button type="button" data-workspace9-caption-format="italic"><i>I</i></button>
        <button type="button" data-workspace9-caption-format="underline"><u>U</u></button>
        <button type="button" data-workspace9-caption-format="link">🔗</button>
      </div>
      <div id="workspace9CaptionLinkModal" class="workspace9-modal hidden" role="dialog" aria-modal="true">
        <div class="workspace9-modal-card">
          <div class="workspace9-modal-head"><strong>Добавить ссылку</strong><button type="button" data-workspace9-caption-link-close>×</button></div>
          <label>Адрес<input id="workspace9CaptionLinkUrl" type="url" value="https://" autocomplete="off"></label>
          <div class="workspace9-modal-actions"><button type="button" data-workspace9-caption-link-close>Отмена</button><button id="workspace9CaptionLinkApply" type="button" class="primary">Применить</button></div>
        </div>
      </div>
    `);

    runtime.caption = { source, editor, syncing: false, lastValue: null };
    syncCaptionFromSource(true);

    const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
    if (descriptor?.get && descriptor?.set) {
      Object.defineProperty(source, 'value', {
        configurable: true,
        get() { return descriptor.get.call(this); },
        set(value) {
          descriptor.set.call(this, value);
          if (!runtime.caption?.syncing) queueMicrotask(() => syncCaptionFromSource(true));
        },
      });
    }

    editor.addEventListener('input', syncCaptionToSource);
    editor.addEventListener('paste', (event) => {
      event.preventDefault();
      document.execCommand('insertText', false, event.clipboardData?.getData('text/plain') || '');
      syncCaptionToSource();
    });
    editor.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && ['b', 'i', 'u', 'k'].includes(event.key.toLowerCase())) {
        event.preventDefault();
        const key = event.key.toLowerCase();
        if (key === 'k') return openCaptionLinkModal();
        document.execCommand({ b: 'bold', i: 'italic', u: 'underline' }[key], false);
        syncCaptionToSource();
      }
    });
    source.addEventListener('input', () => {
      if (!runtime.caption.syncing) queueMicrotask(() => syncCaptionFromSource(true));
    });

    const toolbar = byId('workspace9CaptionToolbar');
    toolbar.addEventListener('mousedown', (event) => event.preventDefault());
    toolbar.addEventListener('click', (event) => {
      const action = event.target.closest('[data-workspace9-caption-format]')?.dataset.workspace9CaptionFormat;
      if (!action || !restoreCaptionSelection()) return;
      if (action === 'link') return openCaptionLinkModal();
      document.execCommand({ bold: 'bold', italic: 'italic', underline: 'underline' }[action], false);
      syncCaptionToSource();
      updateCaptionToolbar();
    });

    const linkModal = byId('workspace9CaptionLinkModal');
    linkModal.addEventListener('click', (event) => {
      if (event.target === linkModal || event.target.closest('[data-workspace9-caption-link-close]')) closeCaptionLinkModal();
    });
    byId('workspace9CaptionLinkApply').addEventListener('click', applyCaptionLink);
    byId('mediaPreviewSend')?.addEventListener('click', syncCaptionToSource, true);
  }

  function captionSelectionInside(range) {
    const node = range?.commonAncestorContainer;
    const element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
    return Boolean(runtime.caption?.editor && element && runtime.caption.editor.contains(element));
  }

  function updateCaptionToolbar() {
    const toolbar = byId('workspace9CaptionToolbar');
    if (!toolbar || !runtime.caption) return;
    const selection = window.getSelection();
    if (!selection?.rangeCount || selection.isCollapsed || !String(selection.toString()).trim()) {
      toolbar.classList.add('hidden');
      return;
    }
    const range = selection.getRangeAt(0);
    if (!captionSelectionInside(range)) {
      toolbar.classList.add('hidden');
      return;
    }
    runtime.captionRange = range.cloneRange();
    const rect = range.getBoundingClientRect();
    toolbar.style.left = `${Math.max(10, Math.min(window.innerWidth - toolbar.offsetWidth - 10, rect.left + rect.width / 2 - toolbar.offsetWidth / 2))}px`;
    toolbar.style.top = `${Math.max(8, rect.top - 48)}px`;
    toolbar.classList.remove('hidden');
  }

  function restoreCaptionSelection() {
    if (!runtime.captionRange || !runtime.caption?.editor?.isConnected) return false;
    runtime.caption.editor.focus();
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(runtime.captionRange.cloneRange());
    return true;
  }

  function openCaptionLinkModal() {
    const selection = window.getSelection();
    if (selection?.rangeCount && captionSelectionInside(selection.getRangeAt(0)) && !selection.isCollapsed) runtime.captionRange = selection.getRangeAt(0).cloneRange();
    if (!runtime.captionRange) return notify('Сначала выделите текст', true);
    byId('workspace9CaptionLinkUrl').value = 'https://';
    byId('workspace9CaptionLinkModal').classList.remove('hidden');
    requestAnimationFrame(() => byId('workspace9CaptionLinkUrl').focus());
  }

  function closeCaptionLinkModal() {
    byId('workspace9CaptionLinkModal')?.classList.add('hidden');
  }

  function applyCaptionLink() {
    let url = String(byId('workspace9CaptionLinkUrl').value || '').trim();
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    try { new URL(url); } catch { return notify('Введите корректную ссылку', true); }
    if (!restoreCaptionSelection()) return;
    document.execCommand('createLink', false, url);
    sanitizeCaptionEditor(runtime.caption.editor);
    syncCaptionToSource();
    closeCaptionLinkModal();
    byId('workspace9CaptionToolbar')?.classList.add('hidden');
  }

  function ensureMobilePinnedBanners() {
    const banner = byId('workspacePinnedBanner');
    const header = document.querySelector('.chat-header');
    if (banner && header && header.nextElementSibling !== banner) header.insertAdjacentElement('afterend', banner);
    document.querySelectorAll('.community2-thread-pinned').forEach((node) => node.classList.add('workspace9-mobile-pin-ready'));
  }

  function installObserver() {
    if (runtime.mediaObserver) return;
    runtime.mediaObserver = new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          scanMedia(node);
          if (node.id === 'workspaceFolderDrawerList' || node.querySelector?.('#workspaceFolderDrawerList')) enhanceFolderDrawer();
          if (node.id === 'mediaPreviewModal' || node.querySelector?.('#mediaPreviewModal')) ensureCaptionUi();
          if (node.id === 'workspacePinnedBanner' || node.querySelector?.('#workspacePinnedBanner,.community2-thread-pinned')) ensureMobilePinnedBanners();
        });
      }
    });
    runtime.mediaObserver.observe(document.body, { childList: true, subtree: true });
  }

  function installEvents() {
    document.addEventListener('load', (event) => {
      const media = event.target;
      if (!(media instanceof HTMLImageElement)) return;
      const bubble = media.closest('.message-bubble.visual-media-bubble');
      if (bubble) decorateMediaBubble(bubble);
    }, true);
    document.addEventListener('loadedmetadata', (event) => {
      const media = event.target;
      if (!(media instanceof HTMLVideoElement)) return;
      const bubble = media.closest('.message-bubble.visual-media-bubble');
      if (bubble) decorateMediaBubble(bubble);
    }, true);
    document.addEventListener('selectionchange', () => requestAnimationFrame(updateCaptionToolbar));
    document.addEventListener('click', (event) => {
      const remove = event.target.closest?.('[data-workspace9-folder-delete]');
      if (remove) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        openFolderDeleteModal(remove.dataset.workspace9FolderDelete);
      }
    }, true);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeFolderDeleteModal();
        closeCaptionLinkModal();
        byId('workspace9CaptionToolbar')?.classList.add('hidden');
      }
    });
    window.addEventListener('resize', updateCallViewport, { passive: true });
    window.addEventListener('orientationchange', updateCallViewport, { passive: true });
    window.visualViewport?.addEventListener('resize', updateCallViewport, { passive: true });
    window.visualViewport?.addEventListener('scroll', updateCallViewport, { passive: true });
  }

  async function install() {
    if (runtime.installed) return;
    runtime.installed = true;
    document.documentElement.dataset.meetusWorkspace9 = '1';
    updateCallViewport();
    ensureFolderDeleteModal();
    ensureCaptionUi();
    wrapRenderChats();
    installEvents();
    installObserver();
    scanMedia();
    enhanceFolderDrawer();
    ensureMobilePinnedBanners();

    for (let attempt = 0; attempt < 30; attempt += 1) {
      if (typeof state !== 'undefined' && state.user && typeof request === 'function') break;
      await sleep(200);
    }
    wrapRenderChats();
    await loadDiscussionSpaces();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => void install(), { once: true });
  else void install();

  window.meetusWorkspace9Version = VERSION;
})();
