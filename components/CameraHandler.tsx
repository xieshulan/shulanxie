import React, { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, RefreshCw } from 'lucide-react';
import { detectGesture } from '../services/visionService';
import { GestureState, GeminiVisionResponse } from '../types';
import { CAMERA_CHECK_INTERVAL_MS } from '../constants';

interface CameraHandlerProps {
  onGestureDetected: (state: GestureState) => void;
  active: boolean;
}

const CameraHandler: React.FC<CameraHandlerProps> = ({ onGestureDetected, active }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (active && hasPermission) {
      startAnalysisLoop();
    } else {
      stopAnalysisLoop();
    }
    return () => stopAnalysisLoop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, hasPermission]);

  const startCamera = async () => {
    setLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
            width: { ideal: 320 }, // Low res is fine for gesture and faster
            height: { ideal: 240 },
            facingMode: 'user'
        } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setHasPermission(true);
      }
    } catch (err) {
      setError("Camera access denied or unavailable.");
      setHasPermission(false);
    } finally {
      setLoading(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const startAnalysisLoop = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    intervalRef.current = window.setInterval(async () => {
      if (!videoRef.current || !canvasRef.current) return;
      
      const context = canvasRef.current.getContext('2d');
      if (!context) return;

      // Draw current video frame to canvas
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);

      // Convert to base64 jpeg (lower quality for speed)
      const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.5);

      // Call Gemini
      // We don't await here to block the UI, but we handle the promise
      detectGesture(dataUrl).then((response: GeminiVisionResponse) => {
        if (response.gesture !== 'NONE') {
            // Map Gemini response to our enum
            const state = response.gesture === 'OPEN' ? GestureState.OPEN : GestureState.CLOSED;
            onGestureDetected(state);
        }
      });

    }, CAMERA_CHECK_INTERVAL_MS);
  };

  const stopAnalysisLoop = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2 pointer-events-none">
       {/* Debug view (minimized) */}
       <div className={`
         relative overflow-hidden rounded-xl border border-white/20 bg-black/50 backdrop-blur-md transition-all duration-500
         ${hasPermission ? 'w-32 h-24' : 'w-0 h-0'}
         ${active ? 'opacity-100' : 'opacity-40'}
       `}>
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-cover transform scale-x-[-1]" // Mirror
          />
          <canvas ref={canvasRef} className="hidden" />
          
          {/* Status Indicator */}
          <div className="absolute top-2 right-2 flex gap-1">
             <div className={`w-2 h-2 rounded-full ${active ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
          </div>
       </div>

       {/* Camera Controls (Pointer events enabled for buttons) */}
       <div className="pointer-events-auto flex gap-2">
         {error && (
            <div className="bg-red-500/80 text-white text-xs px-3 py-1 rounded-full backdrop-blur">
              {error}
            </div>
         )}
         
         {!hasPermission && !loading && !error && (
             <button 
             onClick={startCamera}
             className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-full backdrop-blur-md transition-all"
           >
             <CameraOff size={20} />
           </button>
         )}

         {hasPermission && (
            <button 
              onClick={startCamera} 
              className="bg-white/10 hover:bg-white/20 text-white/50 hover:text-white p-2 rounded-full backdrop-blur-md transition-all"
              title="Restart Camera"
            >
              <RefreshCw size={14} />
            </button>
         )}
       </div>
    </div>
  );
};

export default CameraHandler;