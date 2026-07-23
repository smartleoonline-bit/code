/* MEETUS 0.6.25.2 COMMUNITY2-TG9 */
(() => {
  "use strict";

  const emojiPattern = /^[\p{Extended_Pictographic}\p{Emoji_Presentation}\uFE0F\u200D\s]+$/u;
  let decorateFrame = 0;

  function emojiClusters(value) {
    const text = String(value || "").trim();
    if (!text || !emojiPattern.test(text)) return [];
    try {
      if ("Segmenter" in Intl) {
        return [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)]
          .map((item) => item.segment)
          .filter((item) => item.trim());
      }
    } catch {
      // Fall through to a lightweight approximation.
    }
    return Array.from(text.replace(/\s+/g, ""));
  }

  function activeMessage(messageId) {
    return Array.isArray(window.state?.activeMessages)
      ? window.state.activeMessages.find((item) => item.id === messageId)
      : null;
  }

  function decorateEmojiRow(row) {
    const bubble = row.querySelector(":scope > .message-bubble");
    const textNode = bubble?.querySelector(":scope > .message-text");
    if (!bubble || !textNode) return;

    const message = activeMessage(row.dataset.messageId);
    const text = message?.text ?? textNode.textContent ?? "";
    const clusters = emojiClusters(text);
    const eligible =
      clusters.length > 0 &&
      clusters.length <= 8 &&
      !message?.media_key &&
      !bubble.classList.contains("deleted-message-bubble");

    bubble.classList.toggle("emoji-only-bubble", eligible);
    bubble.classList.toggle("emoji-many", eligible && clusters.length > 3);
    textNode.classList.toggle("emoji-only-text", eligible);
  }

  function compactLandscapeMedia(row) {
    const bubble = row.querySelector(":scope > .message-bubble.visual-media-bubble");
    const button = bubble?.querySelector(":scope > .media-image-button");
    const image = button?.querySelector(":scope > .message-image");
    if (!bubble || !button || !image) return;

    const apply = () => {
      const landscape =
        Number(image.naturalWidth) > 0 &&
        Number(image.naturalHeight) > 0 &&
        image.naturalWidth / image.naturalHeight >= 1.15;

      const renderedBefore = Math.max(
        1,
        Math.round(image.getBoundingClientRect().width || button.getBoundingClientRect().width),
      );

      bubble.classList.toggle("landscape-media-compact", landscape);
      if (!landscape) {
        bubble.style.removeProperty("--tg9-media-width");
        return;
      }

      bubble.style.setProperty("--tg9-media-width", `${renderedBefore}px`);
    };

    if (image.complete && image.naturalWidth) apply();
    else image.addEventListener("load", apply, { once: true });
  }

  function decorateRows() {
    cancelAnimationFrame(decorateFrame);
    decorateFrame = requestAnimationFrame(() => {
      document
        .querySelectorAll("#messageArea > .message-row[data-message-id]")
        .forEach((row) => {
          decorateEmojiRow(row);
          compactLandscapeMedia(row);
        });
    });
  }

  const area = document.getElementById("messageArea");
  if (area) {
    new MutationObserver(decorateRows).observe(area, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  window.addEventListener("resize", decorateRows, { passive: true });
  window.addEventListener("load", decorateRows, { once: true });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) decorateRows();
  });
  setTimeout(decorateRows, 0);
  setTimeout(decorateRows, 350);

  window.MeetusTg9 = { decorateRows };
})();
