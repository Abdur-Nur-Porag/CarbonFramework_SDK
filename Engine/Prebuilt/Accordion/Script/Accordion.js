
//small correction Toggle-> Toggle


// 1. Global JS API
        window.Accordion = {
            Active: function(id) {
                if (!id) return console.warn("Accordion.Active requires an id.");
                const item = document.getElementById(id);
                if (!item || item.tagName.toUpperCase() !== 'ACCORDIONITEM') return;

                const parent = item.closest('Accordion');
                if (parent && parent.getAttribute('Toggle') === 'true') {
                    const siblings = parent.querySelectorAll('AccordionItem');
                    siblings.forEach(sib => sib.removeAttribute('Active'));
                }
                item.setAttribute('Active', 'true');
            },

            Close: function(id) {
                if (id) {
                    const item = document.getElementById(id);
                    if (item && item.tagName.toUpperCase() === 'ACCORDIONITEM') {
                        item.removeAttribute('Active');
                    }
                } else {
                    document.querySelectorAll('AccordionItem[Active="true"]').forEach(item => {
                        item.removeAttribute('Active');
                    });
                }
            },

            ActiveAll: function() {
                document.querySelectorAll('AccordionItem').forEach(item => {
                    item.setAttribute('Active', 'true');
                });
            },

            CloseAll: function() {
                document.querySelectorAll('AccordionItem').forEach(item => {
                    item.removeAttribute('Active');
                });
            }
        };

        // 2. Initialize Framework
        document.addEventListener('DOMContentLoaded', () => {
            const chevronSvg = `
                <svg class="accordion-icon" focusable="false" aria-hidden="true" viewBox="0 0 24 24">
                    <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"></path>
                </svg>
            `;

            const accordions = document.querySelectorAll('Accordion');
            if (accordions.length === 0) return; 

            accordions.forEach(accordion => {
                // Apply GapY attribute if it exists
                const gapY = accordion.getAttribute('GapY');
                if (gapY) {
                    // Check if the user passed a pure number (e.g., "16") and append 'px', otherwise use the string (e.g., "1rem")
                    accordion.style.gap = !isNaN(gapY) ? `${gapY}px` : gapY;
                }

                const isToggle = accordion.getAttribute('Toggle') === 'true';
                const items = accordion.querySelectorAll('AccordionItem');

                items.forEach(item => {
                    const title = item.querySelector('AccordionItemTitle');
                    const detail = item.querySelector('AccordionItemDetail');

                    if (title && detail) {
                        title.insertAdjacentHTML('beforeend', chevronSvg);
                        const detailContent = detail.innerHTML;
                        detail.innerHTML = `<div class="detail-inner">${detailContent}</div>`;

                        title.addEventListener('click', () => {
                            const isActive = item.getAttribute('Active') === 'true';

                            if (isToggle) {
                                items.forEach(siblingItem => {
                                    if (siblingItem !== item) {
                                        siblingItem.removeAttribute('Active');
                                    }
                                });
                            }

                            if (isActive) {
                                item.removeAttribute('Active');
                            } else {
                                item.setAttribute('Active', 'true');
                            }
                        });
                    }
                });
            });
        });