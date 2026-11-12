export function makeSound(button, storageKey) {
  let muted = false;
  let audio;
  try { muted = localStorage.getItem(storageKey) === "yes"; } catch {}
  button.setAttribute("aria-pressed", String(!muted));

  function play(pitches, interval = .08) {
    if (muted) return;
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    try {
      audio ||= new Audio();
      if (audio.state === "suspended") audio.resume().catch(() => {});
      pitches.forEach((pitch, index) => {
        const time = audio.currentTime + .01 + index * interval;
        const tone = audio.createOscillator();
        const volume = audio.createGain();
        tone.type = "triangle";
        tone.frequency.value = pitch;
        volume.gain.setValueAtTime(.001, time);
        volume.gain.exponentialRampToValueAtTime(.075, time + .016);
        volume.gain.exponentialRampToValueAtTime(.001, time + .16);
        tone.connect(volume).connect(audio.destination);
        tone.start(time);
        tone.stop(time + .17);
      });
    } catch {}
  }

  button.addEventListener("click", () => {
    muted = !muted;
    try { localStorage.setItem(storageKey, muted ? "yes" : "no"); } catch {}
    button.setAttribute("aria-pressed", String(!muted));
    if (muted) audio?.suspend().catch(() => {});
    else play([523, 659]);
  });
  return play;
}
