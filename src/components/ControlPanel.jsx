import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Palette,
  Settings,
  Trash2,
  Undo2,
  Redo2,
  Download,
  Eye,
  EyeOff,
  Zap,
  HelpCircle,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

const COLORS = [
  { hex: '#00ffff', name: 'Cyan' },
  { hex: '#ff00ff', name: 'Magenta' },
  { hex: '#ffff00', name: 'Yellow' },
  { hex: '#00ff88', name: 'Emerald' },
  { hex: '#ff4444', name: 'Red' },
  { hex: '#ff8800', name: 'Orange' },
  { hex: '#8844ff', name: 'Purple' },
  { hex: '#ffffff', name: 'White' },
];

const ControlPanel = ({
  settings,
  onSettingsChange,
  onClear,
  onUndo,
  onRedo,
  onSave,
  onToggleCamera,
  cameraVisible,
  gestureVisible,
  onToggleGestures,
  onHelp
}) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div style={{
      position: 'fixed',
      right: '20px',
      top: '20px',
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      alignItems: 'flex-end',
    }}>
      {/* Settings Toggle */}
      <motion.button
        id="settings-toggle"
        className="glass-meta"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '46px',
          height: '46px',
          borderRadius: '14px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          color: '#fff',
        }}
      >
        <motion.div
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <Settings size={20} />
        </motion.div>
      </motion.button>

      {/* Settings Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="glass-meta"
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            style={{
              borderRadius: '22px',
              padding: '22px',
              width: '280px',
              color: '#fff',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            {/* Title */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              paddingBottom: '4px',
            }}>
              <Sparkles size={16} style={{ color: '#00ffff' }} />
              <span style={{
                fontSize: '13px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.8)',
              }}>
                Neon Air Draw
              </span>
            </div>

            {/* Color Palette */}
            <div>
              <SectionLabel icon={<Palette size={14} />} label="Color Palette" />
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(8, 1fr)',
                gap: '8px',
                marginTop: '8px',
              }}>
                {COLORS.map(({ hex }) => (
                  <motion.div
                    key={hex}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.85 }}
                    onClick={() => onSettingsChange({ color: hex })}
                    title={hex}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      backgroundColor: hex,
                      cursor: 'pointer',
                      border: settings.color === hex ? '2px solid #fff' : '2px solid transparent',
                      boxShadow: settings.color === hex
                        ? `0 0 12px ${hex}, 0 0 4px ${hex}`
                        : 'none',
                      transition: 'border 0.15s, box-shadow 0.15s',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Sliders */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <SliderLabel label="Brush Thickness" value={`${settings.lineWidth}px`} />
                <input
                  id="brush-thickness"
                  type="range"
                  min="2"
                  max="40"
                  value={settings.lineWidth}
                  onChange={(e) => onSettingsChange({ lineWidth: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <SliderLabel label="Glow Intensity" value={settings.glowIntensity} />
                <input
                  id="glow-intensity"
                  type="range"
                  min="0"
                  max="50"
                  value={settings.glowIntensity}
                  onChange={(e) => onSettingsChange({ glowIntensity: parseInt(e.target.value) })}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
            }}>
              <ActionButton id="btn-undo" icon={<Undo2 size={16} />} label="Undo" onClick={onUndo} />
              <ActionButton id="btn-redo" icon={<Redo2 size={16} />} label="Redo" onClick={onRedo} />
              <ActionButton id="btn-clear" icon={<Trash2 size={16} />} label="Clear" onClick={onClear} color="#ff4444" />
              <ActionButton id="btn-save" icon={<Download size={16} />} label="Save" onClick={onSave} color="#00ff88" />
              <ActionButton
                id="btn-camera"
                icon={cameraVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                label={cameraVisible ? "Hide Cam" : "Show Cam"}
                onClick={onToggleCamera}
              />
              <ActionButton
                id="btn-gestures"
                icon={<Zap size={16} />}
                label={gestureVisible ? "Gestures On" : "Gestures Off"}
                onClick={onToggleGestures}
                active={gestureVisible}
                color={gestureVisible ? '#00ffff' : undefined}
              />
            </div>

            {/* Help Button */}
            <motion.button
              id="btn-help"
              className="glass-meta"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onHelp}
              style={{
                borderRadius: '12px',
                padding: '10px 14px',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                fontWeight: 500,
                width: '100%',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HelpCircle size={15} style={{ color: 'rgba(255,255,255,0.5)' }} />
                <span>Gesture Guide</span>
              </div>
              <ChevronRight size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * Section label with icon
 */
const SectionLabel = ({ icon, label }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    fontWeight: 600,
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  }}>
    {icon}
    {label}
  </div>
);

/**
 * Slider label with value display
 */
const SliderLabel = ({ label, value }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2px',
  }}>
    <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.45)' }}>
      {label}
    </span>
    <span style={{
      fontSize: '11px',
      color: 'rgba(255, 255, 255, 0.6)',
      fontFamily: '"JetBrains Mono", monospace',
    }}>
      {value}
    </span>
  </div>
);

/**
 * Action button component
 */
const ActionButton = ({ id, icon, label, onClick, active = false, color }) => (
  <motion.button
    id={id}
    className="glass-meta"
    whileHover={{ scale: 1.04 }}
    whileTap={{ scale: 0.94 }}
    onClick={onClick}
    style={{
      borderRadius: '12px',
      padding: '10px 8px',
      color: active ? (color || '#00ffff') : '#fff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4px',
      fontSize: '10px',
      fontWeight: 500,
      letterSpacing: '0.02em',
      transition: 'all 0.2s',
      boxShadow: active ? `0 0 12px ${color || 'rgba(0,255,255,0.3)'}40` : 'none',
    }}
  >
    <span style={{ color: color || 'inherit', opacity: active ? 1 : 0.8 }}>
      {icon}
    </span>
    {label}
  </motion.button>
);

export default ControlPanel;
