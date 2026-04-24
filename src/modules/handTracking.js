/**
 * HandTracking Module
 * 
 * Handles webcam capture and MediaPipe Hands integration.
 * Implements exponential smoothing (LERP) on landmark positions
 * to reduce jitter and noise in real-time tracking.
 * 
 * smoothed = prev + alpha * (current - prev)
 * alpha = 0.25 (configurable)
 */

const getHandsConstructor = () => {
  if (typeof window !== 'undefined' && window.Hands) return window.Hands;
  return null;
};

export class HandTracker {
  constructor(onResults, options = {}) {
    const HandsConstructor = getHandsConstructor();
    if (!HandsConstructor) {
      console.error('MediaPipe Hands not found. Ensure CDN is loaded in index.html.');
      throw new Error('MediaPipe Hands not found');
    }

    this.hands = new HandsConstructor({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      },
    });

    this.hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
    });

    // Smoothing configuration
    this.alpha = options.alpha || 0.25;
    this.smoothedLandmarks = {}; // key: handIndex, value: array of 21 smoothed landmarks

    // Wrap callback to apply smoothing
    this._userCallback = onResults;
    this.hands.onResults((results) => this._onRawResults(results));
  }

  /**
   * Apply exponential smoothing to all landmark positions.
   */
  _onRawResults(results) {
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      this.smoothedLandmarks = {};
      this._userCallback(results);
      return;
    }

    const smoothedResults = {
      ...results,
      multiHandLandmarks: [],
    };

    // Build a mapping from handedness label to ensure consistent smoothing
    for (let i = 0; i < results.multiHandLandmarks.length; i++) {
      const rawLandmarks = results.multiHandLandmarks[i];
      const handLabel = results.multiHandedness?.[i]?.label || `hand_${i}`;

      if (!this.smoothedLandmarks[handLabel]) {
        // First frame for this hand — initialize with raw values
        this.smoothedLandmarks[handLabel] = rawLandmarks.map(lm => ({
          x: lm.x,
          y: lm.y,
          z: lm.z,
        }));
      } else {
        // Apply exponential smoothing: smoothed = prev + alpha * (current - prev)
        const prev = this.smoothedLandmarks[handLabel];
        this.smoothedLandmarks[handLabel] = rawLandmarks.map((lm, j) => ({
          x: prev[j].x + this.alpha * (lm.x - prev[j].x),
          y: prev[j].y + this.alpha * (lm.y - prev[j].y),
          z: prev[j].z + this.alpha * (lm.z - prev[j].z),
        }));
      }

      smoothedResults.multiHandLandmarks.push(this.smoothedLandmarks[handLabel]);
    }

    // Clean up smoothed data for hands no longer detected
    const activeLabels = new Set();
    for (let i = 0; i < results.multiHandLandmarks.length; i++) {
      const label = results.multiHandedness?.[i]?.label || `hand_${i}`;
      activeLabels.add(label);
    }
    for (const key of Object.keys(this.smoothedLandmarks)) {
      if (!activeLabels.has(key)) {
        delete this.smoothedLandmarks[key];
      }
    }

    this._userCallback(smoothedResults);
  }

  async send(image) {
    await this.hands.send({ image });
  }

  /**
   * Get a specific landmark from results.
   */
  static getLandmark(results, handIndex, landmarkIndex) {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > handIndex) {
      return results.multiHandLandmarks[handIndex][landmarkIndex];
    }
    return null;
  }

  /**
   * Check if a finger is extended (tip is above PIP joint).
   * fingerIndex: 0=Thumb, 1=Index, 2=Middle, 3=Ring, 4=Pinky
   */
  static isFingerUp(landmarks, fingerIndex) {
    if (fingerIndex === 0) {
      // Thumb: compare x-distance (thumb moves laterally)
      const tip = landmarks[4];
      const ip = landmarks[3];
      const mcp = landmarks[2];
      // Use the direction from MCP to IP to determine thumb orientation
      return Math.abs(tip.x - mcp.x) > Math.abs(ip.x - mcp.x);
    }
    const tip = landmarks[fingerIndex * 4 + 4];
    const pip = landmarks[fingerIndex * 4 + 2];
    return tip.y < pip.y;
  }

  /**
   * Normalize a landmark's (x, y) from [0,1] range to screen pixel coordinates.
   * Mirrors the x-axis (selfie mode).
   */
  static toScreenCoords(landmark, width, height) {
    return {
      x: (1 - landmark.x) * width,
      y: landmark.y * height,
      z: landmark.z,
    };
  }
}
