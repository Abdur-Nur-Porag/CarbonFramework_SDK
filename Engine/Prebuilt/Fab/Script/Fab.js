class FabManager {
  constructor() {
    this.initExistingFabs();
    this.observeDOM();
  }
  
  closeAll() {
    document.querySelectorAll('fab.active').forEach(f => f.classList.remove('active'));
  }
  
  initExistingFabs() {
    document.querySelectorAll('fab').forEach(fab => this.setupFab(fab));
  }
  
  setupFab(fab) {
    if (fab.dataset.initialized) return;
    fab.dataset.initialized = 'true';
    
    // 1. Create a scoped overlay specifically for THIS Fab
    const overlay = document.createElement('div');
    overlay.className = 'fab-overlay';
    fab.insertBefore(overlay, fab.firstChild);
    
    // Clicking the local overlay closes this fab
    overlay.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeAll();
    });
    
    const button = fab.querySelector('fabbutton');
    const items = fab.querySelectorAll('fabitem');
    
    if (button) {
      button.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent hitting the overlay
        const isActive = fab.classList.contains('active');
        
        this.closeAll(); // Close any other open fabs just in case
        
        if (!isActive) {
          fab.classList.add('active');
        }
      });
    }
    
    if (items) {
      items.forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          
          const action = item.getAttribute('data-action') || item.innerText;
          console.log(`✅ FAB Action triggered: ${action}`);
          
          this.closeAll(); // Close after selection
        });
      });
    }
  }
  
  observeDOM() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.tagName && node.tagName.toLowerCase() === 'fab') {
            this.setupFab(node);
          } else if (node.querySelectorAll) {
            node.querySelectorAll('fab').forEach(fab => this.setupFab(fab));
          }
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
}

// Boot the framework
document.addEventListener('DOMContentLoaded', () => {
  new FabManager();
});