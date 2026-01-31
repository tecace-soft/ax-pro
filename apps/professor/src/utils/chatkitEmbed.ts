/**
 * Removes the ChatKit floating widget and its popup from the DOM.
 * Call when leaving Settings or when route is not /settings so the widget
 * does not persist on other pages.
 */
export function removeChatkitEmbedWidget(): void {
  if (typeof document === 'undefined') return;

  document.querySelectorAll('script[data-ax-chatkit-preview]').forEach((el) => el.remove());
  document.querySelectorAll('body iframe').forEach((iframe) => {
    const src = (iframe.getAttribute('src') || '').toLowerCase();
    const isChatPopup = src.includes('chatkit') || src.includes('ax-pro') || src.includes('tecace');
    if (isChatPopup || src === '') {
      const parent = iframe.parentElement;
      if (parent && parent !== document.body) parent.remove();
      else iframe.remove();
    }
  });
  const selectors = [
    '[id*="chatkit"], [id*="embed-widget"], [class*="floating-chat"], [data-ax-embed]',
    '[id*="chat-widget"], [id*="chatbot"], [id*="mcp-n8n"], [id*="ax-pro-embed"]',
    '[id*="embed-root"], [id*="widget-container"], [id*="floating-button"]',
    '[class*="chat-widget"], [class*="floating-widget"], [class*="floating-chat"]',
    '[class*="embed-widget"], [data-embed], [data-chat-widget]',
  ];
  selectors.forEach((sel) => {
    try {
      document.querySelectorAll(sel).forEach((el) => el.remove());
    } catch (_) {
      /* ignore invalid selector */
    }
  });
  // Fallback: remove any body direct child that looks like the embed
  Array.from(document.body.children).forEach((child) => {
    if (child.id === 'root' || child.tagName === 'SCRIPT') return;
    const text = (child.textContent || '').trim();
    const hasChatIframe = child.querySelector('iframe[src*="chatkit"], iframe[src*="ax-pro"], iframe[src*="tecace"]');
    if (text.includes('Chat with AI') || hasChatIframe) child.remove();
  });
}
