import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, Play, Keyboard, Info, Bug, X } from 'lucide-react';

import { Tooltip } from './Tooltip';
import { createPortal } from 'react-dom';

const SHORTCUTS = [
  { action: 'New Project', keys: 'Ctrl + N' },
  { action: 'Open Project', keys: 'Ctrl + O' },
  { action: 'Save Project', keys: 'Ctrl + S' },
  { action: 'Compile Code', keys: 'Ctrl + Enter' },
  { action: 'Run Simulation', keys: 'Shift + Enter' },
  { action: 'Delete Selected', keys: 'Delete' },
  { action: 'Toggle Sidebar', keys: 'Ctrl + B' },
  { action: 'Pan Canvas', keys: 'Space + Drag' },
  { action: 'Zoom Canvas', keys: 'Ctrl + Scroll' },
];

export function HelpMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleStartTour = () => {
    setIsOpen(false);
    window.dispatchEvent(new CustomEvent('arduino-sim-start-tour'));
  };

  return (
    <>
      <div className="relative flex items-center justify-center h-full" ref={menuRef}>
        <Tooltip position="bottom" content="Help & Resources">
          <button 
            className={`flex items-center justify-center p-2 rounded-md text-[#2C5E4A] hover:bg-[#2C5E4A]/10 transition-colors ${isOpen ? 'bg-[#2C5E4A]/15' : ''}`}
            onClick={() => setIsOpen(!isOpen)}
          >
            <HelpCircle size={18} />
          </button>
        </Tooltip>

        {isOpen && (
          <div className="absolute top-full right-0 mt-1 w-56 bg-white border border-[#E5EBE8] rounded-md shadow-lg z-50 py-1">
            <button
              onClick={handleStartTour}
              className="w-full text-left px-4 py-2 text-sm text-[#2C5E4A] font-medium hover:bg-[#F3F4F3] flex items-center gap-3 transition-colors"
            >
              <Play size={14} className="text-[#82b49b]" />
              <span>Start Tutorial</span>
            </button>
            <button
              onClick={() => { setIsOpen(false); setShowShortcuts(true); }}
              className="w-full text-left px-4 py-2 text-sm text-[#2C5E4A] font-medium hover:bg-[#F3F4F3] flex items-center gap-3 transition-colors"
            >
              <Keyboard size={14} className="text-[#6A7B76]" />
              <span>Keyboard Shortcuts</span>
            </button>
            
            <div className="h-px bg-[#E5EBE8] my-1"></div>
            
            <button
              onClick={() => { setIsOpen(false); alert('Arduino Simulator v1.0.0\nBuilt with React & Konva'); }}
              className="w-full text-left px-4 py-2 text-sm text-[#2C5E4A] font-medium hover:bg-[#F3F4F3] flex items-center gap-3 transition-colors"
            >
              <Info size={14} className="text-[#6A7B76]" />
              <span>About</span>
            </button>
            <a
              href="https://github.com/madhan295/oscilink/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full text-left px-4 py-2 text-sm text-[#2C5E4A] font-medium hover:bg-[#F3F4F3] flex items-center gap-3 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <Bug size={14} className="text-[#6A7B76]" />
              <span>Report a Bug</span>
            </a>
          </div>
        )}
      </div>

      {showShortcuts && createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative bg-white p-6 rounded-2xl shadow-2xl border border-[#E5EBE8] max-w-md w-full mx-4 zoom-in-95">
            <button 
              onClick={() => setShowShortcuts(false)}
              className="absolute top-4 right-4 text-[#6A7B76] hover:text-[#2C5E4A] transition-colors p-1"
            >
              <X size={20} />
            </button>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#F3F4F3] rounded-lg flex items-center justify-center text-[#2C5E4A]">
                <Keyboard size={20} />
              </div>
              <h2 className="text-xl font-bold text-[#2C5E4A]">Keyboard Shortcuts</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              {SHORTCUTS.map((shortcut, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-[#E5EBE8] last:border-0">
                  <span className="text-sm font-medium text-[#6A7B76]">{shortcut.action}</span>
                  <div className="flex gap-1">
                    {shortcut.keys.split('+').map((key, i) => (
                      <React.Fragment key={i}>
                        {i > 0 && <span className="text-[#B5C2BF] text-xs mx-0.5 mt-1">+</span>}
                        <kbd className="px-2 py-1 bg-[#F3F4F3] rounded border border-[#E5EBE8] text-xs font-mono font-bold text-[#2C5E4A] shadow-sm">
                          {key.trim()}
                        </kbd>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
