/**
 * Image loading enhancement
 * Adds loaded/error states, lightbox, and portrait image grouping
 */

// 使用 WeakSet 跟踪已增强的图片，避免重复处理
const enhancedImages = new WeakSet<HTMLImageElement>();

// Zoom state for lightbox
interface ZoomState {
  scale: number;
  translateX: number;
  translateY: number;
  lastPinchDistance: number;
  isPinching: boolean;
  isPanning: boolean;
  isMouseDragging: boolean;
  lastPanPoint: { x: number; y: number };
}

const MIN_SCALE = 1;
const MAX_SCALE = 5;

function getInitialZoomState(): ZoomState {
  return {
    scale: 1,
    translateX: 0,
    translateY: 0,
    lastPinchDistance: 0,
    isPinching: false,
    isPanning: false,
    isMouseDragging: false,
    lastPanPoint: { x: 0, y: 0 },
  };
}

let zoomState = getInitialZoomState();

// Cached lightbox image reference (set when lightbox is created)
let lightboxImg: HTMLImageElement | null = null;

/**
 * Get or create lightbox element (handles SPA navigation)
 */
function getLightbox(): HTMLElement {
  let overlay = document.querySelector('.markdown-image-lightbox');
  if (!overlay) {
    overlay = createLightbox();
    document.body.appendChild(overlay);
  } else {
    // Update cached reference if lightbox already exists
    lightboxImg = overlay.querySelector('.markdown-image-lightbox-img');
  }
  return overlay as HTMLElement;
}

/**
 * Create fullscreen button for images
 */
function createFullscreenButton(): HTMLButtonElement {
  const button = document.createElement('button');
  button.className = 'markdown-image-fullscreen';
  button.setAttribute('type', 'button');
  button.setAttribute('aria-label', '全屏查看');
  button.title = '全屏查看';
  button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>`;
  return button;
}

/**
 * Get distance between two touch points
 */
function getTouchDistance(touches: TouchList): number {
  if (touches.length < 2) return 0;
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Get center point between two touches
 */
function getTouchCenter(touches: TouchList): { x: number; y: number } {
  if (touches.length < 2) {
    return { x: touches[0].clientX, y: touches[0].clientY };
  }
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  };
}

/**
 * Clamp translation to keep image within reasonable bounds
 */
function clampTranslation(img: HTMLImageElement): void {
  if (zoomState.scale <= 1) return;

  const rect = img.getBoundingClientRect();
  const containerWidth = window.innerWidth;
  const containerHeight = window.innerHeight;

  // Calculate scaled dimensions
  const scaledWidth = rect.width;
  const scaledHeight = rect.height;

  // Allow panning up to half the image size beyond viewport
  const maxX = Math.max(0, (scaledWidth - containerWidth) / 2 + containerWidth * 0.3);
  const maxY = Math.max(0, (scaledHeight - containerHeight) / 2 + containerHeight * 0.3);

  zoomState.translateX = Math.max(-maxX, Math.min(maxX, zoomState.translateX));
  zoomState.translateY = Math.max(-maxY, Math.min(maxY, zoomState.translateY));
}

/**
 * Apply zoom transform to lightbox image
 */
function applyZoomTransform(img: HTMLImageElement): void {
  clampTranslation(img);
  const { scale, translateX, translateY } = zoomState;
  img.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
  img.style.cursor = scale > 1 ? (zoomState.isMouseDragging ? 'grabbing' : 'grab') : 'zoom-in';
}

/**
 * Reset zoom state and transform
 */
function resetZoom(): void {
  zoomState = getInitialZoomState();
  if (lightboxImg) {
    lightboxImg.style.transform = '';
    lightboxImg.style.cursor = 'zoom-in';
  }
}

/**
 * Handle touch start for pinch zoom
 */
function handleTouchStart(e: TouchEvent): void {
  if (e.touches.length === 2) {
    e.preventDefault();
    zoomState.isPinching = true;
    zoomState.lastPinchDistance = getTouchDistance(e.touches);
  } else if (e.touches.length === 1 && zoomState.scale > 1) {
    // Start panning when zoomed in
    zoomState.isPanning = true;
    zoomState.lastPanPoint = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  }
}

/**
 * Handle touch move for pinch zoom and pan
 */
function handleTouchMove(e: TouchEvent): void {
  if (!lightboxImg) return;

  if (e.touches.length === 2 && zoomState.isPinching) {
    e.preventDefault();
    const currentDistance = getTouchDistance(e.touches);
    const scaleDelta = currentDistance / zoomState.lastPinchDistance;

    // Calculate new scale
    let newScale = zoomState.scale * scaleDelta;
    newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));

    // Zoom towards pinch center
    if (newScale !== zoomState.scale) {
      const center = getTouchCenter(e.touches);
      const rect = lightboxImg.getBoundingClientRect();
      const imgCenterX = rect.left + rect.width / 2;
      const imgCenterY = rect.top + rect.height / 2;

      // Adjust translation to zoom towards pinch point
      const scaleRatio = newScale / zoomState.scale;
      zoomState.translateX = center.x - (center.x - imgCenterX - zoomState.translateX) * scaleRatio - imgCenterX;
      zoomState.translateY = center.y - (center.y - imgCenterY - zoomState.translateY) * scaleRatio - imgCenterY;

      zoomState.scale = newScale;
      applyZoomTransform(lightboxImg);
    }

    zoomState.lastPinchDistance = currentDistance;
  } else if (e.touches.length === 1 && zoomState.isPanning && zoomState.scale > 1) {
    e.preventDefault();
    const deltaX = e.touches[0].clientX - zoomState.lastPanPoint.x;
    const deltaY = e.touches[0].clientY - zoomState.lastPanPoint.y;

    zoomState.translateX += deltaX;
    zoomState.translateY += deltaY;
    zoomState.lastPanPoint = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };

    applyZoomTransform(lightboxImg);
  }
}

/**
 * Handle touch end
 */
function handleTouchEnd(e: TouchEvent): void {
  if (e.touches.length < 2) {
    zoomState.isPinching = false;
  }
  if (e.touches.length === 0) {
    zoomState.isPanning = false;
    if (lightboxImg && zoomState.scale > 1) {
      lightboxImg.style.cursor = 'grab';
    }
  }

  // Reset if scale is close to 1
  if (zoomState.scale < 1.05) {
    resetZoom();
  }
}

/**
 * Handle wheel for zoom (ctrl/cmd + scroll or trackpad pinch)
 */
function handleWheel(e: WheelEvent): void {
  // Trackpad pinch fires wheel events with ctrlKey
  if (!e.ctrlKey && !e.metaKey) return;
  if (!lightboxImg) return;

  e.preventDefault();

  // Calculate new scale
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  let newScale = zoomState.scale * delta;
  newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));

  if (newScale !== zoomState.scale) {
    const rect = lightboxImg.getBoundingClientRect();
    const imgCenterX = rect.left + rect.width / 2;
    const imgCenterY = rect.top + rect.height / 2;

    // Zoom towards cursor position
    const scaleRatio = newScale / zoomState.scale;
    zoomState.translateX = e.clientX - (e.clientX - imgCenterX - zoomState.translateX) * scaleRatio - imgCenterX;
    zoomState.translateY = e.clientY - (e.clientY - imgCenterY - zoomState.translateY) * scaleRatio - imgCenterY;

    zoomState.scale = newScale;
    applyZoomTransform(lightboxImg);
  }

  // Reset if scale is close to 1
  if (zoomState.scale < 1.05) {
    resetZoom();
  }
}

/**
 * Handle double tap/click to toggle zoom
 */
function handleDoubleClick(e: MouseEvent): void {
  if (!lightboxImg) return;
  const target = e.target as HTMLElement;
  if (!target.classList.contains('markdown-image-lightbox-img')) return;

  e.preventDefault();
  e.stopPropagation();

  if (zoomState.scale > 1) {
    // Reset zoom
    resetZoom();
  } else {
    // Zoom to 2x at click point
    const rect = lightboxImg.getBoundingClientRect();
    const imgCenterX = rect.left + rect.width / 2;
    const imgCenterY = rect.top + rect.height / 2;

    const newScale = 2;
    const scaleRatio = newScale / zoomState.scale;
    zoomState.translateX = e.clientX - (e.clientX - imgCenterX) * scaleRatio - imgCenterX;
    zoomState.translateY = e.clientY - (e.clientY - imgCenterY) * scaleRatio - imgCenterY;
    zoomState.scale = newScale;

    applyZoomTransform(lightboxImg);
  }
}

/**
 * Handle mouse move for panning when zoomed
 */
function handleMouseMove(e: MouseEvent): void {
  if (!zoomState.isMouseDragging || zoomState.scale <= 1 || !lightboxImg) return;

  const deltaX = e.clientX - zoomState.lastPanPoint.x;
  const deltaY = e.clientY - zoomState.lastPanPoint.y;

  zoomState.translateX += deltaX;
  zoomState.translateY += deltaY;
  zoomState.lastPanPoint = { x: e.clientX, y: e.clientY };

  applyZoomTransform(lightboxImg);
}

/**
 * Handle mouse up to end panning
 */
function handleMouseUp(): void {
  if (zoomState.isMouseDragging) {
    zoomState.isMouseDragging = false;
    if (lightboxImg && zoomState.scale > 1) {
      lightboxImg.style.cursor = 'grab';
    }
  }
}

/**
 * Create lightbox overlay for fullscreen image viewing
 */
function createLightbox(): HTMLElement {
  const overlay = document.createElement('div');
  overlay.className = 'markdown-image-lightbox';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', '图片全屏查看');

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.className = 'markdown-image-lightbox-close';
  closeBtn.setAttribute('type', 'button');
  closeBtn.setAttribute('aria-label', '关闭');
  closeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

  // Image container
  const imgContainer = document.createElement('div');
  imgContainer.className = 'markdown-image-lightbox-content';

  const img = document.createElement('img');
  img.className = 'markdown-image-lightbox-img';

  // Cache the image reference
  lightboxImg = img;

  imgContainer.appendChild(img);
  overlay.appendChild(closeBtn);
  overlay.appendChild(imgContainer);

  // Close on overlay click (not image), but not when zoomed and panning
  overlay.addEventListener('click', (e) => {
    if (zoomState.scale > 1) return; // Don't close when zoomed
    if (e.target === overlay || e.target === imgContainer) {
      closeLightbox();
    }
  });

  // Close button click
  closeBtn.addEventListener('click', closeLightbox);

  // Touch events for pinch zoom
  imgContainer.addEventListener('touchstart', handleTouchStart, { passive: false });
  imgContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
  imgContainer.addEventListener('touchend', handleTouchEnd);
  imgContainer.addEventListener('touchcancel', handleTouchEnd);

  // Wheel event for ctrl+scroll zoom (and trackpad pinch)
  imgContainer.addEventListener('wheel', handleWheel, { passive: false });

  // Double click/tap to toggle zoom
  img.addEventListener('dblclick', handleDoubleClick);

  // Mouse drag for panning when zoomed (on imgContainer to capture moves outside img)
  img.addEventListener('mousedown', (e) => {
    if (zoomState.scale > 1) {
      e.preventDefault();
      zoomState.isMouseDragging = true;
      zoomState.lastPanPoint = { x: e.clientX, y: e.clientY };
      img.style.cursor = 'grabbing';
    }
  });

  // Use imgContainer for mousemove/mouseup to avoid adding listeners to document
  imgContainer.addEventListener('mousemove', handleMouseMove);
  imgContainer.addEventListener('mouseup', handleMouseUp);
  imgContainer.addEventListener('mouseleave', handleMouseUp);

  return overlay;
}

/**
 * Open lightbox with image
 */
function openLightbox(imgSrc: string, imgAlt: string): void {
  const overlay = getLightbox();

  // Reset zoom state at start (ensures clean state even if previous close was interrupted)
  resetZoom();

  if (!lightboxImg) return;

  // 先隐藏图片，防止显示上一张
  lightboxImg.classList.remove('loaded');
  lightboxImg.src = '';

  // 设置新图片源
  lightboxImg.alt = imgAlt;
  lightboxImg.src = imgSrc;

  // 图片加载完成后显示
  lightboxImg.onload = () => {
    lightboxImg?.classList.add('loaded');
  };

  overlay.classList.add('active');
  document.body.classList.add('lightbox-open');

  // Add ESC listener
  document.addEventListener('keydown', handleLightboxKeydown);
}

/**
 * Close lightbox
 */
function closeLightbox(): void {
  const overlay = document.querySelector('.markdown-image-lightbox');
  if (overlay) {
    overlay.classList.remove('active');
    document.body.classList.remove('lightbox-open');
    document.removeEventListener('keydown', handleLightboxKeydown);
    // Reset zoom state
    resetZoom();
  }
}

/**
 * Handle keydown for lightbox
 */
function handleLightboxKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    closeLightbox();
  }
}

/**
 * Create accessible error placeholder for failed images
 */
function createErrorPlaceholder(img: HTMLImageElement): HTMLElement {
  const placeholder = document.createElement('div');
  placeholder.className = 'markdown-image-error';
  placeholder.setAttribute('role', 'img');
  placeholder.setAttribute('aria-label', img.alt ? `图片加载失败: ${img.alt}` : '图片加载失败');

  // Icon
  const icon = document.createElement('span');
  icon.className = 'markdown-image-error-icon';
  icon.setAttribute('aria-hidden', 'true');

  // Text
  const text = document.createElement('span');
  text.className = 'markdown-image-error-text';
  text.textContent = '图片加载失败';

  placeholder.appendChild(icon);
  placeholder.appendChild(text);

  return placeholder;
}

/**
 * Handle image click for lightbox (using event delegation)
 */
function handleImageClick(e: Event): void {
  const target = e.target as HTMLElement;

  // Check if clicked on image or fullscreen button
  if (target.classList.contains('markdown-image')) {
    const img = target as HTMLImageElement;
    openLightbox(img.src, img.alt || '图片');
  } else if (target.closest('.markdown-image-fullscreen')) {
    const wrapper = target.closest('.markdown-image-wrapper');
    const img = wrapper?.querySelector('.markdown-image') as HTMLImageElement;
    if (img) {
      e.stopPropagation();
      openLightbox(img.src, img.alt || '图片');
    }
  }
}

export function enhanceImages(container: Element): void {
  const images = container.querySelectorAll<HTMLImageElement>('.markdown-image');
  let loadedCount = 0;
  const totalImages = images.length;

  // 使用事件委托处理点击，避免为每个图片添加监听器
  container.addEventListener('click', handleImageClick);

  const checkAllLoaded = () => {
    loadedCount++;
    if (loadedCount >= totalImages) {
      // All images processed, group portrait images
      groupPortraitImages(container);
    }
  };

  images.forEach((img) => {
    // Skip if already enhanced (using WeakSet for SPA compatibility)
    if (enhancedImages.has(img)) {
      checkAllLoaded();
      return;
    }
    enhancedImages.add(img);

    // Check if already loaded (cached images)
    if (img.complete && img.naturalWidth > 0) {
      handleImageLoaded(img);
      checkAllLoaded();
      return;
    }

    // Check if already errored (broken image)
    if (img.complete && img.naturalWidth === 0) {
      handleImageError(img);
      checkAllLoaded();
      return;
    }

    // Handle load event
    img.addEventListener(
      'load',
      () => {
        handleImageLoaded(img);
        checkAllLoaded();
      },
      { once: true },
    );

    // Handle error event
    img.addEventListener(
      'error',
      () => {
        handleImageError(img);
        checkAllLoaded();
      },
      { once: true },
    );
  });

  // If no images, still run grouping (in case of pre-marked portraits)
  if (totalImages === 0) {
    groupPortraitImages(container);
  }
}

function handleImageLoaded(img: HTMLImageElement): void {
  img.classList.add('loaded');

  // Mark portrait images (height > width * 1.2 to ensure clearly portrait)
  const isPortrait = img.naturalHeight > img.naturalWidth * 1.2;
  if (isPortrait) {
    img.closest('.markdown-image-wrapper')?.classList.add('portrait');
  }

  const wrapper = img.closest('.markdown-image-wrapper');
  if (!wrapper || wrapper.querySelector('.markdown-image-fullscreen')) return;

  // Add fullscreen button (click handled by event delegation)
  const fullscreenBtn = createFullscreenButton();
  wrapper.appendChild(fullscreenBtn);

  // Set cursor style
  img.style.cursor = 'zoom-in';
}

function handleImageError(img: HTMLImageElement): void {
  img.classList.add('error');

  // Add accessible error placeholder
  const wrapper = img.closest('.markdown-image-wrapper');
  if (wrapper && !wrapper.querySelector('.markdown-image-error')) {
    const placeholder = createErrorPlaceholder(img);
    wrapper.appendChild(placeholder);
  }
}

/**
 * Group consecutive portrait images side by side
 */
function groupPortraitImages(container: Element): void {
  const allWrappers = Array.from(container.querySelectorAll('.markdown-image-wrapper'));

  let currentGroup: Element[] = [];

  const flushGroup = () => {
    if (currentGroup.length >= 2) {
      // Create a row container
      const row = document.createElement('div');
      row.className = 'markdown-image-row';

      // Insert row before first image in group
      currentGroup[0].parentNode?.insertBefore(row, currentGroup[0]);

      // Use DocumentFragment for batch DOM operations
      const fragment = document.createDocumentFragment();
      currentGroup.forEach((wrapper) => {
        fragment.appendChild(wrapper);
      });
      row.appendChild(fragment);
    }
    currentGroup = [];
  };

  allWrappers.forEach((wrapper, index) => {
    const isPortrait = wrapper.classList.contains('portrait');
    // Skip if already in a row
    if (wrapper.parentElement?.classList.contains('markdown-image-row')) return;

    if (isPortrait) {
      const prevWrapper = allWrappers[index - 1];

      // Check if this wrapper is immediately after the previous portrait
      if (
        currentGroup.length > 0 &&
        prevWrapper &&
        prevWrapper.classList.contains('portrait') &&
        isConsecutiveSibling(prevWrapper, wrapper)
      ) {
        currentGroup.push(wrapper);
      } else {
        flushGroup();
        currentGroup = [wrapper];
      }
    } else {
      flushGroup();
    }
  });

  flushGroup();
}

/**
 * Check if two elements are consecutive siblings (allowing text nodes between)
 */
function isConsecutiveSibling(el1: Element, el2: Element): boolean {
  let next = el1.nextSibling;
  while (next) {
    // Skip empty text nodes
    if (next.nodeType === Node.TEXT_NODE && next.textContent?.trim() === '') {
      next = next.nextSibling;
      continue;
    }
    return next === el2;
  }
  return false;
}
