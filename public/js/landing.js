// Scrollytelling interattivo Tempra Gym.

function entraInApp() {
  document.getElementById('auth-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function setupLandingScroll() {
  const sections = [...document.querySelectorAll('#landing section')];
  const dots = document.getElementById('section-dots');
  const labels = ['Start', 'Allenati', 'Progressi', 'Misure', 'Account'];

  sections.forEach((section, index) => {
    const dot = document.createElement('button');
    dot.title = labels[index] || `Sezione ${index + 1}`;
    dot.addEventListener('click', () => section.scrollIntoView({ behavior: 'smooth' }));
    dots.appendChild(dot);
  });

  const revealObserver = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  }), { threshold: .18 });
  document.querySelectorAll('#landing .reveal').forEach((item) => revealObserver.observe(item));

  const sectionObserver = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const index = sections.indexOf(entry.target);
    [...dots.children].forEach((dot, dotIndex) => dot.classList.toggle('active', dotIndex === index));
  }), { threshold: .55 });
  sections.forEach((section) => sectionObserver.observe(section));

  const parallaxItems = document.querySelectorAll('[data-parallax]');
  const updateMotion = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const progress = max > 0 ? window.scrollY / max : 0;
    document.getElementById('scroll-progress').style.width = `${progress * 100}%`;
    parallaxItems.forEach((item) => {
      const depth = Number(item.dataset.parallax || 0);
      item.style.transform = `translateY(${window.scrollY * depth * -0.2}px)`;
    });
  };

  window.addEventListener('scroll', updateMotion, { passive: true });
  updateMotion();
}

function setupTilt() {
  document.querySelectorAll('.tilt').forEach((card) => {
    card.addEventListener('mousemove', (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - .5;
      const y = (event.clientY - rect.top) / rect.height - .5;
      card.style.transform = `perspective(800px) rotateY(${x * 8}deg) rotateX(${y * -8}deg) translateY(-4px)`;
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });
}

(async function initLanding() {
  try {
    const response = await fetch('/api/auth/me');
    if (response.ok) document.getElementById('landing').classList.add('hidden');
  } catch (_) {}
  setupLandingScroll();
  setupTilt();
})();
