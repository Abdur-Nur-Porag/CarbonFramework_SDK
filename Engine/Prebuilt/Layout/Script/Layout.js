        function layout() {
          const customTags = [
            'VCenter', 'VTop', 'VBottom',
            'HLeft', 'HCenter', 'HRight', 'HBottom',
            'HScroll', 'VScroll'
          ];
          
          customTags.forEach(tag => {
            document.createElement(tag);
          });
          
        }
        layout()