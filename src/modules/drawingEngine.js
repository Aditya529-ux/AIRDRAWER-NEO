/**
 * DrawingEngine Module
 * 
 * High-performance Canvas2D rendering engine featuring:
 *   - Neon gradient stroke trails with glow effects
 *   - Velocity-based dynamic stroke width
 *   - Multi-layer rendering (glow → stroke → highlights)
 *   - Non-destructive transform rendering
 *   - Selection guides (move/scale/rotate indicators)
 *   - Particle system integration
 *   - Shape recognition visual feedback
 */

import { TransformEngine } from './transformEngine';

// Pre-computed gradient color stops for neon trail effects
const NEON_PALETTES = {
  '#00ffff': ['#00ffff', '#00ccff', '#0088ff', '#0044ff'],
  '#ff00ff': ['#ff00ff', '#ff00cc', '#ff0088', '#cc00ff'],
  '#ffff00': ['#ffff00', '#ffcc00', '#ff8800', '#ff4400'],
  '#00ff00': ['#00ff00', '#00cc44', '#00ff88', '#44ffaa'],
  '#ff0000': ['#ff0000', '#ff3300', '#ff6600', '#cc0000'],
  '#ffffff': ['#ffffff', '#ddddff', '#bbbbff', '#9999ff'],
};

export class DrawingEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.lastFrameTime = performance.now();

    // Performance: pre-allocate reusable gradient objects
    this._gradientCache = {};
  }

  /**
   * Clear the entire canvas.
   */
  clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Main render method — called every frame via requestAnimationFrame.
   * 
   * @param {Array} strokes - All committed strokes from StrokeManager
   * @param {Object|null} currentPath - The in-progress drawing path
   * @param {number|null} selectedStrokeId - ID of stroke selected by control hand
   * @param {string} controlGesture - Current control gesture for visual guides
   * @param {Object|null} particleSystem - ParticleSystem instance for rendering
   */
  draw(strokes, currentPath = null, selectedStrokeId = null, controlGesture = 'CTRL_IDLE', particleSystem = null) {
    const now = performance.now();
    const dt = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;

    this.clearCanvas();
    const ctx = this.ctx;

    // Render all committed strokes
    const allStrokes = [...strokes];
    if (currentPath) allStrokes.push(currentPath);

    for (const stroke of allStrokes) {
      if (!stroke.points || stroke.points.length === 0) continue;

      const points = stroke.transform
        ? TransformEngine.getTransformedPoints(stroke)
        : stroke.points;

      if (points.length === 0) continue;

      const isSelected = selectedStrokeId !== null && stroke.id === selectedStrokeId;
      const isCurrent = stroke === currentPath;

      if (points.length === 1) {
        this._drawDot(ctx, points[0], stroke, isSelected);
        continue;
      }

      // Render the stroke with neon effects
      this._drawNeonStroke(ctx, points, stroke, isSelected, isCurrent);

      // Selection guides
      if (isSelected) {
        this._drawSelectionGuides(ctx, points, stroke, controlGesture);
      }
    }

    // Render particles on top
    if (particleSystem) {
      particleSystem.update(dt);
      particleSystem.render(ctx);
    }
  }

  /**
   * Draw a single dot (for strokes with only 1 point).
   */
  _drawDot(ctx, point, stroke, isSelected) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(point.x, point.y, stroke.lineWidth / 2, 0, Math.PI * 2);

    if (isSelected) {
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 30;
      ctx.shadowColor = '#ffffff';
    } else {
      ctx.fillStyle = stroke.color;
      ctx.shadowBlur = stroke.glowIntensity || 15;
      ctx.shadowColor = stroke.color;
    }

    ctx.fill();
    ctx.restore();
  }

  /**
   * Draw a stroke with neon glow effects and velocity-based width.
   */
  _drawNeonStroke(ctx, points, stroke, isSelected, isCurrent) {
    const baseWidth = stroke.lineWidth * (stroke.transform?.scale || 1);
    const glowIntensity = stroke.glowIntensity || 20;
    const color = isSelected ? '#ffffff' : stroke.color;

    // === LAYER 1: Outer glow (wide, soft) ===
    ctx.save();
    ctx.beginPath();
    this._traceSmoothedPath(ctx, points);
    ctx.strokeStyle = color;
    ctx.lineWidth = baseWidth * 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.08;
    ctx.shadowBlur = glowIntensity * 3;
    ctx.shadowColor = color;
    ctx.stroke();
    ctx.restore();

    // === LAYER 2: Mid glow ===
    ctx.save();
    ctx.beginPath();
    this._traceSmoothedPath(ctx, points);
    ctx.strokeStyle = color;
    ctx.lineWidth = baseWidth * 1.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.2;
    ctx.shadowBlur = glowIntensity * 1.5;
    ctx.shadowColor = color;
    ctx.stroke();
    ctx.restore();

    // === LAYER 3: Core stroke with gradient ===
    ctx.save();
    ctx.beginPath();

    // Use velocity-based width for current (in-progress) strokes
    if (isCurrent && points.length > 2) {
      this._drawVelocityStroke(ctx, points, stroke, color, baseWidth, glowIntensity);
    } else {
      this._traceSmoothedPath(ctx, points);
      ctx.strokeStyle = color;
      ctx.lineWidth = baseWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowBlur = glowIntensity;
      ctx.shadowColor = color;
      ctx.stroke();
    }

    ctx.restore();

    // === LAYER 4: Bright center highlight ===
    ctx.save();
    ctx.beginPath();
    this._traceSmoothedPath(ctx, points);
    ctx.strokeStyle = isSelected ? '#ffffff' : this._lightenColor(color, 0.6);
    ctx.lineWidth = Math.max(1, baseWidth * 0.3);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.6;
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Draw stroke segments with velocity-based width variation.
   * Faster movement → thinner stroke, slower → thicker.
   */
  _drawVelocityStroke(ctx, points, stroke, color, baseWidth, glowIntensity) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowBlur = glowIntensity;
    ctx.shadowColor = color;
    ctx.strokeStyle = color;

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const velocity = Math.sqrt(dx * dx + dy * dy);

      // Map velocity to width: fast → thin, slow → thick
      const velocityFactor = Math.max(0.3, Math.min(1.5, 1.5 - velocity / 30));
      const segmentWidth = baseWidth * velocityFactor;

      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(curr.x, curr.y);
      ctx.lineWidth = segmentWidth;
      ctx.stroke();
    }
  }

  /**
   * Trace a Catmull-Rom smoothed path through points.
   */
  _traceSmoothedPath(ctx, points) {
    if (points.length < 2) return;

    ctx.moveTo(points[0].x, points[0].y);

    if (points.length === 2) {
      ctx.lineTo(points[1].x, points[1].y);
      return;
    }

    // Catmull-Rom spline through points for smoother curves
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[Math.min(points.length - 1, i + 1)];
      const p3 = points[Math.min(points.length - 1, i + 2)];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
  }

  /**
   * Create a gradient along the stroke path (neon trail effect).
   */
  _createStrokeGradient(ctx, points, color) {
    const first = points[0];
    const last = points[points.length - 1];

    try {
      const gradient = ctx.createLinearGradient(first.x, first.y, last.x, last.y);
      const palette = NEON_PALETTES[color] || [color, color, color, color];

      gradient.addColorStop(0, palette[0]);
      gradient.addColorStop(0.33, palette[1]);
      gradient.addColorStop(0.66, palette[2]);
      gradient.addColorStop(1, palette[3]);

      return gradient;
    } catch {
      return color;
    }
  }

  /**
   * Lighten a hex color by a given amount.
   */
  _lightenColor(hex, amount) {
    try {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);

      const nr = Math.min(255, Math.round(r + (255 - r) * amount));
      const ng = Math.min(255, Math.round(g + (255 - g) * amount));
      const nb = Math.min(255, Math.round(b + (255 - b) * amount));

      return `rgb(${nr}, ${ng}, ${nb})`;
    } catch {
      return '#ffffff';
    }
  }

  /**
   * Draw visual guides around a selected stroke.
   */
  _drawSelectionGuides(ctx, points, stroke, controlGesture) {
    // Calculate bounding box center
    let cx = 0, cy = 0;
    for (const p of points) { cx += p.x; cy += p.y; }
    cx /= points.length;
    cy /= points.length;

    // Calculate bounding radius
    let maxR = 0;
    for (const p of points) {
      const d = Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2);
      if (d > maxR) maxR = d;
    }
    const guideRadius = maxR + 25;

    ctx.save();

    // Animated dashed selection ring
    const dashOffset = (performance.now() / 50) % 24;
    ctx.beginPath();
    ctx.arc(cx, cy, guideRadius, 0, 2 * Math.PI);
    ctx.setLineDash([6, 6]);
    ctx.lineDashOffset = dashOffset;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);

    // Mode-specific guides
    if (controlGesture === 'CTRL_ROTATE') {
      const angle = stroke.transform?.rotation || 0;
      ctx.beginPath();
      ctx.arc(cx, cy, guideRadius + 10, -Math.PI / 2, -Math.PI / 2 + angle, angle < 0);
      ctx.strokeStyle = 'rgba(255, 165, 0, 0.8)';
      ctx.lineWidth = 3;
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'rgba(255, 165, 0, 0.6)';
      ctx.stroke();

      // Arrow endpoint
      const endAngle = -Math.PI / 2 + angle;
      const ax = cx + (guideRadius + 10) * Math.cos(endAngle);
      const ay = cy + (guideRadius + 10) * Math.sin(endAngle);
      ctx.beginPath();
      ctx.arc(ax, ay, 5, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(255, 165, 0, 0.9)';
      ctx.fill();

    } else if (controlGesture === 'CTRL_SCALE') {
      const scale = stroke.transform?.scale || 1;
      // Pulsing scale rings
      const pulse = 0.5 + Math.sin(performance.now() / 200) * 0.2;
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.arc(cx, cy, guideRadius * (0.5 + i * 0.2), 0, 2 * Math.PI);
        ctx.strokeStyle = `rgba(0, 255, 200, ${0.15 * (4 - i) * pulse})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      // Scale label
      ctx.fillStyle = 'rgba(0, 255, 200, 0.9)';
      ctx.font = '600 12px "Outfit", sans-serif';
      ctx.shadowBlur = 8;
      ctx.shadowColor = 'rgba(0, 255, 200, 0.5)';
      ctx.fillText(`${(scale * 100).toFixed(0)}%`, cx - 18, cy - guideRadius - 14);

    } else if (controlGesture === 'CTRL_MOVE') {
      // Crosshair with glow
      ctx.shadowBlur = 12;
      ctx.shadowColor = 'rgba(100, 180, 255, 0.6)';
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(100, 180, 255, 0.7)';
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(cx - 16, cy); ctx.lineTo(cx + 16, cy);
      ctx.moveTo(cx, cy - 16); ctx.lineTo(cx, cy + 16);
      ctx.strokeStyle = 'rgba(100, 180, 255, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Export canvas as PNG data URL.
   */
  saveAsImage() {
    return this.canvas.toDataURL('image/png');
  }
}
