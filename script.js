/* ============================================================
   SISHIR BHARATI — PORTFOLIO v2
   Three.js 3D effects + all interactions
   ============================================================ */

'use strict';

const lerp = (a, b, t) => a + (b - a) * t;
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = window.innerWidth < 768;

/* ══════════ 1. HERO THREE.JS ══════════ */
(function initHeroScene() {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas || typeof THREE === 'undefined') return;

  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: !isMobile, alpha: true, powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 28);

  const mouse = { x: 0, y: 0 };
  const target = { x: 0, y: 0 };
  document.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
    mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  // Star field
  const starCount = isMobile ? 500 : 1200;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount * 3; i++) starPos[i] = (Math.random() - 0.5) * 200;
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
    color: 0xaaccff, size: 0.12, transparent: true, opacity: 0.5,
  })));

  // Nebula
  const nebulaCount = isMobile ? 250 : 600;
  const nebPos = new Float32Array(nebulaCount * 3);
  const nebCol = new Float32Array(nebulaCount * 3);
  for (let i = 0; i < nebulaCount; i++) {
    const r = 10 + Math.random() * 14;
    const phi = Math.acos(-1 + Math.random() * 2);
    const tht = Math.random() * Math.PI * 2;
    nebPos[i * 3]     = r * Math.sin(phi) * Math.cos(tht);
    nebPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(tht);
    nebPos[i * 3 + 2] = r * Math.cos(phi) - 10;
    const t = (nebPos[i * 3 + 1] + r) / (2 * r);
    nebCol[i * 3]     = lerp(0.49, 0.0, t);
    nebCol[i * 3 + 1] = lerp(0.23, 0.9, t);
    nebCol[i * 3 + 2] = lerp(0.93, 1.0, t);
  }
  const nebGeo = new THREE.BufferGeometry();
  nebGeo.setAttribute('position', new THREE.BufferAttribute(nebPos, 3));
  nebGeo.setAttribute('color', new THREE.BufferAttribute(nebCol, 3));
  const nebula = new THREE.Points(nebGeo, new THREE.PointsMaterial({
    size: isMobile ? 0.2 : 0.16, vertexColors: true, transparent: true,
    opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  scene.add(nebula);

  // DNA Helix
  const helixGroup = new THREE.Group();
  scene.add(helixGroup);
  const colorA = new THREE.Color(0x00e5ff);
  const colorB = new THREE.Color(0x8b5cf6);
  const helixHeight = 14, helixRadius = 2.6, helixTurns = 4, strandPoints = 120;

  function buildStrand(phaseOffset, color) {
    const pts = [];
    for (let i = 0; i <= strandPoints; i++) {
      const t = i / strandPoints;
      const angle = t * Math.PI * 2 * helixTurns + phaseOffset;
      pts.push(new THREE.Vector3(Math.cos(angle) * helixRadius, t * helixHeight - helixHeight / 2, Math.sin(angle) * helixRadius));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const geo = new THREE.TubeGeometry(curve, strandPoints * 2, 0.06, 6, false);
    return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 }));
  }
  helixGroup.add(buildStrand(0, colorA));
  helixGroup.add(buildStrand(Math.PI, colorB));

  const rungCount = helixTurns * 8;
  for (let i = 0; i <= rungCount; i++) {
    const t = i / rungCount;
    const angle = t * Math.PI * 2 * helixTurns;
    const y = t * helixHeight - helixHeight / 2;
    const pA = new THREE.Vector3(Math.cos(angle) * helixRadius, y, Math.sin(angle) * helixRadius);
    const pB = new THREE.Vector3(Math.cos(angle + Math.PI) * helixRadius, y, Math.sin(angle + Math.PI) * helixRadius);
    helixGroup.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([pA, pB]),
      new THREE.LineBasicMaterial({ color: colorA.clone().lerp(colorB, t), transparent: true, opacity: 0.35 })
    ));
    [pA, pB].forEach((pt, idx) => {
      const sph = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), new THREE.MeshBasicMaterial({ color: idx === 0 ? colorA : colorB }));
      sph.position.copy(pt);
      helixGroup.add(sph);
    });
  }
  helixGroup.position.set(7, 0, 0);
  helixGroup.rotation.x = 0.15;

  // Floating shapes
  const shapes = [];
  [
    { geo: new THREE.OctahedronGeometry(0.5), pos: [-12, 5, -5], rot: [0.6, 0.4, 0.2], col: 0x00e5ff },
    { geo: new THREE.TetrahedronGeometry(0.4), pos: [-9, -4, -8], rot: [0.3, 0.8, 0.1], col: 0x8b5cf6 },
    { geo: new THREE.IcosahedronGeometry(0.35), pos: [12, -5, -10], rot: [0.5, 0.3, 0.7], col: 0xf472b6 },
    { geo: new THREE.DodecahedronGeometry(0.3), pos: [-14, -2, -6], rot: [0.2, 0.6, 0.4], col: 0x00e5ff },
    { geo: new THREE.OctahedronGeometry(0.25), pos: [11, 6, -4], rot: [0.7, 0.1, 0.5], col: 0x8b5cf6 },
  ].forEach(({ geo, pos, rot, col }) => {
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: col, wireframe: true, transparent: true, opacity: 0.3 }));
    mesh.position.set(...pos);
    mesh.userData = { rotSpeed: rot, floatOffset: Math.random() * Math.PI * 2 };
    scene.add(mesh);
    shapes.push(mesh);
  });

  let isVisible = true;
  new IntersectionObserver(([e]) => { isVisible = e.isIntersecting; }, { threshold: 0 }).observe(document.getElementById('hero'));

  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    if (!isVisible) return;
    const elapsed = clock.getElapsedTime();
    target.x = lerp(target.x, mouse.x * 1.5, 0.04);
    target.y = lerp(target.y, mouse.y * 0.8, 0.04);
    camera.position.x = lerp(camera.position.x, target.x, 0.06);
    camera.position.y = lerp(camera.position.y, target.y * 0.5, 0.06);
    camera.lookAt(0, 0, 0);
    nebula.rotation.y = elapsed * 0.04;
    nebula.rotation.x = elapsed * 0.018;
    helixGroup.rotation.y = elapsed * 0.3;
    helixGroup.position.y = Math.sin(elapsed * 0.5) * 0.6;
    shapes.forEach((s) => {
      s.rotation.x += s.userData.rotSpeed[0] * 0.008;
      s.rotation.y += s.userData.rotSpeed[1] * 0.01;
      s.rotation.z += s.userData.rotSpeed[2] * 0.007;
      s.position.y += Math.sin(elapsed + s.userData.floatOffset) * 0.003;
    });
    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }, { passive: true });
})();

/* ══════════ 2. PROJECTS BG ══════════ */
(function initProjectsBg() {
  const canvas = document.getElementById('projectsBg');
  if (!canvas || typeof THREE === 'undefined') return;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
  renderer.setPixelRatio(1);
  const section = document.getElementById('projects');
  renderer.setSize(section.offsetWidth, section.offsetHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, section.offsetWidth / section.offsetHeight, 0.1, 100);
  camera.position.z = 16;

  const dotCount = isMobile ? 200 : 400;
  const positions = new Float32Array(dotCount * 3);
  for (let i = 0; i < dotCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 40;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 30;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const dots = new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0x00e5ff, size: 0.08, transparent: true, opacity: 0.25,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  scene.add(dots);

  let visible = false;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 }).observe(section);

  const clock = new THREE.Clock();
  (function animate() {
    requestAnimationFrame(animate);
    if (!visible) return;
    dots.rotation.y = clock.getElapsedTime() * 0.06;
    renderer.render(scene, camera);
  })();

  window.addEventListener('resize', () => {
    renderer.setSize(section.offsetWidth, section.offsetHeight);
    camera.aspect = section.offsetWidth / section.offsetHeight;
    camera.updateProjectionMatrix();
  }, { passive: true });
})();

/* ══════════ 3. TYPEWRITER ══════════ */
(function initTypewriter() {
  const el = document.getElementById('typeTarget');
  if (!el) return;

  const phrases = [
    'Aspiring Developer | AI Enthusiast',
    "Building Tomorrow's Solutions Today",
    'Python \u2022 JavaScript \u2022 C \u2022 AI/ML',
    'From Nepal to the World \uD83C\uDF0F',
  ];

  let pIdx = 0, cIdx = 0, deleting = false;

  function tick() {
    const phrase = phrases[pIdx];
    if (!deleting) {
      el.textContent = phrase.slice(0, cIdx + 1);
      cIdx++;
      if (cIdx === phrase.length) { deleting = true; setTimeout(tick, 1800); return; }
    } else {
      el.textContent = phrase.slice(0, cIdx - 1);
      cIdx--;
      if (cIdx === 0) { deleting = false; pIdx = (pIdx + 1) % phrases.length; setTimeout(tick, 400); return; }
    }
    setTimeout(tick, deleting ? 45 : 80);
  }
  setTimeout(tick, 1000);
})();

/* ══════════ 4. NAVBAR ══════════ */
(function initNavbar() {
  const navbar = document.getElementById('navbar');
  const navLinks = document.querySelectorAll('.nav-link');
  const hamburger = document.getElementById('hamburger');
  const navMenu = document.getElementById('navLinks');

  function openMenu() { hamburger.classList.add('open'); navMenu.classList.add('open'); document.body.classList.add('nav-open'); }
  function closeMenu() { hamburger.classList.remove('open'); navMenu.classList.remove('open'); document.body.classList.remove('nav-open'); }

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
    const sections = ['about', 'projects', 'skills', 'contact'];
    let activeId = '';
    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) { const rect = el.getBoundingClientRect(); if (rect.top <= 120 && rect.bottom >= 120) activeId = id; }
    });
    navLinks.forEach((link) => link.classList.toggle('active', link.dataset.section === activeId));
  }, { passive: true });

  hamburger.addEventListener('click', () => navMenu.classList.contains('open') ? closeMenu() : openMenu());
  navLinks.forEach((link) => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && navMenu.classList.contains('open')) closeMenu(); });
  navMenu.addEventListener('click', (e) => { if (e.target === navMenu) closeMenu(); });
})();

/* ══════════ 5. SMOOTH SCROLL ══════════ */
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id === '#') return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

/* ══════════ 6. SCROLL REVEAL ══════════ */
(function initReveal() {
  const els = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-up');
  if (!els.length) return;
  const observer = new IntersectionObserver(
    (entries) => entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } }),
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );
  els.forEach((el) => observer.observe(el));
})();

/* ══════════ 7. SKILL BARS ══════════ */
(function initSkillBars() {
  const fills = document.querySelectorAll('.skill-fill');
  if (!fills.length) return;
  let animated = false;
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting && !animated) {
        animated = true;
        fills.forEach((fill, idx) => setTimeout(() => { fill.style.width = fill.dataset.w + '%'; }, idx * 100));
        observer.disconnect();
      }
    },
    { threshold: 0.3 }
  );
  const skillsSection = document.getElementById('skills');
  if (skillsSection) observer.observe(skillsSection);
})();

/* ══════════ 8. CUSTOM CURSOR ══════════ */
(function initCursor() {
  const cursor = document.getElementById('cursor');
  const ring = document.getElementById('cursorRing');
  if (!cursor || !ring || window.matchMedia('(pointer: coarse)').matches) return;

  let mx = -100, my = -100, rx = -100, ry = -100;

  document.addEventListener('mousemove', (e) => {
    mx = e.clientX; my = e.clientY;
    cursor.style.transform = `translate(${mx - 4}px, ${my - 4}px)`;
  });

  function follow() {
    rx = lerp(rx, mx, 0.12);
    ry = lerp(ry, my, 0.12);
    ring.style.transform = `translate(${rx - 16}px, ${ry - 16}px)`;
    requestAnimationFrame(follow);
  }
  follow();

  document.querySelectorAll('a, button, .project-card, .skill-card, input, textarea').forEach((el) => {
    el.addEventListener('mouseenter', () => { cursor.style.transform += ' scale(2)'; ring.style.width = '48px'; ring.style.height = '48px'; });
    el.addEventListener('mouseleave', () => { ring.style.width = ''; ring.style.height = ''; });
  });
})();

/* ══════════ 9. CONTACT FORM ══════════ */
const contactForm = document.getElementById('contactForm');
const feedback = document.getElementById('formFeedback');

contactForm.addEventListener('submit', function (e) {
  e.preventDefault();
  const submitBtn = contactForm.querySelector('button');
  submitBtn.innerHTML = '<span>Sending...</span>';
  const formData = new FormData(contactForm);

  fetch(contactForm.action, { method: 'POST', body: formData, headers: { Accept: 'application/json' } })
    .then(function (response) {
      if (response.ok) {
        feedback.innerHTML = '\u2705 Message sent successfully!';
        feedback.style.color = '#00ff99';
        contactForm.reset();
      } else {
        feedback.innerHTML = '\u26A0 Failed to send message.';
        feedback.style.color = '#ff4d4d';
      }
      submitBtn.innerHTML = '<span>Send Message</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>';
    })
    .catch(function () {
      feedback.innerHTML = '\u26A0 Failed to send message.';
      feedback.style.color = '#ff4d4d';
      submitBtn.innerHTML = '<span>Send Message</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>';
    });
});

/* ══════════ 10. CARD TILT ══════════ */
(function initCardTilt() {
  if (isMobile) return;
  document.querySelectorAll('.project-card').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const dx = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
      const dy = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
      card.style.transform = `translateY(-8px) rotateX(${-dy * 5}deg) rotateY(${dx * 5}deg)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      card.style.transition = 'transform 0.5s ease';
      setTimeout(() => { card.style.transition = ''; }, 500);
    });
  });
})();

/* ══════════ 11. STAT COUNT-UP ══════════ */
(function initCountUp() {
  const statEls = document.querySelectorAll('.stat-value');
  let ran = false;

  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !ran) {
      ran = true;
      statEls.forEach((el) => {
        const raw = el.textContent.trim();
        if (raw === '\u221E' || raw === '\u221e') return;
        const num = parseInt(raw, 10);
        const suffix = raw.replace(String(num), '');
        el.textContent = '0';
        let start = 0;
        const step = 1000 / num;
        const timer = setInterval(() => {
          start += 1;
          el.textContent = start + suffix;
          if (start >= num) { el.textContent = num + suffix; clearInterval(timer); }
        }, step);
      });
      observer.disconnect();
    }
  }, { threshold: 0.8 });

  const heroStats = document.querySelector('.hero-stats');
  if (heroStats) observer.observe(heroStats);
})();

console.log('%c[SB] Portfolio v2 loaded \uD83D\uDE80', 'color:#00e5ff; font-family:monospace; font-size:13px; font-weight:bold;');
