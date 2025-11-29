import React, { useState, useEffect } from 'react';
import { CommandPalette } from './components/CommandPalette';
import { LayoutGrid, Command } from 'lucide-react';

const App: React.FC = () => {
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);

  // Keyboard shortcut listener (Simulates background.js trigger)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Alt+S
      if (e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setIsDashboardOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex flex-col items-center justify-center">
      
      {/* Mock Page Content */}
      <div className="z-0 bg-white w-[90%] h-[90vh] rounded-xl shadow-2xl p-12 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-3xl flex items-center justify-center mb-6 shadow-sm">
          <LayoutGrid size={40} />
        </div>
        
        <h1 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
          Global Command Center
        </h1>
        <p className="text-slate-500 text-lg max-w-lg mb-8">
          A Safari Start Page aesthetic for your Chrome Extension.
          Press the shortcut or click the button below to trigger the overlay.
        </p>

        <div className="flex items-center gap-4">
           <div className="px-6 py-4 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-3 shadow-sm">
              <span className="font-mono font-bold text-slate-700">Alt + S</span>
              <span className="text-sm text-slate-400">(Trigger)</span>
           </div>
           
           <button 
             onClick={() => setIsDashboardOpen(true)}
             className="px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center gap-2"
           >
             <Command size={18} />
             Open Dashboard
           </button>
        </div>
      </div>

      {/* The Dashboard Component */}
      <CommandPalette 
        isOpen={isDashboardOpen} 
        onClose={() => setIsDashboardOpen(false)} 
      />
      
    </div>
  );
};

export default App;