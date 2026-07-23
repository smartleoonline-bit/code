/* MEETUS 0.6.25.2 COMMUNITY2-TG11-WORKSPACE12
 * Reliable uploaded audio, immediate in-chat upload progress, compact folder actions,
 * modern media composer/editor, visible receipts and polished UI motion.
 */
(() => {
  'use strict';

  const VERSION = '0.6.25.2-community2tg11workspace12';
  const runtime = {
    installed: false,
    observer: null,
    observerFrame: 0,
    pendingRoots: new Set(),
    audioMarkupWrapped: false,
    uploadWrapped: false,
    chatWrapped: false,
    mediaSendInstalled: false,
    mediaSending: false,
  };

  const AUDIO_EXT = /\.(?:mp3|m4a|aac|wav|wave|ogg|oga|opus|flac|weba|amr|aiff|aif|wma)(?:$|[?#])/i;
  const byId = (id) => document.getElementById(id);
  const escapeLocal = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  function bytes(value) {
    const size = Number(value || 0);
    if (!Number.isFinite(size) || size <= 0) return 'Аудиофайл';
    const units = ['Б', 'КБ', 'МБ', 'ГБ'];
    let amount = size;
    let unit = 0;
    while (amount >= 1024 && unit < units.length - 1) {
      amount /= 1024;
      unit += 1;
    }
    return `${amount >= 10 || unit === 0 ? Math.round(amount) : amount.toFixed(1)} ${units[unit]}`;
  }

  function clock(seconds) {
    const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
    const minutes = Math.floor(safe / 60);
    const rest = Math.floor(safe % 60);
    return `${minutes}:${String(rest).padStart(2, '0')}`;
  }

  function notify(message, error = false) {
    try {
      if (typeof setUploadStatus === 'function') {
        setUploadStatus(message, error);
        window.setTimeout(() => setUploadStatus(''), error ? 4500 : 2200);
        return;
      }
    } catch {}
    console[error ? 'error' : 'log'](message);
  }

  function isUploadedAudio(message) {
    if (!message || message.kind === 'voice' || message.kind === 'video') return false;
    const mime = String(message.mime_type || message.mimeType || '').toLowerCase();
    const name = String(message.file_name || message.fileName || '').toLowerCase();
    return mime.startsWith('audio/') || AUDIO_EXT.test(name);
  }

  function audioPlayerMarkup(message, url, fileName) {
    const safeName = escapeLocal(fileName || 'Аудио');
    return `
      <div class="workspace12-audio-file" data-workspace12-audio>
        <button type="button" class="workspace12-audio-play" aria-label="Воспроизвести аудио">
          <svg class="workspace12-audio-play-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7z"/></svg>
          <svg class="workspace12-audio-pause-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>
        </button>
        <div class="workspace12-audio-content">
          <div class="workspace12-audio-title"><strong>${safeName}</strong><small>${escapeLocal(bytes(message?.file_size || message?.fileSize))}</small></div>
          <input class="workspace12-audio-range" type="range" min="0" max="1000" value="0" aria-label="Позиция аудио">
          <div class="workspace12-audio-time"><span>0:00</span><span>0:00</span></div>
        </div>
        <audio preload="metadata" playsinline src="${escapeLocal(url)}"></audio>
      </div>`;
  }

  function bindAudioPlayer(node) {
    if (!(node instanceof HTMLElement) || node.dataset.workspace12Ready === '1') return;
    const audio = node.querySelector('audio');
    const play = node.querySelector('.workspace12-audio-play');
    const range = node.querySelector('.workspace12-audio-range');
    const labels = node.querySelectorAll('.workspace12-audio-time span');
    if (!(audio instanceof HTMLAudioElement) || !(play instanceof HTMLElement) || !(range instanceof HTMLInputElement)) return;

    node.dataset.workspace12Ready = '1';
    const current = labels[0];
    const duration = labels[1];

    const sync = () => {
      const total = Number.isFinite(audio.duration) ? audio.duration : 0;
      const now = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
      range.value = total > 0 ? String(Math.round((now / total) * 1000)) : '0';
      if (current) current.textContent = clock(now);
      if (duration) duration.textContent = clock(total);
    };

    play.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      document.querySelectorAll('.workspace12-audio-file audio,.workspace-audio-file audio,.voice-message audio').forEach((other) => {
        if (other !== audio && !other.paused) other.pause();
      });
      try {
        if (audio.paused) {
          if (audio.readyState === 0) audio.load();
          await audio.play();
        } else {
          audio.pause();
        }
      } catch (error) {
        console.warn('WORKSPACE12 audio playback failed', error);
        notify('Не удалось воспроизвести аудио. Попробуйте ещё раз.', true);
      }
    });
    audio.addEventListener('play', () => node.classList.add('is-playing'));
    audio.addEventListener('pause', () => node.classList.remove('is-playing'));
    audio.addEventListener('ended', () => {
      node.classList.remove('is-playing');
      audio.currentTime = 0;
      sync();
    });
    audio.addEventListener('loadedmetadata', sync);
    audio.addEventListener('durationchange', sync);
    audio.addEventListener('timeupdate', sync);
    audio.addEventListener('error', () => node.classList.add('has-error'));
    range.addEventListener('input', () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        audio.currentTime = (Number(range.value) / 1000) * audio.duration;
      }
    });
    sync();
  }

  function convertWorkspaceAudioNode(node) {
    if (!(node instanceof HTMLElement) || node.dataset.workspace12Upgraded === '1') return;
    const audio = node.querySelector('audio');
    if (!(audio instanceof HTMLAudioElement) || !audio.getAttribute('src')) return;
    node.dataset.workspace12Upgraded = '1';
    const fileName = node.querySelector('strong')?.textContent?.trim() || 'Аудио';
    const sizeLabel = [...node.querySelectorAll('small span')].at(-1)?.textContent?.trim() || 'Аудиофайл';
    const shell = document.createElement('div');
    shell.innerHTML = audioPlayerMarkup({ file_size: 0 }, audio.getAttribute('src'), fileName).trim();
    const player = shell.firstElementChild;
    const small = player?.querySelector('.workspace12-audio-title small');
    if (small) small.textContent = sizeLabel;
    if (player) {
      node.replaceWith(player);
      bindAudioPlayer(player);
    }
  }

  function convertLegacyAudioAnchor(anchor) {
    if (!(anchor instanceof HTMLAnchorElement) || anchor.dataset.workspace12Checked === '1') return;
    anchor.dataset.workspace12Checked = '1';
    const fileName = anchor.getAttribute('download') || anchor.querySelector('strong')?.textContent?.trim() || '';
    const href = anchor.getAttribute('href') || '';
    if (!AUDIO_EXT.test(fileName) && !AUDIO_EXT.test(href)) return;
    const sizeLabel = anchor.querySelector('small')?.textContent?.trim() || 'Аудиофайл';
    const shell = document.createElement('div');
    shell.innerHTML = audioPlayerMarkup({ file_size: 0 }, href, fileName || 'Аудио').trim();
    const player = shell.firstElementChild;
    const small = player?.querySelector('.workspace12-audio-title small');
    if (small) small.textContent = sizeLabel;
    if (player) {
      anchor.replaceWith(player);
      bindAudioPlayer(player);
    }
  }

  function scanAudio(root = document) {
    if (root instanceof Element) {
      if (root.matches('[data-workspace12-audio]')) bindAudioPlayer(root);
      if (root.matches('.workspace-audio-file')) convertWorkspaceAudioNode(root);
      if (root.matches('a.message-file')) convertLegacyAudioAnchor(root);
    }
    root.querySelectorAll?.('.workspace-audio-file').forEach(convertWorkspaceAudioNode);
    root.querySelectorAll?.('[data-workspace12-audio]').forEach(bindAudioPlayer);
    root.querySelectorAll?.('a.message-file').forEach(convertLegacyAudioAnchor);
  }

  function wrapAudioMarkup() {
    if (runtime.audioMarkupWrapped || typeof mediaMarkup !== 'function') return;
    runtime.audioMarkupWrapped = true;
    const base = mediaMarkup;
    mediaMarkup = function workspace12MediaMarkup(message) {
      if (isUploadedAudio(message) && message?.media_key) {
        const url = `/api/media/${encodeURIComponent(message.media_key)}`;
        return audioPlayerMarkup(message, url, message.file_name || 'Аудио');
      }
      return base.call(this, message);
    };
  }

  function uploadPreviewMarkup(blob, fileName, kind) {
    const name = escapeLocal(fileName || 'Файл');
    if (kind === 'image' || kind === 'video') {
      const url = URL.createObjectURL(blob);
      return {
        objectUrl: url,
        html: kind === 'image'
          ? `<img class="workspace12-upload-media" src="${escapeLocal(url)}" alt="${name}">`
          : `<video class="workspace12-upload-media" src="${escapeLocal(url)}" muted playsinline preload="metadata"></video>`,
      };
    }
    const audio = kind === 'voice' || String(blob?.type || '').startsWith('audio/') || AUDIO_EXT.test(fileName || '');
    return {
      objectUrl: null,
      html: `<div class="workspace12-upload-file-icon ${audio ? 'audio' : ''}">
        ${audio
          ? '<svg viewBox="0 0 24 24"><path d="M9 18V5l10-2v13M9 9l10-2M6 18a3 2 0 1 0 0 4 3 2 0 0 0 0-4Zm10-2a3 2 0 1 0 0 4 3 2 0 0 0 0-4Z"/></svg>'
          : '<svg viewBox="0 0 24 24"><path d="M6 2h8l4 4v16H6zM14 2v5h5"/></svg>'}
      </div>`,
    };
  }

  function createUploadCard(blob, fileName, kind) {
    const area = byId('messageArea');
    if (!area) return null;
    const preview = uploadPreviewMarkup(blob, fileName, kind);
    const row = document.createElement('div');
    row.className = 'message-row mine workspace12-upload-row';
    row.innerHTML = `
      <div class="message-bubble workspace12-upload-bubble ${kind === 'image' || kind === 'video' ? 'has-preview' : ''}">
        <div class="workspace12-upload-preview">${preview.html}</div>
        <div class="workspace12-upload-overlay">
          <div class="workspace12-upload-ring" style="--progress:0"><span>0%</span></div>
        </div>
        <div class="workspace12-upload-details">
          <strong>${escapeLocal(fileName || 'Файл')}</strong>
          <span data-workspace12-upload-status>Подготовка…</span>
        </div>
        <div class="workspace12-upload-track"><i></i></div>
        <button type="button" class="workspace12-upload-retry hidden">Повторить</button>
      </div>`;
    area.appendChild(row);
    requestAnimationFrame(() => {
      area.scrollTop = area.scrollHeight;
      row.classList.add('workspace12-upload-visible');
    });
    return {
      row,
      bar: row.querySelector('.workspace12-upload-track i'),
      ring: row.querySelector('.workspace12-upload-ring'),
      percent: row.querySelector('.workspace12-upload-ring span'),
      status: row.querySelector('[data-workspace12-upload-status]'),
      retry: row.querySelector('.workspace12-upload-retry'),
      objectUrl: preview.objectUrl,
    };
  }

  function updateUploadCard(card, progress, status) {
    if (!card?.row?.isConnected) return;
    const value = Math.max(0, Math.min(100, Math.round(progress || 0)));
    if (card.bar) card.bar.style.width = `${value}%`;
    if (card.ring) card.ring.style.setProperty('--progress', String(value));
    if (card.percent) card.percent.textContent = `${value}%`;
    if (card.status && status) card.status.textContent = status;
  }

  function disposeUploadCard(card, delay = 0) {
    const remove = () => {
      card?.row?.remove();
      if (card?.objectUrl) URL.revokeObjectURL(card.objectUrl);
    };
    if (delay) window.setTimeout(remove, delay);
    else remove();
  }

  function xhrMediaUpload(blob, fileName, forceAttachment, card) {
    return new Promise((resolve, reject) => {
      const form = new FormData();
      form.append('file', blob, fileName);
      if (forceAttachment) form.append('disposition', 'attachment');

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API}/media/upload`, true);
      xhr.withCredentials = true;
      xhr.timeout = 180000;
      if (state?.token) xhr.setRequestHeader('Authorization', `Bearer ${state.token}`);
      xhr.upload.addEventListener('progress', (event) => {
        if (!event.lengthComputable) return;
        const progress = Math.max(1, Math.min(96, (event.loaded / event.total) * 96));
        updateUploadCard(card, progress, `Загрузка ${Math.round(progress)}%`);
      });
      xhr.addEventListener('load', () => {
        let payload = null;
        try { payload = JSON.parse(xhr.responseText || 'null'); } catch {}
        resolve({ status: xhr.status, ok: xhr.status >= 200 && xhr.status < 300, payload });
      });
      xhr.addEventListener('timeout', () => reject(new Error('Хранилище не ответило вовремя')));
      xhr.addEventListener('abort', () => reject(new Error('Загрузка отменена')));
      xhr.addEventListener('error', () => reject(new Error('Не удалось связаться с хранилищем файлов')));
      xhr.send(form);
    });
  }

  async function performUpload(blob, fileName, forceAttachment, card) {
    let response = await xhrMediaUpload(blob, fileName, forceAttachment, card);
    if (response.status === 401 && typeof refreshAccessToken === 'function') {
      updateUploadCard(card, 2, 'Обновляем сессию…');
      const refreshed = await refreshAccessToken();
      if (refreshed === 'ok') response = await xhrMediaUpload(blob, fileName, forceAttachment, card);
      else if (refreshed === 'unauthorized') {
        if (typeof handleSessionExpired === 'function') handleSessionExpired();
        throw new Error('Сессия истекла. Войдите снова.');
      }
    }
    if (!response.ok) throw new Error(response.payload?.message || `Ошибка загрузки ${response.status}`);
    return response.payload;
  }

  async function createMediaMessageForChat(chatId, uploaded, kind, caption = '', replyToId = undefined, durationMs = undefined, waveform = null) {
    if (state?.activeChat?.id === chatId && typeof createMediaMessage === 'function') {
      return createMediaMessage(uploaded, kind, caption, replyToId, durationMs, waveform);
    }
    const message = await request(`/chats/${encodeURIComponent(chatId)}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        kind,
        mediaKey: uploaded.key,
        mimeType: uploaded.mimeType,
        fileName: uploaded.fileName,
        fileSize: uploaded.fileSize,
        durationMs,
        text: caption || undefined,
        replyToId,
        waveform: kind === 'voice' && Array.isArray(waveform) ? waveform : undefined,
      }),
    });
    if (typeof playAppSound === 'function') playAppSound('send');
    if (typeof loadChats === 'function') loadChats(false);
    return message;
  }

  async function uploadBlob12(blob, fileName, kind, durationMs, waveform = null, caption = '', replyToId = undefined, forceAttachment = kind === 'file', internal = null) {
    if (!state?.activeChat) throw new Error('Сначала выберите чат');
    if (!state?.token) {
      if (typeof handleSessionExpired === 'function') handleSessionExpired();
      throw new Error('Сессия истекла. Войдите снова.');
    }
    if (!blob) throw new Error('Файл не выбран');
    if (blob.size > 200 * 1024 * 1024) throw new Error('Максимальный размер файла — 200 МБ');

    const chatId = internal?.chatId || internal?.card?.chatId || state.activeChat.id;
    const card = internal?.card || createUploadCard(blob, fileName, kind);
    if (card) card.chatId = chatId;
    card?.row?.classList.remove('is-failed');
    card?.retry?.classList.add('hidden');
    updateUploadCard(card, 1, kind === 'voice' ? 'Отправляем голосовое…' : 'Начинаем загрузку…');

    try {
      if (typeof setLocalChatActivity === 'function') setLocalChatActivity('upload');
      const uploaded = await performUpload(blob, fileName, forceAttachment, card);
      updateUploadCard(card, 98, 'Создаём сообщение…');
      const message = await createMediaMessageForChat(chatId, uploaded, kind, caption, replyToId, durationMs, waveform);
      updateUploadCard(card, 100, 'Отправлено');
      disposeUploadCard(card, 90);
      return message;
    } catch (error) {
      if (card?.row) {
        card.row.classList.add('is-failed');
        updateUploadCard(card, 100, error?.message || 'Ошибка отправки');
        if (card.retry) {
          card.retry.classList.remove('hidden');
          card.retry.onclick = () => {
            card.retry.onclick = null;
            void uploadBlob12(blob, fileName, kind, durationMs, waveform, caption, replyToId, forceAttachment, { card, chatId }).catch(() => {});
          };
        }
      }
      throw error;
    } finally {
      if (typeof clearLocalChatActivity === 'function') clearLocalChatActivity();
    }
  }

  function wrapUploadBlob() {
    if (runtime.uploadWrapped || typeof uploadBlob !== 'function' || typeof createMediaMessage !== 'function') return;
    runtime.uploadWrapped = true;
    uploadBlob = uploadBlob12;
  }

  async function sendPendingMediaImmediate() {
    if (runtime.mediaSending || !state?.activeChat || !Array.isArray(state.pendingMediaFiles) || !state.pendingMediaFiles.length) return;
    runtime.mediaSending = true;
    const files = [...state.pendingMediaFiles];
    const caption = String(byId('mediaPreviewCaption')?.value || '').trim();
    const replyToId = state.replyToMessage?.id;
    const chatId = state.activeChat.id;
    const cards = files.map((file) => {
      const card = createUploadCard(file, file.name, typeof classifyFile === 'function' ? classifyFile(file) : (file.type.startsWith('video/') ? 'video' : 'image'));
      if (card) card.chatId = chatId;
      return card;
    });

    try {
      if (typeof clearReplyMessage === 'function') clearReplyMessage();
      if (typeof closeMediaPreview === 'function') closeMediaPreview();
      let failed = 0;
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const kind = typeof classifyFile === 'function' ? classifyFile(file) : (file.type.startsWith('video/') ? 'video' : 'image');
        try {
          await uploadBlob12(file, file.name, kind, undefined, null, index === 0 ? caption : '', index === 0 ? replyToId : undefined, false, { card: cards[index], chatId });
        } catch {
          failed += 1;
        }
      }
      if (failed) notify(`Не отправлено файлов: ${failed}. Нажмите «Повторить» в чате.`, true);
    } finally {
      runtime.mediaSending = false;
    }
  }

  function installImmediateMediaSend() {
    if (runtime.mediaSendInstalled) return;
    const button = byId('mediaPreviewSend');
    if (!button) return;
    runtime.mediaSendInstalled = true;
    button.addEventListener('click', (event) => {
      if (byId('mediaPreviewModal')?.classList.contains('hidden')) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      void sendPendingMediaImmediate();
    }, true);
  }

  function tidyFolderActions(root = document) {
    const drawer = root.id === 'workspaceFolderDrawerList' ? root : byId('workspaceFolderDrawerList');
    if (!drawer) return;
    drawer.querySelectorAll('[data-workspace-folder]').forEach((button) => {
      const folderId = button.dataset.workspaceFolder;
      if (!folderId || folderId === 'all') return;
      const edit = button.querySelector('[data-workspace5-folder-edit]');
      const remove = button.querySelector('[data-workspace9-folder-delete]');
      if (!edit && !remove) return;
      let actions = button.querySelector('.workspace12-folder-actions');
      if (!actions) {
        actions = document.createElement('span');
        actions.className = 'workspace12-folder-actions';
        const count = button.querySelector(':scope > small');
        if (count) count.insertAdjacentElement('afterend', actions);
        else button.append(actions);
      }
      if (edit && edit.parentElement !== actions) actions.append(edit);
      if (remove && remove.parentElement !== actions) actions.append(remove);
      button.classList.add('workspace12-folder-row');
    });
  }

  function ensureRotateTool() {
    const toolbar = document.querySelector('#imageEditorModal .image-editor-toolbar');
    const canvas = byId('imageEditorCanvas');
    if (!toolbar || !(canvas instanceof HTMLCanvasElement) || byId('workspace12ImageRotate')) return;
    const button = document.createElement('button');
    button.id = 'workspace12ImageRotate';
    button.type = 'button';
    button.title = 'Повернуть на 90°';
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4v6h6M5.5 16a8 8 0 1 0 2-9"/></svg><span>Повернуть</span>';
    const undo = byId('imageEditorUndo');
    toolbar.insertBefore(button, undo || toolbar.firstChild);
    button.addEventListener('click', () => {
      if (!canvas.width || !canvas.height) return;
      try { if (typeof pushEditorHistory === 'function') pushEditorHistory(); } catch {}
      const copy = document.createElement('canvas');
      copy.width = canvas.height;
      copy.height = canvas.width;
      const context = copy.getContext('2d');
      context.translate(copy.width, 0);
      context.rotate(Math.PI / 2);
      context.drawImage(canvas, 0, 0);
      canvas.width = copy.width;
      canvas.height = copy.height;
      canvas.getContext('2d').drawImage(copy, 0, 0);
    });
  }

  function modernizeMediaUi() {
    const preview = byId('mediaPreviewModal');
    const editor = byId('imageEditorModal');
    if (preview) preview.dataset.workspace12Modern = '1';
    if (editor) editor.dataset.workspace12Modern = '1';
    ensureRotateTool();

    const previewEdit = byId('mediaPreviewEdit');
    const previewVideo = byId('mediaPreviewVideo');
    const previewImage = byId('mediaPreviewImage');
    if (previewEdit && previewVideo) {
      if (!previewEdit.dataset.workspace12OriginalHtml) previewEdit.dataset.workspace12OriginalHtml = previewEdit.innerHTML;
      const videoVisible = !previewVideo.classList.contains('hidden');
      if (videoVisible) {
        previewEdit.classList.remove('hidden');
        previewEdit.classList.toggle('workspace12-video-muted', previewVideo.muted);
        previewEdit.title = previewVideo.muted ? 'Включить звук' : 'Выключить звук';
        if (previewEdit.dataset.workspace12Mode !== 'video') {
          previewEdit.dataset.workspace12Mode = 'video';
          previewEdit.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6.5 9H3v6h3.5L11 19zM15 9.5a4 4 0 0 1 0 5M17.8 6.8a8 8 0 0 1 0 10.4"/></svg>';
        }
      } else if (previewImage && !previewImage.classList.contains('hidden')) {
        previewEdit.classList.remove('workspace12-video-muted');
        previewEdit.title = 'Редактировать фото';
        if (previewEdit.dataset.workspace12Mode !== 'image') {
          previewEdit.dataset.workspace12Mode = 'image';
          previewEdit.innerHTML = previewEdit.dataset.workspace12OriginalHtml;
        }
      }
      if (previewEdit.dataset.workspace12VideoToggle !== '1') {
        previewEdit.dataset.workspace12VideoToggle = '1';
        previewEdit.addEventListener('click', (event) => {
          if (previewVideo.classList.contains('hidden')) return;
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          previewVideo.muted = !previewVideo.muted;
          modernizeMediaUi();
        }, true);
      }
    }
  }

  function wrapOpenChatMotion() {
    if (runtime.chatWrapped || typeof openChat !== 'function') return;
    runtime.chatWrapped = true;
    const base = openChat;
    openChat = async function workspace12OpenChat(...args) {
      const pane = byId('chatPane');
      pane?.classList.add('workspace12-chat-switching');
      try {
        return await base.apply(this, args);
      } finally {
        requestAnimationFrame(() => requestAnimationFrame(() => pane?.classList.remove('workspace12-chat-switching')));
      }
    };
  }

  function scanRoot(root = document) {
    scanAudio(root);
    tidyFolderActions(root);
    modernizeMediaUi();
  }

  function flushObserver() {
    runtime.observerFrame = 0;
    const roots = [...runtime.pendingRoots];
    runtime.pendingRoots.clear();
    roots.forEach(scanRoot);
  }

  function installObserver() {
    if (runtime.observer) return;
    runtime.observer = new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach((node) => {
          if (node instanceof Element) runtime.pendingRoots.add(node);
        });
      }
      if (!runtime.observerFrame) runtime.observerFrame = requestAnimationFrame(flushObserver);
    });
    runtime.observer.observe(document.body, { childList: true, subtree: true });
  }

  function install() {
    if (runtime.installed) return;
    runtime.installed = true;
    document.documentElement.dataset.meetusWorkspace12 = '1';
    wrapAudioMarkup();
    wrapUploadBlob();
    wrapOpenChatMotion();
    installImmediateMediaSend();
    modernizeMediaUi();
    tidyFolderActions();
    scanAudio();
    installObserver();

    [150, 500, 1200, 2500].forEach((delay) => window.setTimeout(() => {
      wrapAudioMarkup();
      wrapUploadBlob();
      wrapOpenChatMotion();
      installImmediateMediaSend();
      scanRoot(document);
    }, delay));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();

  window.meetusWorkspace12Version = VERSION;
})();
