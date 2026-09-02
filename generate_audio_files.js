const fs = require('fs');
const path = require('path');

// Helper to write 16-bit PCM WAV file
function createWavBuffer(samples, sampleRate = 44100) {
  const numChannels = 1;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF identifier
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt sub-chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20);  // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // BitsPerSample

  // data sub-chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Write audio samples
  for (let i = 0; i < samples.length; i++) {
    let s = Math.max(-1, Math.min(1, samples[i]));
    let val = s < 0 ? s * 32768 : s * 32767;
    buffer.writeInt16LE(Math.floor(val), 44 + i * 2);
  }

  return buffer;
}

// Generate Tone with attack-decay-sustain-release envelope
function generateTone(freq, duration, sampleRate = 44100, type = 'sine', volume = 0.6) {
  const numSamples = Math.floor(duration * sampleRate);
  const samples = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let wave = 0;

    if (type === 'sine') {
      wave = Math.sin(2 * Math.PI * freq * t) + 0.3 * Math.sin(4 * Math.PI * freq * t);
    } else if (type === 'triangle') {
      wave = Math.asin(Math.sin(2 * Math.PI * freq * t)) * (2 / Math.PI) + 0.25 * Math.sin(4 * Math.PI * freq * t);
    } else if (type === 'bell') {
      wave = Math.sin(2 * Math.PI * freq * t) * Math.exp(-2.5 * t) +
             0.5 * Math.sin(2 * Math.PI * freq * 2.76 * t) * Math.exp(-3.5 * t) +
             0.3 * Math.sin(2 * Math.PI * freq * 5.4 * t) * Math.exp(-4.5 * t);
    } else if (type === 'horn') {
      wave = 0.6 * Math.sin(2 * Math.PI * freq * t) +
             0.3 * Math.sin(4 * Math.PI * freq * t) +
             0.2 * Math.sin(6 * Math.PI * freq * t);
    }

    // Envelope
    let env = 1;
    const attack = 0.04;
    const release = Math.max(0.1, duration * 0.4);
    if (t < attack) {
      env = t / attack;
    } else if (t > duration - release) {
      env = (duration - t) / release;
    }

    samples[i] = wave * env * volume;
  }
  return samples;
}

// Concatenate multiple sample arrays
function concatSamples(arrays) {
  let totalLength = arrays.reduce((sum, a) => sum + a.length, 0);
  let result = new Float32Array(totalLength);
  let offset = 0;
  for (let a of arrays) {
    result.set(a, offset);
    offset += a.length;
  }
  return result;
}

// Generate Silence
function generateSilence(duration, sampleRate = 44100) {
  return new Float32Array(Math.floor(duration * sampleRate));
}

// Generate Formant Voice-like Melodic Cadence (Voice announcement simulator)
function generateVoiceAlertTune(lang = 'hindi') {
  const sr = 44100;
  const silenceShort = generateSilence(0.12, sr);
  const silenceMed = generateSilence(0.3, sr);

  // 1. Signature Municipal Chime: C5 -> E5 -> G5 -> C6
  const chime1 = generateTone(523.25, 0.25, sr, 'triangle', 0.65);
  const chime2 = generateTone(659.25, 0.25, sr, 'triangle', 0.65);
  const chime3 = generateTone(783.99, 0.32, sr, 'triangle', 0.7);
  const chime4 = generateTone(1046.50, 0.7, sr, 'bell', 0.85);

  const signatureJingle = concatSamples([chime1, chime2, chime3, chime4, silenceMed]);

  // 2. Multi-tone vocal voice cadence ("Gadiwala Aaya Ghar Se Kachra Nikal")
  let vocalNotes = [];
  if (lang === 'hindi') {
    // "Ga-di-wa-la Aa-ya ... Ghar se kach-ra ni-kal"
    const notes = [
      { f: 440, d: 0.22 }, { f: 493.88, d: 0.22 }, { f: 523.25, d: 0.35 }, { f: 440, d: 0.4 }, // Gadiwala Aaya
      { f: 392, d: 0.2 }, { f: 440, d: 0.2 }, { f: 493.88, d: 0.25 }, { f: 523.25, d: 0.5 }, // Pune Mahanagarpalika
      { f: 587.33, d: 0.3 }, { f: 659.25, d: 0.3 }, { f: 523.25, d: 0.6 } // Kachra Gadi
    ];
    vocalNotes = notes.map(n => generateTone(n.f, n.d, sr, 'bell', 0.6));
  } else if (lang === 'marathi') {
    // "Laksha dya nagarik ... Kachra Gadi aali aahe"
    const notes = [
      { f: 523.25, d: 0.28 }, { f: 587.33, d: 0.28 }, { f: 659.25, d: 0.4 }, // Laksha dya
      { f: 523.25, d: 0.22 }, { f: 440, d: 0.22 }, { f: 493.88, d: 0.3 }, { f: 523.25, d: 0.55 }, // Kachra Gadi
      { f: 659.25, d: 0.35 }, { f: 783.99, d: 0.6 } // Aali Aahe
    ];
    vocalNotes = notes.map(n => generateTone(n.f, n.d, sr, 'bell', 0.6));
  } else {
    // English: "Attention resident ... Waste truck is arriving"
    const notes = [
      { f: 587.33, d: 0.25 }, { f: 659.25, d: 0.25 }, { f: 783.99, d: 0.4 }, // Attention
      { f: 659.25, d: 0.22 }, { f: 523.25, d: 0.25 }, { f: 587.33, d: 0.5 }, // Waste Truck
      { f: 523.25, d: 0.3 }, { f: 659.25, d: 0.6 } // Arriving
    ];
    vocalNotes = notes.map(n => generateTone(n.f, n.d, sr, 'bell', 0.6));
  }

  return concatSamples([signatureJingle, ...vocalNotes, silenceShort]);
}

const audioDir = path.join(__dirname, 'audio');
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

// 1. Swachh Bharat 4-Note Chime
const swachhChime = concatSamples([
  generateTone(523.25, 0.28, 44100, 'triangle', 0.7),
  generateTone(659.25, 0.28, 44100, 'triangle', 0.7),
  generateTone(783.99, 0.35, 44100, 'triangle', 0.75),
  generateTone(1046.50, 0.9, 44100, 'bell', 0.9)
]);
fs.writeFileSync(path.join(audioDir, 'swachh_bharat_chime.wav'), createWavBuffer(swachhChime));

// 2. Doorbell Ding-Dong
const doorbellChime = concatSamples([
  generateTone(659.25, 0.45, 44100, 'bell', 0.8),
  generateSilence(0.08, 44100),
  generateTone(523.25, 0.75, 44100, 'bell', 0.85)
]);
fs.writeFileSync(path.join(audioDir, 'doorstep_bell_chime.wav'), createWavBuffer(doorbellChime));

// 3. Eco Horn Fanfare
const ecoHorn = concatSamples([
  generateTone(440.00, 0.22, 44100, 'horn', 0.7),
  generateTone(554.37, 0.22, 44100, 'horn', 0.7),
  generateTone(659.25, 0.6, 44100, 'horn', 0.8)
]);
fs.writeFileSync(path.join(audioDir, 'eco_horn_chime.wav'), createWavBuffer(ecoHorn));

// 4. Full Voice Announcement Tracks (Melody + Voice Jingle)
fs.writeFileSync(path.join(audioDir, 'voice_alert_hindi.wav'), createWavBuffer(generateVoiceAlertTune('hindi')));
fs.writeFileSync(path.join(audioDir, 'voice_alert_marathi.wav'), createWavBuffer(generateVoiceAlertTune('marathi')));
fs.writeFileSync(path.join(audioDir, 'voice_alert_english.wav'), createWavBuffer(generateVoiceAlertTune('english')));

console.log('✓ All municipal voice & chime audio files successfully generated in /audio directory!');
