    class SvgContainer extends HTMLElement {
  connectedCallback() {
    // 1. Set the container's own styles to prevent ghost space
    this.style.display = 'block';
    
    // 2. Apply dimensions from the custom attributes
    if (this.hasAttribute('width')) {
      this.style.width = this.getAttribute('width');
    }
    if (this.hasAttribute('height')) {
      this.style.height = this.getAttribute('height');
    }
    
    // 3. Check if we are loading an external SVG or an inline one
    const externalSrc = this.getAttribute('externalsrc');
    
    if (externalSrc) {
      this.loadExternalSvg(externalSrc);
    } else {
      // If inline, fix the SVG immediately
      this.fixSvg(this.querySelector('svg'));
    }
  }
  
  async loadExternalSvg(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Network response was not ok');
      
      const svgText = await response.text();
      this.innerHTML = svgText; // Inject the SVG
      
      // Now that it's in the DOM, apply the fixes
      this.fixSvg(this.querySelector('svg'));
    } catch (error) {
      console.error("Failed to load SVG from externalsrc:", error);
    }
  }
  
  fixSvg(svgElement) {
    if (!svgElement) return;
    
    // Remove the hardcoded dimensions that cause scaling issues
    svgElement.removeAttribute('width');
    svgElement.removeAttribute('height');
    
    // Apply CSS to make it fit the container and remove ghost space
    svgElement.style.display = 'block';
    svgElement.style.width = '100%';
    svgElement.style.height = '100%';
    
    // Optional: Warn if the SVG is missing a viewBox, as it won't scale properly without one
    if (!svgElement.hasAttribute('viewBox')) {
      console.warn('<svg-container> warning: The loaded SVG is missing a viewBox attribute.');
    }
  }
}

// Register the custom element
customElements.define('svg-container', SvgContainer);
 