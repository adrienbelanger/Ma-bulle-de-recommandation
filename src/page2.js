function navigate(url) {
  document.body.classList.add('fade-out');
  const dest = url + location.hash;
  document.body.addEventListener('animationend', () => window.location.href = dest, { once: true });
}
function removeRow(btn) {
  const row = btn.closest('tr');
  row.classList.add('fade-out-row');
  row.addEventListener('animationend', () => row.remove());
}
