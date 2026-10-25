/**
 * Universal Clipboard Copier with Modern Clipboard API + Fallback and Custom Toast Notification Support.
 */

export async function copyToClipboard(
  text: string | number,
  label?: string,
  onNotify?: (type: 'success' | 'error', title: string, message: string) => void
): Promise<boolean> {
  const content = (text ?? '').toString();
  if (!content) {
    if (onNotify) {
      onNotify('error', 'تعذر النسخ', 'لا يوجد نص أو محتوى لنسخه.');
    }
    return false;
  }

  let copied = false;

  // 1. Try modern navigator.clipboard API
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(content);
      copied = true;
    } catch (err) {
      console.warn('navigator.clipboard.writeText failed, using textarea fallback...', err);
    }
  }

  // 2. Fallback to document.execCommand('copy') with invisible off-screen textarea
  if (!copied && typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = content;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.top = '-9999px';
      textarea.style.left = '-9999px';
      textarea.style.opacity = '0';
      textarea.style.pointerEvents = 'none';
      document.body.appendChild(textarea);

      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);

      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (successful) {
        copied = true;
      }
    } catch (fallbackErr) {
      console.error('Fallback execCommand copy failed', fallbackErr);
    }
  }

  const successMessage = label ? `تم نسخ ${label} بنجاح إلى الحافظة.` : 'تم نسخ المحتوى بنجاح إلى الحافظة.';

  if (copied) {
    if (onNotify) {
      onNotify('success', 'تم النسخ بنجاح 📋', successMessage);
    }
    // Also dispatch a browser custom event in case components listen globally
    try {
      window.dispatchEvent(
        new CustomEvent('app:copy-success', {
          detail: { text: content, label, message: successMessage }
        })
      );
    } catch (e) {}
    return true;
  } else {
    if (onNotify) {
      onNotify('error', 'فشل النسخ', 'تعذر الوصول إلى الحافظة. يرجى النسخ يدوياً.');
    }
    return false;
  }
}
