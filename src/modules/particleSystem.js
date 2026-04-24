/**
 * ParticleSystem Module
 * 
 * High-performance particle effects for:
 *   - Drawing trail particles (neon sparks follow the fingertip)
 *   - Stroke completion burst (explosion on shape snap)
 *   - Erase dissolve particles
 *   - Ambient floating particles
 * 
 * Uses object pooling for zero-allocation rendering.
 */

const MAX_PARTICLES = 600;
const TWO_PI = Math.PI * 2;

class Particle {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.life = 0;
    this.maxLife = 0;
    this.size = 0;
    this.color = '#00ffff';
    this.alpha = 1;
    this.type = 'trail'; // 'trail', 'burst', 'ambient', 'dissolve'
    this.active = false;
    this.gravity = 0;
    this.friction = 0.98;
    this.sizeDecay = 0.97;
  }

  update(dt) {
    if (!this.active) return;

    this.life -= dt;
    if (this.life <= 0) {
      this.active = false;
      return;
    }

    this.vx *= this.friction;
    this.vy *= this.friction;
    this.vy += this.gravity;

    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;

    this.size *= this.sizeDecay;
    this.alpha = Math.max(0, this.life / this.maxLife);
  }
}

export class ParticleSystem {
  constructor() {
    // Object pool
    this.pool = [];
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.pool.push(new Particle());
    }
    this.activeCount = 0;
  }

  /**
   * Get an inactive particle from the pool.
   */
  _getParticle() {
    for (let i = 0; i < this.pool.length; i++) {
      if (!this.pool[i].active) {
        return this.pool[i];
      }
    }
    // Pool exhausted — recycle oldest
    return this.pool[0];
  }

  /**
   * Emit trail particles at a position (follows drawing fingertip).
   */
  emitTrail(x, y, color, velocity = { x: 0, y: 0 }) {
    const count = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      const p = this._getParticle();
      p.reset();
      p.active = true;
      p.type = 'trail';
      p.x = x + (Math.random() - 0.5) * 8;
      p.y = y + (Math.random() - 0.5) * 8;
      p.vx = (Math.random() - 0.5) * 2 + velocity.x * 0.3;
      p.vy = (Math.random() - 0.5) * 2 + velocity.y * 0.3;
      p.life = 0.4 + Math.random() * 0.6;
      p.maxLife = p.life;
      p.size = 2 + Math.random() * 4;
      p.color = color;
      p.gravity = 0.02;
      p.friction = 0.96;
      p.sizeDecay = 0.96;
    }
  }

  /**
   * Emit a burst of particles (shape snap effect).
   */
  emitBurst(x, y, color, count = 30) {
    for (let i = 0; i < count; i++) {
      const p = this._getParticle();
      p.reset();
      p.active = true;
      p.type = 'burst';
      p.x = x;
      p.y = y;
      const angle = Math.random() * TWO_PI;
      const speed = 1 + Math.random() * 5;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.life = 0.5 + Math.random() * 1.0;
      p.maxLife = p.life;
      p.size = 2 + Math.random() * 5;
      p.color = color;
      p.gravity = 0.03;
      p.friction = 0.95;
      p.sizeDecay = 0.95;
    }
  }

  /**
   * Emit dissolve particles (erase effect).
   */
  emitDissolve(x, y, color = '#ff4444', count = 15) {
    for (let i = 0; i < count; i++) {
      const p = this._getParticle();
      p.reset();
      p.active = true;
      p.type = 'dissolve';
      p.x = x + (Math.random() - 0.5) * 40;
      p.y = y + (Math.random() - 0.5) * 40;
      const angle = Math.random() * TWO_PI;
      const speed = 0.5 + Math.random() * 2;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed - 0.5;
      p.life = 0.3 + Math.random() * 0.5;
      p.maxLife = p.life;
      p.size = 1.5 + Math.random() * 3;
      p.color = color;
      p.gravity = -0.02; // Float upward
      p.friction = 0.97;
      p.sizeDecay = 0.94;
    }
  }

  /**
   * Emit shape recognition indicator along a shape's outline.
   */
  emitShapeOutline(points, color, count = 40) {
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * points.length);
      const pt = points[idx];
      const p = this._getParticle();
      p.reset();
      p.active = true;
      p.type = 'burst';
      p.x = pt.x;
      p.y = pt.y;
      const angle = Math.random() * TWO_PI;
      const speed = 0.5 + Math.random() * 2;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.life = 0.6 + Math.random() * 0.8;
      p.maxLife = p.life;
      p.size = 2 + Math.random() * 4;
      p.color = color;
      p.gravity = 0;
      p.friction = 0.96;
      p.sizeDecay = 0.97;
    }
  }

  /**
   * Update all active particles.
   */
  update(dt) {
    this.activeCount = 0;
    for (let i = 0; i < this.pool.length; i++) {
      if (this.pool[i].active) {
        this.pool[i].update(dt);
        if (this.pool[i].active) this.activeCount++;
      }
    }
  }

  /**
   * Render all active particles to a canvas context.
   */
  render(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter'; // Additive blending for glow

    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.active) continue;

      ctx.globalAlpha = p.alpha * 0.8;

      // Draw glow
      ctx.shadowBlur = p.size * 3;
      ctx.shadowColor = p.color;

      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, p.size), 0, TWO_PI);
      ctx.fillStyle = p.color;
      ctx.fill();
    }

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  }

  /**
   * Clear all active particles.
   */
  clear() {
    for (const p of this.pool) {
      p.active = false;
    }
    this.activeCount = 0;
  }
}
