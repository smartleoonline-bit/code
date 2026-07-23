(() => {
  const originalOpenImageEditor = openImageEditor;
  const originalCloseImageEditor = closeImageEditor;
  const originalRenderMediaPreview = renderMediaPreview;
  const originalResetImageEditor = resetImageEditor;

  const imageTextState = {
    font: "sans",
    background: "transparent",
    textColor: "#ffffff",
    backgroundColor: "#000000",
    size: 58,
    text: "",
  };

  const imageObjects = [];
  let selectedImageObject = null;
  let objectSequence = 0;
  let imageObjectLayer = null;
  let imageObjectResizeObserver = null;

  function fontFamily(value) {
    return ({
      sans: "Arial, sans-serif",
      serif: "Georgia, serif",
      impact: "Impact, sans-serif",
      mono: '"Courier New", monospace',
      rounded: '"Trebuchet MS", sans-serif',
      light: '"Trebuchet MS", sans-serif',
    })[value] || "Arial, sans-serif";
  }

  function roundRect(context, x, y, width, height, radius) {
    const safe = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + safe, y);
    context.arcTo(x + width, y, x + width, y + height, safe);
    context.arcTo(x + width, y + height, x, y + height, safe);
    context.arcTo(x, y + height, x, y, safe);
    context.arcTo(x, y, x + width, y, safe);
    context.closePath();
  }

  function wrapText(context, text, maxWidth) {
    const output = [];

    for (const paragraph of String(text).split(/\n/)) {
      const words = paragraph.split(/\s+/).filter(Boolean);

      if (!words.length) {
        output.push(" ");
        continue;
      }

      let line = "";

      for (const word of words) {
        const next = line ? `${line} ${word}` : word;

        if (
          line &&
          context.measureText(next).width > maxWidth
        ) {
          output.push(line);
          line = word;
        } else {
          line = next;
        }
      }

      output.push(line || " ");
    }

    return output.slice(0, 10);
  }

  function ensureImageObjectLayer() {
    if (imageObjectLayer) return imageObjectLayer;

    imageObjectLayer = document.createElement("div");
    imageObjectLayer.className = "image-object-layer-v625";
    imageEditorStage.appendChild(imageObjectLayer);

    imageObjectResizeObserver = new ResizeObserver(
      syncImageObjectLayer,
    );
    imageObjectResizeObserver.observe(imageEditorCanvas);
    imageEditorStage.addEventListener(
      "scroll",
      syncImageObjectLayer,
      { passive: true },
    );
    window.addEventListener(
      "resize",
      syncImageObjectLayer,
    );

    return imageObjectLayer;
  }

  function syncImageObjectLayer() {
    if (
      !imageObjectLayer ||
      imageEditorModal.classList.contains("hidden")
    ) {
      return;
    }

    const stageRect =
      imageEditorStage.getBoundingClientRect();
    const canvasRect =
      imageEditorCanvas.getBoundingClientRect();

    imageObjectLayer.style.left = `${
      canvasRect.left -
      stageRect.left +
      imageEditorStage.scrollLeft
    }px`;
    imageObjectLayer.style.top = `${
      canvasRect.top -
      stageRect.top +
      imageEditorStage.scrollTop
    }px`;
    imageObjectLayer.style.width =
      `${canvasRect.width}px`;
    imageObjectLayer.style.height =
      `${canvasRect.height}px`;
  }

  function fitImageCanvas() {
    if (
      imageEditorModal.classList.contains("hidden")
    ) {
      return;
    }

    const rect =
      imageEditorStage.getBoundingClientRect();

    if (
      !rect.width ||
      !rect.height ||
      !imageEditorCanvas.width ||
      !imageEditorCanvas.height
    ) {
      return;
    }

    const scale = Math.min(
      (rect.width - 20) /
        imageEditorCanvas.width,
      (rect.height - 20) /
        imageEditorCanvas.height,
      1,
    );

    imageEditorCanvas.style.width =
      `${Math.max(
        1,
        Math.round(
          imageEditorCanvas.width * scale,
        ),
      )}px`;
    imageEditorCanvas.style.height =
      `${Math.max(
        1,
        Math.round(
          imageEditorCanvas.height * scale,
        ),
      )}px`;

    requestAnimationFrame(syncImageObjectLayer);
  }

  function colorWithAlpha(hex, alpha) {
    const clean = String(hex || "#000000")
      .replace("#", "");
    const value = Number.parseInt(clean, 16);

    if (!Number.isFinite(value)) {
      return `rgba(0,0,0,${alpha})`;
    }

    return `rgba(${(value >> 16) & 255},${
      (value >> 8) & 255
    },${value & 255},${alpha})`;
  }

  function objectBackground(object) {
    if (object.background === "none") {
      return "transparent";
    }

    if (object.background === "solid") {
      return object.backgroundColor;
    }

    return colorWithAlpha(
      object.backgroundColor,
      .68,
    );
  }

  function applyImageObjectStyle(object) {
    const element = object.element;
    const content = element.querySelector(
      ".image-text-content-v625",
    );

    element.style.left = `${object.x * 100}%`;
    element.style.top = `${object.y * 100}%`;
    element.style.transform =
      `translate(-50%,-50%) rotate(${object.rotation}deg) scale(${object.scale})`;

    content.textContent = object.text;
    content.style.fontFamily =
      fontFamily(object.font);
    content.style.fontSize =
      `${object.size}px`;
    content.style.color =
      object.textColor;
    content.style.background =
      objectBackground(object);
    content.style.padding =
      object.background === "none"
        ? "3px 5px"
        : "9px 14px";

    element.classList.toggle(
      "selected",
      selectedImageObject === object,
    );
  }

  function syncPanelFromObject(object) {
    if (!object) return;

    imageTextState.font = object.font;
    imageTextState.background =
      object.background;
    imageTextState.textColor =
      object.textColor;
    imageTextState.backgroundColor =
      object.backgroundColor;
    imageTextState.size = object.size;
    imageTextState.text = object.text;

    textValue.value = object.text;
    textColor.value = object.textColor;
    bgColor.value = object.backgroundColor;
    textSize.value = String(object.size);
    syncTextButtons();
  }

  function selectImageObject(object) {
    selectedImageObject = object || null;

    for (const item of imageObjects) {
      applyImageObjectStyle(item);
    }

    if (object) {
      syncPanelFromObject(object);
    }
  }

  function removeImageObject(object) {
    if (!object) return;

    const index = imageObjects.indexOf(object);
    if (index >= 0) imageObjects.splice(index, 1);
    object.element.remove();

    if (selectedImageObject === object) {
      selectedImageObject = null;
    }
  }

  function clearImageObjects() {
    for (const object of imageObjects) {
      object.element.remove();
    }

    imageObjects.length = 0;
    selectedImageObject = null;
  }

  function layerPoint(event) {
    const rect =
      imageObjectLayer.getBoundingClientRect();

    return {
      x: Math.min(
        .98,
        Math.max(
          .02,
          (event.clientX - rect.left) /
            Math.max(1, rect.width),
        ),
      ),
      y: Math.min(
        .98,
        Math.max(
          .02,
          (event.clientY - rect.top) /
            Math.max(1, rect.height),
        ),
      ),
    };
  }

  function beginObjectDrag(object, event) {
    if (
      event.target.closest(
        ".image-object-handle-v625",
      )
    ) {
      return;
    }

    selectImageObject(object);
    event.preventDefault();
    event.stopPropagation();

    const start = layerPoint(event);
    const originX = object.x;
    const originY = object.y;

    const move = (moveEvent) => {
      const next = layerPoint(moveEvent);
      object.x = Math.min(
        .98,
        Math.max(
          .02,
          originX + next.x - start.x,
        ),
      );
      object.y = Math.min(
        .98,
        Math.max(
          .02,
          originY + next.y - start.y,
        ),
      );
      applyImageObjectStyle(object);
    };

    const stop = () => {
      window.removeEventListener(
        "pointermove",
        move,
      );
      window.removeEventListener(
        "pointerup",
        stop,
      );
      window.removeEventListener(
        "pointercancel",
        stop,
      );
    };

    window.addEventListener(
      "pointermove",
      move,
    );
    window.addEventListener(
      "pointerup",
      stop,
    );
    window.addEventListener(
      "pointercancel",
      stop,
    );
  }

  function beginObjectResize(object, event) {
    selectImageObject(object);
    event.preventDefault();
    event.stopPropagation();

    const rect =
      object.element.getBoundingClientRect();
    const centerX =
      rect.left + rect.width / 2;
    const centerY =
      rect.top + rect.height / 2;
    const startDistance = Math.max(
      8,
      Math.hypot(
        event.clientX - centerX,
        event.clientY - centerY,
      ),
    );
    const startScale = object.scale;

    const move = (moveEvent) => {
      const distance = Math.max(
        8,
        Math.hypot(
          moveEvent.clientX - centerX,
          moveEvent.clientY - centerY,
        ),
      );

      object.scale = Math.min(
        4,
        Math.max(
          .28,
          startScale *
            (distance / startDistance),
        ),
      );
      applyImageObjectStyle(object);
    };

    const stop = () => {
      window.removeEventListener(
        "pointermove",
        move,
      );
      window.removeEventListener(
        "pointerup",
        stop,
      );
      window.removeEventListener(
        "pointercancel",
        stop,
      );
    };

    window.addEventListener(
      "pointermove",
      move,
    );
    window.addEventListener(
      "pointerup",
      stop,
    );
    window.addEventListener(
      "pointercancel",
      stop,
    );
  }

  function beginObjectRotate(object, event) {
    selectImageObject(object);
    event.preventDefault();
    event.stopPropagation();

    const rect =
      object.element.getBoundingClientRect();
    const centerX =
      rect.left + rect.width / 2;
    const centerY =
      rect.top + rect.height / 2;
    const initialPointerAngle =
      Math.atan2(
        event.clientY - centerY,
        event.clientX - centerX,
      );
    const initialRotation =
      object.rotation;

    const move = (moveEvent) => {
      const currentAngle =
        Math.atan2(
          moveEvent.clientY - centerY,
          moveEvent.clientX - centerX,
        );

      object.rotation =
        initialRotation +
        (currentAngle - initialPointerAngle) *
          180 /
          Math.PI;
      applyImageObjectStyle(object);
    };

    const stop = () => {
      window.removeEventListener(
        "pointermove",
        move,
      );
      window.removeEventListener(
        "pointerup",
        stop,
      );
      window.removeEventListener(
        "pointercancel",
        stop,
      );
    };

    window.addEventListener(
      "pointermove",
      move,
    );
    window.addEventListener(
      "pointerup",
      stop,
    );
    window.addEventListener(
      "pointercancel",
      stop,
    );
  }

  function createImageTextObject(point) {
    ensureImageObjectLayer();

    const object = {
      id: ++objectSequence,
      x:
        point.x /
        Math.max(1, imageEditorCanvas.width),
      y:
        point.y /
        Math.max(1, imageEditorCanvas.height),
      text: imageTextState.text.trim(),
      font: imageTextState.font,
      background:
        imageTextState.background,
      textColor:
        imageTextState.textColor,
      backgroundColor:
        imageTextState.backgroundColor,
      size: imageTextState.size,
      scale: 1,
      rotation: 0,
      element: document.createElement("div"),
    };

    object.element.className =
      "image-text-object-v625";
    object.element.innerHTML = `
      <div class="image-text-content-v625"></div>
      <button type="button" class="image-object-handle-v625 image-object-delete-v625" title="Удалить">×</button>
      <button type="button" class="image-object-handle-v625 image-object-rotate-v625" title="Повернуть">↻</button>
      <button type="button" class="image-object-handle-v625 image-object-resize-v625 top-left" title="Изменить размер"></button>
      <button type="button" class="image-object-handle-v625 image-object-resize-v625 top-right" title="Изменить размер"></button>
      <button type="button" class="image-object-handle-v625 image-object-resize-v625 bottom-left" title="Изменить размер"></button>
      <button type="button" class="image-object-handle-v625 image-object-resize-v625 bottom-right" title="Изменить размер"></button>
    `;

    object.element.addEventListener(
      "pointerdown",
      (event) =>
        beginObjectDrag(object, event),
    );

    object.element.addEventListener(
      "dblclick",
      (event) => {
        event.preventDefault();
        event.stopPropagation();
        selectImageObject(object);
        openTextPanel(object);
      },
    );

    object.element
      .querySelector(
        ".image-object-delete-v625",
      )
      .addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        removeImageObject(object);
      });

    object.element
      .querySelector(
        ".image-object-rotate-v625",
      )
      .addEventListener(
        "pointerdown",
        (event) =>
          beginObjectRotate(object, event),
      );

    object.element
      .querySelectorAll(
        ".image-object-resize-v625",
      )
      .forEach((handle) => {
        handle.addEventListener(
          "pointerdown",
          (event) =>
            beginObjectResize(
              object,
              event,
            ),
        );
      });

    imageObjects.push(object);
    imageObjectLayer.appendChild(
      object.element,
    );
    selectImageObject(object);
    applyImageObjectStyle(object);

    return object;
  }

  const textPanel =
    document.createElement("section");
  textPanel.id = "imageTextPanelV625";
  textPanel.className =
    "editor-text-panel-v621 editor-text-panel-v625 hidden";
  textPanel.innerHTML = `
    <header>
      <strong>Текст на изображении</strong>
      <button type="button" data-close>×</button>
    </header>
    <textarea rows="2" maxlength="180" placeholder="Введите текст"></textarea>
    <div class="font-row">
      <button type="button" data-font="sans" class="active">Aa</button>
      <button type="button" data-font="serif" class="serif">Aa</button>
      <button type="button" data-font="impact" class="impact">Aa</button>
      <button type="button" data-font="mono" class="mono">Aa</button>
      <button type="button" data-font="rounded" class="rounded">Aa</button>
    </div>
    <div class="text-options">
      <label><span>Текст</span><input data-text-color type="color" value="#ffffff"></label>
      <label><span>Подложка</span><input data-bg-color type="color" value="#000000"></label>
      <label><span>Размер</span><input data-size type="range" min="18" max="160" value="58"></label>
    </div>
    <div class="background-row">
      <button type="button" data-bg="none">Без подложки</button>
      <button type="button" data-bg="transparent" class="active">Полупрозрачная</button>
      <button type="button" data-bg="solid">Сплошная</button>
    </div>
    <div class="image-text-panel-actions-v625">
      <button type="button" class="delete-text-object-v625">Удалить объект</button>
      <button type="button" class="apply-text">Добавить / применить</button>
    </div>
    <small>После добавления нажмите на текст: его можно двигать, уменьшать за углы и вращать верхней ручкой.</small>
  `;
  imageEditorModal.append(textPanel);

  const textValue =
    textPanel.querySelector("textarea");
  const textColor =
    textPanel.querySelector(
      "[data-text-color]",
    );
  const bgColor =
    textPanel.querySelector(
      "[data-bg-color]",
    );
  const textSize =
    textPanel.querySelector("[data-size]");
  const deleteTextObjectButton =
    textPanel.querySelector(
      ".delete-text-object-v625",
    );

  function syncTextButtons() {
    textPanel
      .querySelectorAll("[data-font]")
      .forEach((button) => {
        button.classList.toggle(
          "active",
          button.dataset.font ===
            imageTextState.font,
        );
      });

    textPanel
      .querySelectorAll("[data-bg]")
      .forEach((button) => {
        button.classList.toggle(
          "active",
          button.dataset.bg ===
            imageTextState.background,
        );
      });
  }

  function syncStateFromPanel() {
    imageTextState.text =
      textValue.value.trim();
    imageTextState.textColor =
      textColor.value;
    imageTextState.backgroundColor =
      bgColor.value;
    imageTextState.size =
      Number(textSize.value);
  }

  function updateSelectedFromPanel() {
    syncStateFromPanel();

    if (!selectedImageObject) return;

    Object.assign(selectedImageObject, {
      text: imageTextState.text,
      font: imageTextState.font,
      background:
        imageTextState.background,
      textColor:
        imageTextState.textColor,
      backgroundColor:
        imageTextState.backgroundColor,
      size: imageTextState.size,
    });
    applyImageObjectStyle(
      selectedImageObject,
    );
  }

  function openTextPanel(object = null) {
    if (object) selectImageObject(object);

    deleteTextObjectButton.classList.toggle(
      "hidden",
      !selectedImageObject,
    );
    textPanel.classList.remove("hidden");
    requestAnimationFrame(() =>
      textValue.focus(),
    );
  }

  for (const control of [
    textValue,
    textColor,
    bgColor,
    textSize,
  ]) {
    control.addEventListener(
      "input",
      updateSelectedFromPanel,
    );
    control.addEventListener(
      "change",
      updateSelectedFromPanel,
    );
  }

  textPanel.addEventListener(
    "click",
    (event) => {
      if (event.target.closest("[data-close]")) {
        textPanel.classList.add("hidden");
        return;
      }

      const font = event.target.closest(
        "[data-font]",
      )?.dataset.font;

      if (font) {
        imageTextState.font = font;
        syncTextButtons();
        updateSelectedFromPanel();
        return;
      }

      const background =
        event.target.closest(
          "[data-bg]",
        )?.dataset.bg;

      if (background) {
        imageTextState.background =
          background;
        syncTextButtons();
        updateSelectedFromPanel();
        return;
      }

      if (
        event.target.closest(
          ".delete-text-object-v625",
        )
      ) {
        removeImageObject(
          selectedImageObject,
        );
        textPanel.classList.add("hidden");
        return;
      }

      if (
        event.target.closest(".apply-text")
      ) {
        syncStateFromPanel();

        if (!imageTextState.text) {
          textValue.focus();
          return;
        }

        if (selectedImageObject) {
          updateSelectedFromPanel();
          textPanel.classList.add("hidden");
          return;
        }

        textPanel.classList.add("hidden");
        setEditorTool("text");
      }
    },
  );

  placeEditorText = function(point) {
    syncStateFromPanel();

    if (!imageTextState.text) {
      openTextPanel();
      return;
    }

    createImageTextObject(point);
    imageTextState.text = "";
    textValue.value = "";
    setEditorTool("draw");
  };

  function drawImageObject(
    context,
    object,
    scaleX,
    scaleY,
  ) {
    const fontSize = Math.max(
      10,
      object.size * scaleY,
    );
    const lineHeight = fontSize * 1.18;

    context.save();
    context.translate(
      object.x * imageEditorCanvas.width,
      object.y * imageEditorCanvas.height,
    );
    context.rotate(
      object.rotation * Math.PI / 180,
    );
    context.scale(
      object.scale,
      object.scale,
    );
    context.font =
      `700 ${fontSize}px ${fontFamily(
        object.font,
      )}`;
    context.textAlign = "center";
    context.textBaseline = "middle";

    const lines = wrapText(
      context,
      object.text,
      imageEditorCanvas.width * .78,
    );
    const widest = Math.max(
      1,
      ...lines.map((line) =>
        context.measureText(line).width,
      ),
    );
    const paddingX = fontSize * .36;
    const paddingY = fontSize * .2;
    const width = widest + paddingX * 2;
    const height =
      lineHeight * lines.length +
      paddingY * 2;

    if (object.background !== "none") {
      context.fillStyle =
        object.background === "solid"
          ? object.backgroundColor
          : colorWithAlpha(
              object.backgroundColor,
              .68,
            );
      roundRect(
        context,
        -width / 2,
        -height / 2,
        width,
        height,
        fontSize * .24,
      );
      context.fill();
    }

    context.fillStyle = object.textColor;
    lines.forEach((line, index) => {
      context.fillText(
        line,
        0,
        -height / 2 +
          paddingY +
          lineHeight * (index + .5),
      );
    });
    context.restore();
  }

  async function saveImageEditorV625() {
    const index = state.editorFileIndex;
    const original =
      state.pendingMediaFiles[index];

    if (!original) return;

    imageEditorSave.disabled = true;
    imageEditorSave.textContent =
      "Сохраняем…";

    try {
      const exportCanvas =
        document.createElement("canvas");
      exportCanvas.width =
        imageEditorCanvas.width;
      exportCanvas.height =
        imageEditorCanvas.height;
      const context = exportCanvas.getContext(
        "2d",
        { alpha: false },
      );
      context.drawImage(
        imageEditorCanvas,
        0,
        0,
      );

      const layerRect =
        ensureImageObjectLayer()
          .getBoundingClientRect();
      const scaleX =
        exportCanvas.width /
        Math.max(1, layerRect.width);
      const scaleY =
        exportCanvas.height /
        Math.max(1, layerRect.height);

      for (const object of imageObjects) {
        drawImageObject(
          context,
          object,
          scaleX,
          scaleY,
        );
      }

      const blob = await new Promise(
        (resolve) =>
          exportCanvas.toBlob(
            resolve,
            "image/png",
            1,
          ),
      );

      if (!blob) {
        throw new Error(
          "Не удалось сохранить изображение",
        );
      }

      const baseName =
        original.name.replace(/\.[^.]+$/, "") ||
        "image";
      const nextFile = new File(
        [blob],
        `${baseName}-edited.png`,
        {
          type: "image/png",
          lastModified: Date.now(),
        },
      );

      URL.revokeObjectURL(
        state.pendingMediaUrls[index],
      );
      state.pendingMediaFiles[index] =
        nextFile;
      state.pendingMediaUrls[index] =
        URL.createObjectURL(nextFile);

      closeImageEditor(false);
      renderMediaPreview();
    } catch (error) {
      alert(error.message);
    } finally {
      imageEditorSave.disabled = false;
      imageEditorSave.textContent =
        "Готово";
    }
  }

  openImageEditor = async function() {
    clearImageObjects();
    selectedImageObject = null;
    textPanel.classList.add("hidden");
    await originalOpenImageEditor();
    ensureImageObjectLayer();
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        fitImageCanvas();
        syncImageObjectLayer();
      }),
    );
  };

  closeImageEditor = function(saveNothing = true) {
    clearImageObjects();
    textPanel.classList.add("hidden");
    originalCloseImageEditor(saveNothing);
  };

  resetImageEditor = function() {
    clearImageObjects();
    originalResetImageEditor();
  };

  imageEditorText.addEventListener(
    "click",
    (event) => {
      event.stopImmediatePropagation();
      openTextPanel(
        selectedImageObject,
      );
    },
    true,
  );

  imageEditorSave.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      saveImageEditorV625();
    },
    true,
  );

  imageEditorUndo.addEventListener(
    "click",
    (event) => {
      if (!imageObjects.length) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      removeImageObject(
        imageObjects[imageObjects.length - 1],
      );
    },
    true,
  );

  imageEditorReset.addEventListener(
    "click",
    () => {
      clearImageObjects();
    },
    true,
  );

  imageEditorStage.addEventListener(
    "pointerdown",
    (event) => {
      if (
        event.target === imageEditorStage ||
        event.target === imageEditorCanvas ||
        event.target === imageObjectLayer
      ) {
        selectImageObject(null);
      }
    },
    true,
  );

  /* VIDEO EDITOR */

  const videoModal =
    document.createElement("div");
  videoModal.id = "videoEditorModalV625";
  videoModal.className =
    "video-editor-modal-v621 video-editor-modal-v625 hidden";
  videoModal.innerHTML = `
    <header>
      <button type="button" data-close>×</button>
      <div>
        <strong>Редактор видео</strong>
        <span data-status>Обрезка, качество и текст</span>
      </div>
      <button type="button" data-save>Готово</button>
    </header>
    <main>
      <div class="video-viewport">
        <video controls playsinline preload="metadata"></video>
        <div class="video-text-object-v625 hidden">
          <div class="video-text-content-v625"></div>
          <button type="button" class="video-resize-handle-v625 top-left"></button>
          <button type="button" class="video-resize-handle-v625 top-right"></button>
          <button type="button" class="video-resize-handle-v625 bottom-left"></button>
          <button type="button" class="video-resize-handle-v625 bottom-right"></button>
        </div>
      </div>
    </main>
    <footer>
      <section class="trim-card">
        <div>
          <strong>Обрезать начало и конец</strong>
          <span><b data-start-label>0:00</b> — <b data-end-label>0:00</b></span>
        </div>
        <label><span>Начало</span><input data-start type="range" min="0" max="1" step="0.01" value="0"></label>
        <label><span>Конец</span><input data-end type="range" min="0" max="1" step="0.01" value="1"></label>
      </section>
      <section class="video-options">
        <label>
          <span>Качество</span>
          <select data-quality>
            <option value="original">Оригинальное</option>
            <option value="high" selected>Высокое — до 1080p</option>
            <option value="medium">Среднее — до 720p</option>
            <option value="low">Эконом — до 480p</option>
          </select>
        </label>
        <label>
          <span>Текст поверх видео</span>
          <input data-text maxlength="180" placeholder="Необязательно">
        </label>
        <div class="font-row">
          <button type="button" data-vfont="sans" class="active">Aa</button>
          <button type="button" data-vfont="serif" class="serif">Aa</button>
          <button type="button" data-vfont="mono" class="mono">Aa</button>
          <button type="button" data-vfont="light" class="rounded">Aa</button>
        </div>
        <div class="video-style">
          <label><span>Текст</span><input data-vtext-color type="color" value="#ffffff"></label>
          <label><span>Подложка</span><input data-vbg-color type="color" value="#000000"></label>
          <label><span>Размер</span><input data-vsize type="range" min="18" max="160" value="48"></label>
          <label><span>Тип подложки</span><select data-vbg-style><option value="none">Без подложки</option><option value="transparent" selected>Полупрозрачная</option><option value="solid">Сплошная</option></select></label>
        </div>
        <small>Текст можно перетаскивать. Потяните за любой угол, чтобы уменьшить или увеличить.</small>
      </section>
    </footer>
  `;
  document.body.append(videoModal);

  const v = {
    video:
      videoModal.querySelector("video"),
    object:
      videoModal.querySelector(
        ".video-text-object-v625",
      ),
    content:
      videoModal.querySelector(
        ".video-text-content-v625",
      ),
    status:
      videoModal.querySelector(
        "[data-status]",
      ),
    save:
      videoModal.querySelector(
        "[data-save]",
      ),
    start:
      videoModal.querySelector(
        "[data-start]",
      ),
    end:
      videoModal.querySelector(
        "[data-end]",
      ),
    startLabel:
      videoModal.querySelector(
        "[data-start-label]",
      ),
    endLabel:
      videoModal.querySelector(
        "[data-end-label]",
      ),
    quality:
      videoModal.querySelector(
        "[data-quality]",
      ),
    text:
      videoModal.querySelector(
        "[data-text]",
      ),
    textColor:
      videoModal.querySelector(
        "[data-vtext-color]",
      ),
    bgColor:
      videoModal.querySelector(
        "[data-vbg-color]",
      ),
    size:
      videoModal.querySelector(
        "[data-vsize]",
      ),
    bgStyle:
      videoModal.querySelector(
        "[data-vbg-style]",
      ),
    viewport:
      videoModal.querySelector(
        ".video-viewport",
      ),
  };

  const videoState = {
    index: -1,
    duration: 0,
    start: 0,
    end: 0,
    font: "sans",
    x: .5,
    y: .5,
    drag: false,
    pointer: null,
  };

  const clock = (value) => {
    const safe = Math.max(0, Number(value) || 0);
    return `${Math.floor(safe / 60)}:${String(
      Math.floor(safe % 60),
    ).padStart(2, "0")}`;
  };

  function updateVideoOverlay() {
    const text = v.text.value.trim();
    v.content.textContent = text;
    v.object.classList.toggle(
      "hidden",
      !text,
    );
    v.object.style.left =
      `${videoState.x * 100}%`;
    v.object.style.top =
      `${videoState.y * 100}%`;
    v.content.style.fontFamily =
      fontFamily(videoState.font);
    v.content.style.fontSize =
      `${Number(v.size.value)}px`;
    v.content.style.color =
      v.textColor.value;
    v.content.style.background =
      v.bgStyle.value === "none"
        ? "transparent"
        : v.bgStyle.value === "solid"
          ? v.bgColor.value
          : colorWithAlpha(
              v.bgColor.value,
              .68,
            );
    v.content.style.padding =
      v.bgStyle.value === "none"
        ? "3px 5px"
        : "9px 15px";
  }

  function trimStep() {
    return Math.max(
      .01,
      Math.min(
        .1,
        videoState.duration / 2000,
      ),
    );
  }

  function updateTrim(changed) {
    const duration =
      Math.max(0, videoState.duration);
    const gap = trimStep();
    let start = Math.max(
      0,
      Math.min(
        duration,
        Number(v.start.value) || 0,
      ),
    );
    let end = Math.max(
      0,
      Math.min(
        duration,
        Number(v.end.value) || duration,
      ),
    );

    if (changed === "start") {
      start = Math.min(
        start,
        Math.max(0, end - gap),
      );
      v.start.value = String(start);
      v.video.currentTime = start;
    }

    if (changed === "end") {
      end = Math.max(
        end,
        Math.min(duration, start + gap),
      );
      v.end.value = String(end);
      v.video.currentTime = Math.max(
        0,
        end - Math.min(.05, gap),
      );
    }

    videoState.start = start;
    videoState.end = end;
    v.start.value = String(start);
    v.end.value = String(end);
    v.startLabel.textContent = clock(start);
    v.endLabel.textContent = clock(end);
  }

  function videoPoint(event) {
    const rect =
      v.viewport.getBoundingClientRect();

    return {
      x: Math.min(
        .98,
        Math.max(
          .02,
          (event.clientX - rect.left) /
            Math.max(1, rect.width),
        ),
      ),
      y: Math.min(
        .98,
        Math.max(
          .02,
          (event.clientY - rect.top) /
            Math.max(1, rect.height),
        ),
      ),
    };
  }

  function beginVideoDrag(event) {
    if (
      event.target.closest(
        ".video-resize-handle-v625",
      )
    ) {
      return;
    }

    event.preventDefault();
    const start = videoPoint(event);
    const originX = videoState.x;
    const originY = videoState.y;

    const move = (moveEvent) => {
      const next = videoPoint(moveEvent);
      videoState.x = Math.min(
        .98,
        Math.max(
          .02,
          originX + next.x - start.x,
        ),
      );
      videoState.y = Math.min(
        .98,
        Math.max(
          .02,
          originY + next.y - start.y,
        ),
      );
      updateVideoOverlay();
    };

    const stop = () => {
      window.removeEventListener(
        "pointermove",
        move,
      );
      window.removeEventListener(
        "pointerup",
        stop,
      );
      window.removeEventListener(
        "pointercancel",
        stop,
      );
    };

    window.addEventListener(
      "pointermove",
      move,
    );
    window.addEventListener(
      "pointerup",
      stop,
    );
    window.addEventListener(
      "pointercancel",
      stop,
    );
  }

  function beginVideoResize(event) {
    event.preventDefault();
    event.stopPropagation();

    const rect =
      v.object.getBoundingClientRect();
    const centerX =
      rect.left + rect.width / 2;
    const centerY =
      rect.top + rect.height / 2;
    const initialDistance = Math.max(
      8,
      Math.hypot(
        event.clientX - centerX,
        event.clientY - centerY,
      ),
    );
    const initialSize =
      Number(v.size.value);

    const move = (moveEvent) => {
      const distance = Math.max(
        8,
        Math.hypot(
          moveEvent.clientX - centerX,
          moveEvent.clientY - centerY,
        ),
      );
      const size = Math.min(
        160,
        Math.max(
          18,
          initialSize *
            (distance / initialDistance),
        ),
      );
      v.size.value = String(size);
      updateVideoOverlay();
    };

    const stop = () => {
      window.removeEventListener(
        "pointermove",
        move,
      );
      window.removeEventListener(
        "pointerup",
        stop,
      );
      window.removeEventListener(
        "pointercancel",
        stop,
      );
    };

    window.addEventListener(
      "pointermove",
      move,
    );
    window.addEventListener(
      "pointerup",
      stop,
    );
    window.addEventListener(
      "pointercancel",
      stop,
    );
  }

  function openVideoEditor() {
    const index = state.pendingMediaIndex;
    const file =
      state.pendingMediaFiles[index];
    const url =
      state.pendingMediaUrls[index];

    if (
      !file ||
      !file.type.startsWith("video/")
    ) {
      return;
    }

    videoState.index = index;
    videoState.x = .5;
    videoState.y = .5;
    v.text.value = "";
    v.quality.value = "high";
    v.size.value = "48";
    v.textColor.value = "#ffffff";
    v.bgColor.value = "#000000";
    v.bgStyle.value = "transparent";
    v.status.textContent =
      "Загружаем видео…";
    v.video.src = url;
    v.video.load();
    mediaPreviewVideo.pause();
    mediaPreviewModal.classList.add(
      "hidden",
    );
    videoModal.classList.remove("hidden");
    updateVideoOverlay();
  }

  function closeVideoEditor() {
    v.video.pause();
    v.video.removeAttribute("src");
    v.video.load();
    videoModal.classList.add("hidden");
    mediaPreviewModal.classList.remove(
      "hidden",
    );
  }

  async function saveVideo() {
    const file =
      state.pendingMediaFiles[
        videoState.index
      ];

    if (!file) return;

    v.save.disabled = true;
    v.save.textContent = "Обрабатываем…";
    v.status.textContent =
      "Видео обрабатывается на сервере. Не закрывайте страницу.";

    try {
      const form = new FormData();
      form.append("file", file, file.name);

      const options = {
        start: videoState.start,
        end: videoState.end,
        quality: v.quality.value,
        text: v.text.value.trim(),
        font: videoState.font,
        fontSize: v.size.value,
        textColor: v.textColor.value,
        backgroundColor:
          v.bgColor.value,
        backgroundStyle:
          v.bgStyle.value,
        x: videoState.x,
        y: videoState.y,
      };

      for (const [key, value] of
        Object.entries(options)) {
        form.append(key, String(value));
      }

      const send = () =>
        fetch(`${API}/media/edit-video`, {
          method: "POST",
          credentials: "same-origin",
          headers: {
            Authorization:
              `Bearer ${state.token}`,
          },
          body: form,
        });

      let response = await send();

      if (
        response.status === 401 &&
        (await refreshAccessToken()) ===
          "ok"
      ) {
        response = await send();
      }

      if (!response.ok) {
        const data = await response
          .json()
          .catch(() => null);
        throw new Error(
          data?.message ||
          `Ошибка обработки видео ${response.status}`,
        );
      }

      const blob = await response.blob();
      const header = response.headers.get(
        "X-Edited-File-Name",
      );
      const base =
        file.name.replace(/\.[^.]+$/, "") ||
        "video";
      const name = header
        ? decodeURIComponent(header)
        : `${base}-edited.mp4`;
      const next = new File(
        [blob],
        name,
        {
          type: "video/mp4",
          lastModified: Date.now(),
        },
      );

      URL.revokeObjectURL(
        state.pendingMediaUrls[
          videoState.index
        ],
      );
      state.pendingMediaFiles[
        videoState.index
      ] = next;
      state.pendingMediaUrls[
        videoState.index
      ] = URL.createObjectURL(next);

      closeVideoEditor();
      renderMediaPreview();
    } catch (error) {
      v.status.textContent = error.message;
    } finally {
      v.save.disabled = false;
      v.save.textContent = "Готово";
    }
  }

  v.video.addEventListener(
    "loadedmetadata",
    () => {
      videoState.duration =
        Number.isFinite(v.video.duration)
          ? v.video.duration
          : 0;
      videoState.start = 0;
      videoState.end =
        videoState.duration;
      const step = trimStep();

      for (const input of [
        v.start,
        v.end,
      ]) {
        input.min = "0";
        input.max = String(
          videoState.duration,
        );
        input.step = String(step);
      }

      v.start.value = "0";
      v.end.value = String(
        videoState.duration,
      );
      updateTrim();
      v.status.textContent =
        "Выберите границы, качество и оформление";
    },
  );

  v.video.addEventListener(
    "timeupdate",
    () => {
      if (
        videoState.end > 0 &&
        v.video.currentTime >=
          videoState.end
      ) {
        v.video.pause();
        v.video.currentTime =
          videoState.start;
      }
    },
  );

  v.start.addEventListener(
    "input",
    () => updateTrim("start"),
  );
  v.end.addEventListener(
    "input",
    () => updateTrim("end"),
  );

  for (const control of [
    v.text,
    v.textColor,
    v.bgColor,
    v.size,
    v.bgStyle,
  ]) {
    control.addEventListener(
      "input",
      updateVideoOverlay,
    );
    control.addEventListener(
      "change",
      updateVideoOverlay,
    );
  }

  videoModal.addEventListener(
    "click",
    (event) => {
      if (event.target.closest("[data-close]")) {
        closeVideoEditor();
        return;
      }

      if (event.target.closest("[data-save]")) {
        saveVideo();
        return;
      }

      const font = event.target.closest(
        "[data-vfont]",
      )?.dataset.vfont;

      if (font) {
        videoState.font = font;
        videoModal
          .querySelectorAll("[data-vfont]")
          .forEach((button) => {
            button.classList.toggle(
              "active",
              button.dataset.vfont === font,
            );
          });
        updateVideoOverlay();
      }
    },
  );

  v.object.addEventListener(
    "pointerdown",
    beginVideoDrag,
  );
  v.object
    .querySelectorAll(
      ".video-resize-handle-v625",
    )
    .forEach((handle) => {
      handle.addEventListener(
        "pointerdown",
        beginVideoResize,
      );
    });

  renderMediaPreview = function() {
    originalRenderMediaPreview();
    const file =
      state.pendingMediaFiles[
        state.pendingMediaIndex
      ];

    if (file) {
      mediaPreviewEdit.classList.remove(
        "hidden",
      );
      mediaPreviewEdit.title =
        file.type.startsWith("video/")
          ? "Редактировать видео"
          : "Редактировать фото";
    }
  };

  mediaPreviewEdit.addEventListener(
    "click",
    (event) => {
      event.stopImmediatePropagation();
      const file =
        state.pendingMediaFiles[
          state.pendingMediaIndex
        ];

      if (file?.type.startsWith("video/")) {
        openVideoEditor();
      } else {
        openImageEditor();
      }
    },
    true,
  );

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Escape") return;

      textPanel.classList.add("hidden");

      if (
        !videoModal.classList.contains(
          "hidden",
        )
      ) {
        closeVideoEditor();
      }
    },
    true,
  );
})();
