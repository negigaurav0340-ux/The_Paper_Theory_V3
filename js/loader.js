(() => {
  'use strict';

  const loader = document.getElementById('siteLoader');
  const bar = document.getElementById('loaderProgress');
  const percent = document.getElementById('loaderPercent');
  const soundButton = document.getElementById('loaderSound');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const startedAt = performance.now();
  const minimumDuration = reducedMotion ? 250 : 3500;
  let visualProgress = 0;
  let pageReady = document.readyState === 'complete';
  let audioContext;
  let soundPlayed = false;

  function setProgress(value) {
    visualProgress = Math.min(100, Math.max(0, value));
    bar.style.width = `${visualProgress}%`;
    percent.textContent = String(Math.round(visualProgress)).padStart(2, '0');
  }

  function paperSpark() {
    const AudioEngine = window.AudioContext || window.webkitAudioContext;
    if (!AudioEngine) return;
    audioContext ||= new AudioEngine();
    if (audioContext.state === 'suspended') {
      audioContext.resume().then(paperSpark).catch(() => {});
      return;
    }
    if (soundPlayed) return;
    soundPlayed = true;
    const now = audioContext.currentTime;
    const master = audioContext.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.13, now + 0.025);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 1.25);
    master.connect(audioContext.destination);

    [392, 523.25, 659.25, 783.99].forEach((frequency, index) => {
      const tone = audioContext.createOscillator();
      const gain = audioContext.createGain();
      tone.type = index === 0 ? 'sine' : 'triangle';
      tone.frequency.setValueAtTime(frequency, now + index * 0.09);
      gain.gain.setValueAtTime(0.0001, now + index * 0.09);
      gain.gain.exponentialRampToValueAtTime(index === 0 ? 0.34 : 0.18, now + index * 0.09 + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.62 + index * 0.12);
      tone.connect(gain).connect(master);
      tone.start(now + index * 0.09);
      tone.stop(now + 0.9 + index * 0.12);
    });

    const shimmer = audioContext.createOscillator();
    const shimmerGain = audioContext.createGain();
    shimmer.type = 'sine';
    shimmer.frequency.setValueAtTime(1046.5, now + 0.38);
    shimmer.frequency.exponentialRampToValueAtTime(1568, now + 0.78);
    shimmerGain.gain.setValueAtTime(0.0001, now + 0.38);
    shimmerGain.gain.exponentialRampToValueAtTime(0.09, now + 0.43);
    shimmerGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.05);
    shimmer.connect(shimmerGain).connect(master);
    shimmer.start(now + 0.38);
    shimmer.stop(now + 1.08);
  }

  soundButton?.addEventListener('click', () => {
    const soundOn = soundButton.getAttribute('aria-pressed') !== 'true';
    soundButton.setAttribute('aria-pressed', String(soundOn));
    soundButton.querySelector('b').textContent = soundOn ? 'Sound on' : 'Sound off';
    if (soundOn) paperSpark();
  });

  setTimeout(() => {
    if (soundButton?.getAttribute('aria-pressed') === 'true') paperSpark();
  }, 420);
  loader.addEventListener('pointerdown', event => {
    if (!event.target.closest('#loaderSound') && soundButton?.getAttribute('aria-pressed') === 'true') paperSpark();
  }, { once: true });

  addEventListener('load', () => { pageReady = true; }, { once: true });

  function finish() {
    setProgress(100);
    loader.classList.add('loader-complete');
    document.body.classList.remove('is-loading');
    setTimeout(() => {
      loader.hidden = true;
      loader.setAttribute('aria-hidden', 'true');
    }, reducedMotion ? 80 : 780);
  }

  function tick(now) {
    const elapsed = now - startedAt;
    const target = pageReady ? 100 : Math.min(92, 8 + elapsed / 27);
    setProgress(visualProgress + (target - visualProgress) * 0.085);
    if (pageReady && elapsed >= minimumDuration && visualProgress > 98.5) finish();
    else requestAnimationFrame(tick);
  }

  setProgress(4);
  requestAnimationFrame(tick);
  setTimeout(() => { if (!loader.hidden) finish(); }, 5200);
})();
