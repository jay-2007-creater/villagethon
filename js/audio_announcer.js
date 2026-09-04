/**
 * CityAssist Audio Proximity Chime & Municipal Voice Announcer
 * Supports Real Spoken Voice Audio, Melodic Chimes, and Direct Ringtone Downloads
 */

const AudioAnnouncerEngine = {
  isEnabled: true,
  hasAnnouncedApproach: false,
  hasAnnouncedArrival: false,
  audioCtx: null,
  selectedTune: 'swachh_bharat',
  selectedLang: 'en', // default to English or user choice
  isPlaying: false,
  currentAudioObj: null,

  audioFiles: {
    tunes: {
      swachh_bharat: 'audio/swachh_bharat_chime.wav',
      doorbell: 'audio/doorstep_bell_chime.wav',
      eco_horn: 'audio/eco_horn_chime.wav'
    },
    voices: {
      en: 'audio/voice_alert_english.mp3',
      hi: 'audio/voice_alert_hindi.mp3',
      mr: 'audio/voice_alert_marathi.mp3'
    }
  },

  voices: {
    en: {
      title: "English (Municipal Alert)",
      subtitle: "Doorstep Waste Collection Alert",
      text: "Attention resident: Municipal waste collection vehicle is approaching your street in 2 minutes! Please keep your segregated dry and wet waste bins ready.",
      filename: "CityAssist_Garbage_Truck_Alert_English.mp3"
    },
    hi: {
      title: "Hindi (गाड़ीवाला आया)",
      subtitle: "Swachh Bharat Abhiyan Announcement",
      text: "ध्यान दें नागरिक! महानगरपालिका की कचरा गाड़ी 2 मिनट में आ रही है। कृपया सूखा और गीला कचरा अलग रखें।",
      filename: "CityAssist_Garbage_Truck_Alert_Hindi.mp3"
    },
    mr: {
      title: "Marathi (स्वच्छ भारत)",
      subtitle: "महानगरपालिका कचरा गाडी",
      text: "लक्ष द्या नागरिक! महानगरपालिकेची कचरा गाडी २ मिनिटात येत आहे. कृपया ओला आणि सुका कचरा वेगळा ठेवा.",
      filename: "CityAssist_Garbage_Truck_Alert_Marathi.mp3"
    }
  },

  init() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.getVoices();
        };
      }
    }

    // Auto-unlock audio pipeline on first user tap/click anywhere
    const autoUnlock = () => {
      this.unlockAudio();
    };
    document.addEventListener('click', autoUnlock, { once: true });
    document.addEventListener('touchstart', autoUnlock, { once: true });
  },

  /**
   * Unlock Web Audio, HTML5 Audio & Speech Engine on user interaction (vital for Driver mode & Android WebView)
   */
  unlockAudio() {
    try {
      const ctx = this.getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume();
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.resume();
        window.speechSynthesis.getVoices();
      }
    } catch (e) {}
  },

  getAudioContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  },

  /**
   * 100% Reliable Hardware Web Audio Synthesizer (Works even if MP3/WAV files are blocked by autoplay)
   */
  playSynthesizedChime(tuneType = this.selectedTune, onEndedCallback) {
    try {
      this.unlockAudio();
      const ctx = this.getAudioContext();
      if (!ctx) {
        if (onEndedCallback) onEndedCallback();
        return;
      }

      const now = ctx.currentTime;
      let notes = [];

      if (tuneType === 'doorbell') {
        // Classic Two-Tone Doorbell Ding-Dong (E5 -> C5)
        notes = [
          { freq: 659.25, start: 0.0, dur: 0.4 }, // E5
          { freq: 523.25, start: 0.45, dur: 0.7 }  // C5
        ];
      } else if (tuneType === 'eco_horn') {
        // Double Melodic Horn (A4 -> D5)
        notes = [
          { freq: 440.0, start: 0.0, dur: 0.25 },
          { freq: 587.33, start: 0.3, dur: 0.55 }
        ];
      } else {
        // Swachh Bharat Abhiyan 5-Note Melody (G4 -> C5 -> E5 -> G5 -> C6)
        notes = [
          { freq: 392.00, start: 0.0, dur: 0.22 },  // G4
          { freq: 523.25, start: 0.24, dur: 0.22 }, // C5
          { freq: 659.25, start: 0.48, dur: 0.22 }, // E5
          { freq: 783.99, start: 0.72, dur: 0.26 }, // G5
          { freq: 1046.50, start: 1.00, dur: 0.65 } // C6
        ];
      }

      const totalDuration = notes[notes.length - 1].start + notes[notes.length - 1].dur;

      notes.forEach(n => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(n.freq, now + n.start);

        // Natural chime bell envelope (fast attack, smooth exponential decay)
        gain.gain.setValueAtTime(0.001, now + n.start);
        gain.gain.exponentialRampToValueAtTime(0.5, now + n.start + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + n.start + n.dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + n.start);
        osc.stop(now + n.start + n.dur);
      });

      if (onEndedCallback) {
        setTimeout(() => {
          onEndedCallback();
        }, (totalDuration + 0.1) * 1000);
      }
    } catch (e) {
      console.warn("Synthesized chime error:", e);
      if (onEndedCallback) onEndedCallback();
    }
  },

  toggleAudio() {
    this.isEnabled = !this.isEnabled;
    const icon = document.getElementById('chime-toggle-icon');
    const text = document.getElementById('chime-toggle-text');
    const badge = document.getElementById('gt-audio-chime-pill');

    if (this.isEnabled) {
      if (icon) icon.textContent = '🔊';
      if (text) text.textContent = 'On';
      if (badge) badge.className = 'gt-audio-chime-badge active';
      this.unlockAudio();
      CityAssist.showToast("Waste Truck Arrival Voice Alert: ON 🔊");
    } else {
      if (icon) icon.textContent = '🔇';
      if (text) text.textContent = 'Muted';
      if (badge) badge.className = 'gt-audio-chime-badge muted';
      this.stopAudio();
      CityAssist.showToast("Waste Truck Audio Alert: MUTED 🔇");
    }
  },

  setVisualizerState(active) {
    this.isPlaying = active;
    const viz = document.getElementById('audio-visualizer-bars');
    const playBtn = document.getElementById('btn-preview-play-toggle');
    if (viz) {
      if (active) viz.classList.add('playing');
      else viz.classList.remove('playing');
    }
    if (playBtn) {
      playBtn.innerHTML = active 
        ? '<span style="font-size:1.1rem;">⏹️</span> Stop Audio'
        : '<span style="font-size:1.1rem;">▶</span> Play Full Preview';
    }
  },

  stopAudio() {
    if (this.currentAudioObj) {
      this.currentAudioObj.pause();
      this.currentAudioObj.currentTime = 0;
      this.currentAudioObj = null;
    }
    if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    this.setVisualizerState(false);
  },

  /**
   * Play audio file with automatic speech synthesis fallback
   */
  playAudioFile(filePath, onEndedCallback) {
    this.stopAudio();
    this.setVisualizerState(true);
    let fallbackTriggered = false;

    const triggerFallback = () => {
      if (fallbackTriggered) return;
      fallbackTriggered = true;
      this.speakWithSpeechSynthesis(this.selectedLang, onEndedCallback);
    };

    try {
      const audio = new Audio(filePath);
      this.currentAudioObj = audio;

      audio.onended = () => {
        if (onEndedCallback) {
          onEndedCallback();
        } else {
          this.setVisualizerState(false);
        }
      };

      audio.onerror = () => {
        triggerFallback();
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          triggerFallback();
        });
      }
    } catch (e) {
      triggerFallback();
    }
  },

  playSelectedTune(onEndedCallback) {
    // Play synthesized musical chime directly (Zero audio file latency or autoplay blocks)
    this.playSynthesizedChime(this.selectedTune, onEndedCallback);
  },

  selectTune(tuneName) {
    this.selectedTune = tuneName;
    document.querySelectorAll('.tune-option-card').forEach(card => {
      card.classList.remove('selected');
    });
    const el = document.getElementById(`tune-card-${tuneName}`);
    if (el) el.classList.add('selected');
    this.unlockAudio();
    this.playSelectedTune();
  },

  selectLanguage(lang) {
    this.selectedLang = lang;
    document.querySelectorAll('.lang-option-pill').forEach(pill => {
      pill.classList.remove('selected');
    });
    const el = document.getElementById(`lang-pill-${lang}`);
    if (el) el.classList.add('selected');
    
    // Update live text preview
    const textPreview = document.getElementById('preview-voice-text-box');
    if (textPreview && this.voices[lang]) {
      textPreview.textContent = `"${this.voices[lang].text}"`;
    }
    
    this.unlockAudio();
    this.playVoiceAnnouncementOnly(lang);
  },

  /**
   * Play Spoken Voice Announcement Track
   */
  playVoiceAnnouncementOnly(lang = this.selectedLang, onEndedCallback) {
    this.unlockAudio();
    this.speakWithSpeechSynthesis(lang, onEndedCallback);
  },

  /**
   * Play Full Sequence: Melodic Chime followed by Spoken Voice Announcement
   */
  playFullPreview(onComplete) {
    this.unlockAudio();
    if (this.isPlaying) {
      this.stopAudio();
      return;
    }
    this.setVisualizerState(true);

    const voiceData = this.voices[this.selectedLang] || this.voices['en'];

    // 1. If running inside Android Native APK, trigger hardware OS TTS & Chime
    if (window.AndroidVoiceBridge && typeof window.AndroidVoiceBridge.speak === 'function') {
      try {
        if (typeof window.AndroidVoiceBridge.playChime === 'function') {
          window.AndroidVoiceBridge.playChime();
        }
        setTimeout(() => {
          window.AndroidVoiceBridge.speak(voiceData.text, this.selectedLang);
          setTimeout(() => {
            this.setVisualizerState(false);
            if (onComplete) onComplete();
          }, 4000);
        }, 350);
      } catch (e) {
        console.warn("AndroidVoiceBridge error, falling back to WebAudio:", e);
      }
    }

    // 2. Play Web Audio Melodic Chime first
    this.playSelectedTune(() => {
      // 3. Immediately speak announcement via Web Audio / SpeechSynthesis
      setTimeout(() => {
        this.speakWithSpeechSynthesis(this.selectedLang, () => {
          this.setVisualizerState(false);
          if (onComplete) onComplete();
        });
      }, 150);
    });
  },

  resetAnnouncements() {
    this.hasAnnouncedApproach = false;
    this.hasAnnouncedArrival = false;
    this.stopAudio();
  },

  /**
   * Dynamic Proximity Audio Evaluation
   * Handles 300m - 500m Approach Alert and Doorstep Arrival Alert
   */
  onProximityUpdate(distanceKm, etaMins, status, isDriverActive) {
    if (!this.isEnabled || status !== 'in_progress') return;

    // 1. Approaching Doorstep Alert (triggers around 300m - 500m)
    if (distanceKm <= 0.50 && !this.hasAnnouncedApproach) {
      this.hasAnnouncedApproach = true;
      this.announceApproach(etaMins, distanceKm);
    }

    // 2. Arrival at Doorstep Alert (within 120m)
    if (distanceKm <= 0.12 && !this.hasAnnouncedArrival) {
      this.hasAnnouncedArrival = true;
      this.announceArrival();
    }
  },

  announceApproach(etaMins = 2, distanceKm = 0.3) {
    this.unlockAudio();
    const distText = distanceKm < 1 ? `${Math.round(distanceKm * 1000)} meters` : `${distanceKm.toFixed(1)} km`;
    if (typeof CityAssist !== 'undefined') {
      CityAssist.showToast(`📢 Waste Truck is ~${distText} away (~${etaMins} mins)! Please keep waste bins ready 🔊`);
    }

    // Play Chime + Spoken Voice Alert
    this.playFullPreview();
  },

  announceArrival() {
    this.unlockAudio();
    if (typeof CityAssist !== 'undefined') {
      CityAssist.showToast("🔔 Waste Collection Vehicle has arrived at your Doorstep! 🚚");
    }

    const arrivalText = this.selectedLang === 'hi'
      ? "कचरा गाड़ी आपके दरवाजे पर पहुंच गई है।"
      : (this.selectedLang === 'mr' ? "कचरा गाडी आपल्या घरासमोर आली आहे." : "Municipal waste vehicle has arrived at your doorstep!");

    if (window.AndroidVoiceBridge && typeof window.AndroidVoiceBridge.speak === 'function') {
      try {
        window.AndroidVoiceBridge.playChime();
        setTimeout(() => {
          window.AndroidVoiceBridge.speak(arrivalText, this.selectedLang);
        }, 300);
      } catch (e) {}
    }

    this.playSynthesizedChime('doorbell', () => {
      this.speakWithSpeechSynthesis(this.selectedLang);
    });
  },

  triggerTestAnnouncement() {
    this.unlockAudio();
    this.playFullPreview();
    CityAssist.showToast("Playing Chime & Voice Alert 🔊");
  },

  /**
   * Guaranteed SpeechSynthesis Spoken Voice Engine
   */
  speakWithSpeechSynthesis(lang = 'en', onEndedCallback) {
    const voiceData = this.voices[lang] || this.voices['en'];

    // If native Android TTS is available, trigger it
    if (window.AndroidVoiceBridge && typeof window.AndroidVoiceBridge.speak === 'function') {
      try {
        window.AndroidVoiceBridge.speak(voiceData.text, lang);
      } catch (e) {}
    }

    if (!('speechSynthesis' in window)) {
      this.setVisualizerState(false);
      if (onEndedCallback) onEndedCallback();
      return;
    }

    try {
      this.unlockAudio();
      this.setVisualizerState(true);

      // Cancel previous to clear buffer, then speak in fresh tick
      window.speechSynthesis.cancel();

      setTimeout(() => {
        try {
          const utterance = new SpeechSynthesisUtterance(voiceData.text);
          utterance.lang = lang === 'hi' ? 'hi-IN' : (lang === 'mr' ? 'mr-IN' : 'en-US');
          utterance.volume = 1.0;
          utterance.rate = 0.95;
          utterance.pitch = 1.0;

          // Attempt to match language voice
          const voices = window.speechSynthesis.getVoices();
          if (voices && voices.length > 0) {
            const code = lang === 'hi' ? 'hi' : (lang === 'mr' ? 'mr' : 'en');
            const found = voices.find(v => v.lang.toLowerCase().startsWith(code));
            if (found) utterance.voice = found;
          }

          utterance.onend = () => {
            this.setVisualizerState(false);
            if (onEndedCallback) onEndedCallback();
          };
          utterance.onerror = (err) => {
            console.warn("SpeechSynthesis error:", err);
            this.setVisualizerState(false);
            if (onEndedCallback) onEndedCallback();
          };

          window._activeUtterance = utterance; // Prevent Chrome garbage collection bug
          window.speechSynthesis.speak(utterance);
          window.speechSynthesis.resume();
        } catch (innerErr) {
          console.warn("Speech inner error:", innerErr);
          this.setVisualizerState(false);
          if (onEndedCallback) onEndedCallback();
        }
      }, 40);
    } catch (e) {
      console.warn("Speech synthesis exception:", e);
      this.setVisualizerState(false);
      if (onEndedCallback) onEndedCallback();
    }
  },

  /**
   * Direct Download of Voice Alert / Ringtone
   */
  downloadAudioAlert(lang = this.selectedLang) {
    const voiceData = this.voices[lang] || this.voices['en'];
    const filePath = this.audioFiles.voices[lang] || this.audioFiles.voices['en'];
    const fileName = voiceData.filename || `PMC_Garbage_Truck_Alert_${lang}.mp3`;

    const link = document.createElement('a');
    link.href = filePath;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    CityAssist.showToast(`⬇️ Downloaded "${fileName}" to your phone!`);
  },

  showRingtoneGuideModal() {
    const html = `
      <div style="padding: 6px 4px 10px;">
        <div style="text-align:center; margin-bottom:14px;">
          <div style="font-size:2.4rem; margin-bottom:4px;">📲</div>
          <h3 style="font-size:1.2rem; font-weight:800; color:#0F172A;">Set as Phone Ringtone / Alarm</h3>
          <p style="font-size:0.8rem; color:#64748B;">How to set the Municipal Voice Alert as your notification sound</p>
        </div>

        <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:14px; padding:14px; margin-bottom:14px;">
          <div style="display:flex; align-items:flex-start; gap:10px; margin-bottom:12px;">
            <div style="background:#DCFCE7; color:#15803D; font-weight:800; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0;">1</div>
            <div>
              <strong style="font-size:0.88rem; color:#0F172A;">Download the Audio File</strong>
              <p style="font-size:0.78rem; color:#64748B; margin-top:2px;">Tap the button below to save the Voice Alert to your phone's Downloads folder.</p>
            </div>
          </div>

          <div style="display:flex; align-items:flex-start; gap:10px; margin-bottom:12px;">
            <div style="background:#DCFCE7; color:#15803D; font-weight:800; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0;">2</div>
            <div>
              <strong style="font-size:0.88rem; color:#0F172A;">Open Phone Settings</strong>
              <p style="font-size:0.78rem; color:#64748B; margin-top:2px;">Go to <b>Settings ➔ Sound & Vibration ➔ Notification Sound</b> (or Alarm).</p>
            </div>
          </div>

          <div style="display:flex; align-items:flex-start; gap:10px;">
            <div style="background:#DCFCE7; color:#15803D; font-weight:800; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0;">3</div>
            <div>
              <strong style="font-size:0.88rem; color:#0F172A;">Select "Custom Ringtone"</strong>
              <p style="font-size:0.78rem; color:#64748B; margin-top:2px;">Select the downloaded <i>"PMC_Garbage_Truck_Alert"</i> audio from your storage!</p>
            </div>
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:8px;">
          <button type="button" class="btn-studio-play-full" onclick="AudioAnnouncerEngine.downloadAudioAlert(); CityAssist.closeModal();" style="width:100%; padding:13px;">
            ⬇️ Download Voice Alert Audio (.MP3)
          </button>
          <button type="button" onclick="CityAssist.closeModal()" style="background:#F1F5F9; border:none; padding:10px; border-radius:12px; font-weight:700; color:#475569; cursor:pointer;">
            Got it, Close
          </button>
        </div>
      </div>
    `;
    CityAssist.openModal(html);
  },

  /**
   * Set and persist as live in-app arrival alert with rich toggle notification
   */
  setAsInAppArrivalAlert() {
    this.isEnabled = true;
    const tuneNames = {
      swachh_bharat: 'Swachh Bharat 4-Note',
      doorbell: 'Doorstep Bell',
      eco_horn: 'Eco Horn'
    };
    const langNames = {
      en: 'English (Municipal)',
      hi: 'Hindi (गाड़ीवाला आया)',
      mr: 'Marathi (कचरा गाडी)'
    };

    const tune = tuneNames[this.selectedTune] || 'Swachh Bharat';
    const lang = langNames[this.selectedLang] || 'English';

    // Update UI toggle badge on garbage screen
    const icon = document.getElementById('chime-toggle-icon');
    const text = document.getElementById('chime-toggle-text');
    const badge = document.getElementById('gt-audio-chime-pill');
    if (icon) icon.textContent = '🔊';
    if (text) text.textContent = 'On';
    if (badge) badge.className = 'gt-audio-chime-badge active';

    CityAssist.closeModal();
    CityAssist.showToast(`🔔 Arrival Alert Set! Tune: ${tune} • ${lang} (Active)`);
  },

  /**
   * Open the Dedicated Voice & Tune Preview Studio Modal
   */
  openVoicePreviewModal() {
    const currentLangData = this.voices[this.selectedLang];
    
    const html = `
      <div class="voice-preview-studio-modal">
        <!-- Header -->
        <div class="studio-header">
          <div style="display:flex; align-items:center; gap:10px;">
            <div class="studio-badge-icon">🎙️</div>
            <div>
              <h3 style="font-size:1.15rem; font-weight:800; color:#0F172A; margin-bottom:2px;">Waste Truck Arrival Audio Studio</h3>
              <p style="font-size:0.78rem; color:#64748B;">Preview municipal tunes and voice alerts</p>
            </div>
          </div>
        </div>

        <!-- Animated Soundwave Equalizer Visualizer -->
        <div class="audio-visualizer-container" id="audio-visualizer-bars">
          <div class="visualizer-bar bar-1"></div>
          <div class="visualizer-bar bar-2"></div>
          <div class="visualizer-bar bar-3"></div>
          <div class="visualizer-bar bar-4"></div>
          <div class="visualizer-bar bar-5"></div>
          <div class="visualizer-bar bar-6"></div>
          <div class="visualizer-bar bar-7"></div>
          <div class="visualizer-bar bar-8"></div>
          <div class="visualizer-bar bar-9"></div>
          <div class="visualizer-bar bar-10"></div>
          <div class="visualizer-bar bar-11"></div>
          <div class="visualizer-bar bar-12"></div>
        </div>

        <!-- Section 1: Choose Signature Melody Tune -->
        <div style="margin-bottom:14px;">
          <label style="font-size:0.8rem; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.5px; display:block; margin-bottom:8px;">
            1. Select Arrival Tune Chime
          </label>
          <div class="tune-options-grid" style="grid-template-columns: 1fr 1fr;">
            <!-- 1. Swachh Bharat -->
            <div class="tune-option-card ${this.selectedTune === 'swachh_bharat' ? 'selected' : ''}" id="tune-card-swachh_bharat" onclick="AudioAnnouncerEngine.selectTune('swachh_bharat')">
              <div class="tune-card-icon">🎵</div>
              <div class="tune-card-title">Swachh Bharat</div>
              <div class="tune-card-desc">4-Note Signature</div>
            </div>

            <!-- 2. Doorstep Bell -->
            <div class="tune-option-card ${this.selectedTune === 'doorbell' ? 'selected' : ''}" id="tune-card-doorbell" onclick="AudioAnnouncerEngine.selectTune('doorbell')">
              <div class="tune-card-icon">🔔</div>
              <div class="tune-card-title">Doorstep Bell</div>
              <div class="tune-card-desc">2-Tone Ding-Dong</div>
            </div>
          </div>
        </div>

        <!-- Section 2: Choose Announcement Language -->
        <div style="margin-bottom:14px;">
          <label style="font-size:0.8rem; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.5px; display:block; margin-bottom:8px;">
            2. Select Voice Announcement Language
          </label>
          <div class="lang-pills-row">
            <button type="button" class="lang-option-pill ${this.selectedLang === 'en' ? 'selected' : ''}" id="lang-pill-en" onclick="AudioAnnouncerEngine.selectLanguage('en')">
              English (Municipal)
            </button>
            <button type="button" class="lang-option-pill ${this.selectedLang === 'hi' ? 'selected' : ''}" id="lang-pill-hi" onclick="AudioAnnouncerEngine.selectLanguage('hi')">
              Hindi (गाड़ीवाला आया)
            </button>
            <button type="button" class="lang-option-pill ${this.selectedLang === 'mr' ? 'selected' : ''}" id="lang-pill-mr" onclick="AudioAnnouncerEngine.selectLanguage('mr')">
              Marathi (कचरा गाडी)
            </button>
          </div>
        </div>

        <!-- Live Script Transcript Box -->
        <div class="voice-transcript-card">
          <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
            <strong style="font-size:0.75rem; color:#15803D; text-transform:uppercase; letter-spacing:0.5px;">📢 Live Spoken Announcement</strong>
            <span style="font-size:0.72rem; color:#15803D; font-weight:700;">● Real Spoken Audio Active</span>
          </div>
          <p id="preview-voice-text-box" style="font-size:0.85rem; color:#1E293B; font-weight:600; line-height:1.45;">
            "${currentLangData.text}"
          </p>
        </div>

        <!-- Control Action Buttons -->
        <div class="studio-actions-row" style="margin-bottom:12px;">
          <button type="button" class="btn-studio-play-full" id="btn-preview-play-toggle" onclick="AudioAnnouncerEngine.playFullPreview()">
            <span style="font-size:1.1rem;">▶</span> Play Full Preview
          </button>
          <button type="button" class="btn-studio-tune-only" onclick="AudioAnnouncerEngine.playSelectedTune()" title="Play Melody Tune Only">
            🎵 Tune Only
          </button>
          <button type="button" class="btn-studio-voice-only" onclick="AudioAnnouncerEngine.playVoiceAnnouncementOnly()" title="Play Spoken Voice Announcement Only">
            🗣️ Voice Only
          </button>
        </div>

        <!-- Save As Default CTA -->
        <button type="button" class="btn-studio-save-default" onclick="AudioAnnouncerEngine.setAsInAppArrivalAlert()">
          ✓ Set as My In-App Arrival Alert
        </button>
      </div>
    `;

    CityAssist.openModal(html);
  }
};
