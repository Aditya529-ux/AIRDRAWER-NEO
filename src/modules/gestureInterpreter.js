/**
 * GestureInterpreter Module
 * 
 * Interprets gestures from two hands simultaneously:
 *   - Primary hand (right by default) → drawing gestures (DRAW, ERASE, MOVE)
 *   - Secondary hand (left by default) → control/transform gestures (MOVE, SCALE, ROTATE)
 * 
 * Assigns hand roles based on MediaPipe handedness labels.
 * Provides smoothed, stable gesture output with debouncing.
 */

import { GestureEngine, GESTURES, ControlGestureEngine, CONTROL_GESTURES } from './gestureEngine';

export { CONTROL_GESTURES };
export { GESTURES };

export class GestureInterpreter {
  constructor() {
    this.primaryEngine = new GestureEngine();
    this.controlEngine = new ControlGestureEngine();
  }

  /**
   * Process results from MediaPipe Hands.
   * 
   * @param {Object} results - MediaPipe results with multiHandLandmarks and multiHandedness
   * @returns {{ primary: Object, secondary: Object }} Gesture data for both hands
   */
  interpret(results) {
    const output = {
      primary: {
        gesture: GESTURES.IDLE,
        landmark: null,      // Index fingertip (landmark 8)
        fingertips: [],      // All 5 fingertips
      },
      secondary: {
        gesture: CONTROL_GESTURES.IDLE,
        landmark: null,
        fingertips: [],
        pinchDelta: 0,       // Change in pinch distance (for scaling)
        angleDelta: 0,       // Change in wrist angle (for rotation)
      },
    };

    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      this.primaryEngine.reset();
      this.controlEngine.reset();
      return output;
    }

    // --- Assign roles based on handedness ---
    let primaryLandmarks = null;
    let secondaryLandmarks = null;

    if (results.multiHandLandmarks.length === 1) {
      // Only one hand: treat it as primary (drawing hand)
      primaryLandmarks = results.multiHandLandmarks[0];
      this.controlEngine.reset();
    } else if (results.multiHandLandmarks.length >= 2) {
      // Two hands: use handedness to assign roles
      const handedness = results.multiHandedness || [];

      let primaryIdx = 0;
      let secondaryIdx = 1;

      // MediaPipe reports handedness from camera's perspective (mirrored).
      // "Right" label = user's left hand, "Left" label = user's right hand.
      // User's right hand = primary = "Left" label in MediaPipe.
      if (handedness.length >= 2) {
        const label0 = handedness[0]?.label || '';
        if (label0 === 'Right') {
          // Index 0 is user's left hand → secondary
          primaryIdx = 1;
          secondaryIdx = 0;
        }
      }

      primaryLandmarks = results.multiHandLandmarks[primaryIdx];
      secondaryLandmarks = results.multiHandLandmarks[secondaryIdx];
    }

    // --- Process Primary Hand ---
    if (primaryLandmarks) {
      output.primary.gesture = this.primaryEngine.update(primaryLandmarks);
      output.primary.landmark = primaryLandmarks[8]; // Index fingertip
      output.primary.fingertips = [4, 8, 12, 16, 20].map(i => primaryLandmarks[i]);
    }

    // --- Process Secondary Hand ---
    if (secondaryLandmarks) {
      const controlResult = this.controlEngine.detect(secondaryLandmarks);
      output.secondary.gesture = controlResult.gesture;
      output.secondary.landmark = secondaryLandmarks[8];
      output.secondary.fingertips = [4, 8, 12, 16, 20].map(i => secondaryLandmarks[i]);
      output.secondary.pinchDelta = controlResult.pinchDelta;
      output.secondary.angleDelta = controlResult.angleDelta;
    } else {
      this.controlEngine.reset();
    }

    return output;
  }
}
