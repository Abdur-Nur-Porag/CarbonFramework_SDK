// Carbon :: Scroll
// Attributes:
//   Type="VScroll|HScroll|Both"   -> which axis is scrollable (required to activate the component)
//   ScrollBar="true|false"        -> show/hide the native scrollbar (default: false/hidden)

class AutoScroll {
    constructor(el) {
        this.el = el;
        this.type = el.getAttribute('Type') || 'VScroll';
        this.timeout = null;
        this.vBar = null;
        this.hBar = null;
        this.hWrap = null; // wrapper div used to place HScroll bar after content

        this.createBars();

        // Listen to scroll events properly
        const targetEl = (this.el === document.body || this.el === document.documentElement) ? window : this.el;
        targetEl.addEventListener('scroll', () => this.handleScroll(), { passive: true });
        window.addEventListener('resize', () => this.update(), { passive: true });

        // Render initial state
        this.update();
    }

    createBars() {
        const isBody = this.el === document.body || this.el === document.documentElement;

        // --- VSCROLL: unchanged, overlay style ---
        if (this.type.includes('VScroll')) {
            const parent = isBody ? document.body : this.el;
            const posType = isBody ? 'fixed' : 'absolute';

            this.vBar = document.createElement('div');
            this.vBar.className = 'md-scrollbar-track md-scrollbar-v';
            this.vBar.style.width = '4px'; /* Thinner Material Size */
            this.vBar.style.top = '0px';
            this.vBar.style.left = '0px';
            this.vBar.style.position = posType;
            parent.appendChild(this.vBar);
        }

        // --- HSCROLL: shown AFTER the content (normal flow), not overlapping it ---
        if (this.type.includes('HScroll')) {
            if (isBody) {
                // The page itself can't be "wrapped", so keep it pinned to the
                // viewport bottom. This is the one case that stays an overlay.
                this.hBar = document.createElement('div');
                this.hBar.className = 'md-scrollbar-track md-scrollbar-h';
                this.hBar.style.height = '4px';
                this.hBar.style.top = '0px';
                this.hBar.style.left = '0px';
                this.hBar.style.position = 'fixed';
                document.body.appendChild(this.hBar);
            } else {
                // Wrap the element so we can place the track as a real sibling
                // that sits below the content instead of floating over it.
                const wrapper = document.createElement('div');
                wrapper.className = 'md-hscroll-wrapper';

                this.el.parentNode.insertBefore(wrapper, this.el);
                wrapper.appendChild(this.el);

                const hTrackWrap = document.createElement('div');
                hTrackWrap.className = 'md-hscroll-track-wrap';
                wrapper.appendChild(hTrackWrap);

                this.hBar = document.createElement('div');
                this.hBar.className = 'md-scrollbar-track md-scrollbar-h';
                this.hBar.style.height = '4px';
                this.hBar.style.top = '2px';
                this.hBar.style.left = '0px';
                this.hBar.style.position = 'absolute';
                hTrackWrap.appendChild(this.hBar);

                this.hWrap = wrapper;
            }
        }
    }

    handleScroll() {
        if (this.vBar && this.vBar.style.display !== 'none') this.vBar.style.opacity = '1';
        if (this.hBar && this.hBar.style.display !== 'none') this.hBar.style.opacity = '1';

        this.update();

        clearTimeout(this.timeout);
        this.timeout = setTimeout(() => {
            if (this.vBar) this.vBar.style.opacity = '0';
            if (this.hBar) this.hBar.style.opacity = '0';
        }, 1200);
    }

    update() {
        const isBody = this.el === document.body || this.el === document.documentElement;
        const target = isBody ? document.documentElement : this.el;

        const sTop = isBody ? window.scrollY : target.scrollTop;
        const sLeft = isBody ? window.scrollX : target.scrollLeft;
        const sHeight = target.scrollHeight;
        const sWidth = target.scrollWidth;
        const vHeight = isBody ? window.innerHeight : target.clientHeight;
        const vWidth = isBody ? window.innerWidth : target.clientWidth;

        // --- VSCROLL LOGIC (unchanged, overlay on the right edge) ---
        if (this.vBar) {
            if (sHeight > vHeight + 2) {
                this.vBar.style.display = 'block';

                const barHeight = Math.max((vHeight / sHeight) * vHeight, 30);
                const maxTravel = vHeight - barHeight - 4;
                const scrollPercent = sTop / (sHeight - vHeight);
                const barPos = scrollPercent * maxTravel;

                const offsetX = isBody ? (vWidth - 4) : (sLeft + vWidth - 4);
                const offsetY = isBody ? 0 : sTop;

                this.vBar.style.height = `${barHeight}px`;
                this.vBar.style.transform = `translate(${offsetX}px, ${barPos + offsetY + 2}px)`;
            } else {
                this.vBar.style.display = 'none';
            }
        }

        // --- HSCROLL LOGIC ---
        if (this.hBar) {
            if (sWidth > vWidth + 2) {
                this.hBar.style.display = 'block';

                const barWidth = Math.max((vWidth / sWidth) * vWidth, 30);
                const maxTravel = vWidth - barWidth - 4;
                const scrollPercent = sLeft / (sWidth - vWidth);
                const barPos = scrollPercent * maxTravel;

                if (isBody) {
                    // Still an overlay pinned to the viewport bottom
                    const offsetY = vHeight - 6;
                    this.hBar.style.width = `${barWidth}px`;
                    this.hBar.style.transform = `translate(${barPos + 2}px, ${offsetY}px)`;
                } else {
                    // Track wrap is already positioned right after the content,
                    // so the bar only needs to move horizontally inside it.
                    this.hBar.style.width = `${barWidth}px`;
                    this.hBar.style.transform = `translate(${barPos + 2}px, 0px)`;
                }
            } else {
                this.hBar.style.display = 'none';
                // Collapse the track-wrap row so no empty gap is left when
                // there's nothing to scroll horizontally.
                if (this.hWrap) {
                    const trackWrap = this.hWrap.querySelector('.md-hscroll-track-wrap');
                    if (trackWrap) trackWrap.style.display = 'none';
                }
            }

            if (!isBody && this.hWrap && sWidth > vWidth + 2) {
                const trackWrap = this.hWrap.querySelector('.md-hscroll-track-wrap');
                if (trackWrap) trackWrap.style.display = 'block';
            }
        }
    }
}

// Auto-initialize system
function initAutoScroll() {
    const elements = document.querySelectorAll('[ScrollBar="true"]');
    elements.forEach(el => {
        if (!el.dataset.scrollInited) {
            new AutoScroll(el);
            el.dataset.scrollInited = "true";
        }
    });
}

//run dom
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        CarbonScrollEngine.scan(document);
    });
} else {
    CarbonScrollEngine.scan(document);
}

// Watch for dynamically added elements in the future
const observer_1 = new MutationObserver(initAutoScroll);
observer_1.observe(document.body, { childList: true, subtree: true });




/*********OverScrollEffect Code*************/

//   OverScrollEffect="true|false" -> enable the Android-style edge-glow bounce on this container
//   OverScrollEffectColor="..."   -> CSS color for the glow (default: rgba(0,0,0,0.15))
const CarbonScrollEngine = (() => {

    // ---- Edge-glow tuning ----------------------------------------------
    // ---- Edge-glow tuning ----------------------------------------------
const PULL_RESISTANCE = 0.4;
const MAX_PULL_DISTANCE = 150;
const MAX_OPACITY = 0.5;
const HOLD_DECAY_MS = 200;
const SIZE_RATIO_Y = 0.5;
const SIZE_RATIO_X = 0.9; /* Increased from 0.10 to give a deeper horizontal stretch */
const MIN_MAX_SIZE = 10;
const MAX_MAX_SIZE = 80; /* Increased from 60 to match the new 80px CSS width */

    // ---- Cross-axis "follow the gesture" tuning -------------------------
    // While pulling vertically (top/bottom), horizontal finger movement
    // drags the glow ellipse sideways with it, and vice-versa for the
    // left/right glow with vertical finger movement.
    //
    // Default (a straight, centered pull with no sideways movement) shows the
    // dome centered in the middle of the edge. Dragging sideways during the
    // pull slides the dome's peak toward that side, until - at full drag - the
    // peak sits right on the opposite edge and the curve tapers smoothly to
    // zero exactly at the near edge (a full "hug the edge" sweep).
    //
    // CROSS_OVERHANG_RATIO is how far the glow div extends past the container
    // on each side, and MUST match the CSS (.carbon-edge-glow: width/height
    // 200%, left/top -50% => 50% overhang each side). MAX_CROSS_RATIO is kept
    // equal to it on purpose: that's the exact ratio at which the taper lands
    // on the far edge with zero height, so nothing gets clipped mid-curve into
    // a hard flat wall. If you change the CSS overhang, update this to match.
    const CROSS_OVERHANG_RATIO = 0.5;
    const MAX_CROSS_RATIO = CROSS_OVERHANG_RATIO; // soft-clamp ceiling, as a fraction of the container's cross size
    // How closely the ellipse tracks the perpendicular drag. Raised from the
    // old 0.10 so a normal-length finger drag can actually reach the wider
    // MAX_CROSS_RATIO range above - at 0.10 you'd need ~1500px of travel to
    // get near the cap, which no touch gesture can produce.
    const CROSS_RESISTANCE = 0.45;

    function clamp(v, min, max) {
        return Math.min(Math.max(v, min), max);
}
    // Eases toward `max` instead of hard-cutting at it, so the ellipse never
    // snaps against its overhang limit - it just slows down as it approaches.
    function softClamp(value, max) {
        if (max <= 0) return 0;
        return max * Math.tanh(value / max);
    }

    function computeMaxSize(sizePx, isVertical) {
        const ratio = isVertical ? SIZE_RATIO_Y : SIZE_RATIO_X;
        const raw = sizePx * ratio;
        return Math.min(Math.max(raw, MIN_MAX_SIZE), MAX_MAX_SIZE);
    }

    function buildGlow(edge) {
        const glow = document.createElement('div');
        glow.className = `carbon-edge-glow ${edge}`;
        return glow;
    }

    // crossOffset: perpendicular drift caused by sideways (or up/down) finger
    // movement during the pull. Defaults to 0 so existing callers keep working.
    function applyGlow(el, axisProp, containerDimension, color, distance, scrollOffset, crossOffset = 0) {
        const pull = Math.abs(distance) * PULL_RESISTANCE;
        const intensity = Math.min(pull / MAX_PULL_DISTANCE, 1);

        const isVertical = (axisProp === 'height');
        // Glow height/width auto-adjusts to the container's current size on every call,
        // so it always tracks the ScrollLayout's live height/width.
        const targetMaxSize = computeMaxSize(containerDimension, isVertical);
        const scaleFactor = (intensity * targetMaxSize) / MAX_MAX_SIZE;

        el.style.backgroundColor = color;
        el.style.opacity = intensity * MAX_OPACITY;

        if (!isVertical) {
            // left/right glow: pinned to the edge along X (scrollOffset),
            // free to drift up/down along Y (crossOffset) as the finger moves.
            el.style.transform = `translate(${scrollOffset}px, ${crossOffset}px) scaleX(${scaleFactor})`;
        } else {
            // top/bottom glow: pinned to the edge along Y (scrollOffset),
            // free to drift left/right along X (crossOffset) as the finger moves.
            el.style.transform = `translate(${crossOffset}px, ${scrollOffset}px) scaleY(${scaleFactor})`;
        }
    }

    function resetGlow(el, axisProp, isHold = false) {
        if (!el) return;
        el.style.transition = isHold
            ? 'transform 0.8s cubic-bezier(0.2, 0, 0.2, 1), opacity 0.8s cubic-bezier(0.2, 0, 0.2, 1)'
            : 'transform 0.4s cubic-bezier(0.0, 0, 0.2, 1), opacity 0.3s linear';

        el.style.opacity = '0';

        if (axisProp === 'width') {
            el.style.transform = el.style.transform.replace(/scaleX\([^)]*\)/, 'scaleX(0)');
        } else {
            el.style.transform = el.style.transform.replace(/scaleY\([^)]*\)/, 'scaleY(0)');
        }
    }

    function initOverScrollEffect(container, canScrollX, canScrollY) {
        if (container._carbonOverScrollInit) return;
        container._carbonOverScrollInit = true;

        const edgeColor = container.getAttribute('OverScrollEffectColor') || 'rgba(0,0,0,0.15)';

        if (getComputedStyle(container).position === 'static') {
            container.style.position = 'relative';
        }
        container.style.overscrollBehavior = 'none';

        let topGlow, bottomGlow, leftGlow, rightGlow;

        if (canScrollY) {
            topGlow = buildGlow('top');
            bottomGlow = buildGlow('bottom');
            container.appendChild(topGlow);
            container.appendChild(bottomGlow);
        }
        if (canScrollX) {
            leftGlow = buildGlow('left');
            rightGlow = buildGlow('right');
            container.appendChild(leftGlow);
            container.appendChild(rightGlow);
        }

        let startX = 0, startY = 0;
        let edgeStartX = null, edgeStartY = null;
        // Position captured the moment a pull begins, used to measure the
        // perpendicular ("cross-axis") gesture movement that follows.
        let crossStartX = null; // x at the moment a vertical (top/bottom) pull starts
        let crossStartY = null; // y at the moment a horizontal (left/right) pull starts
        let wheelAccX = 0, wheelAccY = 0, wheelTimeout;
        let holdTimeout;

        const onEnd = () => {
            clearTimeout(holdTimeout);
            edgeStartX = null;
            edgeStartY = null;
            crossStartX = null;
            crossStartY = null;
            if (topGlow) { resetGlow(topGlow, 'height', false); resetGlow(bottomGlow, 'height', false); }
            if (leftGlow) { resetGlow(leftGlow, 'width', false); resetGlow(rightGlow, 'width', false); }
        };

        const onHoldDecay = () => {
            if (topGlow) { resetGlow(topGlow, 'height', true); resetGlow(bottomGlow, 'height', true); }
            if (leftGlow) { resetGlow(leftGlow, 'width', true); resetGlow(rightGlow, 'width', true); }
        };

        container.addEventListener('touchstart', (e) => {
            clearTimeout(holdTimeout);
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            edgeStartX = null;
            edgeStartY = null;
            crossStartX = null;
            crossStartY = null;

            if (topGlow) { topGlow.style.transition = 'none'; bottomGlow.style.transition = 'none'; }
            if (leftGlow) { leftGlow.style.transition = 'none'; rightGlow.style.transition = 'none'; }
        }, { passive: true });

        container.addEventListener('touchmove', (e) => {
            const currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;
            const deltaX = currentX - startX;
            const deltaY = currentY - startY;
            let applied = false;

            if (canScrollY && container.scrollHeight > container.clientHeight) {
                const isAtTop = container.scrollTop <= 0;
                const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 1;

                if (isAtTop && deltaY > 0 && Math.abs(deltaY) >= Math.abs(deltaX)) {
                    if (edgeStartY === null) {
                        edgeStartY = currentY;
                        crossStartX = currentX;
                        topGlow.style.transition = 'none';
                    }
                    const pull = currentY - edgeStartY;
                    if (pull > 0) {
                        if (e.cancelable) e.preventDefault();
                        const maxCross = container.clientWidth * MAX_CROSS_RATIO;
                        const crossOffset = softClamp((currentX - crossStartX) * CROSS_RESISTANCE, maxCross);
                        applyGlow(topGlow, 'height', container.clientHeight, edgeColor, pull, container.scrollTop, crossOffset);
                        applied = true;
                    }
                } else if (isAtBottom && deltaY < 0 && Math.abs(deltaY) >= Math.abs(deltaX)) {
                    if (edgeStartY === null) {
                        edgeStartY = currentY;
                        crossStartX = currentX;
                        bottomGlow.style.transition = 'none';
                    }
                    const pull = currentY - edgeStartY;
                    if (pull < 0) {
                        if (e.cancelable) e.preventDefault();
                        const maxCross = container.clientWidth * MAX_CROSS_RATIO;
                        const crossOffset = softClamp((currentX - crossStartX) * CROSS_RESISTANCE, maxCross);
                        applyGlow(bottomGlow, 'height', container.clientHeight, edgeColor, pull, container.scrollTop, crossOffset);
                        applied = true;
                    }
                } else {
                    edgeStartY = null;
                    crossStartX = null;
                }
            }

            if (!applied && canScrollX && container.scrollWidth > container.clientWidth) {
                const isAtLeft = container.scrollLeft <= 0;
                const isAtRight = container.scrollWidth - container.scrollLeft <= container.clientWidth + 1;

                if (isAtLeft && deltaX > 0 && Math.abs(deltaX) > Math.abs(deltaY)) {
                    if (edgeStartX === null) {
                        edgeStartX = currentX;
                        crossStartY = currentY;
                        leftGlow.style.transition = 'none';
                    }
                    const pull = currentX - edgeStartX;
                    if (pull > 0) {
                        if (e.cancelable) e.preventDefault();
                        const maxCross = container.clientHeight * MAX_CROSS_RATIO;
                        const crossOffset = softClamp((currentY - crossStartY) * CROSS_RESISTANCE, maxCross);
                        applyGlow(leftGlow, 'width', container.clientWidth, edgeColor, pull, container.scrollLeft, crossOffset);
                        applied = true;
                    }
                } else if (isAtRight && deltaX < 0 && Math.abs(deltaX) > Math.abs(deltaY)) {
                    if (edgeStartX === null) {
                        edgeStartX = currentX;
                        crossStartY = currentY;
                        rightGlow.style.transition = 'none';
                    }
                    const pull = currentX - edgeStartX;
                    if (pull < 0) {
                        if (e.cancelable) e.preventDefault();
                        const maxCross = container.clientHeight * MAX_CROSS_RATIO;
                        const crossOffset = softClamp((currentY - crossStartY) * CROSS_RESISTANCE, maxCross);
                        applyGlow(rightGlow, 'width', container.clientWidth, edgeColor, pull, container.scrollLeft, crossOffset);
                        applied = true;
                    }
                } else {
                    edgeStartX = null;
                    crossStartY = null;
                }
            }

            if (applied) {
                clearTimeout(holdTimeout);
                holdTimeout = setTimeout(onHoldDecay, HOLD_DECAY_MS);
            }

        }, { passive: false });

        container.addEventListener('touchend', onEnd);
        container.addEventListener('touchcancel', onEnd);

        // --- Mouse Wheel ---
        // No drag gesture exists for wheel input, so the cross-axis offset
        // instead tracks the pointer's fixed position relative to the
        // container's center (where the cursor sits while the wheel scrolls).
        container.addEventListener('wheel', (e) => {
            const rect = container.getBoundingClientRect();

            if (canScrollY && container.scrollHeight > container.clientHeight && Math.abs(e.deltaY) >= Math.abs(e.deltaX)) {
                const isAtTop = container.scrollTop <= 0;
                const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 1;
                if (isAtTop && e.deltaY < 0) {
                    e.preventDefault();
                    topGlow.style.transition = 'none';
                    wheelAccY += Math.abs(e.deltaY);
                    const maxCross = container.clientWidth * MAX_CROSS_RATIO;
                    const crossOffset = softClamp((e.clientX - (rect.left + rect.width / 2)) * CROSS_RESISTANCE, maxCross);
                    applyGlow(topGlow, 'height', container.clientHeight, edgeColor, wheelAccY, container.scrollTop, crossOffset);
                    debounceWheelReset();
                    return;
                } else if (isAtBottom && e.deltaY > 0) {
                    e.preventDefault();
                    bottomGlow.style.transition = 'none';
                    wheelAccY += Math.abs(e.deltaY);
                    const maxCross = container.clientWidth * MAX_CROSS_RATIO;
                    const crossOffset = softClamp((e.clientX - (rect.left + rect.width / 2)) * CROSS_RESISTANCE, maxCross);
                    applyGlow(bottomGlow, 'height', container.clientHeight, edgeColor, wheelAccY, container.scrollTop, crossOffset);
                    debounceWheelReset();
                    return;
                } else {
                    wheelAccY = 0;
                }
            }

            if (canScrollX && container.scrollWidth > container.clientWidth && Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
                const isAtLeft = container.scrollLeft <= 0;
                const isAtRight = container.scrollWidth - container.scrollLeft <= container.clientWidth + 1;
                if (isAtLeft && e.deltaX < 0) {
                    e.preventDefault();
                    leftGlow.style.transition = 'none';
                    wheelAccX += Math.abs(e.deltaX);
                    const maxCross = container.clientHeight * MAX_CROSS_RATIO;
                    const crossOffset = softClamp((e.clientY - (rect.top + rect.height / 2)) * CROSS_RESISTANCE, maxCross);
                    applyGlow(leftGlow, 'width', container.clientWidth, edgeColor, wheelAccX, container.scrollLeft, crossOffset);
                    debounceWheelReset();
                } else if (isAtRight && e.deltaX > 0) {
                    e.preventDefault();
                    rightGlow.style.transition = 'none';
                    wheelAccX += Math.abs(e.deltaX);
                    const maxCross = container.clientHeight * MAX_CROSS_RATIO;
                    const crossOffset = softClamp((e.clientY - (rect.top + rect.height / 2)) * CROSS_RESISTANCE, maxCross);
                    applyGlow(rightGlow, 'width', container.clientWidth, edgeColor, wheelAccX, container.scrollLeft, crossOffset);
                    debounceWheelReset();
                } else {
                    wheelAccX = 0;
                }
            }
        }, { passive: false });

        function debounceWheelReset() {
            clearTimeout(wheelTimeout);
            wheelTimeout = setTimeout(() => {
                wheelAccX = 0;
                wheelAccY = 0;
                onEnd();
            }, 150);
        }
    }

    function initScroll(el) {
        if (el._carbonScrollInit) return;
        el._carbonScrollInit = true;

        const type = (el.getAttribute('Type') || '').toLowerCase();
        const hasScrollBar = el.getAttribute('ScrollBar') === 'true';

        const canScrollY = (type === 'vscroll' || type === 'both');
        const canScrollX = (type === 'hscroll' || type === 'both');

        if (canScrollY) el.style.overflowY = 'auto';
        if (canScrollX) el.style.overflowX = 'auto';
        if (!canScrollY) el.style.overflowY = el.style.overflowY || 'hidden';
        if (!canScrollX) el.style.overflowX = el.style.overflowX || 'hidden';

        // Reflect ScrollBar attribute for the CSS selectors (default hidden).
        if (hasScrollBar) {
            el.setAttribute('ScrollBar', 'true');
        }

        if (el.getAttribute('OverScrollEffect') === 'true') {
            initOverScrollEffect(el, canScrollX, canScrollY);
        }
    }

    function scan(root) {
        (root.querySelectorAll ? root.querySelectorAll('[Type]') : []).forEach(initScroll);
        if (root.getAttribute && root.getAttribute('Type')) initScroll(root);
    }

    return { initScroll, scan };
})();

document.addEventListener('DOMContentLoaded', () => {
    CarbonScrollEngine.scan(document);
});

// Observer for dynamically injected scroll containers (e.g. Alert's ScrollBar/Type content).
const CarbonScrollObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
            if (node.nodeType !== 1) return;
            CarbonScrollEngine.scan(node);
        });
    });
});

CarbonScrollObserver.observe(document.documentElement, { childList: true, subtree: true });