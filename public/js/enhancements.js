// Micro-interazioni globali.

function addRippleEffect() {
  document.addEventListener('click', (event) => {
    const button = event.target.closest('.btn');
    if (!button || button.disabled) return;
    const rect = button.getBoundingClientRect();
    const ripple = document.createElement('span');
    const size = Math.max(rect.width, rect.height);
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
    button.appendChild(ripple);
    setTimeout(() => ripple.remove(), 550);
  });
}

function setupReveal() {
  const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
  }), { threshold: .12 });
  document.querySelectorAll('.reveal').forEach((item) => observer.observe(item));
}

function setupKeyboard() {
  const sections = ['dashboard', 'allenamento', 'progressi', 'profilo'];
  document.addEventListener('keydown', (event) => {
    if (event.target.matches('input, textarea, select')) return;
    const index = Number(event.key) - 1;
    if (index >= 0 && index < sections.length) document.querySelector(`[data-section="${sections[index]}"]`).click();
  });
}

addRippleEffect();
setupReveal();
setupKeyboard();
