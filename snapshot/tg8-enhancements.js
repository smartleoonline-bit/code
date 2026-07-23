/* MEETUS 0.6.25.2 COMMUNITY2-TG8 */
(() => {
  "use strict";

  /* ---------------- Date separators ---------------- */
  function dayKey(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
  }

  function dateOnly(value = new Date()) {
    const date = new Date(value);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function dayLabel(value) {
    const date = dateOnly(value);
    const today = dateOnly();
    const difference = Math.round((today - date) / 86400000);
    if (difference === 0) return "Сегодня";
    if (difference === 1) return "Вчера";
    return date.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  let dividerFrame = 0;
  function rebuildDateSeparators() {
    cancelAnimationFrame(dividerFrame);
    dividerFrame = requestAnimationFrame(() => {
      document
        .querySelectorAll("#messageArea > .message-date-divider")
        .forEach((divider) => divider.remove());

      let previousKey = "";
      messageArea
        .querySelectorAll(":scope > .message-row[data-message-id]")
        .forEach((row) => {
          const message = state.activeMessages.find(
            (item) => item.id === row.dataset.messageId,
          );
          if (!message) return;
          const key = dayKey(message.created_at);
          row.dataset.messageDay = key;
          if (!key || key === previousKey) return;

          const divider = document.createElement("div");
          divider.className = "message-date-divider";
          divider.dataset.messageDay = key;
          divider.textContent = dayLabel(message.created_at);
          messageArea.insertBefore(divider, row);
          previousKey = key;
        });
    });
  }

  const appendMessageOriginal = appendMessage;
  appendMessage = function tg8AppendMessage(message) {
    const result = appendMessageOriginal(message);
    rebuildDateSeparators();
    return result;
  };

  const replaceMessageOriginal = replaceMessageInCurrentView;
  replaceMessageInCurrentView = function tg8ReplaceMessage(...args) {
    const result = replaceMessageOriginal(...args);
    rebuildDateSeparators();
    return result;
  };

  const removeMessageOriginal = removeMessageFromCurrentView;
  removeMessageFromCurrentView = function tg8RemoveMessage(...args) {
    const result = removeMessageOriginal(...args);
    rebuildDateSeparators();
    return result;
  };

  /* ---------------- Native, full-frame video playback ---------------- */
  function configureViewerVideo() {
    if (!viewerVideo) return;
    viewerVideo.controls = true;
    viewerVideo.preload = "auto";
    viewerVideo.setAttribute("playsinline", "");
    viewerVideo.setAttribute("controlsList", "nodownload");
  }

  configureViewerVideo();
  viewerVideo?.addEventListener("loadedmetadata", () => {
    configureViewerVideo();
    if (viewerVideo.videoWidth > 0 && viewerVideo.videoHeight > 0) {
      viewerVideoShell.style.aspectRatio =
        `${viewerVideo.videoWidth} / ${viewerVideo.videoHeight}`;
    }
  });
  viewerVideo?.addEventListener("error", () => {
    setUploadStatus("Не удалось загрузить видео полностью. Повторяем…", true);
    setTimeout(() => {
      const source = viewerVideo.currentSrc || viewerVideo.src;
      if (!source) return;
      const currentTime = Number.isFinite(viewerVideo.currentTime)
        ? viewerVideo.currentTime
        : 0;
      viewerVideo.src = source;
      viewerVideo.load();
      viewerVideo.addEventListener("loadedmetadata", () => {
        if (currentTime > 0 && currentTime < viewerVideo.duration) {
          viewerVideo.currentTime = currentTime;
        }
      }, { once: true });
      setUploadStatus("");
    }, 700);
  });

  /* ---------------- Photo compression ---------------- */
  async function loadImageSource(file) {
    if ("createImageBitmap" in window) {
      return createImageBitmap(file, { imageOrientation: "from-image" });
    }
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      return image;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function compressCameraPhoto(file) {
    if (!file?.type?.startsWith("image/")) return file;
    const source = await loadImageSource(file);
    const width = source.width || source.naturalWidth;
    const height = source.height || source.naturalHeight;
    const scale = Math.min(1, 1000 / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d", { alpha: false });
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    source.close?.();

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (result) => result ? resolve(result) : reject(new Error("Не удалось сжать фото")),
        "image/jpeg",
        0.70,
      );
    });
    return new File(
      [blob],
      `camera-${Date.now()}.jpg`,
      { type: "image/jpeg", lastModified: Date.now() },
    );
  }

  // Compress photos even when the browser falls back to its system camera.
  cameraInput?.addEventListener("change", async (event) => {
    const file = cameraInput.files?.[0];
    if (!file) return;
    event.stopImmediatePropagation();
    try {
      setUploadStatus("Подготавливаем фото…");
      const prepared = await compressCameraPhoto(file);
      openMediaPreview([prepared]);
      setUploadStatus("");
    } catch (error) {
      setUploadStatus(error.message || "Не удалось обработать фото", true);
      openMediaPreview([file]);
    } finally {
      cameraInput.value = "";
    }
  }, true);

  async function normalizeCameraVideo(file) {
    if (!file?.type?.startsWith("video/") || !state.token) return file;
    const form = new FormData();
    form.append("file", file, file.name || `camera-${Date.now()}.mp4`);
    form.append("quality", "low");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 180000);
    try {
      const response = await fetch(`${API}/media/edit-video`, {
        method: "POST",
        credentials: "same-origin",
        headers: { Authorization: `Bearer ${state.token}` },
        body: form,
        signal: controller.signal,
      });
      if (!response.ok) {
        const detail = await response.json().catch(() => null);
        throw new Error(detail?.message || `Ошибка обработки видео ${response.status}`);
      }
      const blob = await response.blob();
      const encodedName = response.headers.get("X-Edited-File-Name");
      let name = `camera-${Date.now()}.mp4`;
      if (encodedName) {
        try { name = decodeURIComponent(encodedName); } catch { /* keep fallback */ }
      }
      return new File([blob], name, {
        type: "video/mp4",
        lastModified: Date.now(),
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  videoCaptureInput?.addEventListener("change", async (event) => {
    const file = videoCaptureInput.files?.[0];
    if (!file) return;
    event.stopImmediatePropagation();
    try {
      setUploadStatus("Оптимизируем видео до 480p…");
      const prepared = await normalizeCameraVideo(file);
      openMediaPreview([prepared]);
      setUploadStatus("");
    } catch (error) {
      setUploadStatus(error.message || "Не удалось оптимизировать видео", true);
      openMediaPreview([file]);
    } finally {
      videoCaptureInput.value = "";
    }
  }, true);

  /* ---------------- Lightweight in-app camera ---------------- */
  const camera = {
    modal: null,
    video: null,
    stream: null,
    recorder: null,
    chunks: [],
    mode: "photo",
    facingMode: "environment",
    startedAt: 0,
    timer: null,
  };

  function ensureCameraModal() {
    if (camera.modal) return;
    const modal = document.createElement("div");
    modal.className = "tg8-camera-modal hidden";
    modal.innerHTML = `
      <header class="tg8-camera-header">
        <button type="button" class="tg8-camera-close" aria-label="Закрыть">×</button>
        <div class="tg8-camera-title"><strong>Камера</strong><small>Оптимизировано для быстрой отправки</small></div>
        <button type="button" class="tg8-camera-switch" aria-label="Сменить камеру">↻</button>
      </header>
      <div class="tg8-camera-stage">
        <video class="tg8-camera-video" autoplay muted playsinline></video>
        <span class="tg8-camera-timer hidden">0:00</span>
      </div>
      <footer class="tg8-camera-footer">
        <span></span>
        <button type="button" class="tg8-camera-capture" aria-label="Снять"></button>
        <span class="tg8-camera-hint">Фото</span>
      </footer>`;
    document.body.appendChild(modal);
    camera.modal = modal;
    camera.video = modal.querySelector(".tg8-camera-video");

    modal.querySelector(".tg8-camera-close").addEventListener("click", closeCamera);
    modal.querySelector(".tg8-camera-switch").addEventListener("click", async () => {
      if (camera.recorder?.state === "recording") return;
      camera.facingMode = camera.facingMode === "environment" ? "user" : "environment";
      await startCameraStream();
    });
    modal.querySelector(".tg8-camera-capture").addEventListener("click", () => {
      if (camera.mode === "photo") capturePhoto();
      else if (camera.recorder?.state === "recording") stopVideoCapture();
      else startVideoCapture();
    });
  }

  function stopCameraStream() {
    clearInterval(camera.timer);
    camera.timer = null;
    camera.stream?.getTracks().forEach((track) => track.stop());
    camera.stream = null;
    if (camera.video) camera.video.srcObject = null;
  }

  function closeCamera() {
    if (camera.recorder?.state === "recording") {
      camera.recorder.onstop = null;
      camera.recorder.stop();
    }
    camera.recorder = null;
    camera.chunks = [];
    stopCameraStream();
    camera.modal?.classList.add("hidden");
    camera.modal?.classList.remove("recording");
    document.body.classList.remove("viewer-open");
  }

  async function startCameraStream() {
    stopCameraStream();
    camera.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: camera.facingMode },
        width: { ideal: 854, max: 854 },
        height: { ideal: 480, max: 480 },
        frameRate: { ideal: 30, max: 30 },
      },
      audio: camera.mode === "video" ? {
        echoCancellation: true,
        noiseSuppression: true,
        channelCount: 1,
      } : false,
    });
    camera.video.srcObject = camera.stream;
    await camera.video.play();
  }

  async function openCamera(mode) {
    ensureCameraModal();
    camera.mode = mode;
    camera.modal.querySelector(".tg8-camera-title strong").textContent =
      mode === "video" ? "Запись видео" : "Снять фото";
    camera.modal.querySelector(".tg8-camera-hint").textContent =
      mode === "video" ? "Нажмите для записи" : "Фото до 1000 px";
    camera.modal.querySelector(".tg8-camera-timer").classList.add("hidden");
    camera.modal.classList.remove("hidden", "recording");
    document.body.classList.add("viewer-open");
    try {
      await startCameraStream();
    } catch (error) {
      closeCamera();
      setUploadStatus("Камера недоступна — открываем системную", true);
      if (mode === "video") videoCaptureInput.click();
      else cameraInput.click();
    }
  }

  async function capturePhoto() {
    const video = camera.video;
    if (!video?.videoWidth || !video?.videoHeight) return;
    const scale = Math.min(1, 1000 / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d", { alpha: false }).drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (result) => result ? resolve(result) : reject(new Error("Не удалось сделать фото")),
        "image/jpeg",
        0.70,
      );
    });
    const file = new File([blob], `camera-${Date.now()}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
    closeCamera();
    openMediaPreview([file]);
  }

  function bestVideoMime() {
    const candidates = [
      "video/mp4;codecs=h264,aac",
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];
    return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
  }

  function updateCameraTimer() {
    const elapsed = Math.max(0, Date.now() - camera.startedAt);
    const seconds = Math.floor(elapsed / 1000);
    const label = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
    camera.modal.querySelector(".tg8-camera-timer").textContent = label;
    if (elapsed >= 180000) stopVideoCapture();
  }

  function startVideoCapture() {
    if (!camera.stream || !("MediaRecorder" in window)) {
      closeCamera();
      videoCaptureInput.click();
      return;
    }
    camera.chunks = [];
    const mimeType = bestVideoMime();
    camera.recorder = new MediaRecorder(camera.stream, {
      ...(mimeType ? { mimeType } : {}),
      videoBitsPerSecond: 1000000,
      audioBitsPerSecond: 96000,
    });
    camera.recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size) camera.chunks.push(event.data);
    });
    camera.recorder.addEventListener("stop", () => {
      const type = camera.recorder?.mimeType || mimeType || "video/webm";
      const extension = type.startsWith("video/mp4") ? "mp4" : "webm";
      const blob = new Blob(camera.chunks, { type });
      const file = new File([blob], `camera-${Date.now()}.${extension}`, {
        type,
        lastModified: Date.now(),
      });
      closeCamera();
      if (blob.size <= 1000) return;
      setUploadStatus("Оптимизируем видео до 480p…");
      normalizeCameraVideo(file)
        .then((prepared) => {
          openMediaPreview([prepared]);
          setUploadStatus("");
        })
        .catch((error) => {
          setUploadStatus(error.message || "Не удалось оптимизировать видео", true);
          openMediaPreview([file]);
        });
    }, { once: true });
    camera.recorder.start(300);
    camera.startedAt = Date.now();
    camera.modal.classList.add("recording");
    camera.modal.querySelector(".tg8-camera-timer").classList.remove("hidden");
    camera.modal.querySelector(".tg8-camera-hint").textContent = "Стоп";
    updateCameraTimer();
    camera.timer = setInterval(updateCameraTimer, 250);
  }

  function stopVideoCapture() {
    if (camera.recorder?.state !== "recording") return;
    clearInterval(camera.timer);
    camera.timer = null;
    camera.recorder.stop();
  }

  // Capture phase runs before the old attachment handler.
  attachmentMenu?.addEventListener("click", (event) => {
    const action = event.target.closest("[data-attachment-action]")?.dataset.attachmentAction;
    if (action !== "camera" && action !== "video-camera") return;
    event.preventDefault();
    event.stopImmediatePropagation();
    toggleAttachmentMenu(false);
    openCamera(action === "video-camera" ? "video" : "photo");
  }, true);

  window.MeetusTg8 = {
    rebuildDateSeparators,
    openCamera,
    compressCameraPhoto,
    normalizeCameraVideo,
  };
})();
