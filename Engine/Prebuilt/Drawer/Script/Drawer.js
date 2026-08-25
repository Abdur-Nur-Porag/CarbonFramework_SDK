const DrawerRegistry = {};
const DrawerCallbacks = {};
const drawerNameRegistery = [];

const DrawerEngine = {
    getShadow(level, pos) {
        const val = Math.min(Math.max(parseInt(level) || 0, 0), 10);
        if (val === 0) return 'none';
        const blur = val * 5;
        const xOffset = pos === 'left' ? val : -val;
        return `${xOffset}px 0px ${blur}px rgba(0,0,0,${0.001 + (val * 0.02)})`;
    },
    
    initDrawer(el) {
        const name = el.getAttribute('Name');
        const pos = (el.getAttribute('Position') || 'Left').toLowerCase();
        const elevation = el.getAttribute('Elevation') || '5';
        
        // 1. Create Overlay if missing
        if (!document.getElementById('dr-global-overlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'dr-global-overlay';
            overlay.className = 'dr-overlay';
            // Backdrop click does not auto-close the drawer, it only
            // fires whatever callback was registered via
            // Drawer("name").clickBackdrop(callback)
            overlay.addEventListener('click', (e) => {
                document.querySelectorAll('.dr-wrapper.active').forEach((wrapper) => {
                    const activeName = wrapper.dataset.name;
                    const cb = DrawerCallbacks[activeName] && DrawerCallbacks[activeName].backdrop;
                    if (typeof cb === 'function') cb(e);
                });
            });
            document.body.appendChild(overlay);
        }
        
        // 2. Create Wrapper
        const wrapper = document.createElement('div');
        wrapper.className = `dr-wrapper dr-${pos}`;
        wrapper.dataset.name = name;
        wrapper.style.boxShadow = this.getShadow(elevation, pos);
        
        // 3. Move Content
        while (el.firstChild) {
            wrapper.appendChild(el.firstChild);
        }
        
        // 4. Register & Clean
        document.body.appendChild(wrapper);
        DrawerRegistry[name] = wrapper;
        el.remove();
    }
};

// API Methods
window.openDrawer = (name) => {
    const dr = DrawerRegistry[name];
    if (dr) {
        drawerNameRegistery.push(name);
        document.getElementById('dr-global-overlay').classList.add('active');
        dr.classList.add('active');
    }
};

window.closeDrawer = (name) => {
    const dr = DrawerRegistry[name];
    if (dr) {
        drawerNameRegistery.pop();
        dr.classList.remove('active');
        
        // Trigger overlay fade immediately (synchronous — runs concurrently
        // with any page transition triggered right after this call)
        // as long as no other drawers are currently open.
        if (!document.querySelector('.dr-wrapper.active')) {
            document.getElementById('dr-global-overlay').classList.remove('active');
        }
    }
};

// Fluent API: Drawer("name").clickBackdrop(callback)
window.Drawer = (name) => ({
    clickBackdrop(callback) {
        if (!DrawerCallbacks[name]) DrawerCallbacks[name] = {};
        DrawerCallbacks[name].backdrop = callback;
        return this;
    }
});

// Observer for dynamic tags
const drObserver = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
            if (node.tagName === 'DRAWER') DrawerEngine.initDrawer(node);
        });
    });
});

drObserver.observe(document.documentElement, { childList: true, subtree: true });

// Initial Boot
document.querySelectorAll('Drawer').forEach(el => DrawerEngine.initDrawer(el));