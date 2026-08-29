// Shared helpers behind every self-contained, zero-app-dependency printable
// document (invoices, receipts, distributor purchase orders): HTML escaping
// and the hidden-iframe print pipeline. See receiptPrint.ts for the
// rationale (nodedr-pos's proven zero-setup technique + why a hidden iframe
// beats window.open).

export function escHtml(value: string | number | undefined | null): string {
  return String(value ?? '').replace(/[&<>"']/g, ch => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] as string
  ));
}

let sharedPrintFrame: HTMLIFrameElement | null = null;

function getSharedPrintFrame(): HTMLIFrameElement {
  if (sharedPrintFrame && document.body.contains(sharedPrintFrame)) {
    return sharedPrintFrame;
  }
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.position = 'fixed';
  frame.style.top = '-10000px';
  frame.style.left = '-10000px';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = 'none';
  document.body.appendChild(frame);
  sharedPrintFrame = frame;
  return frame;
}

// Prints a self-contained HTML document through a hidden, reusable iframe
// (rather than window.open, which can leave a blank tab or get silently
// swallowed by a popup blocker) so it hits the OS's native print dialog and
// therefore any printer the OS already has installed — no driver or app-side
// setup required.
export function printHtml(html: string): void {
  try {
    const frame = getSharedPrintFrame();
    const triggerPrint = () => {
      frame.removeEventListener('load', triggerPrint);
      const win = frame.contentWindow;
      if (!win) throw new Error('print frame has no window');
      win.focus();
      win.print();
    };
    frame.addEventListener('load', triggerPrint);
    frame.srcdoc = html;
  } catch {
    const popup = window.open('', '_blank');
    if (popup) {
      popup.document.write(html);
      popup.document.close();
      popup.focus();
      popup.print();
    } else {
      window.print();
    }
  }
}

export function downloadHtml(html: string, filename: string): void {
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
