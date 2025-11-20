import React from 'react';

const dispatchGameInput = (code: string, active: boolean) => {
  const eventName = active ? 'game-input-start' : 'game-input-end';
  const event = new CustomEvent(eventName, { detail: { code } });
  window.dispatchEvent(event);
};

const ControlButton: React.FC<{ code: string, label: string, className?: string }> = ({ code, label, className }) => (
  <button
    className={`bg-sky-900/50 border border-sky-500 text-sky-100 rounded-full w-16 h-16 flex items-center justify-center active:bg-sky-500 active:scale-95 transition-all select-none touch-none ${className}`}
    onPointerDown={(e) => { 
        e.preventDefault(); // Prevent mouse emulation
        dispatchGameInput(code, true); 
    }}
    onPointerUp={(e) => { 
        e.preventDefault();
        dispatchGameInput(code, false); 
    }}
    onPointerLeave={(e) => {
        e.preventDefault();
        dispatchGameInput(code, false);
    }}
    // Disable context menu
    onContextMenu={(e) => e.preventDefault()}
  >
    {label}
  </button>
);

const ControlsOverlay: React.FC = () => {
  return (
    <div className="absolute bottom-4 left-0 right-0 px-8 flex justify-between items-end pointer-events-none md:hidden">
      {/* Left Hand: Rotation */}
      <div className="flex gap-4 pointer-events-auto">
        <ControlButton code="ArrowLeft" label="←" />
        <ControlButton code="ArrowRight" label="→" />
      </div>

      {/* Right Hand: Thrust */}
      <div className="pointer-events-auto">
        <ControlButton code="ArrowUp" label="▲" className="w-20 h-20 bg-amber-600/50 border-amber-500 active:bg-amber-500" />
      </div>
    </div>
  );
};

export default ControlsOverlay;