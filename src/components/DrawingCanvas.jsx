import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { DrawingEngine } from '../modules/drawingEngine';
import { StrokeManager } from '../modules/strokeManager';
import { InteractionEngine } from '../modules/interactionEngine';
import { TransformEngine } from '../modules/transformEngine';
import { ParticleSystem } from '../modules/particleSystem';
import { ShapeRecognition } from '../modules/shapeRecognition';

const DrawingCanvas = forwardRef(({
  settings, gesture, landmark,
  controlGesture, controlLandmark, controlPinchDelta, controlAngleDelta
}, ref) => {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const managerRef = useRef(null);
  const interactionRef = useRef(null);
  const transformRef = useRef(null);
  const particlesRef = useRef(null);
  const shapeRecRef = useRef(null);

  // Current in-progress path
  const currentPathRef = useRef(null);
  const lastPointRef = useRef(null);
  const lastRawPointRef = useRef(null); // For velocity tracking

  // Track control gesture for rendering
  const controlGestureRef = useRef('CTRL_IDLE');

  // Smoothing config
  const SMOOTH_ALPHA = 0.25;

  // Shape recognition notification
  const shapeNotifRef = useRef(null);

  useImperativeHandle(ref, () => ({
    clear: () => {
      managerRef.current?.clear();
      particlesRef.current?.clear();
    },
    undo: () => managerRef.current?.undo(),
    redo: () => managerRef.current?.redo(),
    save: () => engineRef.current?.saveAsImage(),
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    managerRef.current = new StrokeManager();
    interactionRef.current = new InteractionEngine(managerRef.current);
    transformRef.current = new TransformEngine(managerRef.current);
    engineRef.current = new DrawingEngine(canvas);
    particlesRef.current = new ParticleSystem();
    shapeRecRef.current = new ShapeRecognition();

    let animationFrameId;
    const renderLoop = () => {
      if (engineRef.current && managerRef.current) {
        const selectedId = transformRef.current?.getSelectedStrokeId()
          ?? interactionRef.current?.getSelectedStrokeId()
          ?? null;
        engineRef.current.draw(
          managerRef.current.getAllStrokes(),
          currentPathRef.current,
          selectedId,
          controlGestureRef.current,
          particlesRef.current
        );

        // Render shape recognition notification
        if (shapeNotifRef.current) {
          _renderShapeNotification(engineRef.current.ctx, shapeNotifRef.current);
        }
      }
      animationFrameId = requestAnimationFrame(renderLoop);
    };
    renderLoop();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  /**
   * Render a floating notification when a shape is recognized.
   */
  function _renderShapeNotification(ctx, notif) {
    const elapsed = performance.now() - notif.startTime;
    const duration = 1500;
    if (elapsed > duration) {
      shapeNotifRef.current = null;
      return;
    }

    const progress = elapsed / duration;
    const alpha = progress < 0.2 ? progress / 0.2 : 1 - (progress - 0.2) / 0.8;
    const yOffset = -20 * progress;

    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.font = '600 14px "Outfit", sans-serif';
    ctx.textAlign = 'center';

    // Glow
    ctx.shadowBlur = 15;
    ctx.shadowColor = notif.color;
    ctx.fillStyle = notif.color;
    ctx.fillText(`✨ ${notif.shapeType.toUpperCase()} DETECTED`, notif.x, notif.y + yOffset);

    ctx.restore();
  }

  /**
   * Save the current in-progress path as a committed stroke.
   * Applies shape recognition before committing.
   */
  const saveCurrentPath = () => {
    if (currentPathRef.current && currentPathRef.current.points.length > 1) {
      let finalPoints = currentPathRef.current.points;
      let shapeType = 'freeform';

      // Run shape recognition
      if (shapeRecRef.current) {
        const result = shapeRecRef.current.analyze(finalPoints);
        if (result.detected) {
          finalPoints = result.points;
          shapeType = result.type;

          // Calculate center for notification and particle burst
          let cx = 0, cy = 0;
          for (const p of finalPoints) { cx += p.x; cy += p.y; }
          cx /= finalPoints.length;
          cy /= finalPoints.length;

          // Emit shape particles
          particlesRef.current?.emitShapeOutline(finalPoints, currentPathRef.current.color, 50);
          particlesRef.current?.emitBurst(cx, cy, currentPathRef.current.color, 25);

          // Show notification
          shapeNotifRef.current = {
            shapeType,
            x: cx,
            y: cy - 30,
            color: currentPathRef.current.color,
            startTime: performance.now(),
          };
        }
      }

      managerRef.current.addStroke(
        finalPoints,
        currentPathRef.current.color,
        currentPathRef.current.lineWidth,
        currentPathRef.current.glowIntensity
      );

      currentPathRef.current = null;
      lastPointRef.current = null;
      lastRawPointRef.current = null;
    }
  };

  // === PRIMARY HAND: Drawing gestures ===
  useEffect(() => {
    if (!landmark || !managerRef.current || !interactionRef.current) return;

    const x = (1 - landmark.x) * canvasRef.current.width;
    const y = landmark.y * canvasRef.current.height;

    switch (gesture) {
      case 'DRAW': {
        if (!currentPathRef.current) {
          currentPathRef.current = {
            points: [{ x, y }],
            color: settings.color,
            lineWidth: settings.lineWidth,
            glowIntensity: settings.glowIntensity,
          };
          lastPointRef.current = { x, y };
          lastRawPointRef.current = { x, y };
        } else {
          // Exponential smoothing: smoothed = prev + alpha * (current - prev)
          const prev = lastPointRef.current;
          const smoothedX = prev.x + SMOOTH_ALPHA * (x - prev.x);
          const smoothedY = prev.y + SMOOTH_ALPHA * (y - prev.y);

          // Only add point if it's far enough from the last one (min distance threshold)
          const dx = smoothedX - prev.x;
          const dy = smoothedY - prev.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist > 1.5) {
            currentPathRef.current.points.push({ x: smoothedX, y: smoothedY });
            lastPointRef.current = { x: smoothedX, y: smoothedY };

            // Emit trail particles
            const velocity = {
              x: smoothedX - (lastRawPointRef.current?.x || smoothedX),
              y: smoothedY - (lastRawPointRef.current?.y || smoothedY),
            };
            particlesRef.current?.emitTrail(smoothedX, smoothedY, settings.color, velocity);
          }

          lastRawPointRef.current = { x, y };
        }
        break;
      }

      case 'ERASE':
        saveCurrentPath();
        interactionRef.current.handleErase(x, y);
        // Erase particles
        particlesRef.current?.emitDissolve(x, y, '#ff4444', 8);
        break;

      case 'MOVE':
        // Open hand on primary hand → just idle (move is now on secondary)
        saveCurrentPath();
        break;

      default:
        saveCurrentPath();
        break;
    }
  }, [gesture, landmark, settings]);

  // === SECONDARY HAND: Control gestures (move/scale/rotate) ===
  useEffect(() => {
    if (!transformRef.current) return;
    controlGestureRef.current = controlGesture || 'CTRL_IDLE';

    if (!controlLandmark) {
      transformRef.current.releaseAll();
      return;
    }

    const x = (1 - controlLandmark.x) * canvasRef.current.width;
    const y = controlLandmark.y * canvasRef.current.height;

    switch (controlGesture) {
      case 'CTRL_MOVE':
        transformRef.current.handleMove(x, y);
        break;

      case 'CTRL_SCALE':
        transformRef.current.selectNearest(x, y);
        transformRef.current.handleScale(controlPinchDelta || 0);
        break;

      case 'CTRL_ROTATE':
        transformRef.current.selectNearest(x, y);
        transformRef.current.handleRotate(controlAngleDelta || 0);
        break;

      default:
        transformRef.current.releaseAll();
        break;
    }
  }, [controlGesture, controlLandmark, controlPinchDelta, controlAngleDelta]);

  return (
    <canvas
      ref={canvasRef}
      id="drawing-canvas"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 10,
        pointerEvents: 'none',
      }}
    />
  );
});

export default DrawingCanvas;
