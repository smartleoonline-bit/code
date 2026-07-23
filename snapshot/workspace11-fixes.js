/* MEETUS 0.6.25.2 COMMUNITY2-TG11-WORKSPACE11 — intrinsic media bubbles and polished motion */
(() => {
  'use strict';

  const VERSION = '0.6.25.2-community2tg11workspace11';
  const runtime = {
    installed: false,
    observer: null,
    resizeFrame: 0,
    scanFrame: 0,
    observerFrame: 0,
    pendingRoots: new Set(),
    pendingRows: new Set(),
    pendingChats: new Set(),
  };

  const isMobile = () => window.matchMedia('(max-width: 700px)').matches;

  function intrinsicRatio(media, bubble) {
    if (media instanceof HTMLVideoElement && media.videoWidth > 0 && media.videoHeight > 0) {
      return media.videoWidth / media.videoHeight;
    }
    if (media instanceof HTMLImageElement && media.naturalWidth > 0 && media.naturalHeight > 0) {
      return media.naturalWidth / media.naturalHeight;
    }

    const declared = getComputedStyle(bubble).getPropertyValue('--workspace8-media-ratio').trim();
    const parsed = Number.parseFloat(declared);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;

    const button = bubble.querySelector('.media-video-button, .media-image-button');
    const styleRatio = getComputedStyle(button || bubble).aspectRatio;
    if (styleRatio && styleRatio !== 'auto') {
      const parts = styleRatio.split('/').map((part) => Number.parseFloat(part));
      const ratio = parts.length === 2 && parts[1] ? parts[0] / parts[1] : parts[0];
      if (Number.isFinite(ratio) && ratio > 0) return ratio;
    }

    return media instanceof HTMLVideoElement ? 16 / 10 : 1;
  }

  function contentWidthFor(bubble) {
    const area = bubble.closest('#messageArea, .message-area, .thread-message-list, .community2-thread-list')
      || document.getElementById('messageArea');
    const measured = area?.getBoundingClientRect().width || document.documentElement.clientWidth || window.innerWidth;
    return Math.max(240, measured);
  }

  function desiredWidth(ratio, available) {
    const room = Math.max(190, available - (isMobile() ? 14 : 34));
    let width;

    if (isMobile()) {
      if (ratio < 0.82) width = Math.min(350, room * 0.76);
      else if (ratio > 1.28) width = Math.min(560, room * 0.94);
      else width = Math.min(440, room * 0.86);
    } else {
      if (ratio < 0.82) width = Math.min(340, room * 0.42);
      else if (ratio > 1.28) width = Math.min(540, room * 0.62);
      else width = Math.min(430, room * 0.50);
    }

    return Math.max(190, Math.min(room, Math.round(width)));
  }

  function fitMediaBubble(bubble) {
    if (!(bubble instanceof HTMLElement)) return;
    const button = bubble.querySelector(':scope > .media-video-button, :scope > .media-image-button')
      || bubble.querySelector('.media-video-button, .media-image-button');
    const media = button?.querySelector('.message-video-preview, .message-image')
      || bubble.querySelector('.message-video-preview, .message-image');
    if (!(button instanceof HTMLElement) || !media) return;

    const rawRatio = intrinsicRatio(media, bubble);
    const ratio = Math.max(0.48, Math.min(2.35, rawRatio));
    const width = desiredWidth(ratio, contentWidthFor(bubble));

    bubble.dataset.workspace11MediaFit = '1';
    bubble.style.setProperty('--workspace11-media-width', `${width}px`);
    bubble.style.setProperty('--workspace11-media-ratio', String(ratio));
    bubble.style.setProperty('height', 'auto', 'important');
    bubble.style.setProperty('min-height', '0', 'important');
    bubble.style.setProperty('max-height', 'none', 'important');
    bubble.style.setProperty('aspect-ratio', 'auto', 'important');

    button.style.setProperty('width', `${width}px`, 'important');
    button.style.setProperty('inline-size', `${width}px`, 'important');
    button.style.setProperty('height', 'auto', 'important');
    button.style.setProperty('min-height', '0', 'important');
    button.style.setProperty('max-height', 'none', 'important');
    button.style.setProperty('aspect-ratio', String(ratio), 'important');

    media.style.setProperty('width', '100%', 'important');
    media.style.setProperty('height', '100%', 'important');
    media.style.setProperty('min-height', '0', 'important');
    media.style.setProperty('max-height', 'none', 'important');
    media.style.setProperty('object-fit', 'cover', 'important');
  }

  function scanMedia(root = document) {
    if (root instanceof Element && root.matches('.message-bubble.visual-media-bubble')) fitMediaBubble(root);
    root.querySelectorAll?.('.message-bubble.visual-media-bubble').forEach(fitMediaBubble);
  }

  function scheduleFullScan() {
    cancelAnimationFrame(runtime.scanFrame);
    runtime.scanFrame = requestAnimationFrame(() => scanMedia(document));
  }

  function collectAddedElement(element) {
    if (!(element instanceof Element)) return;
    runtime.pendingRoots.add(element);

    if (element.matches('.message-row')) runtime.pendingRows.add(element);
    element.querySelectorAll?.('.message-row').forEach((row) => runtime.pendingRows.add(row));

    if (element.matches('.chat-item')) runtime.pendingChats.add(element);
    element.querySelectorAll?.('.chat-item').forEach((item) => runtime.pendingChats.add(item));
  }

  function animateSmallBatch(elements, className, timeout, maxAnimated) {
    const list = [...elements].filter((element) => element?.isConnected);
    elements.clear();
    list.forEach((element) => { element.dataset.workspace11Seen = '1'; });
    if (list.length > maxAnimated) return;
    list.forEach((element) => {
      element.classList.add(className);
      window.setTimeout(() => element.classList.remove(className), timeout);
    });
  }

  function flushObserverQueue() {
    runtime.observerFrame = 0;
    const roots = [...runtime.pendingRoots];
    runtime.pendingRoots.clear();
    roots.forEach((root) => scanMedia(root));
    animateSmallBatch(runtime.pendingRows, 'workspace11-entering', 260, 3);
    animateSmallBatch(runtime.pendingChats, 'workspace11-entering-chat', 240, 2);
  }

  function scheduleObserverFlush() {
    if (runtime.observerFrame) return;
    runtime.observerFrame = requestAnimationFrame(flushObserverQueue);
  }

  function installObserver() {
    if (runtime.observer) return;
    runtime.observer = new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => {
          if (node instanceof Element) collectAddedElement(node);
        });
      });
      scheduleObserverFlush();
    });
    runtime.observer.observe(document.body, { childList: true, subtree: true });
  }

  function scheduleResize() {
    cancelAnimationFrame(runtime.resizeFrame);
    runtime.resizeFrame = requestAnimationFrame(scheduleFullScan);
  }

  function installEvents() {
    document.addEventListener('loadedmetadata', (event) => {
      const media = event.target;
      if (!(media instanceof HTMLVideoElement)) return;
      const bubble = media.closest('.message-bubble.visual-media-bubble');
      if (bubble) fitMediaBubble(bubble);
    }, true);

    document.addEventListener('load', (event) => {
      const media = event.target;
      if (!(media instanceof HTMLImageElement)) return;
      const bubble = media.closest('.message-bubble.visual-media-bubble');
      if (bubble) fitMediaBubble(bubble);
    }, true);

    window.addEventListener('resize', scheduleResize, { passive: true });
    window.addEventListener('orientationchange', scheduleResize, { passive: true });
    window.visualViewport?.addEventListener('resize', scheduleResize, { passive: true });
  }

  function markExistingAsSeen() {
    document.querySelectorAll('.message-row, .chat-item').forEach((element) => {
      element.dataset.workspace11Seen = '1';
    });
  }

  function install() {
    if (runtime.installed) return;
    runtime.installed = true;
    document.documentElement.dataset.meetusWorkspace11 = '1';
    markExistingAsSeen();
    installEvents();
    installObserver();
    scheduleFullScan();
    setTimeout(scheduleFullScan, 350);
    setTimeout(scheduleFullScan, 1000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();

  window.meetusWorkspace11Version = VERSION;
})();
