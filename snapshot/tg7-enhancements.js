/* MEETUS 0.6.25.2 COMMUNITY2-TG7 */
(() => {
  "use strict";

  let recoveryPollBusy = false;

  function isDeleted(message) {
    return Boolean(message?.metadata?.deletedForEveryone);
  }

  async function syncRestoredTombstones() {
    if (
      recoveryPollBusy ||
      !state.token ||
      !state.activeChat?.id ||
      !state.activeMessages?.some(isDeleted)
    ) return;

    recoveryPollBusy = true;
    const chatId = state.activeChat.id;
    try {
      const messages = await request(`/chats/${chatId}/messages`);
      if (state.activeChat?.id !== chatId || !Array.isArray(messages)) return;

      const remoteById = new Map(messages.map((message) => [message.id, message]));
      for (const local of [...state.activeMessages]) {
        if (!isDeleted(local)) continue;
        const remote = remoteById.get(local.id);
        if (!remote || isDeleted(remote)) continue;
        replaceMessageInCurrentView(local.id, {
          ...remote,
          metadata: {
            ...(remote.metadata || {}),
            deletedForEveryone: false,
            deletedForEveryoneAt: null,
            restoreUntil: null,
          },
        });
      }
    } catch (error) {
      console.debug("TG7 recovery sync skipped", error?.message || error);
    } finally {
      recoveryPollBusy = false;
    }
  }

  setInterval(syncRestoredTombstones, 1800);

  const callButton = document.getElementById("chatCallButton");
  callButton?.addEventListener("click", () => {
    setUploadStatus("Звонки появятся в следующем модуле");
    setTimeout(() => setUploadStatus(""), 2200);
  });

  window.MeetusTg7 = { syncRestoredTombstones };
})();
