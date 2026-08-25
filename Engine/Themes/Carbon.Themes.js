const Themes = (function() {
  const themes = {};
  let currentStyleTag = null;
  
  function injectCss(cssText) {
    if (currentStyleTag) currentStyleTag.remove();
    const style = document.createElement('style');
    style.textContent = cssText;
    document.head.appendChild(style);
    currentStyleTag = style;
  }
  
  return {
    config(newThemes) { Object.assign(themes, newThemes); },
    apply(name) {
      if (!themes[name]) return console.warn(`Theme ${name} not found`);
      
      // Sync the class name to the body so CSS selectors like body.greenForest work
      document.body.className = name;
      
      injectCss(themes[name]);
    }
  };
})();