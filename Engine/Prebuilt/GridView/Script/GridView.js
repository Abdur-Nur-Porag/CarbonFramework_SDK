(function() {
  const initGrid = (el) => {
    const getAttr = (n) => el.getAttribute(n) || el.getAttribute(n.toLowerCase());
    
    const parseDim = (val) => {
      if (!val) return '0px';
      const num = parseFloat(val);
      if (isNaN(num) || num < 0) return '0px';
      return isNaN(val) ? val : val + 'px';
    };
    
    const rows = getAttr('Row') || '1';
    const cols = getAttr('Col') || '1';
    
    // ColSize / RowSize: comma-separated sizes e.g. "1fr,2fr,1fr" or "auto,100px"
    const colSize = getAttr('ColSize');
    const rowSize = getAttr('RowSize');
    
    const templateCols = colSize ?
      colSize.split(',').map(s => s.trim()).join(' ') :
      `repeat(${cols}, 1fr)`;
    
    const templateRows = rowSize ?
      rowSize.split(',').map(s => s.trim()).join(' ') :
      `repeat(${rows}, auto)`;
    
    // Align / Justify
    const alignItems = getAttr('AlignItems');
    const justifyItems = getAttr('JustifyItems');
    const alignContent = getAttr('AlignContent');
    
    Object.assign(el.style, {
      display: 'grid',
      gridTemplateColumns: templateCols,
      gridTemplateRows: templateRows,
      columnGap: parseDim(getAttr('GapX')),
      rowGap: parseDim(getAttr('GapY')),
      paddingTop: parseDim(getAttr('GapTop')),
      paddingBottom: parseDim(getAttr('GapBottom')),
      paddingLeft: parseDim(getAttr('GapLeft')),
      paddingRight: parseDim(getAttr('GapRight')),
      ...(alignItems && { alignItems }),
      ...(justifyItems && { justifyItems }),
      ...(alignContent && { alignContent }),
    });
    
    // ColumnSpan
    el.querySelectorAll(':scope > ColumnSpan').forEach(span => {
      const a = (n) => span.getAttribute(n) || span.getAttribute(n.toLowerCase());
      const colRange = a('ColRange') || '1';
      const colStart = a('ColStart');
      span.style.gridColumn = colStart ?
        `${colStart} / span ${colRange}` :
        `span ${colRange}`;
    });
    
    // RowSpan
    el.querySelectorAll(':scope > RowSpan').forEach(span => {
      const a = (n) => span.getAttribute(n) || span.getAttribute(n.toLowerCase());
      const rowRange = a('RowRange') || '1';
      const rowStart = a('RowStart');
      span.style.gridRow = rowStart ?
        `${rowStart} / span ${rowRange}` :
        `span ${rowRange}`;
    });
    
    // GridSpan — spans both columns and rows
    el.querySelectorAll(':scope > GridSpan').forEach(span => {
      const a = (n) => span.getAttribute(n) || span.getAttribute(n.toLowerCase());
      const colRange = a('ColRange') || '1';
      const rowRange = a('RowRange') || '1';
      const colStart = a('ColStart');
      const rowStart = a('RowStart');
      span.style.gridColumn = colStart ?
        `${colStart} / span ${colRange}` :
        `span ${colRange}`;
      span.style.gridRow = rowStart ?
        `${rowStart} / span ${rowRange}` :
        `span ${rowRange}`;
    });
  };
  
  const setup = () => document.querySelectorAll('GridView').forEach(initGrid);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
  
  new MutationObserver((mutations) => {
    mutations.forEach(m => m.addedNodes.forEach(n => {
      if (n.nodeType === 1) {
        if (n.tagName === 'GRIDVIEW') initGrid(n);
        n.querySelectorAll?.('GridView').forEach(initGrid);
      }
    }));
  }).observe(document.body, { childList: true, subtree: true });
})();
