/* MEETUS 0.6.25.2 COMMUNITY2-TG11-WORKSPACE10 — mobile pinned banner at top, exact compact media bubbles */
(() => {
  'use strict';

  const VERSION = '0.6.25.2-community2tg11workspace10';
  const runtime = {
    installed: false,
    observer: null,
    layoutFrame: 0,
    mediaFrame: 0,
  };

  const byId = (id) => document.getElementById(id);
  const isMobile = () => window.matchMedia('(max-width: 700px)').matches;

  function schedulePinnedLayout() {
    cancelAnimationFrame(runtime.layoutFrame);
    runtime.layoutFrame = requestAnimationFrame(layoutPinnedBanner);
  }

  function layoutPinnedBanner() {
    const banner = byId('workspacePinnedBanner');
    const pane = byId('chatPane');
    const header = pane?.querySelector(':scope > .chat-header') || document.querySelector('.chat-header');
    const messageArea = byId('messageArea');
    if (!banner || !pane || !header || !messageArea) return;

    const visible = !banner.classList.contains('hidden');
    pane.classList.toggle('workspace10-has-mobile-pin', isMobile() && visible);

    if (!isMobile()) {
      banner.classList.remove('workspace10-mobile-pin');
      banner.style.removeProperty('--workspace10-pin-top');
      if (header.nextElementSibling !== banner) header.insertAdjacentElement('afterend', banner);
      return;
    }

    // Keep the banner in the chat pane, but position it independently of the pane grid.
    if (banner.parentElement !== pane) pane.appendChild(banner);
    banner.classList.add('workspace10-mobile-pin');
    const paneRect = pane.getBoundingClientRect();
    const headerRect = header.getBoundingClientRect();
    const top = Math.max(0, Math.round(headerRect.bottom - paneRect.top));
    banner.style.setProperty('--workspace10-pin-top', `${top}px`);
  }

  function intrinsicRatio(media) {
    if (media instanceof HTMLVideoElement) {
      return media.videoWidth > 0 && media.videoHeight > 0 ? media.videoWidth / media.videoHeight : 0;
    }
    if (media instanceof HTMLImageElement) {
      return media.naturalWidth > 0 && media.naturalHeight > 0 ? media.naturalWidth / media.naturalHeight : 0;
    }
    return 0;
  }

  function mediaWidthExpression(ratio) {
    if (ratio > 1.28) return 'min(520px, 82vw)';
    if (ratio < 0.82) return 'min(310px, 72vw)';
    return 'min(410px, 78vw)';
  }

  function fitMediaBubble(bubble) {
    if (!(bubble instanceof HTMLElement)) return;
    const button = bubble.querySelector('.media-video-button, .media-image-button');
    const media = bubble.querySelector('.message-video-preview, .message-image');
    if (!button || !media) return;

    const ratio = intrinsicRatio(media);
    if (!ratio) return;

    const safeRatio = Math.max(0.42, Math.min(2.4, ratio));
    bubble.style.setProperty('--workspace10-media-ratio', String(safeRatio));
    bubble.style.setProperty('--workspace10-media-width', mediaWidthExpression(safeRatio));
    bubble.dataset.workspace10MediaFit = '1';

    button.style.setProperty('aspect-ratio', String(safeRatio), 'important');
    if (media instanceof HTMLVideoElement) {
      media.style.setProperty('object-fit', 'cover', 'important');
      media.style.setProperty('background', 'transparent', 'important');
    }
  }

  function scanMedia(root = document) {
    if (root instanceof Element && root.matches('.message-bubble.visual-media-bubble')) fitMediaBubble(root);
    root.querySelectorAll?.('.message-bubble.visual-media-bubble').forEach(fitMediaBubble);
  }

  function scheduleMediaScan(root = document) {
    cancelAnimationFrame(runtime.mediaFrame);
    runtime.mediaFrame = requestAnimationFrame(() => scanMedia(root));
  }

  function installObserver() {
    if (runtime.observer) return;
    runtime.observer = new MutationObserver((records) => {
      let needsPin = false;
      for (const record of records) {
        if (record.type === 'attributes' && record.target.id === 'workspacePinnedBanner') needsPin = true;
        record.addedNodes?.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (node.id === 'workspacePinnedBanner' || node.querySelector?.('#workspacePinnedBanner')) needsPin = true;
          scanMedia(node);
        });
      }
      if (needsPin) schedulePinnedLayout();
    });
    runtime.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });
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
    window.addEventListener('resize', schedulePinnedLayout, { passive: true });
    window.addEventListener('orientationchange', schedulePinnedLayout, { passive: true });
    window.visualViewport?.addEventListener('resize', schedulePinnedLayout, { passive: true });
  }

  function install() {
    if (runtime.installed) return;
    runtime.installed = true;
    document.documentElement.dataset.meetusWorkspace10 = '1';
    installEvents();
    installObserver();
    schedulePinnedLayout();
    scheduleMediaScan();
    setTimeout(schedulePinnedLayout, 300);
    setTimeout(() => scheduleMediaScan(), 500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();

  window.meetusWorkspace10Version = VERSION;
})();
