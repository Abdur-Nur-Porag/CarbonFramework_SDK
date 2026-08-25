class GridPixel {
    constructor() {
        this.engine = null; 
        this._id = null;
        this._visible = true;
        this._colSpan = 100; 
        this._rowSpan = 100; 
        this._x = 0; 
        this._y = 0;
        this.parent = null;
        this._children = [];
        
        this._hScroll = false;
        this._vScroll = false;
        this.scrollX = 0;
        this.scrollY = 0;
        this.maxScrollX = 0;
        this.maxScrollY = 0;

        this._text = "";
        this._html = "";
        this._events = {};
        
        this._domNode = null;
        this.bounds = { x: 0, y: 0, w: 0, h: 0 };
        this._isHovered = false;
        this._hoverCss = null;
        
        this.css = {
            backgroundColor: "transparent",
            color: "#ffffff",
            border: null,
            opacity: 1,
            font: "16px sans-serif",
            borderRadius: "0px",
            rotateX: 0, rotateY: 0, rotateZ: 0,
            translateX: 0, translateY: 0,
            shadowColor: "transparent",
            shadowX: 0, shadowY: 0, shadowBlur: 0
        };

        this._cachedState = {
            styleString: "",
            html: ""
        };
    }

    markDirty() {
        if (this.engine) this.engine.requestRedraw();
    }

    id(name) { this._id = name; return this; }
    
    patch(newProps) {
        let changed = false;
        if (newProps.x !== undefined && this._x !== newProps.x) { this._x = newProps.x; changed = true; }
        if (newProps.y !== undefined && this._y !== newProps.y) { this._y = newProps.y; changed = true; }
        if (newProps.html !== undefined && this._html !== newProps.html) { this._html = newProps.html; changed = true; }
        
        if (newProps.css) {
            for (let key in newProps.css) {
                if (this.css[key] !== newProps.css[key]) {
                    this.css[key] = newProps.css[key];
                    changed = true;
                }
            }
        }
        if (changed) this.markDirty();
        return this;
    }

    at(x, y) { this.patch({x: Math.max(0, x), y: Math.max(0, y)}); return this; }
    colspan(size) { this._colSpan = Math.max(0, size); this.markDirty(); return this; }
    rowspan(size) { this._rowSpan = Math.max(0, size); this.markDirty(); return this; }
    style(cssObj) { this.patch({css: cssObj}); return this; }
    hoverStyle(cssObj) { this._hoverCss = cssObj; return this; }
    vScroll(enabled) { this._vScroll = enabled === true || enabled === 'true'; this.markDirty(); return this; }
    hScroll(enabled) { this._hScroll = enabled === true || enabled === 'true'; this.markDirty(); return this; }
    
    children(arr) { 
        this._children = arr; 
        for(let c of arr) c.parent = this; 
        this._calculateScrollLimits();
        this.markDirty();
        return this; 
    }
    
    text(str) { if(this._text !== str) { this._text = str; this.markDirty(); } return this; }
    html(content) { this.patch({html: content}); return this; }
    event(eventName, callback) { this._events[eventName] = callback; return this; }

    _calculateScrollLimits() {
        let maxRow = 100, maxCol = 100;
        for(let c of this._children) {
            if(c._y + c._rowSpan > maxRow) maxRow = c._y + c._rowSpan;
            if(c._x + c._colSpan > maxCol) maxCol = c._x + c._colSpan;
        }
        this._maxScrollYRatio = (maxRow - 100) / 100;
        this._maxScrollXRatio = (maxCol - 100) / 100;
    }

    _parseBorderRadius(str) {
        if (!str) return [0, 0, 0, 0];
        let parts = str.toString().replace(/px|%/g, '').split(' ').map(parseFloat);
        if (parts.length === 1) return [parts[0], parts[0], parts[0], parts[0]];
        if (parts.length === 2) return [parts[0], parts[1], parts[0], parts[1]];
        if (parts.length === 3) return [parts[0], parts[1], parts[2], parts[1]];
        if (parts.length === 4) return parts;
        return [0, 0, 0, 0];
    }

    render(ctx, overlay, parentW, parentH, offsetX, offsetY, clipBounds) {
        if (!this._visible) {
            if (this._domNode && this._domNode.style.display !== 'none') this._domNode.style.display = 'none';
            return;
        }

        const activeCss = (this._isHovered && this._hoverCss) ? { ...this.css, ...this._hoverCss } : this.css;
        const unitW = parentW / 100;
        const unitH = parentH / 100;

        const tX = parseFloat(activeCss.translateX) || 0;
        const tY = parseFloat(activeCss.translateY) || 0;

        // SHARPNESS FIX: Math.round locks visuals to the exact pixel grid to prevent sub-pixel blur
        const absX = Math.round(offsetX + (this._x * unitW) + tX);
        const absY = Math.round(offsetY + (this._y * unitH) + tY);
        const absW = Math.round(this._colSpan * unitW);
        const absH = Math.round(this._rowSpan * unitH);

        this.bounds = { x: absX, y: absY, w: absW, h: absH };

        const myClipBounds = {
            x: Math.max(clipBounds.x, absX),
            y: Math.max(clipBounds.y, absY),
            w: Math.max(0, Math.min(clipBounds.x + clipBounds.w, absX + absW) - Math.max(clipBounds.x, absX)),
            h: Math.max(0, Math.min(clipBounds.y + clipBounds.h, absY + absH) - Math.max(clipBounds.y, absY)),
        };

        if (myClipBounds.w <= 0 || myClipBounds.h <= 0) return;

        if (activeCss.backgroundColor !== "transparent" || activeCss.border || this._text) {
            const radii = this._parseBorderRadius(activeCss.borderRadius);
            
            ctx.save();
            if(activeCss.opacity !== 1) ctx.globalAlpha = activeCss.opacity;

            if (activeCss.shadowColor && activeCss.shadowColor !== "transparent") {
                ctx.shadowColor = activeCss.shadowColor;
                ctx.shadowOffsetX = Math.round(parseFloat(activeCss.shadowX) || 0);
                ctx.shadowOffsetY = Math.round(parseFloat(activeCss.shadowY) || 0);
                ctx.shadowBlur = Math.round(parseFloat(activeCss.shadowBlur) || 0);
            }

            if (activeCss.rotateZ) {
                ctx.translate(absX + absW/2, absY + absH/2);
                ctx.rotate(parseFloat(activeCss.rotateZ) * Math.PI / 180);
                ctx.translate(-(absX + absW/2), -(absY + absH/2));
            }

            if (activeCss.backgroundColor !== "transparent") {
                ctx.fillStyle = activeCss.backgroundColor;
                ctx.beginPath();
                if (ctx.roundRect) ctx.roundRect(absX, absY, absW, absH, radii);
                else ctx.rect(absX, absY, absW, absH);
                ctx.fill();
            }

            if (activeCss.border) {
                ctx.strokeStyle = activeCss.border;
                ctx.lineWidth = 2; // Keep line width crisp
                ctx.beginPath();
                if (ctx.roundRect) ctx.roundRect(absX, absY, absW, absH, radii);
                else ctx.rect(absX, absY, absW, absH);
                ctx.stroke();
            }

            ctx.shadowColor = "transparent";

            if (this._text) {
                ctx.fillStyle = activeCss.color;
                ctx.font = activeCss.font;
                ctx.textBaseline = "middle";
                ctx.textAlign = "center";
                ctx.save();
                ctx.beginPath(); ctx.rect(myClipBounds.x, myClipBounds.y, myClipBounds.w, myClipBounds.h); ctx.clip();
                ctx.fillText(this._text, absX + (absW / 2), absY + (absH / 2));
                ctx.restore();
            }
            ctx.restore();
        }

        // HTML VDOM
        if (this._html) {
            if (!this._domNode) {
                this._domNode = document.createElement('div');
                this._domNode.className = 'html-layer';
                overlay.appendChild(this._domNode);
            } else if (this._domNode.parentNode !== overlay) {
                overlay.appendChild(this._domNode);
            }

            if (this._cachedState.html !== this._html) {
                this._domNode.innerHTML = this._html;
                this._cachedState.html = this._html;
            }
            
            const cTop = Math.max(0, myClipBounds.y - absY);
            const cLeft = Math.max(0, myClipBounds.x - absX);
            const cBottom = Math.max(0, (absY + absH) - (myClipBounds.y + myClipBounds.h));
            const cRight = Math.max(0, (absX + absW) - (myClipBounds.x + myClipBounds.w));
            
            const transformStr = `perspective(1000px) rotateX(${activeCss.rotateX||0}deg) rotateY(${activeCss.rotateY||0}deg) rotateZ(${activeCss.rotateZ||0}deg)`;
            let boxShadowStr = "none";
            if (activeCss.shadowColor && activeCss.shadowColor !== "transparent") {
                boxShadowStr = `${parseFloat(activeCss.shadowX)||0}px ${parseFloat(activeCss.shadowY)||0}px ${parseFloat(activeCss.shadowBlur)||0}px ${activeCss.shadowColor}`;
            }

            const newStyle = `display:block; left:${absX}px; top:${absY}px; width:${absW}px; height:${absH}px; ` +
                             `clip-path:inset(${cTop}px ${cRight}px ${cBottom}px ${cLeft}px); ` +
                             `opacity:${activeCss.opacity}; border-radius:${activeCss.borderRadius}; ` +
                             `transform:${transformStr}; transform-origin: center center; box-shadow:${boxShadowStr};`;
            
            if (this._cachedState.styleString !== newStyle) {
                this._domNode.style.cssText = newStyle;
                this._cachedState.styleString = newStyle;
            }
        } else if (this._domNode) {
            this._domNode.remove();
            this._domNode = null;
        }

        this.maxScrollY = (this._maxScrollYRatio || 0) * absH;
        this.maxScrollX = (this._maxScrollXRatio || 0) * absW;

        if (this._children.length > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(myClipBounds.x, myClipBounds.y, myClipBounds.w, myClipBounds.h);
            ctx.clip();

            for (const child of this._children) {
                child.render(ctx, overlay, absW, absH, absX - this.scrollX, absY - this.scrollY, myClipBounds);
            }
            ctx.restore();
        }
    }

    findHit(mouseX, mouseY, clipBounds) {
        if (!this._visible) return null;
        if (mouseX < clipBounds.x || mouseX > clipBounds.x + clipBounds.w || 
            mouseY < clipBounds.y || mouseY > clipBounds.y + clipBounds.h) return null;

        const myClipBounds = {
            x: Math.max(clipBounds.x, this.bounds.x),
            y: Math.max(clipBounds.y, this.bounds.y),
            w: Math.max(0, Math.min(clipBounds.x + clipBounds.w, this.bounds.x + this.bounds.w) - Math.max(clipBounds.x, this.bounds.x)),
            h: Math.max(0, Math.min(clipBounds.y + clipBounds.h, this.bounds.y + this.bounds.h) - Math.max(clipBounds.y, this.bounds.y)),
        };

        for (let i = this._children.length - 1; i >= 0; i--) {
            const childHit = this._children[i].findHit(mouseX, mouseY, myClipBounds);
            if (childHit) return childHit; 
        }

        if (mouseX >= this.bounds.x && mouseX <= this.bounds.x + this.bounds.w &&
            mouseY >= this.bounds.y && mouseY <= this.bounds.y + this.bounds.h) {
            return this;
        }
        return null;
    }
}

class EngineManager {
    constructor(container, canvas, overlay, rootPixels) {
        this.container = container;
        this.canvas = canvas;
        this.overlay = overlay;
        this.rootPixels = rootPixels;
        
        const bindEngine = (pixels) => {
            for(let p of pixels) {
                p.engine = this;
                bindEngine(p._children);
            }
        };
        bindEngine(this.rootPixels);

        this.ctx = this.canvas.getContext("2d", { desynchronized: false, alpha: true });
        
        this.hoveredPixel = null; 
        this.activeScrollTarget = null;
        this.lastTouchY = 0;
        this.lastTouchX = 0;
        
        this.lockedWidth = 0;
        this.lockedHeight = 0;
        
        this._isRendering = false;
        this._needsRedraw = true;

        this.setupEvents();
        this.resize();
    }

    resize(forceSynchronousRender = false) {
        const rect = this.container.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        if (!forceSynchronousRender && rect.width === this.lockedWidth && rect.height === this.lockedHeight) return;

        const wasHidden = (this.lockedWidth === 0);

        this.lockedWidth = rect.width;
        this.lockedHeight = rect.height;

        const dpr = Math.max(window.devicePixelRatio || 1, 2);
        
        // Exact pixel matching
        this.canvas.width = Math.floor(this.lockedWidth * dpr);
        this.canvas.height = Math.floor(this.lockedHeight * dpr);
        
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        
        // Optimize context for UI Sharpness
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = "high";
        this.ctx.textRendering = "optimizeLegibility";

        this.cssWidth = this.lockedWidth;
        this.cssHeight = this.lockedHeight;

        if (wasHidden || forceSynchronousRender) {
            // FLICKER FIX: If it was just un-hidden, render synchronously immediately to prevent the black flash
            this._needsRedraw = true;
            this._renderFrame();
        } else {
            this.requestRedraw();
        }
    }

    requestRedraw() {
        this._needsRedraw = true;
        if (!this._isRendering) {
            this._isRendering = true;
            requestAnimationFrame(() => this._renderFrame());
        }
    }

    _renderFrame() {
        this._isRendering = false;
        if (!this._needsRedraw || !this.ctx || this.rootPixels.length === 0) return;
        this._needsRedraw = false;

        this.ctx.clearRect(0, 0, this.cssWidth, this.cssHeight); 
        const baseClip = { x: 0, y: 0, w: this.cssWidth, h: this.cssHeight };
        
        for (const pixel of this.rootPixels) {
            pixel.render(this.ctx, this.overlay, this.cssWidth, this.cssHeight, 0, 0, baseClip);
        }
       

    }

    setupEvents() {
        const getMousePos = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            return { x: e.clientX - rect.left, y: e.clientY - rect.top };
        };

        const getHit = (x, y) => {
            const baseClip = {x: 0, y: 0, w: this.cssWidth, h: this.cssHeight};
            for (let i = this.rootPixels.length - 1; i >= 0; i--) {
                let hit = this.rootPixels[i].findHit(x, y, baseClip);
                if (hit) return hit;
            }
            return null;
        };

        this.canvas.addEventListener('click', (e) => {
            const pos = getMousePos(e);
            let hit = getHit(pos.x, pos.y);
            if (hit && hit._events['click']) hit._events['click'](hit);
        });

        this.canvas.addEventListener('mousemove', (e) => {
            const pos = getMousePos(e);
            let hit = getHit(pos.x, pos.y);

            if (this.hoveredPixel !== hit) {
                if (this.hoveredPixel) {
                    this.hoveredPixel._isHovered = false;
                    if (this.hoveredPixel._events['mouseleave']) this.hoveredPixel._events['mouseleave'](this.hoveredPixel);
                    if (this.hoveredPixel._hoverCss) this.hoveredPixel.markDirty();
                }
                this.hoveredPixel = hit;
                if (this.hoveredPixel) {
                    this.hoveredPixel._isHovered = true;
                    if (this.hoveredPixel._events['mouseenter']) this.hoveredPixel._events['mouseenter'](this.hoveredPixel);
                    if (this.hoveredPixel._hoverCss) this.hoveredPixel.markDirty();
                    this.canvas.style.cursor = (hit._events['click'] || hit._hoverCss) ? 'pointer' : 'default';
                } else {
                    this.canvas.style.cursor = 'default';
                }
            }
        });

        this.canvas.addEventListener('wheel', (e) => {
            const pos = getMousePos(e);
            let target = getHit(pos.x, pos.y);

            while (target) {
                let scrolled = false;
                if (target._vScroll && target.maxScrollY > 0) {
                    let oldY = target.scrollY;
                    target.scrollY = Math.max(0, Math.min(target.scrollY + e.deltaY, target.maxScrollY));
                    if (target.scrollY !== oldY) scrolled = true;
                }
                if (target._hScroll && target.maxScrollX > 0) {
                    let oldX = target.scrollX;
                    target.scrollX = Math.max(0, Math.min(target.scrollX + e.deltaX, target.maxScrollX));
                    if (target.scrollX !== oldX) scrolled = true;
                }
                if (scrolled) { e.preventDefault(); target.markDirty(); return; }
                target = target.parent; 
            }
        }, { passive: false });

        this.canvas.addEventListener('touchstart', (e) => {
            if(e.touches.length > 1) return;
            const pos = getMousePos(e.touches[0]);
            this.lastTouchX = pos.x; this.lastTouchY = pos.y;
            this.activeScrollTarget = getHit(pos.x, pos.y);
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            if (!this.activeScrollTarget) return;
            const pos = getMousePos(e.touches[0]);
            const deltaY = this.lastTouchY - pos.y;
            const deltaX = this.lastTouchX - pos.x;
            this.lastTouchX = pos.x; this.lastTouchY = pos.y;

            let target = this.activeScrollTarget;
            while (target) {
                let scrolled = false;
                if (target._vScroll && target.maxScrollY > 0) {
                    let oldY = target.scrollY;
                    target.scrollY = Math.max(0, Math.min(target.scrollY + deltaY, target.maxScrollY));
                    if (target.scrollY !== oldY) scrolled = true;
                }
                if (target._hScroll && target.maxScrollX > 0) {
                    let oldX = target.scrollX;
                    target.scrollX = Math.max(0, Math.min(target.scrollX + deltaX, target.maxScrollX));
                    if (target.scrollX !== oldX) scrolled = true;
                }
                if (scrolled) { e.preventDefault(); target.markDirty(); return; }
                target = target.parent;
            }
        }, { passive: false });
    }
}

// ==========================================
// CUSTOM DOM SCANNER (ALLOWS NO-HYPHEN TAGS)
// ==========================================
const DOMParserEngine = {
    parseStyle(styleStr) {
        if (!styleStr) return {};
        const styleObj = {};
        styleStr.split(';').forEach(rule => {
            const parts = rule.split(':');
            if (parts.length >= 2) {
                const key = parts[0].trim().replace(/-([a-z])/g, g => g[1].toUpperCase());
                const val = parts.slice(1).join(':').trim();
                styleObj[key] = val;
            }
        });
        return styleObj;
    },

    parseNode(domNode) {
        let p = new GridPixel();
        
        let x = parseFloat(domNode.getAttribute('x') || 0);
        let y = parseFloat(domNode.getAttribute('y') || 0);
        p.at(x, y);

        if (domNode.hasAttribute('colspan')) p.colspan(parseFloat(domNode.getAttribute('colspan')));
        if (domNode.hasAttribute('rowspan')) p.rowspan(parseFloat(domNode.getAttribute('rowspan')));
        if (domNode.hasAttribute('vscroll')) p.vScroll(domNode.getAttribute('vscroll') === 'true');
        if (domNode.hasAttribute('hscroll')) p.hScroll(domNode.getAttribute('hscroll') === 'true');
        if (domNode.hasAttribute('id')) p.id(domNode.getAttribute('id'));

        p.style(this.parseStyle(domNode.getAttribute('style')));

        let children = [];
        let htmlContent = "";

        for (let child of domNode.childNodes) {
            // Matches <PixelGrid> (HTML treats it as 'pixelgrid')
            if (child.nodeName.toLowerCase() === 'pixelgrid') {
                children.push(this.parseNode(child));
            } else if (child.nodeType === 1) { 
                htmlContent += child.outerHTML;
            } else if (child.nodeType === 3) { 
                htmlContent += child.textContent;
            }
        }

        if (children.length > 0) p.children(children);
        if (htmlContent.trim() !== "") p.html(htmlContent.trim());

        return p;
    },

    initEngine(engineNode) {
        // Parse the raw HTML tree from the <PixelEngine> block
        const rootPixels = [];
        for (let child of engineNode.childNodes) {
            if (child.nodeName.toLowerCase() === 'pixelgrid') {
                rootPixels.push(this.parseNode(child));
            }
        }

        // Wipe the raw tags and inject the canvas ecosystem
        engineNode.innerHTML = `
            <div class="engine-container" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; perspective: 1000px;">
                <canvas style="display: block; width: 100%; height: 100%; transform: translate3d(0, 0, 0); will-change: transform; backface-visibility: hidden;"></canvas>
                <div class="ui-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; overflow: hidden; transform: translate3d(0, 0, 0); will-change: transform;"></div>
            </div>
        `;

        const container = engineNode.querySelector('.engine-container');
        const canvas = engineNode.querySelector('canvas');
        const overlay = engineNode.querySelector('.ui-overlay');

        const engine = new EngineManager(container, canvas, overlay, rootPixels);
        
        // Attach the instance to the DOM node for manual triggering
        engineNode.engineInstance = engine;

        // Auto-observe size changes
        const observer = new ResizeObserver(() => engine.resize());
        observer.observe(engineNode);
    }
};

// Auto-boot: Find all <PixelEngine> elements and initialize them
document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll('pixelengine').forEach(engineNode => {
        DOMParserEngine.initEngine(engineNode);
    });
});