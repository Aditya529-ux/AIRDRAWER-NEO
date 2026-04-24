import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, HelpCircle } from 'lucide-react';

const gestures = [
  {
    section: 'Right Hand (Draw)',
    color: '#00ffff',
    items: [
      { emoji: '🤏', gesture: 'Pinch (thumb + index)', action: 'Draw strokes with neon glow' },
      { emoji: '☝️', gesture: 'Index finger only', action: 'Draw strokes (alternate)' },
      { emoji: '✊', gesture: 'Fist (all fingers curled)', action: 'Erase nearby strokes' },
      { emoji: '🖐️', gesture: 'Open hand', action: 'Stop drawing (idle)' },
    ],
  },
  {
    section: 'Left Hand (Transform)',
    color: '#ff9500',
    items: [
      { emoji: '✌️', gesture: 'Two fingers (index + middle)', action: 'Select & Move stroke' },
      { emoji: '🤏', gesture: 'Pinch + spread/close', action: 'Scale stroke up/down' },
      { emoji: '🖐️', gesture: 'Open palm + twist wrist', action: 'Rotate stroke' },
    ],
  },
  {
    section: 'AI Shape Recognition',
    color: '#ff00ff',
    items: [
      { emoji: '📏', gesture: 'Draw a straight line', action: 'Auto-snaps to perfect line' },
      { emoji: '⭕', gesture: 'Draw a circle shape', action: 'Auto-snaps to perfect circle' },
      { emoji: '⬜', gesture: 'Draw a rectangle', action: 'Auto-snaps to perfect rectangle' },
      { emoji: '🔺', gesture: 'Draw a triangle', action: 'Auto-snaps to perfect triangle' },
    ],
  },
  {
    section: 'Tips & Tricks',
    color: '#00ff88',
    items: [
      { emoji: '💡', gesture: 'Single hand only', action: 'Auto-assigned as drawing hand' },
      { emoji: '📐', gesture: 'Release rotation', action: 'Snaps to nearest 45° angle' },
      { emoji: '🌀', gesture: 'Release after moving', action: 'Slight inertia drift effect' },
      { emoji: '✨', gesture: 'Draw fast vs slow', action: 'Velocity changes line thickness' },
      { emoji: '🎨', gesture: 'Particle trails', action: 'Neon particles follow your draw' },
    ],
  },
];

export default function HelpPanel({ isOpen, onClose }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 150,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-meta"
            style={{
              width: '420px',
              maxHeight: '82vh',
              overflowY: 'auto',
              borderRadius: '24px',
              padding: '28px',
              color: '#fff',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #00ffff20, #ff00ff20)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(0, 255, 255, 0.2)',
                }}>
                  <HelpCircle size={18} style={{ color: '#00ffff' }} />
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '0.05em' }}>
                    Gesture Guide
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                    Hand tracking controls
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                style={{
                  color: 'rgba(255,255,255,0.5)',
                  padding: '6px',
                  display: 'flex',
                  borderRadius: '8px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = '#fff';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
                  e.currentTarget.style.background = 'none';
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Gesture Sections */}
            {gestures.map((section, sIdx) => (
              <div key={sIdx} style={{ marginBottom: sIdx < gestures.length - 1 ? '20px' : 0 }}>
                <div style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: section.color,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  marginBottom: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <div style={{
                    width: '16px',
                    height: '2px',
                    background: section.color,
                    borderRadius: '1px',
                    opacity: 0.6,
                  }} />
                  {section.section}
                </div>
                {section.items.map((item, iIdx) => (
                  <div
                    key={iIdx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      marginBottom: '4px',
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      transition: 'background-color 0.2s',
                      cursor: 'default',
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)'}
                  >
                    <span style={{
                      fontSize: '22px',
                      width: '32px',
                      textAlign: 'center',
                      flexShrink: 0,
                    }}>
                      {item.emoji}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, lineHeight: 1.3 }}>
                        {item.gesture}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        color: 'rgba(255,255,255,0.45)',
                        lineHeight: 1.3,
                        marginTop: '2px',
                      }}>
                        {item.action}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}

            {/* Footer */}
            <div style={{
              marginTop: '20px',
              padding: '12px',
              borderRadius: '12px',
              background: 'rgba(0, 255, 255, 0.04)',
              border: '1px solid rgba(0, 255, 255, 0.08)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
                ✨ Shapes are auto-recognized when you finish drawing.<br />
                Draw slowly for thick strokes, fast for thin strokes.
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
