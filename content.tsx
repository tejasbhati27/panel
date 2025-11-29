import React from 'react';
import { createRoot } from 'react-dom/client';
import { CommandPalette } from './components/CommandPalette';

declare const chrome: any;

// ID for our host element
const HOST_ID = 'chrome-command-palette-host';

function init() {
  // Prevent duplicate injection
  if (document.getElementById(HOST_ID)) return;

  // Create Host
  const host = document.createElement('div');
  host.id = HOST_ID;
  host.style.position = 'fixed';
  host.style.top = '0px';
  host.style.left = '0px';
  host.style.width = '0px'; 
  host.style.height = '0px';
  host.style.zIndex = '2147483647'; 
  document.body.appendChild(host);

  // Create Shadow Root
  const shadow = host.attachShadow({ mode: 'open' });

  // 1. Inject Tailwind via CDN
  const tailwindLink = document.createElement('link');
  tailwindLink.rel = 'stylesheet';
  tailwindLink.href = 'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css';
  shadow.appendChild(tailwindLink);

  // 2. Inject Custom Styles
  const style = document.createElement('style');
  style.textContent = `
    :host { 
      all: initial; 
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    
    /* Custom Scrollbar - Premium rounded slate pill */
    .custom-scrollbar {
      scrollbar-width: thin;
      scrollbar-color: #cbd5e1 transparent; /* slate-300 */
    }
    
    .custom-scrollbar::-webkit-scrollbar {
      width: 14px;
      height: 14px;
    }
    
    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent; 
    }
    
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background-color: #cbd5e1; /* slate-300 */
      border-radius: 99px;
      border: 4px solid transparent;
      background-clip: content-box;
      transition: background-color 0.2s;
    }
    
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background-color: #94a3b8; /* slate-400 */
    }
    
    /* Animations */
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    @keyframes zoomIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    
    .animate-in { animation-duration: 0.2s; animation-fill-mode: both; }
    .fade-in { animation-name: fadeIn; }
    .slide-in-from-bottom-2 { animation-name: slideUp; }
    .zoom-in-95 { animation-name: zoomIn; }
  `;
  shadow.appendChild(style);

  // Create Mount Point
  const mountPoint = document.createElement('div');
  mountPoint.className = 'antialiased'; 
  shadow.appendChild(mountPoint);

  // React Root
  const root = createRoot(mountPoint);

  // Component Wrapper
  const DashboardWrapper = () => {
    const [isOpen, setIsOpen] = React.useState(false);

    React.useEffect(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const messageListener = (msg: any) => {
        if (msg.action === 'TOGGLE_DASHBOARD') {
          setIsOpen((prev) => !prev);
        }
      };
      
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.onMessage.addListener(messageListener);
      }

      return () => {
         if (typeof chrome !== 'undefined' && chrome.runtime) {
           chrome.runtime.onMessage.removeListener(messageListener);
         }
      }
    }, []);

    // Listen for Escape locally
    React.useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) setIsOpen(false);
        }
        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, [isOpen]);

    return <CommandPalette isOpen={isOpen} onClose={() => setIsOpen(false)} />;
  };

  root.render(<DashboardWrapper />);
}

init();