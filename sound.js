export function makeSound(button, storageKey) {
  let muted = false;
  let audio;
  let crumbs;
  try { muted = localStorage.getItem(storageKey) === "yes"; } catch {}
  button.setAttribute("aria-pressed", String(!muted));

  function mallet(time, pitch, gain, decay) {
    for (const [ratio, level] of [[1, gain], [2.76, gain * .16]]) {
      const tone = audio.createOscillator();
      const volume = audio.createGain();
      tone.frequency.value = pitch * ratio;
      volume.gain.setValueAtTime(level, time);
      volume.gain.exponentialRampToValueAtTime(.001, time + decay);
      tone.connect(volume).connect(audio.destination);
      tone.start(time);
      tone.stop(time + decay + .01);
    }
  }

  function rustle(time, duration, gain, frequency) {
    if (!crumbs) {
      crumbs = audio.createBuffer(1, Math.ceil(audio.sampleRate * .22), audio.sampleRate);
      const samples = crumbs.getChannelData(0);
      for (let index = 0; index < samples.length; index++) samples[index] = Math.random() * 2 - 1;
    }
    const source = audio.createBufferSource();
    const filter = audio.createBiquadFilter();
    const volume = audio.createGain();
    source.buffer = crumbs;
    filter.type = "bandpass";
    filter.frequency.value = frequency;
    volume.gain.setValueAtTime(gain, time);
    volume.gain.exponentialRampToValueAtTime(.001, time + duration);
    source.connect(filter).connect(volume).connect(audio.destination);
    source.start(time);
    source.stop(time + duration);
  }

  function play(cue, flavor = 0) {
    if (muted) return;
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    try {
      audio ||= new Audio();
      if (audio.state === "suspended") audio.resume().catch(() => {});
      const time = audio.currentTime + .02;
      if (cue === "paper") {
        rustle(time, .15, .12, 1850);
        rustle(time + .055, .07, .045, 3000);
      } else if (cue === "retry") {
        mallet(time, 245, .055, .11);
        rustle(time + .015, .10, .11, 920);
      } else if (cue === "ready") {
        [659, 830, 988, 1318].forEach((pitch, index) => mallet(time + index * .085, pitch, .06, .28));
      } else {
        const notes = [[587, 880], [660, 988], [784, 1047], [698, 932]][flavor];
        rustle(time, .065, .08, 2500);
        mallet(time + .03, notes[0], .07, .24);
        mallet(time + .125, notes[1], .055, .26);
      }
    } catch {}
  }

  button.addEventListener("click", () => {
    muted = !muted;
    try { localStorage.setItem(storageKey, muted ? "yes" : "no"); } catch {}
    button.setAttribute("aria-pressed", String(!muted));
    if (muted) audio?.suspend().catch(() => {});
    else play("correct");
  });
  return play;
}
