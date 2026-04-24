/**
 * GestureEngine - Stable gesture recognition with stability buffer.
 * 
 * Gestures detected:
 *   - PINCH   → Drawing mode (thumb + index close together)
 *   - OPEN    → Move mode (all fingers extended)
 *   - TWO_FINGERS → Rotate mode (index + middle extended)
 *   - FIST    → Erase mode (all fingers curled)
 *   - IDLE    → No actionable gesture
 * 
 * Uses:
 *   - Landmark distance thresholds for pinch detection
 *   - Finger extension detection via tip vs PIP joint positions
 *   - Gesture stability buffer (last 5 frames) — only switches gesture
 *     when the new gesture is stable for 5 consecutive frames
 */

export const GESTURES = {
  IDLE: 'IDLE',
  DRAW: 'DRAW',       // Pinch → draw
  ERASE: 'ERASE',     // Fist → erase
  MOVE: 'MOVE',       // Open hand → move (legacy: primary hand move)
  ROTATE: 'ROTATE',   // Two fingers → rotate (legacy: primary hand)
};

// Thresholds
const PINCH_THRESHOLD = 0.055;   // Normalized distance for pinch detection
const STABILITY_FRAMES = 2;      // Number of consecutive frames required

export class GestureEngine {
  constructor() {
    this.currentGesture = GESTURES.IDLE;
    this.gestureBuffer = [];       // Ring buffer of last N detected gestures
    this.bufferSize = STABILITY_FRAMES;
  }

  /**
   * Check if a finger is extended.
   * fingerIndex: 0=Thumb, 1=Index, 2=Middle, 3=Ring, 4=Pinky
   */
  _isFingerUp(landmarks, fingerIndex) {
    if (fingerIndex === 0) {
      // Thumb uses lateral movement (x-axis comparison)
      const tip = landmarks[4];
      const ip = landmarks[3];
      const mcp = landmarks[2];
      return Math.abs(tip.x - mcp.x) > Math.abs(ip.x - mcp.x);
    }
    const tip = landmarks[fingerIndex * 4 + 4];
    const pip = landmarks[fingerIndex * 4 + 2];
    return tip.y < pip.y;
  }

  /**
   * Calculate Euclidean distance between two landmarks.
   */
  _distance(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }

  /**
   * Detect raw gesture from landmarks (before stability filtering).
   */
  _detectRaw(landmarks) {
    if (!landmarks || landmarks.length < 21) return GESTURES.IDLE;

    const thumbUp = this._isFingerUp(landmarks, 0);
    const indexUp = this._isFingerUp(landmarks, 1);
    const middleUp = this._isFingerUp(landmarks, 2);
    const ringUp = this._isFingerUp(landmarks, 3);
    const pinkyUp = this._isFingerUp(landmarks, 4);

    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const pinchDist = this._distance(thumbTip, indexTip);

    // 1. PINCH → Draw (thumb tip close to index tip)
    if (pinchDist < PINCH_THRESHOLD) {
      return GESTURES.DRAW;
    }

    // 2. FIST → Erase (no fingers up)
    if (!indexUp && !middleUp && !ringUp && !pinkyUp && !thumbUp) {
      return GESTURES.ERASE;
    }

    // 3. TWO FINGERS (Index + Middle up, others down) → Rotate
    if (indexUp && middleUp && !ringUp && !pinkyUp) {
      return GESTURES.ROTATE;
    }

    // 4. OPEN HAND (all or most fingers up) → Move
    const fingersUp = [indexUp, middleUp, ringUp, pinkyUp].filter(Boolean).length;
    if (fingersUp >= 3) {
      return GESTURES.MOVE;
    }

    // 5. Index finger only → Draw fallback (pointing)
    if (indexUp && !middleUp && !ringUp && !pinkyUp) {
      return GESTURES.DRAW;
    }

    return GESTURES.IDLE;
  }

  /**
   * Update gesture with stability buffer.
   * Only switches to a new gesture if it's been detected for
   * STABILITY_FRAMES consecutive frames.
   * 
   * @param {Array} landmarks - 21 hand landmarks
   * @returns {string} Stable gesture identifier
   */
  update(landmarks) {
    const raw = this._detectRaw(landmarks);

    // Add to buffer
    this.gestureBuffer.push(raw);
    if (this.gestureBuffer.length > this.bufferSize) {
      this.gestureBuffer.shift();
    }

    // Check if all items in buffer agree
    if (this.gestureBuffer.length === this.bufferSize) {
      const allSame = this.gestureBuffer.every(g => g === raw);
      if (allSame) {
        this.currentGesture = raw;
      }
    }

    return this.currentGesture;
  }

  /**
   * Get the pinch distance for the current frame (useful for drawing pressure).
   */
  getPinchDistance(landmarks) {
    if (!landmarks) return 0;
    return this._distance(landmarks[4], landmarks[8]);
  }

  /**
   * Reset the gesture engine state.
   */
  reset() {
    this.currentGesture = GESTURES.IDLE;
    this.gestureBuffer = [];
  }
}

/**
 * Control gestures for the secondary (non-dominant) hand.
 * These mirror the primary gestures but are used for canvas transformations.
 */
export const CONTROL_GESTURES = {
  IDLE: 'CTRL_IDLE',
  MOVE: 'CTRL_MOVE',
  SCALE: 'CTRL_SCALE',
  ROTATE: 'CTRL_ROTATE',
};

/**
 * ControlGestureEngine - Detects transform gestures from the secondary hand.
 */
export class ControlGestureEngine {
  constructor() {
    this.currentGesture = CONTROL_GESTURES.IDLE;
    this.gestureBuffer = [];
    this.bufferSize = STABILITY_FRAMES;

    // Scale tracking
    this.lastPinchDistance = null;
    // Rotation tracking
    this.lastHandAngle = null;

    // Idle debounce (require N idle frames before releasing)
    this._idleFrameCount = 0;
    this._idleFramesRequired = 4;
    this._lastActiveGesture = CONTROL_GESTURES.IDLE;
  }

  _isFingerUp(landmarks, fingerIndex) {
    if (fingerIndex === 0) {
      const tip = landmarks[4];
      const ip = landmarks[3];
      const mcp = landmarks[2];
      return Math.abs(tip.x - mcp.x) > Math.abs(ip.x - mcp.x);
    }
    const tip = landmarks[fingerIndex * 4 + 4];
    const pip = landmarks[fingerIndex * 4 + 2];
    return tip.y < pip.y;
  }

  _distance(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }

  /**
   * Detect control gesture and compute deltas.
   */
  detect(landmarks) {
    const result = {
      gesture: CONTROL_GESTURES.IDLE,
      pinchDelta: 0,
      angleDelta: 0,
    };

    if (!landmarks || landmarks.length < 21) return result;

    const indexUp = this._isFingerUp(landmarks, 1);
    const middleUp = this._isFingerUp(landmarks, 2);
    const ringUp = this._isFingerUp(landmarks, 3);
    const pinkyUp = this._isFingerUp(landmarks, 4);

    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const wrist = landmarks[0];
    const middleBase = landmarks[9];

    const pinchDist = this._distance(thumbTip, indexTip);
    const handAngle = Math.atan2(middleBase.y - wrist.y, middleBase.x - wrist.x);

    // SCALE: Pinch gesture
    if (pinchDist < 0.06) {
      result.gesture = CONTROL_GESTURES.SCALE;
      if (this.lastPinchDistance !== null) {
        result.pinchDelta = pinchDist - this.lastPinchDistance;
      }
      this.lastPinchDistance = pinchDist;
      this.lastHandAngle = null;
      return this._applyIdleDebounce(result);
    }
    this.lastPinchDistance = null;

    // ROTATE: All fingers up (open palm) + wrist twist
    if (indexUp && middleUp && ringUp && pinkyUp) {
      result.gesture = CONTROL_GESTURES.ROTATE;
      if (this.lastHandAngle !== null) {
        result.angleDelta = handAngle - this.lastHandAngle;
        if (Math.abs(result.angleDelta) > Math.PI) result.angleDelta = 0;
      }
      this.lastHandAngle = handAngle;
      return this._applyIdleDebounce(result);
    }
    this.lastHandAngle = null;

    // MOVE: Two fingers up (index + middle)
    if (indexUp && middleUp && !ringUp && !pinkyUp) {
      result.gesture = CONTROL_GESTURES.MOVE;
      return this._applyIdleDebounce(result);
    }

    return this._applyIdleDebounce(result);
  }

  /**
   * Prevent flickering by requiring N consecutive idle frames before releasing.
   */
  _applyIdleDebounce(result) {
    if (result.gesture === CONTROL_GESTURES.IDLE) {
      this._idleFrameCount++;
      if (this._idleFrameCount < this._idleFramesRequired && this._lastActiveGesture !== CONTROL_GESTURES.IDLE) {
        result.gesture = this._lastActiveGesture;
      } else {
        this._lastActiveGesture = CONTROL_GESTURES.IDLE;
      }
    } else {
      this._idleFrameCount = 0;
      this._lastActiveGesture = result.gesture;
    }

    this.currentGesture = result.gesture;
    return result;
  }

  reset() {
    this.currentGesture = CONTROL_GESTURES.IDLE;
    this.gestureBuffer = [];
    this.lastPinchDistance = null;
    this.lastHandAngle = null;
    this._idleFrameCount = 0;
    this._lastActiveGesture = CONTROL_GESTURES.IDLE;
  }
}
