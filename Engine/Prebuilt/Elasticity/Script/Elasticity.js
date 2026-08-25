/**
     * ElasticityEffect Framework
     * Syntax: ElasticityEffect('id').maxSize(500).friction(1200)
     */
    function ElasticityEffect(id) {
        const el = document.getElementById(id);
        if (!el) return console.error(`Element ${id} not found`);
        
        // Find or create internal content wrapper to prevent distortion
        let content = el.querySelector('.elastic-content');
        
        const style = window.getComputedStyle(el);
        const baseHeight = parseFloat(style.height);
        const baseRadius = parseFloat(style.borderRadius);
        
        // Default Settings
        let settings = {
            maxPx: baseHeight * 1.8,
            friction: 1000,
            snap: "0.85s cubic-bezier(0.16, 1, 0.3, 1)",
            drag: "0.2s cubic-bezier(0.2, 0, 0, 1)"
        };
        
        let startY = 0;
        let isActive = false;
        
        // Apply initial transitions
        const setTransitions = (type) => {
            const t = type === 'drag' ? settings.drag : settings.snap;
            el.style.transition = `transform ${t}, border-radius ${t}`;
            if (content) content.style.transition = `transform ${t}`;
        };
        
        setTransitions('snap');
        
        const update = (currentY) => {
            const deltaY = currentY - startY;
            if (deltaY > 0) {
                let scale = 1 + (deltaY / settings.friction);
                let currentHeight = baseHeight * scale;
                
                // Enforce maxSize(px) limit
                if (currentHeight > settings.maxPx) {
                    scale = settings.maxPx / baseHeight;
                }
                
                // 1. Stretch background
                el.style.transform = `scaleY(${scale})`;
                // 2. Fix border radius distortion
                el.style.borderRadius = `${(baseRadius / scale).toFixed(3)}px`;
                // 3. FIX: Counter-scale content to keep it "FIXED" size
                if (content) {
                    content.style.transform = `scaleY(${1 / scale})`;
                }
            }
        };
        
        // Event Handlers
        const onStart = (e) => {
            isActive = true;
            startY = e.pageY || e.touches[0].pageY;
            setTransitions('drag');
        };
        
        const onMove = (e) => {
            if (!isActive) return;
            const y = e.pageY || e.touches[0].pageY;
            update(y);
        };
        
        const onEnd = () => {
            isActive = false;
            setTransitions('snap');
            el.style.transform = `scaleY(1)`;
            el.style.borderRadius = `${baseRadius}px`;
            if (content) content.style.transform = `scaleY(1)`;
        };
        
        el.addEventListener('mousedown', onStart);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onEnd);
        el.addEventListener('touchstart', onStart, { passive: false });
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('touchend', onEnd);
        
        // Framework API
        const api = {
            maxSize: (px) => {
                settings.maxPx = px;
                return api;
            },
            friction: (val) => {
                settings.friction = val;
                return api;
            }
        };
        
        return api;
    }
    