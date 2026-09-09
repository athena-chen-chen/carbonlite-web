export const OPEN_FEEDBACK_OVERLAY_EVENT = 'carbonlite:open-feedback-overlay';

export function openFeedbackOverlay() {
  window.dispatchEvent(new CustomEvent(OPEN_FEEDBACK_OVERLAY_EVENT));
}
