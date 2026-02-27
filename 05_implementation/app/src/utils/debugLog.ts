/**
 * On-screen debug logger for iOS Safari debugging.
 * Shows a floating panel with timestamped log entries.
 * Enable by adding ?debug=1 to URL or setting localStorage sage_debug=1
 */

const MAX_ENTRIES = 50;
const entries: string[] = [];
let panel: HTMLDivElement | null = null;
let enabled: boolean | null = null;

function isEnabled(): boolean {
  if (enabled !== null) return enabled;
  try {
    const url = new URL(window.location.href);
    enabled =
      url.searchParams.get('debug') === '1' ||
      localStorage.getItem('sage_debug') === '1';
  } catch {
    enabled = false;
  }
  return enabled;
}

function ensurePanel(): HTMLDivElement {
  if (panel) return panel;
  panel = document.createElement('div');
  panel.id = 'sage-debug-panel';
  Object.assign(panel.style, {
    position: 'fixed',
    bottom: '0',
    left: '0',
    right: '0',
    maxHeight: '40vh',
    overflowY: 'auto',
    backgroundColor: 'rgba(0,0,0,0.85)',
    color: '#0f0',
    fontSize: '10px',
    fontFamily: 'monospace',
    padding: '4px 6px',
    zIndex: '99999',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    pointerEvents: 'auto',
  });

  // Close button
  const close = document.createElement('button');
  close.textContent = '✕ Close Debug';
  Object.assign(close.style, {
    position: 'sticky',
    top: '0',
    background: '#333',
    color: '#fff',
    border: 'none',
    padding: '4px 8px',
    fontSize: '10px',
    cursor: 'pointer',
    display: 'block',
    marginBottom: '4px',
  });
  close.onclick = () => {
    panel!.style.display = panel!.style.display === 'none' ? 'block' : 'none';
  };
  panel.appendChild(close);

  document.body.appendChild(panel);
  return panel;
}

function render() {
  const p = ensurePanel();
  // Keep close button, replace rest
  const content = p.querySelector('#sage-debug-content') || (() => {
    const div = document.createElement('div');
    div.id = 'sage-debug-content';
    p.appendChild(div);
    return div;
  })();
  content.textContent = entries.join('\n');
  // Auto scroll to bottom
  p.scrollTop = p.scrollHeight;
}

export function dlog(tag: string, ...args: unknown[]) {
  const ts = new Date().toISOString().slice(11, 23); // HH:mm:ss.SSS
  const msg = args.map(a => {
    if (a === null) return 'null';
    if (a === undefined) return 'undefined';
    if (a instanceof Error) return `${a.name}: ${a.message}`;
    if (typeof a === 'object') {
      try { return JSON.stringify(a).slice(0, 200); } catch { return String(a); }
    }
    return String(a);
  }).join(' ');

  const line = `[${ts}] ${tag}: ${msg}`;
  entries.push(line);
  if (entries.length > MAX_ENTRIES) entries.shift();

  // Also console.log
  console.log(line);

  if (isEnabled()) {
    render();
  }
}

/** Force-enable debug panel (call from console or on error) */
export function enableDebug() {
  enabled = true;
  localStorage.setItem('sage_debug', '1');
  render();
}

/** Check if debug is active */
export function isDebugActive() {
  return isEnabled();
}
