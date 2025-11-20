
class AudioService {
  private ctx: AudioContext | null = null;
  private thrustOsc: OscillatorNode | null = null;
  private thrustGain: GainNode | null = null;

  // Music State
  private isMusicPlaying = false;
  private nextNoteTime = 0;
  private timerID: number | undefined;
  private beatCount = 0;
  private tempo = 120;
  private lookahead = 25.0; // ms
  private scheduleAheadTime = 0.1; // s

  constructor() {
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.error("Web Audio API not supported");
    }
  }

  private ensureContext() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // --- Sound Effects ---

  playThrust(active: boolean) {
    if (!this.ctx) return;
    this.ensureContext();

    if (active) {
      if (!this.thrustOsc) {
        this.thrustOsc = this.ctx.createOscillator();
        this.thrustGain = this.ctx.createGain();
        
        this.thrustOsc.type = 'sawtooth';
        this.thrustOsc.frequency.value = 50; // Low rumble
        
        // Add some noise-like quality by modulating (simple approx)
        this.thrustGain.gain.value = 0.1;

        this.thrustOsc.connect(this.thrustGain);
        this.thrustGain.connect(this.ctx.destination);
        this.thrustOsc.start();
      }
    } else {
      if (this.thrustOsc) {
        this.thrustOsc.stop();
        this.thrustOsc.disconnect();
        this.thrustOsc = null;
        this.thrustGain = null;
      }
    }
  }

  playSound(type: 'land' | 'crash' | 'success' | 'click') {
    if (!this.ctx) return;
    this.ensureContext();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    const now = this.ctx.currentTime;

    switch (type) {
      case 'land':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
      case 'crash':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.linearRampToValueAtTime(20, now + 0.5);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
        break;
      case 'success':
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(880, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
        break;
      case 'click':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
        break;
    }
  }

  // --- Music Sequencer ---

  toggleMusic(shouldPlay: boolean) {
    if (!this.ctx) return;
    
    if (shouldPlay) {
      this.ensureContext();
      if (!this.isMusicPlaying) {
        this.isMusicPlaying = true;
        this.beatCount = 0;
        this.nextNoteTime = this.ctx.currentTime + 0.1;
        this.scheduler();
      }
    } else {
      this.isMusicPlaying = false;
      if (this.timerID) window.clearTimeout(this.timerID);
    }
  }

  private scheduler() {
    if (!this.ctx) return;
    
    // While there are notes that will need to play before the next interval, schedule them and advance the pointer.
    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
        this.scheduleNote(this.beatCount, this.nextNoteTime);
        this.nextNote();
    }
    
    if (this.isMusicPlaying) {
        this.timerID = window.setTimeout(() => this.scheduler(), this.lookahead);
    }
  }

  private nextNote() {
    const secondsPerBeat = 60.0 / this.tempo;
    // 16th notes = 0.25 of a beat
    this.nextNoteTime += 0.25 * secondsPerBeat; 
    this.beatCount++;
  }

  private scheduleNote(beatIndex: number, time: number) {
    if (!this.ctx) return;

    const step = beatIndex % 16;

    // --- Drums ---
    // Kick: 0, 4, 8, 12
    if (step % 4 === 0) {
        this.playDrum(time, 'kick');
    }
    
    // HiHat: Off beats or every odd 16th
    if (step % 2 !== 0) {
        this.playDrum(time, 'hihat');
    }

    // Snare: 4, 12
    if (step === 4 || step === 12) {
        this.playDrum(time, 'snare');
    }

    // --- Bass (Sawtooth) ---
    // Simple repetitive bassline
    // Root notes: C (steps 0-7), F (8-11), G (12-15)
    if (step % 4 === 2 || step % 4 === 3) { // Playing on the off-beats for driving feel
        let freq = 65.41; // C2
        if (step >= 8 && step < 12) freq = 87.31; // F2
        if (step >= 12) freq = 98.00; // G2
        
        this.playBass(time, freq, 0.15);
    }

    // --- Lead (Square) ---
    // Arpeggiator
    // Chord progression CMaj -> FMaj -> GMaj
    let notes: number[] = [];
    if (step < 8) notes = [261.63, 329.63, 392.00, 523.25]; // C Major (C4, E4, G4, C5)
    else if (step < 12) notes = [349.23, 440.00, 523.25, 698.46]; // F Major (F4, A4, C5, F5)
    else notes = [392.00, 493.88, 587.33, 783.99]; // G Major (G4, B4, D5, G5)

    const note = notes[step % 4];
    
    // Play a melody pattern
    // Pattern: x-x- xx-x x-xx xxxx
    const pattern = [1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1];
    if (pattern[step]) {
        this.playLead(time, note, 0.1);
    }
  }

  private playDrum(time: number, type: 'kick' | 'snare' | 'hihat') {
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();
    osc.connect(gain);
    gain.connect(this.ctx!.destination);

    if (type === 'kick') {
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
        gain.gain.setValueAtTime(0.5, time); // Reduced volume for background mix
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
    } else if (type === 'snare') {
        osc.type = 'triangle'; // Approximation without noise buffer for simplicity
        osc.frequency.setValueAtTime(100, time);
        gain.gain.setValueAtTime(0.2, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
    } else { // hihat
        // Create buffer for white noise
        const bufferSize = this.ctx!.sampleRate * 0.05; // 50ms
        const buffer = this.ctx!.createBuffer(1, bufferSize, this.ctx!.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = this.ctx!.createBufferSource();
        noise.buffer = buffer;
        noise.connect(gain);
        // Override oscillator connection
        gain.gain.setValueAtTime(0.1, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
        noise.start(time);
        return; // Early return as we used buffer source
    }

    osc.start(time);
    osc.stop(time + 0.5);
  }

  private playBass(time: number, freq: number, duration: number) {
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();
    osc.connect(gain);
    gain.connect(this.ctx!.destination);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);
    
    gain.gain.setValueAtTime(0.15, time); // Low volume
    gain.gain.linearRampToValueAtTime(0.0, time + duration);

    osc.start(time);
    osc.stop(time + duration);
  }

  private playLead(time: number, freq: number, duration: number) {
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();
    osc.connect(gain);
    gain.connect(this.ctx!.destination);

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, time);
    
    gain.gain.setValueAtTime(0.05, time); // Quiet melody
    gain.gain.linearRampToValueAtTime(0.0, time + duration);

    osc.start(time);
    osc.stop(time + duration);
  }
}

export const audioService = new AudioService();
