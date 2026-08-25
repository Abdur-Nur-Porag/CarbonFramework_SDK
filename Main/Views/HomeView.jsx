import {ListItem} from "./Com/List.jsx";
import {Switch} from "./Com/Switch.jsx";



function HomeView() {
  return (
    <PageView Name="HomeView">
      <App>
        <AppBody OverScrollEffect="true" ScrollBar="true" Type="VScroll" OverScrollEffectColor="var(--primary)">
          
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            backgroundColor: '#2d3748',
            padding: '24px 16px',
            boxSizing: 'border-box',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}>
            
            {/* Main Card Container */}
            <div style={{
              width: '100%',
              maxWidth: '400px',
              backgroundColor: '#0d1322',
              color: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              textAlign: 'center',
              boxSizing: 'border-box',
              overflow: 'hidden',
              border: '1px solid #1e293b'
            }}>
              
              {/* Top Dark Section */}
              <div style={{ padding: '40px 32px' }}>
                
                {/* Active Glow Badge */}
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 16px',
                  backgroundColor: 'rgba(4, 47, 46, 0.8)',
                  border: '1px solid #065f46',
                  borderRadius: '9999px',
                  marginBottom: '28px'
                }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    backgroundColor: '#10b981',
                    borderRadius: '50%',
                    boxShadow: '0 0 8px #10b981'
                  }} />
                  <span style={{
                    color: '#059669',
                    fontSize: '13px',
                    fontWeight: '500',
                  }}>
                    Running
                  </span>
                </div>

                {/* Title */}
                <h1 style={{
                  fontSize: '28px',
                  fontWeight: '400',
                  margin: '0 0 16px 0',
                  color: '#ffffff'
                }}>
                  Hay, Dev
                </h1>

                {/* Subtitle */}
                <p style={{
                  fontSize: '13px',
                  color: '#e2e8f0',
                  margin: '0 0 24px 0',
                  lineHeight: '1.5'
                }}>
                  Carbon Framrwork is Running
                </p>

                {/* Interactive URL Link */}
                <a 
                  href="http://localhost:3000" 
                  target="_blank" 
                  rel="noreferrer"
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '12px 16px',
                    backgroundColor: '#000000',
                    border: '1px solid #334155',
                    color: '#ffffff',
                    fontSize: '13px',
                    textDecoration: 'none',
                    boxSizing: 'border-box'
                  }}
                >
                  http://localhost:3000
                </a>
              </div>

              {/* Bottom Warning Section - Now Clickable */}
              <div 
               
                style={{
                  backgroundColor: '#d8b475',
                  padding: '24px 32px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '16px',
                  textAlign: 'left',
                  color: '#111827',
                  cursor: 'pointer', /* Added pointer to indicate it's clickable */
                  transition: 'opacity 0.2s ease-in-out'
                }}
                onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
                onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
              >
                {/* Warning Triangle SVG */}
                <svg 
                  width="28" 
                  height="28" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="1.2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  style={{ flexShrink: 0, marginTop: '2px' }}
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                
                {/* Warning Text */}
                <p style={{
                  fontSize: '13px',
                  margin: '0',
                  lineHeight: '1.5',
                  fontWeight: '400'
                }}>
                  Use "Carbon Framework Previewer"<br />
                  to Test and Debug your app insted<br />
                  of browser. Browser does not<br />
                  support native api.
                </p>
              </div>

            </div>
          </div>
        </AppBody>
      </App>
    </PageView>
  );
}

export { HomeView };