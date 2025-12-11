import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Text } from '@react-three/drei';
import { Maximize2, Minimize2, Hand, Info, Sparkles } from 'lucide-react';

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
  const [activePhraseIndex, setActivePhraseIndex] = useState<number>(-1);
  const [cameraActive, setCameraActive] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showInfo, setShowInfo] = useState<boolean>(true);

  // Available pool of indices to ensure non-repetition until exhaustion
  const [availableIndices, setAvailableIndices] = useState<number[]>(
    Array.from({ length: PHRASES.length }, (_, i) => i)
  );

  // Handle Gesture Changes
  const handleGestureDetected = useCallback((detectedState: GestureState) => {
    // Only update if state actually changes to avoid jitter re-renders, 
    // although Three.js handles frame updates separately.
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

    setActivePhraseIndex(phraseIndex);
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
    <div className="relative w-full h-screen bg-black overflow-hidden select-none">
      
      {/* 3D Scene */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 20, 50], fov: 45 }}>
          <color attach="background" args={['#050505']} />
          <ambientLight intensity={0.5} />
          <pointLight position={[100, 100, 100]} intensity={1} color="#ffeebb" />
          <pointLight position={[-100, -50, -100]} intensity={0.5} color="#4455ff" />
          
          <Stars radius={300} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          
          <SaturnScene gestureState={gestureState} isExpanded={isExpanded} />
          
          <OrbitControls 
            enablePan={false} 
            enableZoom={true} 
            minDistance={20} 
            maxDistance={100}
            autoRotate={!isExpanded}
            autoRotateSpeed={0.5}
          />
        </Canvas>
      </div>

      {/* UI Overlay - Top Bar */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-10 pointer-events-none">
        <div className="pointer-events-auto">
           <h1 className="text-white text-3xl font-thin tracking-[0.2em] mb-1">SATURN NEBULA</h1>
           <div className="flex items-center gap-2 text-white/50 text-sm">
             <span className={`w-2 h-2 rounded-full ${cameraActive ? 'bg-green-500' : 'bg-gray-500'}`}></span>
             <span>Gemini Vision Active</span>
           </div>
        </div>

        <div className="flex gap-4 pointer-events-auto">
          <button 
            onClick={() => setShowInfo(!showInfo)}
            className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white transition-all backdrop-blur-sm"
          >
            <Info size={20} />
          </button>
          <button 
            onClick={toggleFullscreen}
            className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white transition-all backdrop-blur-sm"
          >
             {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>
        </div>
      </div>

      {/* Info Panel */}
      {showInfo && (
        <div className="absolute top-24 left-6 max-w-sm text-white/70 text-sm z-10 animate-fade-in pointer-events-none">
           <p className="mb-2 backdrop-blur-md bg-black/30 p-4 rounded-lg border border-white/10">
             Show your <strong>Open Hand</strong> to the camera to disperse the planet and receive cosmic wisdom. 
             <br/><br/>
             <strong>Close your hand</strong> (fist) to bring the particles back together.
           </p>
        </div>
      )}

      {/* Center Phrase Display */}
      <div className={`
        absolute inset-0 flex items-center justify-center z-0 pointer-events-none transition-opacity duration-1000
        ${isExpanded ? 'opacity-100' : 'opacity-0'}
      `}>
        <div className="text-center px-4 max-w-4xl transform translate-y-8">
           <p className="text-white text-4xl md:text-6xl font-thin tracking-wide leading-tight drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
             {currentPhrase}
           </p>
           <div className="mt-6 flex justify-center">
             <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-white/50 to-transparent"></div>
           </div>
        </div>
      </div>

      {/* Manual Control (Bottom Center) - Fallback if camera fails */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
        <button 
          onClick={handleManualToggle}
          className={`
            group flex items-center gap-3 px-8 py-4 rounded-full backdrop-blur-md border border-white/10 transition-all duration-300
            ${isExpanded 
              ? 'bg-white/10 hover:bg-white/20 text-blue-200' 
              : 'bg-white/5 hover:bg-white/15 text-white'
            }
          `}
        >
          {isExpanded ? (
             <>
               <Minimize2 size={18} className="group-hover:scale-110 transition-transform" />
               <span className="uppercase tracking-widest text-sm">Reform</span>
             </>
          ) : (
             <>
               <Hand size={18} className="group-hover:scale-110 transition-transform" />
               <span className="uppercase tracking-widest text-sm">Disperse</span>
             </>
          )}
        </button>
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