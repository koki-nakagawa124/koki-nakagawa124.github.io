'use strict';

// 音声ファイルを使わず、ノイズと緩やかな音量変化で波音を作る。
const soundToggle = document.querySelector('.sound-toggle');
let oceanContext;
let oceanVolume;
let oceanPlaying = false;

function createOceanSound() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) throw new Error('Web Audio is unavailable');
  oceanContext = new AudioContext();
  oceanVolume = oceanContext.createGain();
  oceanVolume.gain.value = 0;
  oceanVolume.connect(oceanContext.destination);

  [0, 1].forEach(layer => {
    const buffer = oceanContext.createBuffer(1, oceanContext.sampleRate * 12, oceanContext.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    const surf = oceanContext.createBufferSource();
    surf.buffer = buffer;
    surf.loop = true;
    const filter = oceanContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = layer === 0 ? 650 : 1800;
    filter.Q.value = 0.5;
    const swell = oceanContext.createGain();
    swell.gain.value = 0.22;
    const tide = oceanContext.createOscillator();
    tide.frequency.value = layer === 0 ? 0.09 : 0.13;
    const depth = oceanContext.createGain();
    depth.gain.value = 0.16;
    tide.connect(depth).connect(swell.gain);
    surf.connect(filter).connect(swell).connect(oceanVolume);
    surf.start();
    tide.start();
  });
}

soundToggle.addEventListener('click', async () => {
  soundToggle.disabled = true;
  try {
    if (!oceanContext) createOceanSound();
    if (oceanPlaying) {
      oceanVolume.gain.setTargetAtTime(0, oceanContext.currentTime, 0.1);
      await new Promise(resolve => setTimeout(resolve, 450));
      await oceanContext.suspend();
      oceanPlaying = false;
    } else {
      await oceanContext.resume();
      oceanVolume.gain.setTargetAtTime(0.55, oceanContext.currentTime, 0.6);
      oceanPlaying = true;
    }
    soundToggle.setAttribute('aria-pressed', String(oceanPlaying));
    soundToggle.setAttribute('aria-label', oceanPlaying ? '海の音を停止する' : '海の音を再生する');
    soundToggle.textContent = oceanPlaying ? '海の音：入' : '海の音：切';
  } catch (error) {
    soundToggle.textContent = '海の音：再試行';
    soundToggle.setAttribute('aria-label', '海の音を再生できませんでした。もう一度試す');
  } finally {
    soundToggle.disabled = false;
  }
});

// 背景の動きだけを切り替える。
const motionToggle = document.querySelector('.motion-toggle');
motionToggle.addEventListener('click', () => {
  const paused = document.body.classList.toggle('motion-paused');
  motionToggle.setAttribute('aria-pressed', String(paused));
  motionToggle.setAttribute('aria-label', paused ? '背景の動きを再開する' : '背景の動きを止める');
  motionToggle.textContent = paused ? '動き：切' : '動き：入';
});

document.querySelector('#year').textContent = new Date().getFullYear();

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const panels = document.querySelectorAll('.panel');
if ('IntersectionObserver' in window && !reducedMotion.matches) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  panels.forEach(panel => {
    panel.classList.add('reveal-ready');
    observer.observe(panel);
  });
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) {
      panels.forEach(panel => panel.classList.add('is-visible'));
      observer.disconnect();
    }
  });
}

const squares = document.querySelectorAll('.scroll-square');
let framePending = false;
function updateSquares() {
  framePending = false;
  if (reducedMotion.matches || document.body.classList.contains('motion-paused')) return;
  const height = window.innerHeight;
  squares.forEach(square => {
    const rect = square.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, (height - rect.top) / (height + rect.height)));
    const reverse = square.classList.contains('square-bottom');
    const distance = reverse ? -window.innerWidth * 0.35 : window.innerWidth * 0.72;
    square.style.setProperty('--travel', `${progress * distance}px`);
    square.style.setProperty('--rotation', `${progress * (reverse ? -1080 : 1080)}deg`);
  });
}
function scheduleSquares() {
  if (!framePending) {
    framePending = true;
    requestAnimationFrame(updateSquares);
  }
}
window.addEventListener('scroll', scheduleSquares, { passive: true });
window.addEventListener('resize', scheduleSquares);
motionToggle.addEventListener('click', scheduleSquares);
updateSquares();
