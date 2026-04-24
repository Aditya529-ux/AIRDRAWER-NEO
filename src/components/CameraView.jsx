import React, { useRef, useEffect, useCallback } from 'react';
import { HandTracker } from '../modules/handTracking';

const CameraView = ({ onResults }) => {
  const videoRef = useRef(null);
  const trackerRef = useRef(null);
  const onResultsRef = useRef(onResults);

  // Keep the callback ref up-to-date without triggering effect re-runs
  useEffect(() => {
    onResultsRef.current = onResults;
  }, [onResults]);

  // Stable callback that always calls the latest onResults
  const stableOnResults = useCallback((results) => {
    onResultsRef.current(results);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    let cancelled = false;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
          },
        });
        if (cancelled) return;
        video.srcObject = stream;
        video.onloadedmetadata = () => {
          video.play();
          startTracking();
        };
      } catch (err) {
        console.error('Error accessing camera:', err);
      }
    };

    const startTracking = () => {
      trackerRef.current = new HandTracker(stableOnResults);
      
      const processFrame = async () => {
        if (cancelled) return;
        if (video.readyState === 4) {
          try {
            await trackerRef.current.send(video);
          } catch (e) {
            console.warn('Frame processing error:', e);
          }
        }
        requestAnimationFrame(processFrame);
      };
      
      processFrame();
    };

    startCamera();

    return () => {
      cancelled = true;
      if (video.srcObject) {
        const tracks = video.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [stableOnResults]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      zIndex: -1,
      backgroundColor: '#000',
    }}>
      <video
        ref={videoRef}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: 'scaleX(-1)', // Mirror effect
          filter: 'brightness(1)', // Clear camera view
        }}
        playsInline
      />
    </div>
  );
};

export default CameraView;
