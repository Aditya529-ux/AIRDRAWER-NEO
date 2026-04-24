import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import CameraView from './components/CameraView';
import DrawingCanvas from './components/DrawingCanvas';
import HelpPanel from './components/HelpPanel';
import ControlPanel from './components/ControlPanel';
import { GestureInterpreter, CONTROL_GESTURES, GESTURES } from './modules/gestureInterpreter';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';

function App() {
  const [settings, setSettings] = useState({
    color: '#00ffff',
    lineWidth: 8,
    glowIntensity: 20,
  });

  // Primary hand (drawing)
  const [gesture, setGesture] = useState(GESTURES.IDLE);
  const [landmark, setLandmark] = useState(null);
  const [fingertips, setFingertips] = useState([]);

  // Secondary hand (control)
  const [controlGesture, setControlGesture] = useState(CONTROL_GESTURES.IDLE);
  const [controlLandmark, setControlLandmark] = useState(null);
  const [controlFingertips, setControlFingertips] = useState([]);
  const [controlPinchDelta, setControlPinchDelta] = useState(0);
  const [controlAngleDelta, setControlAngleDelta] = useState(0);

  const [cameraVisible, setCameraVisible] = useState(true);
  const [gesturesEnabled, setGesturesEnabled] = useState(true);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [fps, setFps] = useState(0);

  const canvasRef = useRef(null);
  const interpreter = useMemo(() => new GestureInterpreter(), []);

  // FPS counter
  const fpsRef = useRef({ frames: 0, lastTime: performance.now() });
  useEffect(() => {
    const interval = setInterval(() => {
      const now = performance.now();
      const elapsed = now - fpsRef.current.lastTime;
      setFps(Math.round((fpsRef.current.frames / elapsed) * 1000));
      fpsRef.current.frames = 0;
      fpsRef.current.lastTime = now;
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const onResults = useCallback((results) => {
    // Count frames for FPS
    fpsRef.current.frames++;

    // Hide loading screen on first results
    if (isLoading) setIsLoading(false);

    if (!gesturesEnabled) {
      setGesture(GESTURES.IDLE);
      setLandmark(null);
      setFingertips([]);
      setControlGesture(CONTROL_GESTURES.IDLE);
      setControlLandmark(null);
      setControlFingertips([]);
      return;
    }

    const { primary, secondary } = interpreter.interpret(results);

    // Primary hand
    setGesture(primary.gesture);
    setLandmark(primary.landmark);
    setFingertips(primary.fingertips);

    // Secondary hand
    setControlGesture(secondary.gesture);
    setControlLandmark(secondary.landmark);
    setControlFingertips(secondary.fingertips);
    setControlPinchDelta(secondary.pinchDelta);
    setControlAngleDelta(secondary.angleDelta);
  }, [interpreter, gesturesEnabled, isLoading]);

  const handleSave = () => {
    const dataUrl = canvasRef.current?.save();
    if (dataUrl) {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `air-drawing-${Date.now()}.png`;
      link.click();
    }
  };

  // Determine active mode label for the HUD
  const activeMode = controlGesture !== CONTROL_GESTURES.IDLE
    ? controlGesture.replace('CTRL_', '')
    : gesture;

  // Map gesture to icon/description
  const gestureInfo = {
    'DRAW': { icon: '✍️', label: 'DRAWING', color: settings.color },
    'ERASE': { icon: '🗑️', label: 'ERASING', color: '#ff4444' },
    'MOVE': { icon: '✋', label: 'MOVE', color: '#64b4ff' },
    'ROTATE': { icon: '🔄', label: 'ROTATE', color: '#ffa500' },
    'SCALE': { icon: '📐', label: 'SCALE', color: '#00ffc8' },
  };

  const currentInfo = gestureInfo[activeMode] || null;

  return (
    <div className="app-container">
      {/* Loading Screen */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            className="loading-screen"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="loading-content">
              <div className="loading-spinner" />
              <h2 className="loading-title">Neon Air Draw</h2>
              <p className="loading-subtitle">Developed by Aditya</p>
              <p className="loading-status">Initializing hand tracking...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {cameraVisible && (
        <CameraView
          onResults={onResults}
        />
      )}

      <DrawingCanvas
        ref={canvasRef}
        settings={settings}
        gesture={gesture}
        landmark={landmark}
        controlGesture={controlGesture}
        controlLandmark={controlLandmark}
        controlPinchDelta={controlPinchDelta}
        controlAngleDelta={controlAngleDelta}
      />

      <ControlPanel
        settings={settings}
        onSettingsChange={(newSettings) => setSettings(prev => ({ ...prev, ...newSettings }))}
        onClear={() => canvasRef.current?.clear()}
        onUndo={() => canvasRef.current?.undo()}
        onRedo={() => canvasRef.current?.redo()}
        onSave={handleSave}
        onToggleCamera={() => setCameraVisible(!cameraVisible)}
        cameraVisible={cameraVisible}
        gestureVisible={gesturesEnabled}
        onToggleGestures={() => setGesturesEnabled(!gesturesEnabled)}
        onHelp={() => setIsHelpOpen(true)}
      />

      <HelpPanel isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      {/* FPS Counter */}
      <div className="fps-counter font-mono-premium">
        {fps} FPS
      </div>

      {/* Floating Gesture Status */}
      <AnimatePresence>
        {currentInfo && activeMode !== 'IDLE' && activeMode !== CONTROL_GESTURES.IDLE && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="gesture-status glass-meta"
            style={{ borderColor: currentInfo.color }}
          >
            <span className="gesture-icon">{currentInfo.icon}</span>
            <span style={{ color: currentInfo.color }}>{currentInfo.label}</span>
            <span className="gesture-mode">MODE</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Primary Hand Fingertip Indicators */}
      {fingertips.map((tip, i) => {
        if (!tip) return null;
        const x = (1 - tip.x) * window.innerWidth;
        const y = tip.y * window.innerHeight;

        let size = '8px';
        let opacity = 0.4;
        let color = settings.color;
        let shadow = `0 0 8px 2px ${color}`;
        let border = 'none';

        if (i === 1) { // Index finger
          if (gesture === 'ERASE') {
            size = '50px';
            color = 'transparent';
            shadow = '0 0 15px 4px rgba(255, 60, 60, 0.8), inset 0 0 10px 2px rgba(255, 60, 60, 0.4)';
            border = '2px solid rgba(255, 60, 60, 0.8)';
            opacity = 1;
          } else if (gesture === 'DRAW') {
            size = '14px';
            opacity = 1;
            shadow = `0 0 20px 6px ${color}, 0 0 40px 10px ${color}40`;
          } else {
            size = '12px';
            opacity = 0.7;
          }
        }

        return (
          <div
            key={`p-${i}`}
            style={{
              position: 'fixed',
              left: x, top: y,
              width: size, height: size,
              backgroundColor: color,
              border,
              borderRadius: '50%',
              transform: 'translate(-50%, -50%)',
              boxShadow: shadow,
              opacity,
              zIndex: 40,
              pointerEvents: 'none',
              transition: 'width 0.15s ease, height 0.15s ease, box-shadow 0.15s ease',
            }}
          />
        );
      })}

      {/* Secondary Hand Fingertip Indicators */}
      {controlFingertips.map((tip, i) => {
        if (!tip) return null;
        const x = (1 - tip.x) * window.innerWidth;
        const y = tip.y * window.innerHeight;

        let size = '8px';
        let opacity = 0.4;
        let color = 'transparent';
        let shadow = '0 0 6px 2px rgba(255, 165, 0, 0.4)';
        let border = '1.5px solid rgba(255, 165, 0, 0.5)';

        if (i === 1) {
          size = '16px';
          opacity = 1;
          if (controlGesture === CONTROL_GESTURES.MOVE) {
            shadow = '0 0 20px 5px rgba(100, 180, 255, 0.8)';
            border = '2px solid rgba(100, 180, 255, 0.9)';
          } else if (controlGesture === CONTROL_GESTURES.SCALE) {
            shadow = '0 0 20px 5px rgba(0, 255, 200, 0.8)';
            border = '2px solid rgba(0, 255, 200, 0.9)';
          } else if (controlGesture === CONTROL_GESTURES.ROTATE) {
            shadow = '0 0 20px 5px rgba(255, 165, 0, 0.8)';
            border = '2px solid rgba(255, 165, 0, 0.9)';
          }
        }

        return (
          <div
            key={`s-${i}`}
            style={{
              position: 'fixed',
              left: x, top: y,
              width: size, height: size,
              backgroundColor: color,
              border,
              borderRadius: '50%',
              transform: 'translate(-50%, -50%)',
              boxShadow: shadow,
              opacity,
              zIndex: 40,
              pointerEvents: 'none',
              transition: 'width 0.15s ease, height 0.15s ease',
            }}
          />
        );
      })}

      {!landmark && !controlLandmark && !isLoading && (
        <div className="overlay-message">
          <div className="overlay-icon">👋</div>
          <div className="overlay-text">Raise your hand to start drawing</div>
          <div className="overlay-hint">Use pinch gesture to draw • Fist to erase</div>
        </div>
      )}
    </div>
  );
}

export default App;
