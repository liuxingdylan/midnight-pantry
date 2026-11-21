// Keyboard and mouse state for Midnight Pantry. The game loop reads a
// plain snapshot each frame; clicks are queued as one-shot events.

const keys = new Set();
const latched = new Set();
const clickQueue = [];
let attached = false;

export function attachInput(canvas, onFirstGesture) {
  if (attached) return;
  attached = true;
  addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (!e.repeat) onFirstGesture?.();
    keys.add(e.code);
    latched.add(e.code);
  });
  addEventListener('keyup', (e) => keys.delete(e.code));
  canvas.addEventListener('pointerdown', (e) => {
    onFirstGesture?.();
    const rect = canvas.getBoundingClientRect();
    clickQueue.push({
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    });
  });
}

export function readInput() {
  const dx = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
  const dy = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
  return {
    dx, dy,
    sneak: keys.has('ShiftLeft') || keys.has('ShiftRight'),
    run: keys.has('Space'),
  };
}

export function takeClicks() {
  return clickQueue.splice(0, clickQueue.length);
}

// A press counts if the key went down at any point since the last frame —
// even a tap shorter than one frame — so quick fingers never lose a press.
export function pressed(code) {
  return latched.has(code);
}

export function clearPressed(code) {
  latched.delete(code);
  keys.delete(code);
}

// Called once at the end of each frame: latches expire, held keys re-latch
// through key auto-repeat.
export function endFrame() {
  latched.clear();
}
