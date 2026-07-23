/* MEETUS 0.6.25.2 COMMUNITY2-TG10-CALLS6-FIX1 — VOICE TRANSCRIPTION */
(() => {
  "use strict";

  const context = { row: null, messageId: null };

  function icon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16M8 9h8M6 13h12M9 17h6"/><path d="M3 21h18"/></svg>';
  }

  function toast(text, error = false) {
    document.querySelector('.voice-transcription-toast')?.remove();
    const node = document.createElement('div');
    node.className = `voice-transcription-toast${error ? ' error' : ''}`;
    node.textContent = text;
    document.body.appendChild(node);
    setTimeout(() => node.remove(), 3600);
  }

  function rowFromTrigger(trigger) {
    return trigger?.closest('[data-message-id], [data-community2-comment-id]') || null;
  }

  function messageIdFromRow(row) {
    return row?.dataset.messageId || row?.dataset.community2CommentId || null;
  }

  function isVoiceRow(row) {
    return Boolean(row?.querySelector('.voice-message'));
  }

  function setCurrentRow(row) {
    context.row = row;
    context.messageId = messageIdFromRow(row);
    document.querySelectorAll('[data-voice-transcription-action]').forEach((button) => {
      button.classList.toggle('hidden', !context.messageId || !isVoiceRow(row));
    });
  }

  function injectButton(menu, thread = false) {
    if (!menu || menu.querySelector('[data-voice-transcription-action]')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.voiceTranscriptionAction = '1';
    button.className = 'hidden voice-transcription-menu-action';
    button.innerHTML = `${icon()}<span>Транскрибация</span>`;
    const anchor = thread
      ? menu.querySelector('[data-community2-thread-action="info"]')
      : menu.querySelector('[data-message-action="info"]');
    if (anchor) anchor.before(button);
    else menu.appendChild(button);
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      menu.classList.add('hidden');
      if (!context.row || !context.messageId) return;
      await toggleTranscription(context.row, context.messageId);
    }, true);
  }

  function ensureButtons() {
    injectButton(document.getElementById('messageContextMenu'), false);
    injectButton(document.getElementById('community2ThreadContextMenu'), true);
  }

  function transcriptPanel(row, messageId) {
    const voice = row.querySelector('.voice-message');
    if (!voice) return null;
    let panel = voice.querySelector('.voice-transcription-panel');
    if (panel) return panel;
    panel = document.createElement('section');
    panel.className = 'voice-transcription-panel hidden';
    panel.dataset.messageId = messageId;
    panel.innerHTML = `
      <div class="voice-transcription-head">
        <strong>Текст голосового</strong>
        <button type="button" data-transcription-copy title="Копировать">Копировать</button>
      </div>
      <div class="voice-transcription-body"></div>`;
    panel.querySelector('[data-transcription-copy]').addEventListener('click', async (event) => {
      event.stopPropagation();
      const text = panel.querySelector('.voice-transcription-body')?.textContent || '';
      if (!text) return;
      await navigator.clipboard.writeText(text);
      toast('Текст скопирован');
    });
    voice.appendChild(panel);
    return panel;
  }

  async function toggleTranscription(row, messageId) {
    const panel = transcriptPanel(row, messageId);
    if (!panel) return toast('Голосовое сообщение не найдено', true);
    if (panel.dataset.loaded === '1') {
      panel.classList.toggle('hidden');
      return;
    }
    panel.classList.remove('hidden');
    panel.classList.add('loading');
    const body = panel.querySelector('.voice-transcription-body');
    body.textContent = 'Распознаём голосовое сообщение…';
    try {
      const path = `/voice-transcriptions/${encodeURIComponent(messageId)}`;
      let payload;

      // CALLS6-FIX1: use the application's authenticated request helper.
      // Meetus keeps the short-lived access token in memory and refreshes it
      // through the session cookie; messenger_token is intentionally removed
      // from localStorage after login.
      if (typeof window.request === 'function') {
        payload = await window.request(path, { method: 'POST' });
      } else {
        // Compatibility fallback for an unexpectedly old frontend.
        const token = localStorage.getItem('messenger_token') || '';
        const response = await fetch(`/api${path}`, {
          method: 'POST',
          credentials: 'same-origin',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.message || `Ошибка ${response.status}`);
      }

      body.textContent = payload?.text || 'Речь не распознана';
      panel.dataset.loaded = '1';
      panel.classList.remove('loading');
    } catch (error) {
      panel.classList.remove('loading');
      panel.classList.add('error');
      body.textContent = error.message || 'Не удалось выполнить транскрибацию';
      toast(body.textContent, true);
    }
  }

  document.addEventListener('pointerdown', (event) => {
    const trigger = event.target.closest('.message-menu-trigger');
    if (!trigger) return;
    ensureButtons();
    setCurrentRow(rowFromTrigger(trigger));
  }, true);

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('.message-menu-trigger');
    if (!trigger) return;
    ensureButtons();
    setCurrentRow(rowFromTrigger(trigger));
  }, true);

  new MutationObserver(() => ensureButtons()).observe(document.body, { childList: true, subtree: true });
  ensureButtons();
  window.MeetusVoiceTranscription = { toggle: toggleTranscription };
})();
