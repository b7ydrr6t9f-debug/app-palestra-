// Interattività e micro-interazioni per Tempra.

function animateValue(element, target, suffix = '') {
  const start = Number(element.dataset.currentValue || 0);
  const value = Number(target) || 0;
  element.dataset.currentValue = value;
  const duration = 650;
  const startTime = performance.now();

  function frame(now) {
    const progress = Math.min(1, (now - startTime) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = `${Math.round(start + (value - start) * eased)}${suffix}`;
    if (progress < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function updateCalorieRing() {
  const total = Number(document.getElementById('cal-totale-oggi').textContent) || 0;
  const goalText = document.getElementById('cal-obiettivo-label').textContent;
  const goalMatch = goalText.match(/(\d+)/);
  const goal = goalMatch ? Number(goalMatch[1]) : 2200;
  const percentage = Math.min(100, Math.round((total / goal) * 100));
  const circumference = 2 * Math.PI * 42;
  const ring = document.getElementById('calorie-ring-progress');
  const label = document.getElementById('calorie-ring-label');
  if (!ring || !label) return;
  ring.style.strokeDashoffset = circumference - (percentage / 100) * circumference;
  label.textContent = `${percentage}%`;
}

function observeDynamicValues() {
  const targets = [
    { id: 'cal-totale-oggi', suffix: '' },
    { id: 'cal-proteine', suffix: 'g' },
    { id: 'cal-carbo', suffix: 'g' },
    { id: 'cal-grassi', suffix: 'g' },
  ];

  targets.forEach(({ id, suffix }) => {
    const element = document.getElementById(id);
    if (!element) return;
    new MutationObserver(() => animateValue(element, element.textContent, suffix)).observe(element, { childList: true, characterData: true, subtree: true });
  });

  const calorieTotal = document.getElementById('cal-totale-oggi');
  const calorieBar = document.getElementById('cal-barra');
  if (calorieTotal && calorieBar) {
    new MutationObserver(updateCalorieRing).observe(calorieTotal, { childList: true, characterData: true, subtree: true });
    new MutationObserver(updateCalorieRing).observe(calorieBar, { attributes: true, attributeFilter: ['style'] });
  }
}

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

function setupRevealAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));
}

function setupKeyboardNavigation() {
  const sections = ['abitudini', 'alimentazione', 'allenamento', 'profilo'];
  document.addEventListener('keydown', (event) => {
    if (event.target.matches('input, textarea, select')) return;
    const index = Number(event.key) - 1;
    if (index >= 0 && index < sections.length) cambiaSezione(sections[index]);
  });
}

function enhanceHabitProgress() {
  const completed = document.getElementById('completed-count');
  const bar = document.getElementById('habits-progress');
  if (!completed || !bar) return;
  const update = () => {
    const match = completed.textContent.match(/(\d+)\s*\/\s*(\d+)/);
    if (!match) return;
    const done = Number(match[1]);
    const total = Number(match[2]);
    bar.style.width = total ? `${(done / total) * 100}%` : '0%';
  };
  new MutationObserver(update).observe(completed, { childList: true, characterData: true, subtree: true });
  update();
}

setupRevealAnimations();
addRippleEffect();
observeDynamicValues();
enhanceHabitProgress();
setupKeyboardNavigation();
updateCalorieRing();
