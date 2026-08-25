(function() {
    class CodeHighlighterElement extends HTMLElement {
        constructor() {
            super();
            this.attachShadow({ mode: 'open' });
        }
        
        connectedCallback() {
            if (window.Prism) {
                this.render();
            } else {
                setTimeout(() => this.render(), 100);
            }
        }
        
        // Added observedAttributes to auto-update when changed via JS
        static get observedAttributes() {
            return ['Code', 'Language'];
        }
        
        attributeChangedCallback(name, oldValue, newValue) {
            if (oldValue !== newValue && this.shadowRoot.innerHTML !== '') {
                this.render();
            }
        }
        
        render() {
            const lang = (this.getAttribute('Language') || 'text').toLowerCase();
            const wrap = this.getAttribute('WordWrap') === 'true';
            const showCopy = this.getAttribute('Copy') !== 'false'; // Default to true for API
            const showLines = this.getAttribute('LineCount') !== 'false'; // Default to true
            
            const width = this.getAttribute('Width') || '100%';
            const height = this.getAttribute('Height') || 'auto';
            
            const codeContent = (this.getAttribute('Code') || this.innerHTML || '').trim();
            
            const lines = codeContent.split('\n');
            const lineNumbers = showLines ?
                `<div class="ln-col">${lines.map((_, i) => `<span>${i + 1}</span>`).join('')}</div>` :
                '';
            
            const prismCSS = Array.from(document.styleSheets)
                .map(sheet => {
                    try { return Array.from(sheet.cssRules).map(rule => rule.cssText).join(''); }
                    catch (e) { return ''; }
                }).join('').includes('language-') ?
                Array.from(document.querySelectorAll('style')).find(s => s.textContent.includes('language-'))?.textContent :
                '';
            
            this.shadowRoot.innerHTML = `
            <style>
                ${prismCSS}
                :host { 
                    display: block; 
                    margin: 1.5em 0; 
                    border-radius: 8px; 
                    overflow: hidden; 
                    box-shadow: 0 5px 20px rgba(0,0,0,0.2);
                    width: ${width};
                    height: ${height};
                    max-width: 100%;
                }
                .wrapper { 
                    display: flex; 
                    flex-direction: column;
                    height: 100%;
                    background: #1e1e1e; 
                    border: 1px solid #333; 
                    font-family: 'Consolas', 'Courier New', monospace; 
                }
                .toolbar { 
                    background: #2d2d2d; 
                    color: #999; 
                    padding: 10px 16px; 
                    font-size: 11px; 
                    display: flex; 
                    justify-content: space-between; 
                    align-items: center; 
                    border-bottom: 1px solid #111; 
                    letter-spacing: 0.5px; 
                }
                .main { 
                    display: flex; 
                    overflow: auto; 
                    flex: 1;
                    position: relative; 
                    align-items: stretch; 
                }
                .ln-col { 
                    padding: 1em 12px; 
                    color: #4b4b4b; 
                    text-align: right; 
                    font-size: 13px; 
                    line-height: 1.5; 
                    background: #181818; 
                    user-select: none; 
                    border-right: 1px solid #2a2a2a; 
                    display: flex; 
                    flex-direction: column; 
                    min-width: 35px; 
                }
                pre { 
                    margin: 0 !important; 
                    padding: 1em !important; 
                    flex: 1; 
                    font-size: 13px !important; 
                    line-height: 1.5 !important; 
                    background: transparent !important;
                    white-space: ${wrap ? 'pre-wrap' : 'pre'} !important; 
                    word-break: ${wrap ? 'break-all' : 'normal'} !important; 
                }
                .copy-btn { 
                    color: #4fc1ff; 
                    background: transparent; 
                    border: 1px solid #4fc1ff; 
                    padding: 3px 12px; 
                    border-radius: 4px; 
                    font-size: 10px; 
                    font-weight: bold; 
                    transition: 0.1s ease; 
                }
                .copy-btn:hover { 
                    background: #7cfc00; 
                    color: #1e1e1e; 
                }
                .copy-btn.success { 
                    pointer-events: none; 
                    border-color: #7cfc00; 
                    color: #000000; 
                }
            </style>
            <div class="wrapper">
                <div class="toolbar">
                    <span><strong>${lang.toUpperCase()}</strong></span>
                    ${showCopy ? `<button class="copy-btn">COPY</button>` : ''}
                </div>
                <div class="main">
                    ${lineNumbers}
                    <pre><code class="language-${lang}">${this.escape(codeContent)}</code></pre>
                </div>
            </div>`;
            
            const codeEl = this.shadowRoot.querySelector('code');
            if (window.Prism) window.Prism.highlightElement(codeEl);
            
            if (showCopy) {
                const btn = this.shadowRoot.querySelector('.copy-btn');
                btn.onclick = () => {
                    navigator.clipboard.writeText(codeContent);
                    const originalText = btn.innerText;
                    btn.innerText = "COPIED!";
                    btn.classList.add('success');
                    setTimeout(() => {
                        btn.innerText = originalText;
                        btn.classList.remove('success');
                    }, 2000);
                };
            }
        }
        
        escape(s) {
            return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        }
    }
    
    // Register Custom Element
    if (!customElements.get('code-highlighter')) {
        customElements.define('code-highlighter', CodeHighlighterElement);
    }
    
    // Convert <CodeHighlighter> to <code-highlighter> and preserve ID
    const initialize = () => {
        document.querySelectorAll('CodeHighlighter').forEach(el => {
            const replacement = document.createElement('code-highlighter');
            for (let i = 0; i < el.attributes.length; i++) {
                replacement.setAttribute(el.attributes[i].name, el.attributes[i].value);
            }
            replacement.innerHTML = el.innerHTML;
            el.replaceWith(replacement);
        });
    };
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
    
    // --- NEW CHAINABLE API ---
    // Syntax: CodeHighlighter('target-id').syntax('javascript').code(`...`)
    window.CodeHighlighter = function(targetId) {
        let selectedLang = 'text';
        
        return {
            // Allows both .syntax and .syntex (just in case of typos)
            syntax: function(lang) {
                selectedLang = lang;
                return this; // Return 'this' to make it chainable
            },
            syntex: function(lang) {
                return this.syntax(lang);
            },
            
            code: function(codeString) {
                const targetEl = document.getElementById(targetId);
                
                // Scenario 1: The ID belongs to an existing <CodeHighlighter>
                if (targetEl && targetEl.tagName.toLowerCase() === 'code-highlighter') {
                    targetEl.setAttribute('Language', selectedLang);
                    targetEl.setAttribute('Code', codeString);
                    return targetEl;
                }
                
                // Scenario 2: The ID belongs to a parent container (like a <div>)
                const el = document.createElement('code-highlighter');
                el.setAttribute('Language', selectedLang);
                el.setAttribute('Code', codeString);
                
                if (targetEl) {
                    // This clears the container completely before putting the new code block inside,
                    // replacing old instances instead of appending endlessly.
                    targetEl.innerHTML = '';
                    targetEl.appendChild(el);
                } else {
                    console.warn(`Container or element with ID '${targetId}' not found.`);
                }
                
                return el;
            }
        };
    };
    
})();