/**
 * ShapeRecognition Module
 * 
 * AI-powered shape detection that analyzes completed strokes
 * and replaces them with perfect geometric shapes.
 * 
 * Supported shapes:
 *   - Line: Low deviation from a straight path
 *   - Circle: Low variance from centroid radius
 *   - Rectangle: 4 corners detected via Douglas-Peucker simplification
 *   - Triangle: 3 corners detected
 * 
 * After stroke ends:
 *   1. Capture stroke points
 *   2. Detect shape type
 *   3. Replace with perfect shape points
 */

export class ShapeRecognition {
  constructor(options = {}) {
    // Thresholds (adjustable)
    this.lineDeviationThreshold = options.lineDeviation || 0.015;   // % of stroke length
    this.circleVarianceThreshold = options.circleVariance || 0.12;  // % of mean radius
    this.cornerAngleThreshold = options.cornerAngle || 0.4;        // radians (~23 degrees)
    this.minPointsForShape = options.minPoints || 8;
    this.closureThreshold = options.closureThreshold || 0.08;       // % of perimeter
    this.enabled = true;
  }

  /**
   * Analyze a set of stroke points and return either the original points
   * or a set of perfect shape points.
   * 
   * @param {Array<{x: number, y: number}>} points - Raw stroke points
   * @returns {{ type: string, points: Array<{x: number, y: number}>, detected: boolean }}
   */
  analyze(points) {
    if (!this.enabled || !points || points.length < this.minPointsForShape) {
      return { type: 'freeform', points, detected: false };
    }

    // Try line first (simplest)
    const lineResult = this._detectLine(points);
    if (lineResult) return lineResult;

    // Check if stroke is closed (start ≈ end)
    const isClosed = this._isStrokeClosed(points);

    if (isClosed) {
      // Try circle
      const circleResult = this._detectCircle(points);
      if (circleResult) return circleResult;

      // Try rectangle/triangle via corner detection
      const polyResult = this._detectPolygon(points);
      if (polyResult) return polyResult;
    }

    return { type: 'freeform', points, detected: false };
  }

  /**
   * Check if the stroke is closed (first point ≈ last point).
   */
  _isStrokeClosed(points) {
    const first = points[0];
    const last = points[points.length - 1];
    const dist = Math.sqrt((first.x - last.x) ** 2 + (first.y - last.y) ** 2);
    const perimeter = this._calculatePerimeter(points);
    return dist / perimeter < this.closureThreshold;
  }

  /**
   * Calculate total path length.
   */
  _calculatePerimeter(points) {
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      total += Math.sqrt(
        (points[i].x - points[i - 1].x) ** 2 +
        (points[i].y - points[i - 1].y) ** 2
      );
    }
    return total;
  }

  // ================================================
  // LINE DETECTION
  // ================================================

  _detectLine(points) {
    const first = points[0];
    const last = points[points.length - 1];
    const lineLength = Math.sqrt((last.x - first.x) ** 2 + (last.y - first.y) ** 2);

    if (lineLength < 20) return null; // Too short

    // Calculate max perpendicular deviation from the straight line
    let maxDeviation = 0;
    for (const p of points) {
      const d = this._pointToLineDistance(p, first, last);
      if (d > maxDeviation) maxDeviation = d;
    }

    const deviationRatio = maxDeviation / lineLength;

    if (deviationRatio < this.lineDeviationThreshold) {
      return {
        type: 'line',
        detected: true,
        points: this._generateLinePoints(first, last),
      };
    }

    return null;
  }

  _pointToLineDistance(point, lineStart, lineEnd) {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let t = lenSq !== 0 ? dot / lenSq : -1;

    t = Math.max(0, Math.min(1, t));

    const nearestX = lineStart.x + t * C;
    const nearestY = lineStart.y + t * D;

    return Math.sqrt((point.x - nearestX) ** 2 + (point.y - nearestY) ** 2);
  }

  _generateLinePoints(start, end, numPoints = 30) {
    const points = [];
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      points.push({
        x: start.x + t * (end.x - start.x),
        y: start.y + t * (end.y - start.y),
      });
    }
    return points;
  }

  // ================================================
  // CIRCLE DETECTION
  // ================================================

  _detectCircle(points) {
    // Calculate centroid
    let cx = 0, cy = 0;
    for (const p of points) {
      cx += p.x;
      cy += p.y;
    }
    cx /= points.length;
    cy /= points.length;

    // Calculate distances from centroid
    const distances = points.map(p =>
      Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2)
    );

    const meanRadius = distances.reduce((a, b) => a + b, 0) / distances.length;

    // Calculate variance coefficient (std / mean)
    const variance = distances.reduce((sum, d) => sum + (d - meanRadius) ** 2, 0) / distances.length;
    const stdDev = Math.sqrt(variance);
    const coeffOfVariation = stdDev / meanRadius;

    if (coeffOfVariation < this.circleVarianceThreshold) {
      return {
        type: 'circle',
        detected: true,
        points: this._generateCirclePoints(cx, cy, meanRadius),
        center: { x: cx, y: cy },
        radius: meanRadius,
      };
    }

    return null;
  }

  _generateCirclePoints(cx, cy, radius, numPoints = 64) {
    const points = [];
    for (let i = 0; i <= numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      points.push({
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      });
    }
    return points;
  }

  // ================================================
  // POLYGON DETECTION (Rectangle, Triangle)
  // ================================================

  _detectPolygon(points) {
    // Use Douglas-Peucker to simplify to key vertices
    const perimeter = this._calculatePerimeter(points);
    const epsilon = perimeter * 0.03; // 3% of perimeter as tolerance
    const simplified = this._douglasPeucker(points, epsilon);

    // Remove near-duplicate points at start/end (since stroke is closed)
    const vertices = this._removeDuplicateEndpoints(simplified);

    if (vertices.length === 3) {
      // TRIANGLE
      return {
        type: 'triangle',
        detected: true,
        points: this._generatePolygonPoints(vertices),
      };
    }

    if (vertices.length === 4) {
      // RECTANGLE — verify roughly right angles
      const isRect = this._verifyRectangle(vertices);
      if (isRect) {
        const rectVertices = this._snapToRectangle(vertices);
        return {
          type: 'rectangle',
          detected: true,
          points: this._generatePolygonPoints(rectVertices),
        };
      }
    }

    return null;
  }

  /**
   * Douglas-Peucker line simplification algorithm.
   */
  _douglasPeucker(points, epsilon) {
    if (points.length <= 2) return points;

    let maxDist = 0;
    let maxIdx = 0;
    const first = points[0];
    const last = points[points.length - 1];

    for (let i = 1; i < points.length - 1; i++) {
      const dist = this._pointToLineDistance(points[i], first, last);
      if (dist > maxDist) {
        maxDist = dist;
        maxIdx = i;
      }
    }

    if (maxDist > epsilon) {
      const left = this._douglasPeucker(points.slice(0, maxIdx + 1), epsilon);
      const right = this._douglasPeucker(points.slice(maxIdx), epsilon);
      return [...left.slice(0, -1), ...right];
    }

    return [first, last];
  }

  _removeDuplicateEndpoints(vertices) {
    if (vertices.length < 2) return vertices;
    const first = vertices[0];
    const last = vertices[vertices.length - 1];
    const dist = Math.sqrt((first.x - last.x) ** 2 + (first.y - last.y) ** 2);

    // If start and end are very close, remove the last one
    if (dist < 30) {
      return vertices.slice(0, -1);
    }
    return vertices;
  }

  _verifyRectangle(vertices) {
    // Check that all 4 angles are roughly 90 degrees
    for (let i = 0; i < 4; i++) {
      const a = vertices[i];
      const b = vertices[(i + 1) % 4];
      const c = vertices[(i + 2) % 4];

      const angle = this._angleBetween(a, b, c);
      // Should be close to PI/2
      if (Math.abs(angle - Math.PI / 2) > 0.5) return false; // ~28 degree tolerance
    }
    return true;
  }

  _angleBetween(a, b, c) {
    const ba = { x: a.x - b.x, y: a.y - b.y };
    const bc = { x: c.x - b.x, y: c.y - b.y };
    const dot = ba.x * bc.x + ba.y * bc.y;
    const magBA = Math.sqrt(ba.x ** 2 + ba.y ** 2);
    const magBC = Math.sqrt(bc.x ** 2 + bc.y ** 2);
    if (magBA === 0 || magBC === 0) return 0;
    return Math.acos(Math.max(-1, Math.min(1, dot / (magBA * magBC))));
  }

  _snapToRectangle(vertices) {
    // Compute oriented bounding box
    // For simplicity, find centroid and align edges
    let cx = 0, cy = 0;
    for (const v of vertices) {
      cx += v.x;
      cy += v.y;
    }
    cx /= 4;
    cy /= 4;

    // Find the angle of the first edge
    const dx = vertices[1].x - vertices[0].x;
    const dy = vertices[1].y - vertices[0].y;
    const angle = Math.atan2(dy, dx);

    // Project all vertices onto the rotated axes
    const projected = vertices.map(v => {
      const rx = (v.x - cx) * Math.cos(-angle) - (v.y - cy) * Math.sin(-angle);
      const ry = (v.x - cx) * Math.sin(-angle) + (v.y - cy) * Math.cos(-angle);
      return { rx, ry };
    });

    // Find bounding box in rotated space
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of projected) {
      minX = Math.min(minX, p.rx);
      maxX = Math.max(maxX, p.rx);
      minY = Math.min(minY, p.ry);
      maxY = Math.max(maxY, p.ry);
    }

    // Create perfect rectangle corners in rotated space, then rotate back
    const corners = [
      { rx: minX, ry: minY },
      { rx: maxX, ry: minY },
      { rx: maxX, ry: maxY },
      { rx: minX, ry: maxY },
    ];

    return corners.map(c => ({
      x: c.rx * Math.cos(angle) - c.ry * Math.sin(angle) + cx,
      y: c.rx * Math.sin(angle) + c.ry * Math.cos(angle) + cy,
    }));
  }

  /**
   * Generate smooth polygon outline points.
   */
  _generatePolygonPoints(vertices, pointsPerEdge = 20) {
    const points = [];
    for (let i = 0; i < vertices.length; i++) {
      const start = vertices[i];
      const end = vertices[(i + 1) % vertices.length];
      for (let j = 0; j < pointsPerEdge; j++) {
        const t = j / pointsPerEdge;
        points.push({
          x: start.x + t * (end.x - start.x),
          y: start.y + t * (end.y - start.y),
        });
      }
    }
    // Close the shape
    points.push({ x: vertices[0].x, y: vertices[0].y });
    return points;
  }
}
