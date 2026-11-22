// The Inventory page is shown inside Parade HQ (the staff website). It copies Parade HQ's theme and accent colour,
// and follows them live when they change in Settings.
const ATTRS = ['data-theme', 'data-accent'];

function hostRoot() {
  try { return window.parent !== window ? window.parent.document.documentElement : null; } catch { return null; }
}

export function followHostTheme() {
  const host = hostRoot();
  if (!host) return;
  const copy = () => ATTRS.forEach(a => {
    const v = host.getAttribute(a);
    if (v) document.documentElement.setAttribute(a, v); else document.documentElement.removeAttribute(a);
  });
  copy();
  new MutationObserver(copy).observe(host, { attributes: true, attributeFilter: ATTRS });
}
