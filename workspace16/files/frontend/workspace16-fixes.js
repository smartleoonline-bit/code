(() => {
  'use strict';

  const VERSION = '0.6.25.2-community2tg11workspace16';
  const state = {
    lastProfileDraft: null,
    lastCommunityPanel: null,
    videoEditorExpectedUntil: 0,
    observerQueued: false,
  };

  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  const visible = (el) => !!(el && el.isConnected && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));
  const textOf = (el) => normalize(el && el.textContent);
  const escapeHtml = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  function renderRichText(raw) {
    let html = escapeHtml(raw || '');
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_self" rel="noopener">$1</a>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__([^_]+)__/g, '<u>$1</u>');
    html = html.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
    html = html.replace(/\n/g, '<br>');
    return html;
  }

  function getCurrentChatId() {
    const hash = new URLSearchParams(String(location.hash || '').replace(/^#/, ''));
    if (hash.get('chat')) return hash.get('chat');
    try {
      const s = window.state || window.appState || window.__state;
      return s?.currentChat?.id || s?.activeChat?.id || s?.selectedChatId || null;
    } catch (_) {
      return null;
    }
  }

  function findPanelHeading(root = document) {
    return $$('h1,h2,h3,[class*="title"],[class*="header"]', root)
      .find((el) => /Информация о (канале|группе)/i.test(textOf(el)) && visible(el));
  }

  function findCommunityPanel() {
    const heading = findPanelHeading();
    if (!heading) return state.lastCommunityPanel && visible(state.lastCommunityPanel) ? state.lastCommunityPanel : null;
    let node = heading;
    let best = null;
    while (node && node !== document.body) {
      const rect = node.getBoundingClientRect();
      if (rect.width >= 300 && rect.height >= 350) best = node;
      if (node.matches?.('aside,[role="dialog"],[class*="drawer"],[class*="sidebar"],[class*="info-panel"],[class*="modal"]')) {
        best = node;
        break;
      }
      node = node.parentElement;
    }
    if (best) state.lastCommunityPanel = best;
    return best;
  }

  function findEditModal(from) {
    let node = from;
    while (node && node !== document.body) {
      const t = textOf(node);
      if (/Редактировать (канал|группу)/i.test(t) && /Сохранить/i.test(t)) return node;
      if (node.matches?.('[role="dialog"],[class*="modal"],[class*="dialog"]') && /Сохранить/i.test(t)) return node;
      node = node.parentElement;
    }
    return null;
  }

  function extractDescription(modal) {
    if (!modal) return { plain: '', html: '' };
    const editable = modal.querySelector(
      '[data-description-editor],[data-rich-editor],.ws15-description-editor,.ws15-rich-editor,.rich-description-editor,[contenteditable="true"],textarea[name*="description" i],textarea'
    );
    if (!editable) return { plain: '', html: '' };
    if (editable.matches('textarea,input')) {
      return { plain: editable.value || '', html: renderRichText(editable.value || '') };
    }
    return {
      plain: normalize(editable.innerText || editable.textContent || ''),
      html: editable.innerHTML || renderRichText(editable.innerText || ''),
    };
  }

  function extractAvatar(modal) {
    if (!modal) return '';
    const candidates = $$('img', modal).filter((img) => {
      const src = img.currentSrc || img.src || '';
      if (!src) return false;
      const r = img.getBoundingClientRect();
      return r.width >= 48 && r.height >= 48;
    });
    candidates.sort((a, b) => {
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      const as = /^(blob:|data:)/.test(a.src || '') ? 1000000 : 0;
      const bs = /^(blob:|data:)/.test(b.src || '') ? 1000000 : 0;
      return (bs + br.width * br.height) - (as + ar.width * ar.height);
    });
    return candidates[0]?.currentSrc || candidates[0]?.src || '';
  }

  function findPanelDescription(panel) {
    if (!panel) return null;
    const known = panel.querySelector(
      '[data-community-description],[data-chat-description],.community-description,.chat-info-description,.workspace-community-description,.ws15-community-description,.ws16-live-description'
    );
    if (known) return known;

    const owner = $$('*', panel).find((el) => visible(el) && /^(Вы владелец|Вы администратор)$/i.test(textOf(el)));
    if (!owner) return null;
    const excluded = /^(Информация о|Связанное сообщество|\d+ участников?|канал|группа|Вы владелец|Вы администратор)$/i;
    const candidates = $$('p,div,span', panel)
      .filter((el) => visible(el) && el.children.length <= 3)
      .filter((el) => {
        const t = textOf(el);
        return t.length > 0 && t.length < 5000 && !excluded.test(t) && !/Изменить аватар/i.test(t);
      })
      .filter((el) => {
        const er = el.getBoundingClientRect();
        const or = owner.getBoundingClientRect();
        return er.bottom <= or.top + 8 && er.top > panel.getBoundingClientRect().top + 100;
      });
    return candidates[candidates.length - 1] || null;
  }

  function updateStateObjects(payload) {
    const chatId = getCurrentChatId();
    const roots = [window.state, window.appState, window.__state].filter(Boolean);
    const seen = new WeakSet();
    const walk = (obj, depth = 0) => {
      if (!obj || typeof obj !== 'object' || seen.has(obj) || depth > 5) return;
      seen.add(obj);
      if ((!chatId || String(obj.id || obj.chatId || '') === String(chatId))) {
        if (payload.plain !== undefined && ('description' in obj || 'about' in obj)) {
          if ('description' in obj) obj.description = payload.plain;
          if ('about' in obj) obj.about = payload.plain;
        }
        if (payload.avatar && ('avatarUrl' in obj || 'avatar' in obj || 'photoUrl' in obj)) {
          if ('avatarUrl' in obj) obj.avatarUrl = payload.avatar;
          if ('avatar' in obj) obj.avatar = payload.avatar;
          if ('photoUrl' in obj) obj.photoUrl = payload.avatar;
        }
      }
      Object.values(obj).forEach((value) => {
        if (value && typeof value === 'object') walk(value, depth + 1);
      });
    };
    roots.forEach((root) => walk(root));
  }

  function updateAvatarEverywhere(oldSrc, newSrc) {
    if (!newSrc) return;
    $$('img').forEach((img) => {
      const src = img.currentSrc || img.src || '';
      const inCommunityUi = !!img.closest('[class*="community"],[class*="chat-info"],[class*="drawer"],[class*="chat-header"],[class*="chat-item"],[role="dialog"]');
      if ((oldSrc && src === oldSrc) || (inCommunityUi && img.dataset.ws16CommunityAvatar === '1')) {
        img.src = newSrc;
      }
    });
    $$('[style*="background-image"]').forEach((el) => {
      const style = el.style.backgroundImage || '';
      if (oldSrc && style.includes(oldSrc)) el.style.backgroundImage = `url("${newSrc}")`;
    });
  }

  function applyProfileImmediately(draft) {
    if (!draft) return;
    const panel = findCommunityPanel();
    if (panel && draft.plain !== undefined) {
      let target = findPanelDescription(panel);
      if (!target) {
        const owner = $$('*', panel).find((el) => visible(el) && /^(Вы владелец|Вы администратор)$/i.test(textOf(el)));
        if (owner) {
          target = document.createElement('div');
          target.className = 'ws16-live-description';
          owner.parentElement?.insertBefore(target, owner);
        }
      }
      if (target) {
        target.classList.add('ws16-live-description');
        target.innerHTML = draft.html || renderRichText(draft.plain || '');
        target.hidden = false;
      }
    }
    updateAvatarEverywhere(draft.oldAvatar, draft.avatar);
    updateStateObjects(draft);
    const detail = {
      chatId: getCurrentChatId(),
      description: draft.plain,
      descriptionHtml: draft.html,
      avatarUrl: draft.avatar || null,
      version: VERSION,
    };
    ['meetus:community-profile-updated', 'community-profile-updated', 'chat:updated']
      .forEach((name) => {
        window.dispatchEvent(new CustomEvent(name, { detail }));
        document.dispatchEvent(new CustomEvent(name, { detail }));
      });
  }

  function captureExistingProfile(panel) {
    if (!panel) return;
    const desc = findPanelDescription(panel);
    const avatar = $$('img', panel)
      .filter((img) => img.getBoundingClientRect().width >= 70)
      .sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0];
    state.lastProfileDraft = {
      plain: textOf(desc),
      html: desc?.innerHTML || '',
      oldAvatar: avatar?.currentSrc || avatar?.src || '',
      avatar: '',
    };
  }

  function handleSaveClick(button) {
    const modal = findEditModal(button);
    if (!modal) return;
    const description = extractDescription(modal);
    const avatar = extractAvatar(modal);
    const previous = state.lastProfileDraft || {};
    const draft = {
      plain: description.plain,
      html: description.html || renderRichText(description.plain),
      avatar,
      oldAvatar: previous.oldAvatar || '',
    };
    state.lastProfileDraft = draft;
    [80, 250, 600, 1200, 2200].forEach((delay) => setTimeout(() => applyProfileImmediately(draft), delay));
  }

  function requestBodyPayload(input, init) {
    try {
      const body = init?.body;
      if (!body) return null;
      if (typeof body === 'string') return JSON.parse(body);
      if (body instanceof FormData) {
        const value = {};
        body.forEach((v, k) => {
          if (typeof v === 'string') value[k] = v;
        });
        return value;
      }
    } catch (_) {}
    return null;
  }

  if (!window.__ws16FetchWrapped && typeof window.fetch === 'function') {
    window.__ws16FetchWrapped = true;
    const originalFetch = window.fetch.bind(window);
    window.fetch = async function ws16Fetch(input, init = {}) {
      const url = typeof input === 'string' ? input : input?.url || '';
      const method = String(init?.method || (typeof input !== 'string' && input?.method) || 'GET').toUpperCase();
      const payload = requestBodyPayload(input, init);
      const response = await originalFetch(input, init);
      if (response.ok && method !== 'GET' && /\/api\/(chats|workspace)\//i.test(url)) {
        const containsProfile = payload && Object.keys(payload).some((key) => /description|about|avatar|photo/i.test(key));
        if (containsProfile) {
          const draft = {
            plain: payload.description ?? payload.about ?? state.lastProfileDraft?.plain ?? '',
            html: state.lastProfileDraft?.html || renderRichText(payload.description ?? payload.about ?? ''),
            avatar: state.lastProfileDraft?.avatar || '',
            oldAvatar: state.lastProfileDraft?.oldAvatar || '',
          };
          [0, 180, 600].forEach((delay) => setTimeout(() => applyProfileImmediately(draft), delay));
        }
      }
      return response;
    };
  }

  function fixAvatarPencil(root = document) {
    const panel = findCommunityPanel();
    const scopes = [panel, ...$$('[role="dialog"],[class*="modal"]', root)].filter(Boolean);
    scopes.forEach((scope) => {
      const avatars = $$('[class*="avatar"],img', scope).filter((el) => {
        const r = el.getBoundingClientRect();
        return visible(el) && r.width >= 70 && r.height >= 70 && Math.abs(r.width - r.height) < Math.max(30, r.width * 0.35);
      });
      avatars.forEach((avatar) => {
        const holder = avatar.matches('img') ? avatar.parentElement : avatar;
        if (!holder) return;
        const hr = holder.getBoundingClientRect();
        const buttons = $$('button,[role="button"]', scope).filter((button) => {
          const br = button.getBoundingClientRect();
          const label = `${button.getAttribute('aria-label') || ''} ${button.title || ''} ${textOf(button)}`;
          const near = br.left < hr.right + 45 && br.right > hr.left - 20 && br.top < hr.bottom + 45 && br.bottom > hr.top - 20;
          const editLike = /аватар|изменить|редакт|edit/i.test(label) || !!button.querySelector('svg,path');
          return visible(button) && near && editLike && br.width <= 70 && br.height <= 70;
        });
        if (!buttons.length) return;
        const button = buttons.sort((a, b) => {
          const ar = a.getBoundingClientRect();
          const br = b.getBoundingClientRect();
          const ad = Math.abs(ar.right - hr.right) + Math.abs(ar.bottom - hr.bottom);
          const bd = Math.abs(br.right - hr.right) + Math.abs(br.bottom - hr.bottom);
          return ad - bd;
        })[0];
        holder.classList.add('ws16-avatar-holder');
        button.classList.add('ws16-avatar-pencil');
        if (button.parentElement !== holder && holder.contains(button) === false) {
          const currentParent = button.parentElement;
          if (currentParent && currentParent.getBoundingClientRect().width <= hr.width * 1.8) currentParent.classList.add('ws16-avatar-button-layer');
        }
      });
    });
  }

  function isVideoFileInput(input) {
    const files = Array.from(input?.files || []);
    return files.some((file) => /^video\//i.test(file.type) || /\.(mp4|mov|m4v|webm|avi|mkv)$/i.test(file.name));
  }

  function findEditorRoots() {
    const candidates = $$('[role="dialog"],[class*="editor"],[class*="modal"],body > div');
    return candidates.filter((root) => {
      if (!visible(root)) return false;
      const t = textOf(root);
      const hasDone = /Готово|Отправить/i.test(t);
      const hasEditor = /Редактор (изображения|видео)|Рисовать|Замазка|Стикер|Повернуть|Качество/i.test(t);
      const hasMedia = !!root.querySelector('video,canvas,img');
      return hasDone && hasEditor && hasMedia;
    });
  }

  function qualityLabel(value) {
    return ({ auto: 'Авто', low: '480p', medium: '720p', high: '1080p', original: 'Оригинал' })[value] || 'Авто';
  }

  function applyQualityChoice(root, value) {
    localStorage.setItem('meetus_video_upload_quality', value);
    window.__meetusVideoUploadQuality = value;
    const possible = $$('select,input[type="radio"],input[type="range"]', root);
    possible.forEach((control) => {
      if (control.matches('select')) {
        const option = Array.from(control.options || []).find((o) => {
          const t = normalize(`${o.value} ${o.textContent}`).toLowerCase();
          if (value === 'auto') return /auto|авто/.test(t);
          if (value === 'low') return /480|low|эконом/.test(t);
          if (value === 'medium') return /720|medium|hd/.test(t);
          if (value === 'high') return /1080|high|full/.test(t);
          return /original|оригинал/.test(t);
        });
        if (option) {
          control.value = option.value;
          control.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    });
    root.querySelectorAll('.ws16-video-quality-option').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.quality === value);
    });
    window.dispatchEvent(new CustomEvent('meetus:video-quality-selected', { detail: { quality: value, label: qualityLabel(value) } }));
  }

  function buildQualityOnlyUi(root) {
    if (root.querySelector('.ws16-video-quality-panel')) return;
    const panel = document.createElement('div');
    panel.className = 'ws16-video-quality-panel';
    panel.innerHTML = `
      <div class="ws16-video-quality-title">Качество видео</div>
      <div class="ws16-video-quality-options">
        <button type="button" class="ws16-video-quality-option" data-quality="auto">Авто</button>
        <button type="button" class="ws16-video-quality-option" data-quality="low">480p</button>
        <button type="button" class="ws16-video-quality-option" data-quality="medium">720p</button>
        <button type="button" class="ws16-video-quality-option" data-quality="original">Оригинал</button>
      </div>`;
    panel.addEventListener('click', (event) => {
      const button = event.target.closest('.ws16-video-quality-option');
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      applyQualityChoice(root, button.dataset.quality || 'auto');
    });
    root.appendChild(panel);
    applyQualityChoice(root, localStorage.getItem('meetus_video_upload_quality') || 'auto');
  }

  function simplifyVideoEditor(root) {
    if (!root || root.classList.contains('ws16-video-quality-only')) return;
    const text = textOf(root);
    const hasVideo = !!root.querySelector('video') || /\.(mp4|mov|m4v|webm|avi|mkv)\b/i.test(text) || Date.now() < state.videoEditorExpectedUntil;
    if (!hasVideo) return;
    root.classList.add('ws16-video-quality-only');
    const hideWords = /Рисовать|Замазка|Текст|Стикер|Повернуть|Обрезать|Кадрировать|Фильтр|Эффект|Отмена|Сбросить|Crop|Rotate|Sticker|Draw|Text/i;
    $$('button,[role="button"],[class*="tool"]', root).forEach((control) => {
      const label = normalize(`${textOf(control)} ${control.title || ''} ${control.getAttribute('aria-label') || ''}`);
      if (hideWords.test(label)) control.classList.add('ws16-hide-for-video');
    });
    $$('[class*="toolbar"],[class*="tools"]', root).forEach((bar) => {
      const useful = $$('button,[role="button"]', bar).filter((b) => !b.classList.contains('ws16-hide-for-video'));
      if (!useful.length) bar.classList.add('ws16-hide-for-video');
    });
    buildQualityOnlyUi(root);
  }

  function scan() {
    state.observerQueued = false;
    fixAvatarPencil();
    findEditorRoots().forEach(simplifyVideoEditor);
  }

  document.addEventListener('change', (event) => {
    const input = event.target;
    if (input instanceof HTMLInputElement && input.type === 'file' && isVideoFileInput(input)) {
      state.videoEditorExpectedUntil = Date.now() + 45000;
      [50, 200, 600, 1200].forEach((delay) => setTimeout(scan, delay));
    }
  }, true);

  document.addEventListener('click', (event) => {
    const button = event.target.closest('button,[role="button"],a');
    if (!button) return;
    const label = normalize(`${textOf(button)} ${button.title || ''} ${button.getAttribute('aria-label') || ''}`);
    if (/Изменить аватар и описание|Редактировать (канал|группу)/i.test(label)) {
      captureExistingProfile(findCommunityPanel());
      setTimeout(scan, 100);
    }
    if (/^Сохранить$/i.test(textOf(button)) && findEditModal(button)) handleSaveClick(button);
  }, true);

  const observer = new MutationObserver(() => {
    if (state.observerQueued) return;
    state.observerQueued = true;
    requestAnimationFrame(scan);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'src'] });

  window.MeetusWorkspace16 = {
    version: VERSION,
    applyProfileImmediately,
    simplifyVideoEditor,
    scan,
  };

  scan();
  console.info(`[Meetus] ${VERSION} loaded`);
})();
