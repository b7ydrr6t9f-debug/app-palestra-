// Scrollytelling Tempra Gym.

function entraInApp() {
  document.getElementById('landing').classList.add('hidden');
  document.getElementById('auth-screen').classList.remove('hidden');
}

function setupLandingScroll() {
  const landing = document.getElementById('landing');
  const progress = document.getElementById('scroll-progress');
  const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  }), { threshold: .18 });

  landing.querySelectorAll('.reveal').forEach((item) => observer.observe(item));
  landing.addEventListener('scroll', () => {
    const percentage = (landing.scrollTop / (landing.scrollHeight - landing.clientHeight)) * 100;
    progress.style.width = `${percentage}%`;
  });
}

(async function initLanding() {
  try {
    const response = await fetch('/api/auth/me');
    if (response.ok) document.getElementById('landing').classList.add('hidden');
  } catch (_) {}
  setupLandingScroll();
})();
