function initWishlist() {
  const dialog = document.querySelector('dialog[data-wishlist]');
  if (!dialog) return;

  let opener;
  document.querySelectorAll('[data-wishlist-open]').forEach((button) => {
    button.addEventListener('click', () => {
      if (document.documentElement.dataset.launchMode === 'wishlist_only') return;
      opener = button;
      if (typeof window.__nordelOpenPlanDialog === 'function') {
        window.__nordelOpenPlanDialog(button.getAttribute('data-checkout-plan') || 'plus', button);
      } else if (!dialog.open) {
        dialog.showModal();
      }
    });
  });

  dialog.querySelectorAll('[data-wishlist-close]').forEach((button) => {
    button.addEventListener('click', () => dialog.close());
  });

  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right ||
        event.clientY < rect.top || event.clientY > rect.bottom) {
      dialog.close();
    }
  });
  dialog.addEventListener('close', () => {
    const target = window.__nordelPlanDialogOpener || opener;
    if (target && typeof target.focus === 'function') target.focus();
    window.__nordelPlanDialogOpener = null;
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWishlist, { once: true });
} else {
  initWishlist();
}
