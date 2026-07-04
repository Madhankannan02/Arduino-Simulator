import { Canvas } from './components/canvas/Canvas';
import { ComponentPalette } from './components/ui/ComponentPalette';
import { WireColorPicker } from './components/ui/WireColorPicker';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { CodeEditorRef } from './components/editor/CodeEditor';
import { RightPanel } from './components/RightPanel';
import { Toaster, toast } from 'react-hot-toast';
import { useState, useRef, useEffect } from 'react';
import { Toolbar } from './components/ui/Toolbar';
import { SensorDistanceControl } from './components/ui/SensorDistanceControl';
import { ErrorPanel } from './components/ui/ErrorPanel';
import { setupAutoSave, deserializeProject } from './utils/projectSerializer';
import { WelcomeModal } from './components/ui/WelcomeModal';
import { GuidedTour } from './components/ui/GuidedTour';
import { SensorValuesControl } from './components/ui/SensorValuesControl';
import { AuthModal } from './components/ui/AuthModal';
import { MyProjectsPanel } from './components/ui/MyProjectsPanel';
import { SaveProjectModal } from './components/ui/SaveProjectModal';
import { SaveOptionsModal } from './components/ui/SaveOptionsModal';

import { LDRControl } from './components/ui/LDRControl';
import { ThermistorControl } from './components/ui/ThermistorControl';
import { MultimeterPanel } from './components/ui/MultimeterPanel';
import { useAuthStore } from './store/authStore';
import { useUiStore } from './store/uiStore';

function App() {
  useKeyboardShortcuts();
  
  const initializeAuth = useAuthStore(state => state.initialize);
  const isAuthModalOpen = useUiStore(state => state.isAuthModalOpen);
  const setAuthModalOpen = useUiStore(state => state.setAuthModalOpen);

  useEffect(() => {
    initializeAuth();
    setupAutoSave();

    const savedTime = localStorage.getItem('arduino-sim-autosave-time');
    if (savedTime) {
      const timeMs = parseInt(savedTime, 10);
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - timeMs < sevenDays) {
        toast((t) => (
          <div className="flex flex-col gap-2">
            <span className="font-semibold text-sm text-[#2C5E4A]">An auto-saved project was found.</span>
            <div className="flex gap-2 justify-end mt-1">
              <button
                onClick={() => toast.dismiss(t.id)}
                className="px-4 py-1.5 text-xs bg-black/5 hover:bg-black/10 rounded-full text-[#2C5E4A] font-medium transition-colors"
              >
                Dismiss
              </button>
              <button
                onClick={() => {
                  try {
                    const data = JSON.parse(localStorage.getItem('arduino-sim-autosave') || '{}');
                    deserializeProject(data);
                    toast.dismiss(t.id);
                  } catch (e) {
                    toast.error('Failed to restore auto-save');
                  }
                }}
                className="px-4 py-1.5 text-xs bg-[#3C6A56] hover:bg-[#2F5343] text-white rounded-full font-medium transition-colors"
              >
                Restore
              </button>
            </div>
          </div>
        ), { duration: 15000, id: 'autosave-toast' });
      }
    }
  }, []);

  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [errorPanelOpen, setErrorPanelOpen] = useState(false);
  const editorRef = useRef<CodeEditorRef>(null);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background">
      {/* Tooltips and Toasts */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setAuthModalOpen(false)} />
      <MyProjectsPanel />
      <SaveOptionsModal />
      <SaveProjectModal />
      <WelcomeModal />
      <GuidedTour />
      <Toaster 
        position="bottom-right" 
        toastOptions={{ 
          style: { 
            background: '#ffffff', 
            color: '#2C5E4A',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            border: '1px solid rgba(0,0,0,0.05)',
            borderRadius: '12px'
          } 
        }} 
      />
      <Toolbar 
        leftOpen={leftOpen} setLeftOpen={setLeftOpen} 
        rightOpen={rightOpen} setRightOpen={setRightOpen} 
        errorPanelOpen={errorPanelOpen} setErrorPanelOpen={setErrorPanelOpen}
        editorRef={editorRef}
      />

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {/* Canvas permanently sits underneath, filling the WHOLE area */}
        <main className="absolute inset-0 bg-[#FFFAFA] flex flex-col z-0">
          <Canvas rightPanelOpen={rightOpen} />
          <WireColorPicker />
        </main>

        {/* Left Panel */}
        <div className={`absolute top-[80px] bottom-4 left-4 z-10 overflow-hidden transition-all duration-300 ease-in-out ${leftOpen ? 'w-[280px]' : 'w-0'}`}>
          <div className="w-[280px] h-full absolute top-0 right-0 shadow-[0_4px_24px_rgba(0,0,0,0.06)] rounded-2xl bg-transparent">
            <ComponentPalette />
          </div>
        </div>

        {/* Right Panel (Code Editor + Properties/Inspector) */}
        <div className={`absolute top-[80px] bottom-4 right-4 z-10 overflow-hidden transition-all duration-300 ease-in-out ${rightOpen ? 'w-[450px]' : 'w-0'}`}>
          <div className="w-[450px] h-full absolute top-0 left-0 shadow-[0_4px_24px_rgba(0,0,0,0.06)] rounded-2xl bg-transparent">
            <RightPanel editorRef={editorRef} />
          </div>
        </div>
      </div>
      
      {/* Standalone Error Panel */}
      {errorPanelOpen && (
        <ErrorPanel onClose={() => setErrorPanelOpen(false)} />
      )}
      
      <SensorDistanceControl />
      <SensorValuesControl />

      <LDRControl />
      <ThermistorControl />
      <MultimeterPanel />
    </div>
  );
}

export default App;

