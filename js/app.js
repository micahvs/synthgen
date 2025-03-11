// SynthGen - Advanced Generative Synthwave Music Tool

// DOM Elements
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const regenerateBtn = document.getElementById('regenerate-btn');
const tempoSlider = document.getElementById('tempo');
const tempoValue = document.getElementById('tempo-value');
const keySelect = document.getElementById('key-select');
const scaleTypeSelect = document.getElementById('scale-type');

// Sliders for synths
const bassSlider = document.getElementById('bass');
const leadSlider = document.getElementById('lead');
const padSlider = document.getElementById('pad');
const arpSlider = document.getElementById('arp');

// Timbre selectors
const bassTimbreSelect = document.getElementById('bass-timbre');
const leadTimbreSelect = document.getElementById('lead-timbre');
const padTimbreSelect = document.getElementById('pad-timbre');
const arpTimbreSelect = document.getElementById('arp-timbre');

// Sliders for drums
const kickSlider = document.getElementById('kick');
const snareSlider = document.getElementById('snare');
const hihatSlider = document.getElementById('hihat');
const percSlider = document.getElementById('perc');

// Pattern selectors for drums
const kickPatternSelect = document.getElementById('kick-pattern');
const snarePatternSelect = document.getElementById('snare-pattern');
const hihatPatternSelect = document.getElementById('hihat-pattern');
const percPatternSelect = document.getElementById('perc-pattern');

// Effect sliders
const reverbSlider = document.getElementById('reverb');
const delaySlider = document.getElementById('delay');
const chorusSlider = document.getElementById('chorus');
const bitcrushSlider = document.getElementById('bitcrush');

// Canvas for visualization
const canvas = document.getElementById('visualizer-canvas');
const ctx = canvas.getContext('2d');

// Initialize visualization
function setupCanvas() {
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
}

window.addEventListener('resize', setupCanvas);
setupCanvas();

// Music theory logic
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Scale patterns (half steps)
const SCALE_PATTERNS = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  minorPentatonic: [0, 3, 5, 7, 10],
  majorPentatonic: [0, 2, 4, 7, 9],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10]
};

// Generate a scale in a specific key
function generateScale(root, scaleType, octaveStart = 2, octaveEnd = 5) {
  const pattern = SCALE_PATTERNS[scaleType];
  const rootIndex = NOTES.indexOf(root);
  const scale = [];
  
  for (let octave = octaveStart; octave <= octaveEnd; octave++) {
    pattern.forEach(interval => {
      const noteIndex = (rootIndex + interval) % 12;
      const note = NOTES[noteIndex] + octave;
      scale.push(note);
    });
  }
  
  return scale;
}

// Chord progressions based on scale degrees
const PROGRESSION_PATTERNS = {
  minor: [
    // i - VI - III - VII
    [0, 5, 2, 6],
    // i - iv - VII - VI
    [0, 3, 6, 5],
    // i - v - VI - iv 
    [0, 4, 5, 3],
    // i - VII - VI - v
    [0, 6, 5, 4]
  ],
  major: [
    // I - V - vi - IV
    [0, 4, 5, 3],
    // I - IV - V - vi
    [0, 3, 4, 5],
    // I - vi - IV - V
    [0, 5, 3, 4],
    // I - V - IV - I
    [0, 4, 3, 0]
  ]
}

// Get chord from scale degree
function getChord(scale, scaleDegree, isMinor) {
  // Find triad/seventh chord notes
  const root = scale[scaleDegree];
  const third = scale[(scaleDegree + 2) % scale.length];
  const fifth = scale[(scaleDegree + 4) % scale.length];
  const seventh = scale[(scaleDegree + 6) % scale.length];
  
  // Include seventh in most chords for that synthwave sound
  if (Math.random() > 0.3) {
    return [root, third, fifth, seventh];
  } else {
    return [root, third, fifth];
  }
}

// Generate chord progression from scale
function generateChordProgression(scale, isMinor) {
  const progressionType = isMinor ? 'minor' : 'major';
  const progressionPatterns = PROGRESSION_PATTERNS[progressionType];
  const selectedPattern = progressionPatterns[Math.floor(Math.random() * progressionPatterns.length)];
  
  return selectedPattern.map(scaleDegree => getChord(scale, scaleDegree, isMinor));
}

// Tone.js setup
let currentKey = 'C';
let currentScaleType = 'minor';
let currentScale = [];
let currentProgression = [];
let isPlaying = false;
let bassSeq, leadSeq, padSeq, arpSeq;
let kickSeq, snareSeq, hihatSeq, percSeq;

// Effects chain
const mainBus = new Tone.Gain(0.8).toDestination();

// Effects
const reverb = new Tone.Reverb({
  decay: 5,
  wet: 0.3
}).connect(mainBus);

const delay = new Tone.PingPongDelay({
  delayTime: 0.25,
  feedback: 0.4,
  wet: 0.2
}).connect(reverb);

const chorus = new Tone.Chorus({
  frequency: 1.5,
  delayTime: 3.5,
  depth: 0.7,
  spread: 180,
  wet: 0.2
}).connect(delay);

// Replace BitCrusher with a combination of standard effects
const distortion = new Tone.Distortion({
  distortion: 0.4,
  wet: 0.1
}).connect(chorus);

const filter = new Tone.Filter({
  type: "lowpass",
  frequency: 4000,
  rolloff: -12
}).connect(distortion);

// This will be our main effects entry point (replacing bitcrusher)
const effectsInput = filter;

// Analyzer for visualizations
const analyzer = new Tone.Analyser('waveform', 512);
analyzer.connect(mainBus);

// Create synth with specified timbre
function createSynth(timbreType) {
  if (timbreType === 'sawtooth' || timbreType === 'square' || timbreType === 'sine') {
    return new Tone.PolySynth({
      oscillator: {
        type: timbreType
      },
      envelope: {
        attack: 0.02,
        decay: 0.2,
        sustain: 0.5,
        release: 1.2
      }
    });
  } else if (timbreType === 'fm') {
    return new Tone.FMSynth({
      harmonicity: 3,
      modulationIndex: 10,
      envelope: {
        attack: 0.01,
        decay: 0.2,
        sustain: 0.3,
        release: 1
      },
      modulation: {
        type: 'square'
      },
      modulationEnvelope: {
        attack: 0.2,
        decay: 0.01,
        sustain: 0.1,
        release: 0.5
      }
    });
  } else if (timbreType === 'am') {
    return new Tone.AMSynth({
      harmonicity: 2,
      envelope: {
        attack: 0.01,
        decay: 0.1,
        sustain: 0.5,
        release: 1
      },
      modulation: {
        type: 'square'
      },
      modulationEnvelope: {
        attack: 0.5,
        decay: 0.1,
        sustain: 0.2,
        release: 0.5
      }
    });
  }
  
  // Default to sawtooth if not recognized
  return new Tone.PolySynth({
    oscillator: {
      type: 'sawtooth'
    }
  });
}

// Synthesized drums - create on demand
function createKickDrum() {
  // Create a kick with better ADSR envelope
  const kick = new Tone.MembraneSynth({
    pitchDecay: 0.05,
    octaves: 6,
    oscillator: {
      type: 'sine'
    },
    envelope: {
      attack: 0.001,
      decay: 0.4,
      sustain: 0.01,
      release: 0.4,
      attackCurve: 'exponential',
      releaseCurve: 'exponential'
    }
  }).connect(effectsInput);
  
  // Add some compression to make it punchier
  const kickComp = new Tone.Compressor({
    threshold: -24,
    ratio: 3,
    attack: 0.003,
    release: 0.25
  }).connect(effectsInput);
  
  kick.connect(kickComp);
  kick.volume.value = -4;
  
  return kick;
}

function createSnareDrum() {
  // Approach with both noise and oscillator for more audible snare
  
  // Create a simple synthesis-based snare 
  const body = new Tone.MembraneSynth({
    pitchDecay: 0.05,
    octaves: 10,
    oscillator: {
      type: 'sine'
    },
    envelope: {
      attack: 0.001,
      decay: 0.2,
      sustain: 0,
      release: 0.1
    }
  }).connect(effectsInput);
  
  // Noise component for the "sizzle"
  const noise = new Tone.NoiseSynth({
    volume: 0,
    noise: {
      type: 'white',
      playbackRate: 3
    },
    envelope: {
      attack: 0.001,
      decay: 0.15,
      sustain: 0,
      release: 0.05
    }
  }).connect(effectsInput);
  
  body.volume.value = 0;
  
  // Wrap in an object that triggers both components
  return {
    triggerAttackRelease: (note, duration, time) => {
      // Always use the same note for consistent sound
      body.triggerAttackRelease('C2', '16n', time);
      noise.triggerAttackRelease('16n', time);
    },
    volume: {
      value: 0,
      get: () => body.volume.value,
      set: (val) => {
        body.volume.value = val;
        noise.volume.value = val;
      }
    }
  };
}

function createHiHat() {
  // Create a hi-hat with a metallic sound
  const hihat = new Tone.MetalSynth({
    frequency: 750,
    envelope: {
      attack: 0.001,
      decay: 0.1,
      sustain: 0.002,
      release: 0.05,
      attackCurve: 'linear',
      releaseCurve: 'exponential'
    },
    harmonicity: 5.1,
    modulationIndex: 32,
    resonance: 6000,
    octaves: 1
  }).connect(effectsInput);
  
  hihat.volume.value = -15;
  return hihat;
}

function createPercussion() {
  // Simple percussion generator
  const perc = new Tone.MetalSynth({
    frequency: 440,
    envelope: {
      attack: 0.001,
      decay: 0.05,
      sustain: 0.005,
      release: 0.2,
      attackCurve: 'exponential',
      releaseCurve: 'exponential'
    },
    harmonicity: 3.1,
    modulationIndex: 16,
    resonance: 2000,
    octaves: 1.5
  }).connect(chorus);
  
  perc.volume.value = -12;
  return perc;
}

// Synth instances - created on demand
let bassSynth, leadSynth, padSynth, arpSynth;
let kickSynth, snareSynth, hihatSynth, percSynth;

// Initialize or recreate synths based on timbre selections
function initializeSynths() {
  // Clean up old synths if they exist
  if (bassSynth) bassSynth.disconnect();
  if (leadSynth) leadSynth.disconnect();
  if (padSynth) padSynth.disconnect();
  if (arpSynth) arpSynth.disconnect();
  
  // Create new synths
  bassSynth = createSynth(bassTimbreSelect.value);
  leadSynth = createSynth(leadTimbreSelect.value);
  padSynth = createSynth(padTimbreSelect.value);
  arpSynth = createSynth(arpTimbreSelect.value);
  
  // Create drums
  kickSynth = createKickDrum();
  
  // Create a simple snare without custom object
  snareSynth = new Tone.NoiseSynth({
    noise: {
      type: 'white',
      playbackRate: 3
    },
    envelope: {
      attack: 0.001,
      decay: 0.15,
      sustain: 0,
      release: 0.05,
      attackCurve: 'exponential',
      releaseCurve: 'exponential'
    }
  }).connect(effectsInput);
  
  hihatSynth = createHiHat();
  percSynth = createPercussion();
  
  // Connect to effects chain
  bassSynth.connect(effectsInput);
  leadSynth.connect(effectsInput);
  padSynth.connect(effectsInput);
  arpSynth.connect(effectsInput);
  
  // Connect to analyzer
  bassSynth.connect(analyzer);
  leadSynth.connect(analyzer);
  padSynth.connect(analyzer);
  arpSynth.connect(analyzer);
  kickSynth.connect(analyzer);
  snareSynth.connect(analyzer);
  hihatSynth.connect(analyzer);
  percSynth.connect(analyzer);
  
  // Set volumes
  updateSynthVolumes();
}

// Helper function to map ranges
function mapRange(value, inputMin, inputMax, outputMin, outputMax) {
  return ((value - inputMin) * (outputMax - outputMin)) / (inputMax - inputMin) + outputMin;
}

// Update effects parameters
function updateEffects() {
  reverb.wet.value = parseFloat(reverbSlider.value);
  delay.wet.value = parseFloat(delaySlider.value);
  chorus.wet.value = parseFloat(chorusSlider.value);
  
  // Update replacement effects (instead of bitcrusher)
  distortion.wet.value = parseFloat(bitcrushSlider.value);
  distortion.distortion = mapRange(parseFloat(bitcrushSlider.value), 0, 1, 0.1, 0.8);
  filter.frequency.value = mapRange(parseFloat(bitcrushSlider.value), 0, 1, 8000, 1000);
}

// Update synth volumes
function updateSynthVolumes() {
  // Helper function to set volume with muting at minimum
  const setVolume = (synth, sliderValue, minDb, maxDb) => {
    if (!synth || !synth.volume) return;
    
    const value = parseFloat(sliderValue);
    // If slider is at minimum, mute the sound (-Infinity dB)
    if (value <= 0.01) {
      synth.volume.value = -Infinity;
    } else {
      synth.volume.value = mapRange(value, 0, 1, minDb, maxDb);
    }
  };
  
  // Set volumes for all instruments with muting at minimum
  if (bassSynth) setVolume(bassSynth, bassSlider.value, -40, 0);
  if (leadSynth) setVolume(leadSynth, leadSlider.value, -40, 0);
  if (padSynth) setVolume(padSynth, padSlider.value, -40, -5);
  if (arpSynth) setVolume(arpSynth, arpSlider.value, -40, -3);
  
  if (kickSynth) setVolume(kickSynth, kickSlider.value, -30, -5);
  if (snareSynth) setVolume(snareSynth, snareSlider.value, -20, 0);
  if (hihatSynth) setVolume(hihatSynth, hihatSlider.value, -30, -15);
  if (percSynth) setVolume(percSynth, percSlider.value, -30, -15);
}

// Initialize music parameters
function initializeMusicParameters() {
  // Update display
  tempoValue.textContent = tempoSlider.value;
  Tone.Transport.bpm.value = parseInt(tempoSlider.value);
  
  // Update key and scale
  currentKey = keySelect.value;
  currentScaleType = scaleTypeSelect.value;
  
  // Generate the scale
  currentScale = generateScale(currentKey, currentScaleType, 2, 5);
  
  // Generate chord progression
  const isMinor = currentScaleType.includes('minor') || currentScaleType === 'dorian';
  currentProgression = generateChordProgression(currentScale, isMinor);
  
  // Initialize effects
  updateEffects();
  
  // Initialize synthesizers
  initializeSynths();
}

// Generate bassline from chord progression
function generateBassline() {
  const bassPattern = [];
  const patternTypes = ['simple', 'octave', 'walking', 'syncopated'];
  const patternType = patternTypes[Math.floor(Math.random() * patternTypes.length)];
  
  // Different pattern types
  currentProgression.forEach(chord => {
    const rootNote = chord[0];
    const fifthNote = chord[2];
    
    switch(patternType) {
      case 'simple':
        // Simple quarter note pattern
        bassPattern.push(rootNote, null, rootNote, null, rootNote, null, rootNote, null);
        break;
      case 'octave':
        // Octave jumps
        const octaveUp = rootNote.replace(/\d/, num => parseInt(num) + 1);
        bassPattern.push(rootNote, null, octaveUp, null, rootNote, null, octaveUp, null);
        break;
      case 'walking':
        // Walking bass line
        bassPattern.push(rootNote, null, fifthNote, null, 
                         chord[1], null, rootNote, null);
        break;
      case 'syncopated':
        // Syncopated rhythm
        bassPattern.push(rootNote, rootNote, null, rootNote, 
                         null, rootNote, rootNote, null);
        break;
    }
  });
  
  return bassPattern;
}

// Generate lead melody
function generateLead() {
  const leadPattern = [];
  // Lead only plays occasionally for interest
  const shouldPlay = Math.random() > 0.3;
  
  if (!shouldPlay) {
    // Fill with rests for the entire progression
    for (let i = 0; i < currentProgression.length * 16; i++) {
      leadPattern.push(null);
    }
    return leadPattern;
  }
  
  // Prefer higher octave notes for lead
  const highNotes = currentScale.filter(note => {
    const octave = parseInt(note.match(/\d/)[0]);
    return octave >= 4;
  });
  
  // Create a simple melody pattern
  for (let i = 0; i < currentProgression.length; i++) {
    // Different patterns for variety
    if (Math.random() > 0.5) {
      // Long sustained notes
      const note1 = highNotes[Math.floor(Math.random() * highNotes.length)];
      const note2 = highNotes[Math.floor(Math.random() * highNotes.length)];
      
      // First bar: long note
      leadPattern.push(note1, null, null, null, null, null, null, null);
      // Second bar: another long note
      leadPattern.push(note2, null, null, null, null, null, null, null);
    } else {
      // More rhythmic pattern
      for (let j = 0; j < 16; j++) {
        if (j % 4 === 0 || (j % 8 === 6 && Math.random() > 0.5)) {
          const note = highNotes[Math.floor(Math.random() * highNotes.length)];
          leadPattern.push(note);
        } else {
          leadPattern.push(null);
        }
      }
    }
  }
  
  return leadPattern;
}

// Generate pad chords
function generatePad() {
  const padPattern = [];
  
  currentProgression.forEach(chord => {
    // Pads play full chords on the first beat of each bar and sustain
    padPattern.push(chord, null, null, null, null, null, null, null,
                   null, null, null, null, null, null, null, null);
  });
  
  return padPattern;
}

// Generate arpeggio from scale and chord progression
function generateArpeggio() {
  const arpPattern = [];
  const notesPerChord = 16; // 16th notes per chord
  
  currentProgression.forEach(chord => {
    const chordNotes = [...chord];
    const extendedChord = [...chord];
    
    // Add some scale notes that fit with the chord
    currentScale.forEach(note => {
      if (!extendedChord.includes(note)) {
        if (Math.random() > 0.7) {
          extendedChord.push(note);
        }
      }
    });
    
    // Different arpeggio patterns
    const patternType = Math.floor(Math.random() * 4);
    
    switch(patternType) {
      case 0: // Up pattern
        for (let i = 0; i < notesPerChord; i++) {
          if (i % 16 < chordNotes.length) {
            arpPattern.push(chordNotes[i % chordNotes.length]);
          } else {
            arpPattern.push(null);
          }
        }
        break;
      case 1: // Down pattern
        for (let i = 0; i < notesPerChord; i++) {
          if (i % 16 < chordNotes.length) {
            arpPattern.push(chordNotes[chordNotes.length - 1 - (i % chordNotes.length)]);
          } else {
            arpPattern.push(null);
          }
        }
        break;
      case 2: // Up-down pattern
        {
          const upDown = [...chordNotes];
          for (let i = chordNotes.length - 2; i > 0; i--) {
            upDown.push(chordNotes[i]);
          }
          for (let i = 0; i < notesPerChord; i++) {
            if (i % 16 < upDown.length) {
              arpPattern.push(upDown[i % upDown.length]);
            } else {
              arpPattern.push(null);
            }
          }
        }
        break;
      case 3: // Random pattern
        for (let i = 0; i < notesPerChord; i++) {
          if (Math.random() > 0.3) {
            const noteIndex = Math.floor(Math.random() * extendedChord.length);
            arpPattern.push(extendedChord[noteIndex]);
          } else {
            arpPattern.push(null);
          }
        }
        break;
    }
  });
  
  return arpPattern;
}

// Generate kick pattern
function generateKickPattern(patternType) {
  const kickPattern = [];
  const barsPerChord = 2;
  const totalBars = currentProgression.length * barsPerChord;
  
  switch(patternType) {
    case 'four-on-floor':
      // Classic 4-on-the-floor
      for (let bar = 0; bar < totalBars; bar++) {
        kickPattern.push('C1', null, null, null, 'C1', null, null, null, 'C1', null, null, null, 'C1', null, null, null);
      }
      break;
    case 'breakbeat':
      // Breakbeat pattern
      for (let bar = 0; bar < totalBars; bar++) {
        kickPattern.push('C1', null, null, null, null, null, 'C1', null, 'C1', null, null, null, null, 'C1', null, null);
      }
      break;
    case 'half-time':
      // Half-time feel
      for (let bar = 0; bar < totalBars; bar++) {
        kickPattern.push('C1', null, null, null, null, null, null, null, 'C1', null, null, 'C1', null, null, null, null);
      }
      break;
    case 'random':
      // Random pattern
      for (let bar = 0; bar < totalBars; bar++) {
        for (let beat = 0; beat < 16; beat++) {
          if (beat % 4 === 0 || Math.random() > 0.8) {
            kickPattern.push('C1');
          } else {
            kickPattern.push(null);
          }
        }
      }
      break;
  }
  
  return kickPattern;
}

// Generate snare pattern
function generateSnarePattern(patternType) {
  const snarePattern = [];
  const barsPerChord = 2;
  const totalBars = currentProgression.length * barsPerChord;
  
  switch(patternType) {
    case 'backbeat':
      // Classic backbeat (beats 2 and 4)
      for (let bar = 0; bar < totalBars; bar++) {
        snarePattern.push(null, null, null, null, 'C2', null, null, null, null, null, null, null, 'C2', null, null, null);
      }
      break;
    case 'fill':
      // Basic pattern with occasional fills
      for (let bar = 0; bar < totalBars; bar++) {
        if (bar % 4 === 3) { // Fill every 4th bar
          snarePattern.push(null, null, null, null, 'C2', null, null, null, null, null, 'C2', 'C2', 'C2', 'C2', 'C2', 'C2');
        } else {
          snarePattern.push(null, null, null, null, 'C2', null, null, null, null, null, null, null, 'C2', null, null, null);
        }
      }
      break;
    case 'sparse':
      // Sparse pattern
      for (let bar = 0; bar < totalBars; bar++) {
        if (bar % 2 === 0) {
          snarePattern.push(null, null, null, null, null, null, null, null, null, null, null, null, 'C2', null, null, null);
        } else {
          snarePattern.push(null, null, null, null, 'C2', null, null, null, null, null, null, null, null, null, null, null);
        }
      }
      break;
    case 'random':
      // Random pattern
      for (let bar = 0; bar < totalBars; bar++) {
        for (let beat = 0; beat < 16; beat++) {
          if (beat % 8 === 4 || (Math.random() > 0.85 && beat % 2 === 0)) {
            snarePattern.push('C2');
          } else {
            snarePattern.push(null);
          }
        }
      }
      break;
  }
  
  return snarePattern;
}

// Generate hi-hat pattern
function generateHihatPattern(patternType) {
  const hihatPattern = [];
  const barsPerChord = 2;
  const totalBars = currentProgression.length * barsPerChord;
  
  switch(patternType) {
    case 'eighth':
      // Eighth notes
      for (let bar = 0; bar < totalBars; bar++) {
        for (let beat = 0; beat < 16; beat++) {
          if (beat % 2 === 0) {
            hihatPattern.push('C3');
          } else {
            hihatPattern.push(null);
          }
        }
      }
      break;
    case 'sixteenth':
      // Sixteenth notes
      for (let bar = 0; bar < totalBars; bar++) {
        for (let beat = 0; beat < 16; beat++) {
          hihatPattern.push('C3');
        }
      }
      break;
    case 'offbeat':
      // Offbeat eighth notes
      for (let bar = 0; bar < totalBars; bar++) {
        for (let beat = 0; beat < 16; beat++) {
          if (beat % 2 === 1) {
            hihatPattern.push('C3');
          } else {
            hihatPattern.push(null);
          }
        }
      }
      break;
    case 'random':
      // Random pattern with emphasis on offbeats
      for (let bar = 0; bar < totalBars; bar++) {
        for (let beat = 0; beat < 16; beat++) {
          if (beat % 2 === 1 || Math.random() > 0.5) {
            hihatPattern.push('C3');
          } else {
            hihatPattern.push(null);
          }
        }
      }
      break;
  }
  
  return hihatPattern;
}

// Generate percussion pattern
function generatePercPattern(patternType) {
  const percPattern = [];
  const barsPerChord = 2;
  const totalBars = currentProgression.length * barsPerChord;
  
  switch(patternType) {
    case 'random':
      // Random sparse percussion
      for (let bar = 0; bar < totalBars; bar++) {
        for (let beat = 0; beat < 16; beat++) {
          if (Math.random() > 0.85) {
            const pitch = Math.random() > 0.5 ? 'C4' : 'D4';
            percPattern.push(pitch);
          } else {
            percPattern.push(null);
          }
        }
      }
      break;
    case 'clave':
      // Basic clave pattern
      const clavePattern = [
        'C4', null, null, 'C4', null, 'C4', null, null, 'C4', null, 'C4', null, null, null, null, null
      ];
      
      for (let bar = 0; bar < totalBars; bar++) {
        percPattern.push(...clavePattern);
      }
      break;
    case 'none':
      // No percussion
      for (let bar = 0; bar < totalBars * 16; bar++) {
        percPattern.push(null);
      }
      break;
  }
  
  return percPattern;
}

// Create all patterns and sequences
function createPatterns() {
  // Generate the musical patterns
  const bassline = generateBassline();
  const leadline = generateLead();
  const padchords = generatePad();
  const arpeggios = generateArpeggio();
  
  // Generate the drum patterns
  const kickPattern = generateKickPattern(kickPatternSelect.value);
  const snarePattern = generateSnarePattern(snarePatternSelect.value);
  const hihatPattern = generateHihatPattern(hihatPatternSelect.value);
  const percPattern = generatePercPattern(percPatternSelect.value);
  
  // Create sequences
  bassSeq = new Tone.Sequence(
    (time, note) => {
      if (note) {
        bassSynth.triggerAttackRelease(note, '8n', time);
      }
    },
    bassline,
    '8n'
  );
  
  leadSeq = new Tone.Sequence(
    (time, note) => {
      if (note) {
        leadSynth.triggerAttackRelease(note, '4n', time);
      }
    },
    leadline,
    '8n'
  );
  
  padSeq = new Tone.Sequence(
    (time, chord) => {
      if (chord) {
        padSynth.triggerAttackRelease(chord, '2n', time);
      }
    },
    padchords,
    '8n'
  );
  
  arpSeq = new Tone.Sequence(
    (time, note) => {
      if (note) {
        arpSynth.triggerAttackRelease(note, '16n', time);
      }
    },
    arpeggios,
    '16n'
  );
  
  // Drum sequences
  kickSeq = new Tone.Sequence(
    (time, note) => {
      if (note) {
        kickSynth.triggerAttackRelease(note, '16n', time);
      }
    },
    kickPattern,
    '16n'
  );
  
  // Standard sequence for snare
  snareSeq = new Tone.Sequence(
    (time, note) => {
      if (note) {
        snareSynth.triggerAttackRelease('16n', time);
      }
    },
    snarePattern,
    '16n'
  );
  
  hihatSeq = new Tone.Sequence(
    (time, note) => {
      if (note) {
        hihatSynth.triggerAttackRelease(note, '32n', time);
      }
    },
    hihatPattern,
    '16n'
  );
  
  percSeq = new Tone.Sequence(
    (time, note) => {
      if (note) {
        percSynth.triggerAttackRelease(note, '16n', time);
      }
    },
    percPattern,
    '16n'
  );
}

// Draw visualizer
function drawVisualizer() {
  requestAnimationFrame(drawVisualizer);
  
  if (!isPlaying) return;
  
  const width = canvas.width;
  const height = canvas.height;
  const bufferLength = analyzer.getValue().length;
  const dataArray = analyzer.getValue();
  
  ctx.clearRect(0, 0, width, height);
  
  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, 'rgba(255, 0, 255, 0.2)');
  gradient.addColorStop(1, 'rgba(0, 255, 255, 0.2)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // Draw grid (synthwave sun effect)
  ctx.strokeStyle = 'rgba(255, 0, 255, 0.5)';
  ctx.lineWidth = 1;
  
  const gridSize = 20;
  const horizon = height * 0.6;
  
  ctx.beginPath();
  for (let i = 0; i < width; i += gridSize) {
    ctx.moveTo(i, 0);
    ctx.lineTo(i, height);
    
    // Perspective lines
    ctx.moveTo(i, horizon);
    ctx.lineTo(width/2, 0);
  }
  
  for (let i = horizon; i < height; i += gridSize) {
    ctx.moveTo(0, i);
    ctx.lineTo(width, i);
  }
  ctx.stroke();
  
  // Draw circular frequency visualizer
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.2;
  
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // Draw waveform around circle
  ctx.beginPath();
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgb(255, 0, 255)';
  
  for (let i = 0; i < bufferLength; i++) {
    const v = dataArray[i] * 2;
    const angle = (i / bufferLength) * Math.PI * 2;
    const x = centerX + Math.cos(angle) * (radius + v * radius);
    const y = centerY + Math.sin(angle) * (radius + v * radius);
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  
  ctx.closePath();
  ctx.stroke();
  
  // Add glow effect
  ctx.shadowBlur = 15;
  ctx.shadowColor = 'cyan';
  ctx.stroke();
  
  // Draw waveform
  ctx.beginPath();
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgb(0, 255, 255)';
  ctx.shadowColor = 'magenta';
  
  const sliceWidth = width / bufferLength;
  let x = 0;
  
  for (let i = 0; i < bufferLength; i++) {
    const v = dataArray[i] * 2;
    const y = (v * height / 2) + height / 2;
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
    
    x += sliceWidth;
  }
  
  ctx.stroke();
  
  // Reset shadow
  ctx.shadowBlur = 0;
  
  // Add beat visualization
  const currentBeat = Math.floor((Tone.Transport.ticks / Tone.Transport.PPQ) % 4);
  
  if (currentBeat !== undefined) {
    const beatSize = Math.min(width, height) * 0.03;
    const beatSpacing = beatSize * 3;
    const startX = width / 2 - ((4 * beatSize + 3 * beatSpacing) / 2);
    
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      const beatX = startX + i * (beatSize + beatSpacing);
      
      if (i === currentBeat) {
        // Current beat 
        ctx.fillStyle = 'rgb(255, 0, 255)';
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'magenta';
      } else {
        // Other beats
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.shadowBlur = 0;
      }
      
      ctx.arc(beatX, height - 30, beatSize, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.shadowBlur = 0;
  }
}

// Start/Stop music
async function startMusic() {
  if (isPlaying) return;
  
  try {
    // Explicitly resume audio context after user interaction
    if (Tone.context.state !== 'running') {
      await Tone.context.resume();
    }
    
    // User interaction is required to start audio context
    await Tone.start();
    
    // Initialize parameters
    initializeMusicParameters();
    
    // Create music patterns
    createPatterns();
    
    // Start transport and sequences
    bassSeq.start(0);
    leadSeq.start(0);
    padSeq.start(0);
    arpSeq.start(0);
    kickSeq.start(0);
    snareSeq.start(0);
    hihatSeq.start(0);
    percSeq.start(0);
    
    Tone.Transport.start();
    
    isPlaying = true;
    
    // Start visualizer
    drawVisualizer();
    
    console.log("Audio started successfully");
  } catch (error) {
    console.error("Error starting audio:", error);
    alert("Please interact with the page first (click anywhere) to allow audio playback");
  }
}

function stopMusic() {
  if (!isPlaying) return;
  
  // Stop transport and sequences
  Tone.Transport.stop();
  
  if (bassSeq) bassSeq.stop();
  if (leadSeq) leadSeq.stop();
  if (padSeq) padSeq.stop();
  if (arpSeq) arpSeq.stop();
  if (kickSeq) kickSeq.stop();
  if (snareSeq) snareSeq.stop();
  if (hihatSeq) hihatSeq.stop();
  if (percSeq) percSeq.stop();
  
  isPlaying = false;
}

// Regenerate patterns
function regeneratePatterns() {
  if (!isPlaying) {
    startMusic();
    return;
  }
  
  // Stop current sequences
  if (bassSeq) bassSeq.stop();
  if (leadSeq) leadSeq.stop();
  if (padSeq) padSeq.stop();
  if (arpSeq) arpSeq.stop();
  if (kickSeq) kickSeq.stop();
  if (snareSeq) snareSeq.stop();
  if (hihatSeq) hihatSeq.stop();
  if (percSeq) percSeq.stop();
  
  // Regenerate the chord progression
  const isMinor = currentScaleType.includes('minor') || currentScaleType === 'dorian';
  currentProgression = generateChordProgression(currentScale, isMinor);
  
  // Create new patterns
  createPatterns();
  
  // Start the new sequences (at the next measure)
  bassSeq.start('@1m');
  leadSeq.start('@1m');
  padSeq.start('@1m');
  arpSeq.start('@1m');
  kickSeq.start('@1m');
  snareSeq.start('@1m');
  hihatSeq.start('@1m');
  percSeq.start('@1m');
}

// Event listeners
startBtn.addEventListener('click', startMusic);
stopBtn.addEventListener('click', stopMusic);
regenerateBtn.addEventListener('click', regeneratePatterns);

// Tempo change
tempoSlider.addEventListener('input', () => {
  tempoValue.textContent = tempoSlider.value;
  Tone.Transport.bpm.value = parseInt(tempoSlider.value);
});

// Effects sliders
reverbSlider.addEventListener('input', updateEffects);
delaySlider.addEventListener('input', updateEffects);
chorusSlider.addEventListener('input', updateEffects);
bitcrushSlider.addEventListener('input', updateEffects);

// Synth volume sliders
bassSlider.addEventListener('input', updateSynthVolumes);
leadSlider.addEventListener('input', updateSynthVolumes);
padSlider.addEventListener('input', updateSynthVolumes);
arpSlider.addEventListener('input', updateSynthVolumes);

// Drum volume sliders
kickSlider.addEventListener('input', updateSynthVolumes);
snareSlider.addEventListener('input', updateSynthVolumes);
hihatSlider.addEventListener('input', updateSynthVolumes);
percSlider.addEventListener('input', updateSynthVolumes);

// Timbre select changes
bassTimbreSelect.addEventListener('change', () => {
  if (isPlaying) {
    bassSeq.stop();
    
    // Recreate bass synth with new timbre
    if (bassSynth) bassSynth.disconnect();
    bassSynth = createSynth(bassTimbreSelect.value);
    bassSynth.connect(bitcrusher);
    bassSynth.connect(analyzer);
    bassSynth.volume.value = mapRange(parseFloat(bassSlider.value), 0, 1, -40, 0);
    
    // Restart sequence
    bassSeq.start('@1m');
  }
});

leadTimbreSelect.addEventListener('change', () => {
  if (isPlaying) {
    leadSeq.stop();
    
    // Recreate lead synth with new timbre
    if (leadSynth) leadSynth.disconnect();
    leadSynth = createSynth(leadTimbreSelect.value);
    leadSynth.connect(bitcrusher);
    leadSynth.connect(analyzer);
    leadSynth.volume.value = mapRange(parseFloat(leadSlider.value), 0, 1, -40, 0);
    
    // Restart sequence
    leadSeq.start('@1m');
  }
});

padTimbreSelect.addEventListener('change', () => {
  if (isPlaying) {
    padSeq.stop();
    
    // Recreate pad synth with new timbre
    if (padSynth) padSynth.disconnect();
    padSynth = createSynth(padTimbreSelect.value);
    padSynth.connect(bitcrusher);
    padSynth.connect(analyzer);
    padSynth.volume.value = mapRange(parseFloat(padSlider.value), 0, 1, -40, -5);
    
    // Restart sequence
    padSeq.start('@1m');
  }
});

arpTimbreSelect.addEventListener('change', () => {
  if (isPlaying) {
    arpSeq.stop();
    
    // Recreate arp synth with new timbre
    if (arpSynth) arpSynth.disconnect();
    arpSynth = createSynth(arpTimbreSelect.value);
    arpSynth.connect(bitcrusher);
    arpSynth.connect(analyzer);
    arpSynth.volume.value = mapRange(parseFloat(arpSlider.value), 0, 1, -40, -3);
    
    // Restart sequence
    arpSeq.start('@1m');
  }
});

// Key and scale changes
keySelect.addEventListener('change', () => {
  if (isPlaying) {
    regeneratePatterns();
  }
});

scaleTypeSelect.addEventListener('change', () => {
  if (isPlaying) {
    regeneratePatterns();
  }
});

// Drum pattern changes
kickPatternSelect.addEventListener('change', () => {
  if (isPlaying) {
    kickSeq.stop();
    
    const kickPattern = generateKickPattern(kickPatternSelect.value);
    kickSeq = new Tone.Sequence(
      (time, note) => {
        if (note) {
          kickSynth.triggerAttackRelease(note, '16n', time);
        }
      },
      kickPattern,
      '16n'
    );
    
    kickSeq.start('@1m');
  }
});

snarePatternSelect.addEventListener('change', () => {
  if (isPlaying) {
    snareSeq.stop();
    
    const snarePattern = generateSnarePattern(snarePatternSelect.value);
    snareSeq = new Tone.Sequence(
      (time, note) => {
        if (note) {
          snareSynth.triggerAttackRelease(note, '16n', time);
        }
      },
      snarePattern,
      '16n'
    );
    
    snareSeq.start('@1m');
  }
});

hihatPatternSelect.addEventListener('change', () => {
  if (isPlaying) {
    hihatSeq.stop();
    
    const hihatPattern = generateHihatPattern(hihatPatternSelect.value);
    hihatSeq = new Tone.Sequence(
      (time, note) => {
        if (note) {
          hihatSynth.triggerAttackRelease(note, '32n', time);
        }
      },
      hihatPattern,
      '16n'
    );
    
    hihatSeq.start('@1m');
  }
});

percPatternSelect.addEventListener('change', () => {
  if (isPlaying) {
    percSeq.stop();
    
    const percPattern = generatePercPattern(percPatternSelect.value);
    percSeq = new Tone.Sequence(
      (time, note) => {
        if (note) {
          percSynth.triggerAttackRelease(note, '16n', time);
        }
      },
      percPattern,
      '16n'
    );
    
    percSeq.start('@1m');
  }
});

// Initialize the app
window.addEventListener('load', () => {
  setupCanvas();
  
  // Add a click handler to the document to resume AudioContext
  document.addEventListener('click', async () => {
    if (Tone.context.state !== 'running') {
      try {
        await Tone.context.resume();
        console.log("AudioContext resumed after user interaction");
      } catch (error) {
        console.error("Error resuming AudioContext:", error);
      }
    }
  }, { once: true });
  
  // Also display instructions to the user
  const instructions = document.createElement('div');
  instructions.style.position = 'absolute';
  instructions.style.top = '50%';
  instructions.style.left = '50%';
  instructions.style.transform = 'translate(-50%, -50%)';
  instructions.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
  instructions.style.color = '#fff';
  instructions.style.padding = '20px';
  instructions.style.borderRadius = '10px';
  instructions.style.fontSize = '18px';
  instructions.style.textAlign = 'center';
  instructions.style.zIndex = '1000';
  instructions.style.maxWidth = '80%';
  instructions.style.boxShadow = '0 0 20px rgba(255, 0, 255, 0.5)';
  instructions.innerHTML = '<h3>Click anywhere to enable audio</h3><p>Modern browsers require user interaction before playing audio.</p>';
  document.body.appendChild(instructions);
  
  // Remove the instructions after click
  document.addEventListener('click', () => {
    if (instructions.parentNode) {
      instructions.parentNode.removeChild(instructions);
    }
  }, { once: true });
});