import React, { useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { Maximize2, Minimize2, Hand, Info, X } from 'lucide-react';

// Components
import SaturnScene from './components/SaturnScene';
import CameraHandler from './components/CameraHandler';

// Logic
import { GestureState } from './types';
import { PHRASES } from './constants';

const App: React.FC = () => {
  // Application State
  const [gestureState, setGestureState] = useState<GestureState>(GestureState.CLOSED);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [currentPhrase, setCurrentPhrase] = useState<string>("");
  const [cameraActive, setCameraActive] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showInfo, setShowInfo] = useState<boolean>(true);

  // Available pool of indices to ensure non-repetition until exhaustion
  const [availableIndices, setAvailableIndices] = useState<number[]>(
    Array.from({ length: PHRASES.length }, (_, i) => i)
  );

  // Handle Gesture Changes
  const handleGestureDetected = useCallback((detectedState: GestureState) => {
    if (detectedState === GestureState.OPEN && !isExpanded) {
      setIsExpanded(true);
      triggerNewPhrase();
    } else if (detectedState === GestureState.CLOSED && isExpanded) {
      setIsExpanded(false);
    }
    setGestureState(detectedState);
  }, [isExpanded]);

  // Logic to pick a random phrase without repetition
  const triggerNewPhrase = () => {
    let indices = availableIndices;
    if (indices.length === 0) {
      // Reset if we used all phrases
      indices = Array.from({ length: PHRASES.length }, (_, i) => i);
    }

    const randomIndex = Math.floor(Math.random() * indices.length);
    const phraseIndex = indices[randomIndex];
    
    // Remove used index
    const newIndices = [...indices];
    newIndices.splice(randomIndex, 1);
    setAvailableIndices(newIndices);

    setCurrentPhrase(PHRASES[phraseIndex]);
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  // Manual Trigger for debugging/fallback
  const handleManualToggle = () => {
    if (isExpanded) {
      setIsExpanded(false);
      setGestureState(GestureState.CLOSED);
    } else {
      setIsExpanded(true);
      setGestureState(GestureState.OPEN);
      triggerNewPhrase();
    }
  };

  return (
    <div className="relative w-full h-screen bg-[#050505] overflow-hidden select-none font-sans text-white">
      
      {/* 3D Scene */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 20, 60], fov: 45 }} dpr={[1, 2]}>
          <color attach="background" args={['#020205']} />
          <ambientLight intensity={0.2} />
          
          <Stars radius={200} depth={50} count={7000} factor={4} saturation={0} fade speed={0.5} />
          
          <SaturnScene gestureState={gestureState} isExpanded={isExpanded} />
          
          <OrbitControls 
            enablePan={false} 
            enableZoom={true} 
            minDistance={20} 
            maxDistance={120}
            autoRotate={!isExpanded}
            autoRotateSpeed={0.3}
          />
        </Canvas>
      </div>

      {/* Header UI */}
      <header className="absolute top-0 left-0 w-full p-8 flex justify-between items-start z-10 pointer-events-none">
        <div className="pointer-events-auto animate-fade-in-down">
           <h1 className="text-3xl md:text-4xl font-extralight tracking-[0.3em] text-white/90 drop-shadow-lg">
             SATURN NEBULA
           </h1>
           <div className="flex items-center gap-2 mt-2 ml-1 text-white/40 text-xs font-mono uppercase tracking-widest">
             <span className={`w-1.5 h-1.5 rounded-full ${cameraActive ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-red-500'}`}></span>
             <span>Gemini Vision Link Active</span>
           </div>
        </div>

        <div className="flex gap-3 pointer-events-auto">
          <button 
            onClick={() => setShowInfo(!showInfo)}
            className="group p-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 backdrop-blur-md transition-all duration-300"
            aria-label="Toggle Info"
          >
            <Info size={18} className="text-white/70 group-hover:text-white" />
          </button>
          <button 
            onClick={toggleFullscreen}
            className="group p-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 backdrop-blur-md transition-all duration-300"
            aria-label="Toggle Fullscreen"
          >
             {isFullscreen ? 
               <Minimize2 size={18} className="text-white/70 group-hover:text-white" /> : 
               <Maximize2 size={18} className="text-white/70 group-hover:text-white" />
             }
          </button>
        </div>
      </header>

      {/* Info Card */}
      {showInfo && (
        <div className="absolute top-32 left-8 w-80 z-20 pointer-events-auto animate-slide-in-left">
           <div className="relative p-6 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500/50 via-purple-500/50 to-orange-500/50"></div>
             <button 
                onClick={() => setShowInfo(false)}
                className="absolute top-4 right-4 text-white/30 hover:text-white/80 transition-colors"
             >
               <X size={14} />
             </button>
             
             <h3 className="text-white/90 font-light tracking-wider mb-4 text-lg">GESTURE CONTROL</h3>
             
             <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-white/5 border border-white/5 text-emerald-300/80">
                    <Hand size={20} className="transform scale-x-[-1]" />
                  </div>
                  <div>
                    <p className="text-white/90 text-sm font-medium">Open Hand</p>
                    <p className="text-white/50 text-xs mt-1 leading-relaxed">
                      Spread your fingers to disperse the planet and reveal cosmic wisdom.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-white/5 border border-white/5 text-amber-300/80">
                    <div className="w-5 h-5 rounded-full border-2 border-current"></div>
                  </div>
                  <div>
                    <p className="text-white/90 text-sm font-medium">Close Hand</p>
                    <p className="text-white/50 text-xs mt-1 leading-relaxed">
                      Make a fist to reform the planet and gather the stardust.
                    </p>
                  </div>
                </div>
             </div>
           </div>
        </div>
      )}

      {/* Center Phrase Display */}
      <div className={`
        absolute inset-0 flex items-center justify-center z-0 pointer-events-none transition-all duration-1000 ease-out
        ${isExpanded ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-95 blur-sm'}
      `}>
        <div className="text-center px-6 max-w-5xl">
           <p className="text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/60 text-4xl md:text-6xl lg:text-7xl font-thin tracking-wide leading-tight drop-shadow-[0_0_25px_rgba(255,255,255,0.3)] animate-float-slow">
             {currentPhrase}
           </p>
           <div className={`
              mt-8 flex justify-center transition-all duration-1000 delay-300
              ${isExpanded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
           `}>
             <div className="h-[1px] w-32 bg-gradient-to-r from-transparent via-blue-400/50 to-transparent"></div>
           </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-10 left-0 w-full flex justify-center z-20 pointer-events-auto">
        <div className="flex flex-col items-center gap-4">
           {/* Hint text */}
           <p className={`text-white/30 text-xs uppercase tracking-widest transition-opacity duration-500 ${showInfo ? 'opacity-0' : 'opacity-100'}`}>
             {isExpanded ? "Close hand to reform" : "Open hand to disperse"}
           </p>

           <button 
            onClick={handleManualToggle}
            className={`
              relative group flex items-center gap-3 px-8 py-3 rounded-full border transition-all duration-500 overflow-hidden
              ${isExpanded 
                ? 'bg-blue-500/10 border-blue-400/30 text-blue-200 hover:bg-blue-500/20' 
                : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
              }
              backdrop-blur-md hover:scale-105 active:scale-95
            `}
          >
            {/* Button Glow Effect */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl ${isExpanded ? 'bg-blue-500/20' : 'bg-white/10'}`}></div>
            
            <div className="relative flex items-center gap-3">
              {isExpanded ? (
                <>
                  <Minimize2 size={16} />
                  <span className="uppercase tracking-[0.15em] text-xs font-semibold">Reform Planet</span>
                </>
              ) : (
                <>
                  <Hand size={16} />
                  <span className="uppercase tracking-[0.15em] text-xs font-semibold">Disperse</span>
                </>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Camera Logic Component */}
      <CameraHandler 
        active={cameraActive} 
        onGestureDetected={handleGestureDetected} 
      />

    </div>
  );
};

export default App;