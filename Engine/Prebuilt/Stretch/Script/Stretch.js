    document.addEventListener("DOMContentLoaded", () => {
      // 1. Find all elements with the specific attribute
      const scrollElements = document.querySelectorAll('[OverScrollStretchEffect="true"]');
      
      scrollElements.forEach(scrollView => {
        
        // 2. Automatically apply required scrolling CSS to the parent
        scrollView.style.overflowY = 'auto';
        scrollView.style.overscrollBehaviorY = 'none';
        
        // 3. Dynamically create the stretch wrapper
        const wrapper = document.createElement('div');
        wrapper.style.willChange = 'transform';
        
        // 4. Move all existing children of the scroll view into the new wrapper
        while (scrollView.firstChild) {
          wrapper.appendChild(scrollView.firstChild);
        }
        scrollView.appendChild(wrapper);
        
        // 5. Physics variables
        let startY = 0;
        let isStretching = false;
        const MAX_STRETCH = 1.04;
        const RESISTANCE = 800;
        
        // 6. Attach Event Listeners
        scrollView.addEventListener('touchstart', (e) => {
          startY = e.touches[0].clientY;
          wrapper.style.transition = 'none';
        }, { passive: true });
        
        scrollView.addEventListener('touchmove', (e) => {
          const currentY = e.touches[0].clientY;
          const deltaY = currentY - startY;
          
          if (scrollView.scrollTop <= 0 && deltaY > 0) {
            isStretching = true;
            
            const pullFactor = Math.min(deltaY / RESISTANCE, 1);
            const easeOut = pullFactor * (2 - pullFactor);
            const stretch = 1 + (easeOut * (MAX_STRETCH - 1));
            
            wrapper.style.transformOrigin = 'top';
            wrapper.style.transform = `scaleY(${stretch})`;
          }
          else if (scrollView.scrollTop + scrollView.clientHeight >= scrollView.scrollHeight && deltaY < 0) {
            isStretching = true;
            
            const pullFactor = Math.min(Math.abs(deltaY) / RESISTANCE, 1);
            const easeOut = pullFactor * (2 - pullFactor);
            const stretch = 1 + (easeOut * (MAX_STRETCH - 1));
            
            wrapper.style.transformOrigin = 'bottom';
            wrapper.style.transform = `scaleY(${stretch})`;
          }
        }, { passive: true });
        
        scrollView.addEventListener('touchend', () => {
          if (isStretching) {
            isStretching = false;
            wrapper.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)';
            wrapper.style.transform = 'scaleY(1)';
          }
        });
      });
    });