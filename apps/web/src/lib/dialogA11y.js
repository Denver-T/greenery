// Shared a11y helpers for accessible dialog components.
// Extracted from DeleteWorkRequestDialog so ScheduleRequestDialog,
// MarkCompleteDialog, and any future modal can reuse the same focus trap
// without copy-pasting the implementation.

/**
 * Constrain Tab/Shift+Tab focus movement to elements inside the given
 * container. Call from a `keydown` event handler.
 *
 *   document.addEventListener("keydown", (e) => {
 *     if (e.key === "Tab") trapFocus(e, dialogRef.current);
 *   });
 */
export function trapFocus(event, container) {
  if (!container) return;
  const focusable = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  );
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;

  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}
