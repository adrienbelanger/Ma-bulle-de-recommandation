document.getElementById('start-btn').addEventListener('click', () => {
  document.body.classList.add('fade-out');
  document.body.addEventListener('animationend', () => {
    const target = 'page1.html' + location.hash;
    window.location.href = target;
  }, { once: true });
});
