document.addEventListener('DOMContentLoaded', () => {
  // Dismiss flash messages on click or auto-fade after 5 seconds
  const flashBanner = document.querySelector('.flash');
  if (flashBanner) {
    const closeBtn = flashBanner.querySelector('.flash-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => flashBanner.remove());
    }
    setTimeout(() => {
      if (flashBanner && flashBanner.parentNode) {
        flashBanner.style.transition = 'opacity 0.4s ease';
        flashBanner.style.opacity = '0';
        setTimeout(() => flashBanner.remove(), 400);
      }
    }, 5000);
  }

  // Quick-fill demo credentials buttons on login page
  document.querySelectorAll('[data-demo-user]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const userField = document.getElementById('username');
      const passField = document.getElementById('password');
      if (userField && passField) {
        userField.value = btn.getAttribute('data-demo-user');
        passField.value = btn.getAttribute('data-demo-pass');
      }
    });
  });

  // Confirmation prompt before deleting a trail
  document.querySelectorAll('form[data-confirm]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      const message = form.getAttribute('data-confirm') || 'Are you sure you want to delete this record?';
      if (!window.confirm(message)) {
        e.preventDefault();
      }
    });
  });
});
