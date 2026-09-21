(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BJ_UTILS = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function rafThrottle(callback, requestFrame) {
    const raf = requestFrame || requestAnimationFrame;
    let frame = 0;
    let latestArgs = [];

    return function throttled(...args) {
      latestArgs = args;
      if (frame) return;
      frame = raf(() => {
        frame = 0;
        callback(...latestArgs);
      });
    };
  }

  /* 音频开关。
     audio 为可选：页面里没有 <audio> 元素时（即站内不提供《游京》音轨），
     直接以合成古琴起步，不会去请求不存在的音频文件。 */
  function createAudioToggle({ audio = null, fallback, onState = function () {}, playTimeoutMs = 1500 }) {
    let playing = false;
    let mode = audio ? 'idle' : 'synth';

    const state = () => ({ playing, mode });
    const emit = () => {
      const next = state();
      onState(next);
      return next;
    };

    async function toggle() {
      if (playing) {
        if (mode === 'track') audio.pause();
        else fallback.stop();
        playing = false;
        return emit();
      }

      if (mode === 'synth') {
        await fallback.start();
        playing = true;
        return emit();
      }

      let timeoutId = null;
      let timedOut = false;
      try {
        await Promise.race([
          Promise.resolve().then(() => audio.play()),
          new Promise((resolve, reject) => {
            timeoutId = setTimeout(() => {
              timedOut = true;
              reject(new Error('Audio play request timed out'));
            }, playTimeoutMs);
          }),
        ]);
        mode = 'track';
      } catch (error) {
        if (timedOut) {
          try { audio.pause(); } catch (pauseError) { /* media was never active */ }
        }
        await fallback.start();
        mode = 'synth';
      } finally {
        if (timeoutId !== null) clearTimeout(timeoutId);
      }
      playing = true;
      return emit();
    }

    return { toggle, getState: state };
  }

  function loadImageCandidates(sources, createImage) {
    const candidates = sources.filter(Boolean);
    const makeImage = createImage || (() => new Image());

    return new Promise((resolve, reject) => {
      let index = 0;
      const attempt = () => {
        if (index >= candidates.length) {
          reject(new Error('No image source could be loaded'));
          return;
        }
        const source = candidates[index++];
        const image = makeImage();
        image.onload = () => resolve({ image, source });
        image.onerror = attempt;
        image.src = source;
      };
      attempt();
    });
  }

  function nearestIndex(sortedValues, target) {
    if (!sortedValues.length) return -1;
    let low = 0;
    let high = sortedValues.length - 1;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (sortedValues[mid] < target) low = mid + 1;
      else high = mid;
    }
    if (low === 0) return 0;
    return target - sortedValues[low - 1] <= sortedValues[low] - target ? low - 1 : low;
  }

  function createFrameClock(fps) {
    const interval = 1000 / fps;
    let lastTime = null;
    return {
      step(now) {
        if (lastTime === null) {
          lastTime = now;
          return 1;
        }
        const elapsed = now - lastTime;
        if (elapsed < interval) return 0;
        lastTime = now;
        return Math.min(2.5, elapsed / (1000 / 60));
      },
      reset() { lastTime = null; },
    };
  }

  return { rafThrottle, createAudioToggle, loadImageCandidates, nearestIndex, createFrameClock };
});
