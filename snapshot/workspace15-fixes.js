/* MEETUS 0.6.25.2 COMMUNITY2-TG11-WORKSPACE15
 * Rich community descriptions, circular avatar cropper, clean pin previews
 * and Meetus-styled pin title editing.
 */
(() => {
  'use strict';

  const VERSION = '0.6.25.2-community2tg11workspace15';
  const rt = {
    installed: false,
    communityInfoWrapped: false,
    socketBound: false,
    crop: null,
    cropResolve: null,
    cropObjectUrl: null,
    cropPointer: null,
    pinResolve: null,
  };

  const byId = (id) => document.getElementById(id);
  const esc = (value = '') => String(value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');

  function notice(message, error = false) {
    try {
      if (typeof setUploadStatus === 'function') {
        setUploadStatus(message, error);
        window.setTimeout(() => setUploadStatus(''), error ? 4400 : 2300);
        return;
      }
    } catch {}
    console[error ? 'error' : 'log'](message);
  }

  function markdownToHtml(markdown = '') {
    const tokens = [];
    let source = String(markdown).replace(/\[([^\]\n]{1,500})\]\((https?:\/\/[^\s)]+)\)/gi, (_, label, href) => {
      const token = `\u0000WS15L${tokens.length}\u0000`;
      let target = '_blank';
      try { target = new URL(href, location.href).origin === location.origin ? '_self' : '_blank'; } catch {}
      tokens.push(`<a href="${esc(href)}" target="${target}" rel="noopener noreferrer">${esc(label)}</a>`);
      return token;
    });
    source = esc(source)
      .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^_\n]+)__/g, '<em>$1</em>')
      .replace(/\+\+([^+\n]+)\+\+/g, '<u>$1</u>')
      .replace(/\r?\n/g, '<br>');
    return source.replace(/\u0000WS15L(\d+)\u0000/g, (_, index) => tokens[Number(index)] || '');
  }

  function cleanMarkdown(value = '') {
    return String(value)
      .replace(/\[([^\]\n]{1,500})\]\((https?:\/\/[^\s)]+)\)/gi, '$1')
      .replace(/\*\*([^*\n]+)\*\*/g, '$1')
      .replace(/__([^_\n]+)__/g, '$1')
      .replace(/\+\+([^+\n]+)\+\+/g, '$1')
      .replace(/`([^`\n]+)`/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function injectUi() {
    if (!byId('workspace15CropModal')) {
      document.body.insertAdjacentHTML('beforeend', `
        <div id="workspace15CropModal" class="workspace15-modal hidden" role="dialog" aria-modal="true">
          <section class="workspace15-card workspace15-crop-card">
            <header><div><h3>Подогнать аватарку</h3><small>Перемещайте изображение и настройте масштаб</small></div><button type="button" data-workspace15-crop-close>×</button></header>
            <div class="workspace15-crop-body">
              <div id="workspace15CropViewport" class="workspace15-crop-viewport"><img id="workspace15CropImage" alt="Предпросмотр аватарки"><span aria-hidden="true"></span></div>
              <label class="workspace15-zoom"><span>Масштаб</span><input id="workspace15CropZoom" type="range" min="100" max="300" step="1" value="100"></label>
              <small>В круг попадёт именно та часть, которая видна внутри рамки.</small>
            </div>
            <footer><button type="button" data-workspace15-crop-close>Отмена</button><button id="workspace15CropApply" type="button" class="primary">Применить</button></footer>
          </section>
        </div>
        <div id="workspace15PinTitleModal" class="workspace15-modal hidden" role="dialog" aria-modal="true">
          <section class="workspace15-card workspace15-pin-title-card">
            <header><div><h3>Заголовок закрепа</h3><small>Короткое название для списка закреплённых сообщений</small></div><button type="button" data-workspace15-pin-close>×</button></header>
            <div class="workspace15-pin-title-body">
              <label><span>Заголовок</span><input id="workspace15PinTitleInput" type="text" maxlength="180" autocomplete="off" placeholder="Например: Важная информация"></label>
              <small><b id="workspace15PinTitleCount">0</b>/180</small>
            </div>
            <footer><button type="button" data-workspace15-pin-close>Отмена</button><button id="workspace15PinTitleApply" type="button" class="primary">Сохранить</button></footer>
          </section>
        </div>`);

      const cropModal = byId('workspace15CropModal');
      cropModal?.addEventListener('click', (event) => {
        if (event.target === cropModal || event.target.closest('[data-workspace15-crop-close]')) closeCrop(null);
      });
      byId('workspace15CropApply')?.addEventListener('click', applyCrop);
      byId('workspace15CropZoom')?.addEventListener('input', (event) => {
        if (!rt.crop) return;
        rt.crop.zoom = Math.max(1, Number(event.target.value || 100) / 100);
        clampCrop();
        renderCrop();
      });
      const viewport = byId('workspace15CropViewport');
      viewport?.addEventListener('pointerdown', cropPointerDown);
      viewport?.addEventListener('pointermove', cropPointerMove);
      viewport?.addEventListener('pointerup', cropPointerUp);
      viewport?.addEventListener('pointercancel', cropPointerUp);

      const pinModal = byId('workspace15PinTitleModal');
      pinModal?.addEventListener('click', (event) => {
        if (event.target === pinModal || event.target.closest('[data-workspace15-pin-close]')) closePinTitle(null);
      });
      byId('workspace15PinTitleApply')?.addEventListener('click', () => {
        const input = byId('workspace15PinTitleInput');
        closePinTitle(String(input?.value || '').trim());
      });
      byId('workspace15PinTitleInput')?.addEventListener('input', (event) => {
        const count = byId('workspace15PinTitleCount');
        if (count) count.textContent = String(event.target.value.length);
      });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !byId('workspace15CropModal')?.classList.contains('hidden')) closeCrop(null);
        if (event.key === 'Escape' && !byId('workspace15PinTitleModal')?.classList.contains('hidden')) closePinTitle(null);
        if (event.key === 'Enter' && !byId('workspace15PinTitleModal')?.classList.contains('hidden') && event.target === byId('workspace15PinTitleInput')) {
          event.preventDefault();
          byId('workspace15PinTitleApply')?.click();
        }
      });
    }
  }

  function revokeCropUrl() {
    if (rt.cropObjectUrl) URL.revokeObjectURL(rt.cropObjectUrl);
    rt.cropObjectUrl = null;
  }

  function cropMetrics() {
    const viewport = byId('workspace15CropViewport');
    const size = Math.max(220, Math.round(viewport?.clientWidth || 320));
    const image = rt.crop?.image;
    if (!image) return { size, base: 1, width: size, height: size };
    const base = Math.max(size / image.naturalWidth, size / image.naturalHeight);
    const scale = base * rt.crop.zoom;
    return { size, base, width: image.naturalWidth * scale, height: image.naturalHeight * scale };
  }

  function clampCrop() {
    if (!rt.crop) return;
    const metrics = cropMetrics();
    const maxX = Math.max(0, (metrics.width - metrics.size) / 2);
    const maxY = Math.max(0, (metrics.height - metrics.size) / 2);
    rt.crop.x = Math.max(-maxX, Math.min(maxX, rt.crop.x));
    rt.crop.y = Math.max(-maxY, Math.min(maxY, rt.crop.y));
  }

  function renderCrop() {
    if (!rt.crop) return;
    const img = byId('workspace15CropImage');
    if (!img) return;
    const metrics = cropMetrics();
    img.style.width = `${metrics.width}px`;
    img.style.height = `${metrics.height}px`;
    img.style.left = `${metrics.size / 2 - metrics.width / 2 + rt.crop.x}px`;
    img.style.top = `${metrics.size / 2 - metrics.height / 2 + rt.crop.y}px`;
  }

  function cropPointerDown(event) {
    if (!rt.crop) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    rt.cropPointer = { id: event.pointerId, startX: event.clientX, startY: event.clientY, x: rt.crop.x, y: rt.crop.y };
  }

  function cropPointerMove(event) {
    if (!rt.crop || !rt.cropPointer || rt.cropPointer.id !== event.pointerId) return;
    event.preventDefault();
    rt.crop.x = rt.cropPointer.x + event.clientX - rt.cropPointer.startX;
    rt.crop.y = rt.cropPointer.y + event.clientY - rt.cropPointer.startY;
    clampCrop();
    renderCrop();
  }

  function cropPointerUp(event) {
    if (rt.cropPointer?.id !== event.pointerId) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    rt.cropPointer = null;
  }

  function closeCrop(result) {
    byId('workspace15CropModal')?.classList.add('hidden');
    rt.cropPointer = null;
    rt.crop = null;
    revokeCropUrl();
    const resolve = rt.cropResolve;
    rt.cropResolve = null;
    if (resolve) resolve(result);
  }

  async function openCrop(file) {
    injectUi();
    if (!(file instanceof Blob)) return file;
    return new Promise((resolve, reject) => {
      revokeCropUrl();
      rt.cropResolve = resolve;
      rt.cropObjectUrl = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        rt.crop = { file, image, zoom: 1, x: 0, y: 0 };
        const img = byId('workspace15CropImage');
        img.src = rt.cropObjectUrl;
        byId('workspace15CropZoom').value = '100';
        byId('workspace15CropModal').classList.remove('hidden');
        requestAnimationFrame(() => {
          clampCrop();
          renderCrop();
        });
      };
      image.onerror = () => {
        revokeCropUrl();
        rt.cropResolve = null;
        reject(new Error('Не удалось открыть изображение'));
      };
      image.src = rt.cropObjectUrl;
    });
  }

  async function applyCrop() {
    if (!rt.crop) return;
    const apply = byId('workspace15CropApply');
    apply.disabled = true;
    apply.textContent = 'Готовим…';
    try {
      const metrics = cropMetrics();
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 640;
      const ratio = canvas.width / metrics.size;
      const left = metrics.size / 2 - metrics.width / 2 + rt.crop.x;
      const top = metrics.size / 2 - metrics.height / 2 + rt.crop.y;
      const context = canvas.getContext('2d', { alpha: false });
      context.fillStyle = '#111821';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(rt.crop.image, left * ratio, top * ratio, metrics.width * ratio, metrics.height * ratio);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      if (!blob) throw new Error('Не удалось подготовить аватарку');
      const originalName = String(rt.crop.file?.name || 'avatar.jpg').replace(/\.[^.]+$/, '');
      const result = new File([blob], `${originalName}-avatar.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
      closeCrop(result);
    } catch (error) {
      notice(error?.message || 'Не удалось обработать аватарку', true);
    } finally {
      apply.disabled = false;
      apply.textContent = 'Применить';
    }
  }

  function openPinTitle(initialValue = '') {
    injectUi();
    if (rt.pinResolve) closePinTitle(null);
    return new Promise((resolve) => {
      rt.pinResolve = resolve;
      const value = cleanMarkdown(initialValue).slice(0, 180);
      const input = byId('workspace15PinTitleInput');
      input.value = value;
      byId('workspace15PinTitleCount').textContent = String(value.length);
      byId('workspace15PinTitleModal').classList.remove('hidden');
      requestAnimationFrame(() => {
        input.focus();
        input.select();
      });
    });
  }

  function closePinTitle(result) {
    byId('workspace15PinTitleModal')?.classList.add('hidden');
    const resolve = rt.pinResolve;
    rt.pinResolve = null;
    if (resolve) resolve(result);
  }

  function renderManagedDescription(description) {
    const target = byId('communityManageDescription');
    if (!target) return;
    const raw = String(description ?? '');
    if (target.dataset.workspace15Raw === raw && target.classList.contains('workspace15-rich-description')) return;
    target.dataset.workspace15Raw = raw;
    target.classList.add('workspace15-rich-description');
    target.innerHTML = raw ? markdownToHtml(raw) : '<span class="workspace15-empty-description">Описание не заполнено</span>';
  }

  function currentManagedDescription(info = null) {
    if (info && Object.prototype.hasOwnProperty.call(info, 'description')) return info.description || '';
    try {
      if (window.state?.managedCommunityInfo && Object.prototype.hasOwnProperty.call(state.managedCommunityInfo, 'description')) return state.managedCommunityInfo.description || '';
      if (window.state?.managedCommunity && Object.prototype.hasOwnProperty.call(state.managedCommunity, 'description')) return state.managedCommunity.description || '';
    } catch {}
    return null;
  }

  function wrapCommunityInfo() {
    if (rt.communityInfoWrapped || typeof applyCommunityInfo !== 'function') return;
    rt.communityInfoWrapped = true;
    const base = applyCommunityInfo;
    applyCommunityInfo = function workspace15ApplyCommunityInfo(info) {
      const result = base.apply(this, arguments);
      queueMicrotask(() => renderManagedDescription(currentManagedDescription(info)));
      return result;
    };
  }

  function bindSocket() {
    if (rt.socketBound || typeof socket === 'undefined' || !socket?.on) return;
    rt.socketBound = true;
    socket.on('workspace.chat-profile.changed', (payload) => {
      try {
        if (payload?.chatId === window.state?.managedCommunity?.id && payload?.profile) {
          renderManagedDescription(payload.profile.description || '');
        }
      } catch {}
    });
  }

  function ensureDescriptionEditors() {
    try { window.MeetusWorkspace5?.ensureRichEditors?.(); } catch {}
    const profileEditor = byId('workspace13Description')?.previousElementSibling;
    if (profileEditor?.classList.contains('workspace5-rich-editor')) profileEditor.dataset.placeholder = 'Расскажите о канале или группе';
    const createEditor = byId('communityDescriptionInput')?.previousElementSibling;
    if (createEditor?.classList.contains('workspace5-rich-editor')) createEditor.dataset.placeholder = 'Описание канала или группы';
  }

  function fixPinUi() {
    document.querySelectorAll('.workspace13-pin-open strong,.workspace13-pin-open small,#workspacePinnedText').forEach((node) => {
      const clean = cleanMarkdown(node.textContent || '');
      if (clean && node.textContent !== clean) node.textContent = clean;
    });
  }

  function install() {
    if (rt.installed) return;
    rt.installed = true;
    document.documentElement.dataset.meetusWorkspace15 = '1';
    injectUi();
    wrapCommunityInfo();
    bindSocket();
    ensureDescriptionEditors();
    const description = currentManagedDescription();
    if (description !== null) renderManagedDescription(description);
    fixPinUi();

    const observer = new MutationObserver(() => {
      ensureDescriptionEditors();
      const value = currentManagedDescription();
      if (value !== null) renderManagedDescription(value);
      fixPinUi();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    window.setInterval(() => {
      wrapCommunityInfo();
      bindSocket();
      ensureDescriptionEditors();
      const value = currentManagedDescription();
      if (value !== null) renderManagedDescription(value);
      fixPinUi();
    }, 900);
  }

  window.meetusWorkspace15CropAvatar = openCrop;
  window.meetusWorkspace15PromptPinTitle = openPinTitle;
  window.meetusWorkspace15CleanText = cleanMarkdown;
  window.meetusWorkspace15Version = VERSION;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
