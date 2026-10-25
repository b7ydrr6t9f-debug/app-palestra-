// Scrollytelling Tempra Gym.

function entraInApp() {
  document.getElementById('landing').classList.add('hidden');
  document.getElementById('auth-screen').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function setupLandingScroll() {
  const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  }), { threshold: .18 });

  document.querySelectorAll('#landing .reveal').forEach((item) => observer.observe(item));

  const updateProgress = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const percentage = max > 0 ? (window.scrollY / max) * 100 : 0;
    document.getElementById('scroll-progress').style.width = `${percentage}%`;
  };

  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();
}

(async function initLanding() {
  try {
    const response = await fetch('/api/auth/me');
    if (response.ok) {
      document.getElementById('landing').classList.add('hidden');
    }
  } catch (_) {}
  setupLandingScroll();
})();
