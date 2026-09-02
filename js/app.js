/**
 * CityAssist - Application Controller & Router
 */

const CityAssist = {
  currentScreen: 'home',
  previousScreen: 'home',
  currentFilter: 'in_progress',
  selectedEmergencyType: 'Water Leakage',
  selectedIssueType: 'Illegal Dumping',
  uploadedPhotos: [],

  init() {
    this.loadSavedAddresses();
    this.loadSavedProfile();
    this.bindEvents();
    this.renderRequestsList();
    this.syncActiveAddressUI();
    if (typeof AuthEngine !== 'undefined') {
      AuthEngine.restoreSession();
    }
    this.navigateTo('home');
  },

  bindEvents() {
    // Desktop presentation bar quick buttons
    document.querySelectorAll('.nav-shortcut-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const screen = e.target.dataset.screen;
        if (screen === 'drawer') {
          this.openDrawer();
        } else {
          this.navigateTo(screen);
        }
      });
    });

    // Frame toggle
    const toggleBtn = document.getElementById('toggle-frame-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('fullscreen-mode');
        const isFullscreen = document.body.classList.contains('fullscreen-mode');
        toggleBtn.textContent = isFullscreen ? '📱 Phone View' : '📱 Frame Mode';
      });
    }
  },

  historyStack: ['home'],

  navigateTo(screenId) {
    if (!screenId) screenId = 'home';

    // Close overlays
    this.closeDrawer();
    this.closeModal();

    if (this.currentScreen !== screenId) {
      this.previousScreen = this.currentScreen;
      this.currentScreen = screenId;
      if (this.historyStack[this.historyStack.length - 1] !== screenId) {
        this.historyStack.push(screenId);
      }
    }

    // Update screen views
    document.querySelectorAll('.screen-view').forEach(view => {
      view.classList.remove('active');
    });

    const targetView = document.getElementById(`screen-${screenId}`);
    if (targetView) {
      targetView.classList.add('active');
      const scroller = targetView.querySelector('.screen-content');
      if (scroller) scroller.scrollTop = 0;
    }

    // Hide or Show Bottom Tab Bar on Auth & Fullscreen Screens
    const bottomBars = document.querySelectorAll('.bottom-tab-bar, .bottom-navigation-bar');
    const isAuthOrFs = screenId.startsWith('auth-') || screenId === 'fullscreen-map';
    bottomBars.forEach(bar => {
      bar.style.display = isAuthOrFs ? 'none' : 'flex';
    });

    // Update bottom nav tab state
    document.querySelectorAll('.nav-tab-item').forEach(tab => {
      tab.classList.remove('active');
      const tabName = tab.dataset.tab;
      if (
        (screenId === 'profile' && tabName === 'profile') ||
        (screenId === 'home' && tabName === 'home') ||
        (screenId === 'garbage' && tabName === 'garbage') ||
        (screenId === 'services' && tabName === 'services') ||
        (screenId === 'my-requests' && tabName === 'services') ||
        (screenId === 'community' && tabName === 'community')
      ) {
        tab.classList.add('active');
      }
    });

    // Update desktop presentation header shortcut buttons
    document.querySelectorAll('.nav-shortcut-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.screen === screenId) {
        btn.classList.add('active');
      }
    });

    // Auto-mount Leaflet interactive map on Garbage, Driver HUD, and Report an Issue screens
    if (screenId === 'garbage') {
      if (typeof GPSTrackerEngine !== 'undefined') {
        GPSTrackerEngine.renderCitizenStopsUI();
      }
      if (typeof LeafletMapEngine !== 'undefined') {
        setTimeout(() => LeafletMapEngine.initCitizenMap(), 150);
      }
    } else if (screenId === 'driver') {
      if (typeof GPSTrackerEngine !== 'undefined') {
        GPSTrackerEngine.renderDriverStopsUI();
      }
      if (typeof LeafletMapEngine !== 'undefined') {
        setTimeout(() => LeafletMapEngine.initDriverMap(), 150);
      }
    } else if (screenId === 'report-issue' && typeof LeafletMapEngine !== 'undefined') {
      setTimeout(() => LeafletMapEngine.initReportMap(), 150);
    }
  },

  navigateBack() {
    this.closeDrawer();
    this.closeModal();
    if (this.historyStack.length > 1) {
      this.historyStack.pop();
      const prev = this.historyStack[this.historyStack.length - 1];
      this.navigateTo(prev);
    } else {
      this.navigateTo('home');
    }
  },

  // --- Requests View Controller ---
  filterRequests(filterGroup) {
    this.currentFilter = filterGroup;
    
    // Update pills
    document.querySelectorAll('.filter-pill').forEach(pill => {
      pill.classList.remove('active');
      if (pill.dataset.filter === filterGroup) {
        pill.classList.add('active');
      }
    });

    this.renderRequestsList();
  },

  renderRequestsList() {
    const listContainer = document.getElementById('requests-cards-list');
    if (!listContainer) return;

    let filtered = CityData.requests;
    if (this.currentFilter !== 'all') {
      filtered = CityData.requests.filter(r => r.filterGroup === this.currentFilter);
    }

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align:center; padding:40px 20px; color:#6B7280;">
          <div style="font-size:2.5rem; margin-bottom:10px;">📋</div>
          <h3 style="font-size:1.1rem; font-weight:700; color:#111827;">No ${this.currentFilter} requests</h3>
          <p style="font-size:0.85rem; margin-top:4px;">You don't have any requests in this category.</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = filtered.map(req => UIComponents.renderRequestCard(req)).join('');
  },

  showRequestDetails(reqId) {
    const req = CityData.requests.find(r => r.id === reqId);
    if (req) {
      this.openModal(UIComponents.renderRequestDetailsModal(req));
    }
  },

  cancelRequest(reqId) {
    const req = CityData.requests.find(r => r.id === reqId);
    if (req) {
      req.filterGroup = 'canceled';
      req.status = 'canceled';
      req.statusLabel = 'Canceled';
      req.timeline.step = 'Request was canceled';
      req.timeline.detail = 'Canceled by resident';
      this.closeModal();
      this.renderRequestsList();
      this.showToast(`Request ${reqId} has been canceled`);
    }
  },

  // --- Emergency SOS Flow ---
  selectEmergency(element, typeName) {
    document.querySelectorAll('.emergency-select-card').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
    this.selectedEmergencyType = typeName;
  },

  triggerEmergencySOS() {
    // Open dispatch modal
    this.openModal(UIComponents.renderEmergencyDispatchModal(this.selectedEmergencyType));
    
    // Add to requests
    const newReqId = `SOS-${Math.floor(1000 + Math.random() * 9000)}`;
    CityData.requests.unshift({
      id: newReqId,
      title: `Emergency: ${this.selectedEmergencyType}`,
      category: 'emergency',
      iconType: 'water',
      status: 'on_the_way',
      statusLabel: 'Emergency Dispatched',
      filterGroup: 'in_progress',
      assignedTo: {
        name: "Rapid Response Unit #4",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
        phone: "+91 1800 233 4567"
      },
      timeline: {
        step: "Rapid Patrol En Route",
        detail: "Expected arrival: <span class='highlight-green'>6 mins</span>",
        iconType: "gear"
      },
      date: "Just now",
      address: "Flat 402, Samta Colony, Talegaon Dabhade"
    });
    this.renderRequestsList();
  },

  editLocation() {
    this.showAddressModal();
  },

  recenterGPS() {
    if (typeof GPSTrackerEngine !== 'undefined') {
      GPSTrackerEngine.fetchCitizenLocation(
        (loc) => {
          this.showToast(`📍 Citizen GPS updated: ${loc.lat.toFixed(4)}°N, ${loc.lng.toFixed(4)}°E`);
        },
        (err) => {
          this.showToast("📍 Citizen GPS reset to Shivaji Nagar Sector 4");
        }
      );
    } else {
      this.showToast("📍 Citizen GPS updated to Shivaji Nagar Sector 4");
    }
  },

  // --- Report an Issue Flow ---
  selectIssueType(element, issueName) {
    document.querySelectorAll('.issue-type-tile').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
    this.selectedIssueType = issueName;
  },

  handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const src = e.target.result;
        this.uploadedPhotos.push(src);
        this.renderUploadedPhotos();
        this.triggerAIVisionScan(src);
      };
      reader.readAsDataURL(file);
    }
  },

  loadSampleIssuePhoto(presetType) {
    const samples = {
      'overflowing_bin': {
        img: 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?w=600&auto=format&fit=crop&q=80',
        category: 'Overflowing Bin',
        priority: 'Critical',
        priorityColor: '#DC2626',
        desc: 'Overflowing municipal community dumpster located at Samta Colony Chowk. Debris spilling onto the pedestrian walkway creating foul odor and hygiene hazard. Requires urgent hydraulic loader dispatch.',
        confidence: 98.4,
        tags: ['#PlasticWaste', '#OverflowHazard', '#SamtaColony']
      },
      'road_litter': {
        img: 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?w=600&auto=format&fit=crop&q=80',
        category: 'Road Littering',
        priority: 'High',
        priorityColor: '#D97706',
        desc: 'Accumulated street-side plastic and dry packaging litter along Talegaon Station Main Road. Street sweeping required to prevent drain blockage before evening rainfall.',
        confidence: 96.1,
        tags: ['#StreetSweeping', '#DrainageRisk']
      },
      'dirty_area': {
        img: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=600&auto=format&fit=crop&q=80',
        category: 'Dirty Area',
        priority: 'Moderate',
        priorityColor: '#2563EB',
        desc: 'Uncleaned vacant community spot with dry leaves and garden waste buildup. Requesting scheduled sanitization truck clearing.',
        confidence: 94.8,
        tags: ['#Sanitization', '#Ward2']
      }
    };

    const preset = samples[presetType] || samples['overflowing_bin'];
    this.uploadedPhotos = [preset.img];
    this.renderUploadedPhotos();
    this.triggerAIVisionScan(preset.img, preset);
  },

  triggerAIVisionScan(imageSrc, customPreset = null) {
    const scanWrap = document.getElementById('ai-vision-scanner-wrap');
    const scanImg = document.getElementById('ai-vision-scanner-img');
    const statusText = document.getElementById('ai-scan-status-text');
    const triageCard = document.getElementById('ai-triage-result-card');

    if (!scanWrap || !scanImg) return;

    scanImg.src = imageSrc;
    scanWrap.style.display = 'block';
    scanWrap.classList.add('scanning');
    if (triageCard) triageCard.style.display = 'none';

    if (statusText) statusText.textContent = "🧠 Initializing neural visual scan...";

    setTimeout(() => {
      if (statusText) statusText.textContent = "🔍 Detecting municipal waste & hazard patterns...";
    }, 600);

    setTimeout(() => {
      if (statusText) statusText.textContent = "⚡ Calculating civic severity index & category...";
    }, 1300);

    setTimeout(() => {
      scanWrap.classList.remove('scanning');
      scanWrap.style.display = 'none';

      // Pick preset or smart heuristics
      const preset = customPreset || {
        category: 'Overflowing Bin',
        priority: 'Critical',
        priorityColor: '#DC2626',
        desc: 'Detected severe municipal waste overflow with plastic packaging and mixed organic debris. Requires high-priority clearance vehicle.',
        confidence: 97.6,
        tags: ['#AITriaged', '#UrgentAction']
      };

      // Auto-fill Description
      const descInput = document.getElementById('issue-description-input');
      if (descInput) {
        descInput.value = preset.desc;
      }

      // Auto-select Category Tile
      document.querySelectorAll('.issue-type-tile').forEach(tile => {
        if (tile.dataset.issue === preset.category) {
          tile.classList.add('selected');
          this.selectedIssueType = preset.category;
        } else {
          tile.classList.remove('selected');
        }
      });

      // Show Triage Result Card
      if (triageCard) {
        triageCard.innerHTML = `
          <div class="ai-triage-header">
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-size:1.1rem;">✨</span>
              <strong style="font-size:0.88rem; color:#0F172A;">AI Vision Auto-Triage</strong>
            </div>
            <span class="ai-confidence-score">${preset.confidence}% Confidence</span>
          </div>

          <div style="display:flex; align-items:center; gap:8px; margin:6px 0 10px;">
            <span class="ai-triage-severity ${preset.priority === 'Critical' ? 'critical' : 'moderate'}">
              ${preset.priority === 'Critical' ? '🚨 CRITICAL PRIORITY' : '⚠️ HIGH PRIORITY'}
            </span>
            <span style="font-size:0.75rem; color:#64748B; font-weight:700;">
              Detected: <strong style="color:#0F172A;">${preset.category}</strong>
            </span>
          </div>

          <p style="font-size:0.8rem; color:#334155; line-height:1.4; margin:0 0 8px;">
            ${preset.desc}
          </p>

          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            ${preset.tags.map(t => `<span style="font-size:0.7rem; background:#E2E8F0; color:#475569; padding:2px 8px; border-radius:10px; font-weight:700;">${t}</span>`).join('')}
          </div>
        `;
        triageCard.style.display = 'block';
      }

      if (typeof AudioAnnouncerEngine !== 'undefined') {
        AudioAnnouncerEngine.playChimeSound('high');
      }
      CityAssist.showToast(`✨ AI Auto-Triage: Categorized as ${preset.category} (${preset.confidence}%)`);
    }, 2000);
  },

  triggerDoorstepGeofenceAlert(distanceMeters = 240, etaMins = 2) {
    const banner = document.getElementById('doorstep-geofence-alert-banner');
    if (!banner) return;

    banner.classList.add('active');

    const descEl = document.getElementById('geofence-banner-desc');
    if (descEl) {
      descEl.innerHTML = `Vehicle <strong>#MH-12-EA-4920</strong> is <strong>${distanceMeters}m</strong> away (~${etaMins} mins). Keep wet & dry waste ready!`;
    }

    if (typeof AudioAnnouncerEngine !== 'undefined') {
      AudioAnnouncerEngine.playChimeSound('high');
      AudioAnnouncerEngine.speakAnnouncement(`Municipal waste collection vehicle is approaching Samta Colony doorstep zone. It is approximately ${etaMins} minutes away. Please keep wet and dry waste ready.`);
    }

    // Auto dismiss after 9s
    setTimeout(() => {
      banner.classList.remove('active');
    }, 9000);
  },

  dismissGeofenceAlert() {
    const banner = document.getElementById('doorstep-geofence-alert-banner');
    if (banner) banner.classList.remove('active');
  },

  showCivicEcoCardModal() {
    this.openModal(UIComponents.renderCivicEcoCardModal());
  },

  renderUploadedPhotos() {
    const placeholder = document.getElementById('upload-placeholder');
    const container = document.getElementById('uploaded-photos');
    if (this.uploadedPhotos.length > 0) {
      placeholder.style.display = 'none';
      container.style.display = 'flex';
      container.innerHTML = this.uploadedPhotos.map((src, index) => `
        <div style="position:relative; display:inline-block;">
          <img src="${src}" class="uploaded-thumb-preview" alt="Uploaded issue photo">
          <button onclick="event.stopPropagation(); CityAssist.removePhoto(${index})" style="position:absolute; top:-6px; right:-6px; background:#EF4444; color:#fff; border:none; border-radius:50%; width:20px; height:20px; font-size:12px; cursor:pointer;">×</button>
        </div>
      `).join('') + `
        <button onclick="event.stopPropagation(); document.getElementById('issue-photo-input').click();" style="width:60px; height:60px; border:1px dashed #94A3B8; border-radius:10px; background:#fff; font-size:1.4rem; cursor:pointer; color:#64748B;">+</button>
      `;
    } else {
      placeholder.style.display = 'flex';
      container.style.display = 'none';
    }
  },

  removePhoto(index) {
    this.uploadedPhotos.splice(index, 1);
    this.renderUploadedPhotos();
  },

  handleIssueTextChange(text) {
    const feedbackBox = document.getElementById('ai-report-feedback');
    if (!feedbackBox || typeof CityAIEngine === 'undefined') return;

    const analysis = CityAIEngine.analyzeText(text);
    if (!analysis) {
      feedbackBox.style.display = 'none';
      return;
    }

    feedbackBox.style.display = 'block';
    
    // Update AI Card Fields
    document.getElementById('ai-suggested-category').textContent = analysis.category;
    const prioEl = document.getElementById('ai-detected-priority');
    prioEl.textContent = analysis.priority;
    prioEl.style.color = analysis.priorityColor;
    document.getElementById('ai-routed-dept').textContent = analysis.department;
    document.getElementById('ai-confidence-val').textContent = `${analysis.confidence}% confidence`;

    // Auto-select category tile if matches
    document.querySelectorAll('.issue-type-tile').forEach(tile => {
      if (tile.dataset.issue === analysis.category) {
        tile.classList.add('selected');
        this.selectedIssueType = analysis.category;
      } else {
        tile.classList.remove('selected');
      }
    });

    // Check Duplicate
    const dupBox = document.getElementById('ai-duplicate-box');
    if (analysis.duplicateCheck && analysis.duplicateCheck.isDuplicate) {
      dupBox.style.display = 'block';
      document.getElementById('ai-duplicate-desc').textContent = 
        `Ticket ${analysis.duplicateCheck.existingId} (${analysis.duplicateCheck.existingTitle}) is already active in ${analysis.duplicateCheck.location}.`;
    } else {
      dupBox.style.display = 'none';
    }
  },

  upvoteExistingTicket() {
    CityData.user.points += 25;
    
    // Update points across UI
    document.querySelectorAll('.bold-num').forEach(el => {
      if (el.textContent.includes('1,')) {
        el.textContent = CityData.user.points.toLocaleString();
      }
    });

    this.showToast("Upvoted! +25 Civic Points added to your balance 🎉");
    this.closeModal();
    this.navigateTo('my-requests');
  },

  submitReport() {
    const desc = document.getElementById('issue-description-input').value.trim();
    const newReqId = `REQ-${Math.floor(10850 + Math.random() * 100)}`;
    
    const analysis = (typeof CityAIEngine !== 'undefined' && desc) 
      ? CityAIEngine.analyzeText(desc) 
      : { priority: "Normal", department: "PMC Solid Waste Management Dept", confidence: 92 };

    const priority = analysis ? analysis.priority : "Normal";
    const department = analysis ? analysis.department : "PMC Solid Waste Management Dept";

    // Add to citizen requests list
    CityData.requests.unshift({
      id: newReqId,
      title: `Civic: ${this.selectedIssueType}`,
      category: 'civic',
      iconType: 'waste',
      status: 'in_progress',
      statusLabel: 'Under Review',
      filterGroup: 'in_progress',
      priority: priority,
      department: department,
      assignedTo: {
        name: department,
        avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120&auto=format&fit=crop&q=80",
        phone: "+91 020 25501000"
      },
      timeline: {
        step: "AI Auto-Triaged",
        detail: `Priority: ${priority} • Dispatched to ${department}`,
        iconType: "gear"
      },
      date: "Just now",
      address: "Shivaji Nagar, Pune"
    });

    // Also push to Municipality Command Center triage queue
    CityData.municipality.triageQueue.unshift({
      id: newReqId,
      title: `Civic: ${this.selectedIssueType} - "${desc || 'Citizen Report'}"`,
      category: this.selectedIssueType,
      priority: priority,
      department: department,
      aiConfidence: analysis ? `${analysis.confidence}%` : "94%",
      location: "Shivaji Nagar, Pune",
      time: "Just now",
      status: "pending",
      assignedSquad: null
    });
    CityData.municipality.openReportsCount++;
    MunicipalityEngine.renderTriageList();

    // Reset form
    document.getElementById('issue-description-input').value = '';
    const feedbackBox = document.getElementById('ai-report-feedback');
    if (feedbackBox) feedbackBox.style.display = 'none';
    this.uploadedPhotos = [];
    this.renderUploadedPhotos();
    
    this.renderRequestsList();
    this.showToast(`✨ AI Triaged (${priority}) & Dispatched to ${department}!`);
    
    // Switch to requests view to see it
    setTimeout(() => {
      this.navigateTo('my-requests');
    }, 600);
  },

  // --- Side Drawer ---
  openDrawer() {
    const overlay = document.getElementById('drawer-overlay');
    const drawer = document.getElementById('side-drawer');
    if (overlay) overlay.classList.add('open');
    if (drawer) drawer.classList.add('open');
  },

  closeDrawer() {
    const overlay = document.getElementById('drawer-overlay');
    const drawer = document.getElementById('side-drawer');
    if (overlay) overlay.classList.remove('open');
    if (drawer) drawer.classList.remove('open');
  },

  handleLogout() {
    if (typeof AuthEngine !== 'undefined') {
      AuthEngine.logout();
    }
  },

  showNotificationsModal() {
    if (typeof UIComponents !== 'undefined') {
      this.openModal(UIComponents.renderNotificationsModal());
    }
  },

  showNotificationSettings() {
    if (typeof UIComponents !== 'undefined') {
      this.openModal(UIComponents.renderNotificationSettingsModal());
    }
  },

  // --- Modals & Sheets ---
  openModal(contentHtml) {
    const dynamic = document.getElementById('modal-dynamic-content');
    const backdrop = document.getElementById('app-modal-backdrop');
    const sheet = document.getElementById('app-bottom-sheet');
    if (dynamic) dynamic.innerHTML = contentHtml;
    if (backdrop) backdrop.classList.add('open');
    if (sheet) sheet.classList.add('open');
  },

  closeModal() {
    const backdrop = document.getElementById('app-modal-backdrop');
    const sheet = document.getElementById('app-bottom-sheet');
    if (backdrop) backdrop.classList.remove('open');
    if (sheet) sheet.classList.remove('open');
  },

  handleProfilePhotoUpload(event) {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        this.showToast("Please select a valid image file");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const customImgData = e.target.result;
        CityData.user.avatar = customImgData;

        // Update Profile screen avatar image
        const profileImg = document.getElementById('profile-avatar-img');
        if (profileImg) profileImg.src = customImgData;

        // Update Side Drawer avatar image if open
        const drawerImg = document.querySelector('.drawer-avatar-wrapper .drawer-avatar');
        if (drawerImg) drawerImg.src = customImgData;

        this.showToast("Profile photo updated from device! 📸");
      };
      reader.readAsDataURL(file);
    }
  },

  /**
   * Open the Edit Profile modal with pre-filled user data
   */
  openEditProfileModal() {
    const profile = JSON.parse(localStorage.getItem('cityassist_user_profile') || '{}');
    const name = profile.name || 'Siddhant Ramteke';
    const phone = profile.phone || '9876543210';
    const email = profile.email || 'siddhant@gmail.com';
    const address = profile.address || 'Plot 42, Samta Colony, near Municipal Garden';
    const area = profile.area || 'Samta Colony, Sector 2';
    const pincode = profile.pincode || '410507';
    const phoneVerified = profile.phoneVerified ? true : false;

    this.openModal(`
      <div style="padding:4px 0;">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:18px;">
          <div style="width:36px; height:36px; border-radius:12px; background:linear-gradient(135deg,#0F7943,#16A34A); display:flex; align-items:center; justify-content:center;">
            <svg viewBox="0 0 24 24" fill="none" stroke="#FFF" stroke-width="2.5" width="18" height="18"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </div>
          <div>
            <h3 style="margin:0; font-size:1.05rem; font-weight:800; color:#0F172A;">Edit Profile</h3>
            <p style="margin:0; font-size:0.75rem; color:#64748B;">Update your personal details</p>
          </div>
        </div>

        <!-- Full Name -->
        <div style="margin-bottom:14px;">
          <label style="font-size:0.75rem; font-weight:800; color:#475569; display:block; margin-bottom:4px;">Full Name <span style="color:#EF4444;">*</span></label>
          <input type="text" id="edit-profile-name" value="${name}" placeholder="Enter your full name" style="width:100%; padding:11px 14px; border:1.5px solid #E2E8F0; border-radius:12px; font-size:0.9rem; font-weight:600; font-family:'Plus Jakarta Sans',sans-serif; color:#0F172A; background:#F8FAFC; box-sizing:border-box; outline:none; transition:border-color 0.2s;" onfocus="this.style.borderColor='#0F7943'" onblur="this.style.borderColor='#E2E8F0'">
        </div>

        <!-- Mobile Number with OTP -->
        <div style="margin-bottom:14px;">
          <label style="font-size:0.75rem; font-weight:800; color:#475569; display:block; margin-bottom:4px;">Mobile Number <span style="color:#EF4444;">*</span></label>
          <div style="display:flex; gap:8px;">
            <div style="display:flex; align-items:center; background:#F1F5F9; border:1.5px solid #E2E8F0; border-radius:12px; padding:0 10px; font-size:0.85rem; font-weight:700; color:#64748B; white-space:nowrap;">+91</div>
            <input type="tel" id="edit-profile-phone" value="${phone}" maxlength="10" placeholder="10-digit number" style="flex:1; padding:11px 14px; border:1.5px solid #E2E8F0; border-radius:12px; font-size:0.9rem; font-weight:600; font-family:'Plus Jakarta Sans',sans-serif; color:#0F172A; background:#F8FAFC; box-sizing:border-box; outline:none;" onfocus="this.style.borderColor='#0F7943'" onblur="this.style.borderColor='#E2E8F0'">
            <button type="button" onclick="CityAssist.sendProfileOTP()" id="edit-profile-otp-btn" style="background:${phoneVerified ? '#DCFCE7' : '#EFF6FF'}; color:${phoneVerified ? '#15803D' : '#1D4ED8'}; border:1px solid ${phoneVerified ? '#BBF7D0' : '#BFDBFE'}; padding:8px 12px; border-radius:12px; font-size:0.72rem; font-weight:800; cursor:pointer; white-space:nowrap;">
              ${phoneVerified ? '✓ Verified' : 'Send OTP'}
            </button>
          </div>
          <!-- OTP Input (hidden by default) -->
          <div id="edit-profile-otp-section" style="display:none; margin-top:8px;">
            <div style="display:flex; gap:8px; align-items:center;">
              <input type="text" id="edit-profile-otp" maxlength="4" placeholder="Enter 4-digit OTP" style="flex:1; padding:10px 14px; border:1.5px solid #F59E0B; border-radius:12px; font-size:0.95rem; font-weight:800; font-family:'Plus Jakarta Sans',sans-serif; color:#0F172A; background:#FFFBEB; text-align:center; letter-spacing:8px; box-sizing:border-box; outline:none;">
              <button type="button" onclick="CityAssist.verifyProfileOTP()" style="background:#F59E0B; color:#FFF; border:none; padding:10px 14px; border-radius:12px; font-size:0.78rem; font-weight:800; cursor:pointer;">Verify</button>
            </div>
            <div style="font-size:0.7rem; color:#92400E; margin-top:4px;">Demo OTP: <strong>4920</strong></div>
          </div>
        </div>

        <!-- Email (Optional) -->
        <div style="margin-bottom:14px;">
          <label style="font-size:0.75rem; font-weight:800; color:#475569; display:block; margin-bottom:4px;">Email Address <span style="color:#CBD5E1; font-size:0.7rem;">(Optional)</span></label>
          <input type="email" id="edit-profile-email" value="${email}" placeholder="your.email@gmail.com" style="width:100%; padding:11px 14px; border:1.5px solid #E2E8F0; border-radius:12px; font-size:0.9rem; font-weight:600; font-family:'Plus Jakarta Sans',sans-serif; color:#0F172A; background:#F8FAFC; box-sizing:border-box; outline:none;" onfocus="this.style.borderColor='#0F7943'" onblur="this.style.borderColor='#E2E8F0'">
        </div>

        <hr style="border:none; border-top:1px solid #E2E8F0; margin:16px 0;">
        <div style="display:flex; align-items:center; gap:6px; margin-bottom:12px;">
          <span style="font-size:0.95rem;">📍</span>
          <span style="font-size:0.82rem; font-weight:800; color:#0F172A;">Location & Address</span>
        </div>

        <!-- Home Address -->
        <div style="margin-bottom:14px;">
          <label style="font-size:0.75rem; font-weight:800; color:#475569; display:block; margin-bottom:4px;">Home Address</label>
          <textarea id="edit-profile-address" rows="2" placeholder="House/Flat No., Street, Landmark" style="width:100%; padding:11px 14px; border:1.5px solid #E2E8F0; border-radius:12px; font-size:0.85rem; font-weight:600; font-family:'Plus Jakarta Sans',sans-serif; color:#0F172A; background:#F8FAFC; box-sizing:border-box; resize:none; outline:none;" onfocus="this.style.borderColor='#0F7943'" onblur="this.style.borderColor='#E2E8F0'">${address}</textarea>
        </div>

        <!-- Area / Locality -->
        <div style="margin-bottom:14px;">
          <label style="font-size:0.75rem; font-weight:800; color:#475569; display:block; margin-bottom:4px;">Area / Locality</label>
          <input type="text" id="edit-profile-area" value="${area}" placeholder="e.g., Samta Colony, Sector 2" style="width:100%; padding:11px 14px; border:1.5px solid #E2E8F0; border-radius:12px; font-size:0.9rem; font-weight:600; font-family:'Plus Jakarta Sans',sans-serif; color:#0F172A; background:#F8FAFC; box-sizing:border-box; outline:none;" onfocus="this.style.borderColor='#0F7943'" onblur="this.style.borderColor='#E2E8F0'">
        </div>

        <!-- Pincode -->
        <div style="margin-bottom:14px;">
          <label style="font-size:0.75rem; font-weight:800; color:#475569; display:block; margin-bottom:4px;">Pincode</label>
          <input type="text" id="edit-profile-pincode" value="${pincode}" maxlength="6" placeholder="6-digit pincode" style="width:100%; padding:11px 14px; border:1.5px solid #E2E8F0; border-radius:12px; font-size:0.9rem; font-weight:800; font-family:'Plus Jakarta Sans',sans-serif; color:#0F172A; background:#F8FAFC; box-sizing:border-box; letter-spacing:2px; outline:none;" onfocus="this.style.borderColor='#0F7943'" onblur="this.style.borderColor='#E2E8F0'">
        </div>

        <!-- Use Current GPS Button -->
        <button type="button" onclick="CityAssist.fillEditProfileWithGPS()" style="width:100%; background:#EFF6FF; color:#1D4ED8; border:1.5px solid #BFDBFE; padding:11px; border-radius:12px; font-size:0.82rem; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; margin-bottom:18px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="15" height="15"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>
          📍 Use My Current GPS Location
        </button>

        <!-- Action Buttons -->
        <div style="display:flex; gap:10px;">
          <button type="button" onclick="CityAssist.saveProfileChanges()" class="primary-green-btn" style="flex:1; padding:13px; font-weight:800; font-size:0.9rem;">
            ✓ Save Changes
          </button>
          <button type="button" onclick="CityAssist.closeModal()" style="background:#F1F5F9; color:#475569; border:none; padding:13px 18px; border-radius:12px; font-weight:700; font-size:0.85rem; cursor:pointer;">
            Cancel
          </button>
        </div>
      </div>
    `);
  },

  /**
   * Send OTP for phone verification in edit profile
   */
  sendProfileOTP() {
    const phone = document.getElementById('edit-profile-phone')?.value?.trim();
    if (!phone || phone.length !== 10) {
      this.showToast('⚠️ Please enter a valid 10-digit mobile number');
      return;
    }
    const otpSection = document.getElementById('edit-profile-otp-section');
    if (otpSection) otpSection.style.display = 'block';
    const btn = document.getElementById('edit-profile-otp-btn');
    if (btn) {
      btn.textContent = 'OTP Sent ✓';
      btn.style.background = '#FEF3C7';
      btn.style.color = '#92400E';
      btn.style.borderColor = '#FCD34D';
    }
    this.showToast(`📱 OTP sent to +91 ${phone}. Use demo OTP: 4920`);
  },

  /**
   * Verify OTP entered by user in edit profile
   */
  verifyProfileOTP() {
    const otp = document.getElementById('edit-profile-otp')?.value?.trim();
    if (otp === '4920') {
      const btn = document.getElementById('edit-profile-otp-btn');
      if (btn) {
        btn.textContent = '✓ Verified';
        btn.style.background = '#DCFCE7';
        btn.style.color = '#15803D';
        btn.style.borderColor = '#BBF7D0';
      }
      const otpSection = document.getElementById('edit-profile-otp-section');
      if (otpSection) otpSection.style.display = 'none';

      const badge = document.getElementById('profile-phone-verified-badge');
      if (badge) badge.style.display = 'inline-flex';

      // Save verified state
      const profile = JSON.parse(localStorage.getItem('cityassist_user_profile') || '{}');
      profile.phoneVerified = true;
      localStorage.setItem('cityassist_user_profile', JSON.stringify(profile));

      this.showToast('✅ Phone number verified successfully!');
    } else {
      this.showToast('❌ Incorrect OTP. Hint: Use demo OTP 4920');
    }
  },

  /**
   * Auto-fill address fields in edit modal using GPS
   */
  fillEditProfileWithGPS() {
    this.showToast('📍 Detecting your GPS location...');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude.toFixed(4);
          const lng = pos.coords.longitude.toFixed(4);
          const addressField = document.getElementById('edit-profile-address');
          const areaField = document.getElementById('edit-profile-area');
          if (addressField) addressField.value = `GPS Location: ${lat}°N, ${lng}°E`;
          if (areaField) areaField.value = `Talegaon Dabhade (Auto-detected)`;
          this.showToast(`📍 GPS Location detected: ${lat}°N, ${lng}°E`);
        },
        (err) => {
          this.showToast('⚠️ Could not access GPS. Please enter address manually.');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      this.showToast('⚠️ GPS not supported on this device');
    }
  },

  /**
   * Save profile changes from edit modal
   */
  saveProfileChanges() {
    const name = document.getElementById('edit-profile-name')?.value?.trim();
    const phone = document.getElementById('edit-profile-phone')?.value?.trim();
    const email = document.getElementById('edit-profile-email')?.value?.trim();
    const address = document.getElementById('edit-profile-address')?.value?.trim();
    const area = document.getElementById('edit-profile-area')?.value?.trim();
    const pincode = document.getElementById('edit-profile-pincode')?.value?.trim();

    if (!name) { this.showToast('⚠️ Please enter your full name'); return; }
    if (!phone || phone.length !== 10) { this.showToast('⚠️ Please enter a valid 10-digit mobile number'); return; }
    if (pincode && pincode.length !== 6) { this.showToast('⚠️ Pincode must be 6 digits'); return; }

    // Save to localStorage
    const profile = JSON.parse(localStorage.getItem('cityassist_user_profile') || '{}');
    profile.name = name;
    profile.phone = phone;
    profile.email = email || '';
    profile.address = address || '';
    profile.area = area || '';
    profile.pincode = pincode || '410507';
    localStorage.setItem('cityassist_user_profile', JSON.stringify(profile));

    // Update profile screen UI
    const el = (id) => document.getElementById(id);
    if (el('profile-display-name')) el('profile-display-name').textContent = name;
    if (el('profile-display-phone')) el('profile-display-phone').textContent = '+91 ' + phone.replace(/(\d{5})(\d{5})/, '$1 $2');
    if (el('profile-display-email')) el('profile-display-email').textContent = email || '—';
    if (el('profile-info-name')) el('profile-info-name').textContent = name;
    if (el('profile-info-phone')) el('profile-info-phone').textContent = '+91 ' + phone.replace(/(\d{5})(\d{5})/, '$1 $2');
    if (el('profile-info-email')) el('profile-info-email').textContent = email || 'Not set';
    if (el('profile-info-address')) el('profile-info-address').textContent = address || 'Not set';
    if (el('profile-info-area')) el('profile-info-area').textContent = area || 'Not set';
    if (el('profile-info-pincode')) el('profile-info-pincode').textContent = pincode || '—';

    // Update drawer name
    const drawerName = document.querySelector('.drawer-user-name');
    if (drawerName) drawerName.textContent = name;

    this.closeModal();
    this.showToast('✅ Profile updated successfully!');
  },

  /**
   * Refresh GPS location on profile screen
   */
  refreshProfileGPSLocation() {
    this.showToast('📍 Getting your current location...');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude.toFixed(4);
          const lng = pos.coords.longitude.toFixed(4);
          const el = (id) => document.getElementById(id);
          if (el('profile-info-current-location')) el('profile-info-current-location').textContent = `Talegaon Dabhade (${lat}°N)`;
          if (el('profile-info-gps-coords')) el('profile-info-gps-coords').textContent = `${lat}°N, ${lng}°E`;
          this.showToast(`✅ Location updated: ${lat}°N, ${lng}°E`);
        },
        (err) => {
          this.showToast('⚠️ Could not access GPS. Check location permissions.');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      this.showToast('⚠️ GPS not available on this device');
    }
  },

  /**
   * Load saved profile data on app init
   */
  loadSavedProfile() {
    const profile = JSON.parse(localStorage.getItem('cityassist_user_profile') || '{}');
    if (!profile.name) return;
    const el = (id) => document.getElementById(id);
    if (el('profile-display-name')) el('profile-display-name').textContent = profile.name;
    if (el('profile-display-phone')) el('profile-display-phone').textContent = '+91 ' + (profile.phone || '').replace(/(\d{5})(\d{5})/, '$1 $2');
    if (el('profile-display-email')) el('profile-display-email').textContent = profile.email || '—';
    if (el('profile-info-name')) el('profile-info-name').textContent = profile.name;
    if (el('profile-info-phone')) el('profile-info-phone').textContent = '+91 ' + (profile.phone || '').replace(/(\d{5})(\d{5})/, '$1 $2');
    if (el('profile-info-email')) el('profile-info-email').textContent = profile.email || 'Not set';
    if (el('profile-info-address')) el('profile-info-address').textContent = profile.address || 'Not set';
    if (el('profile-info-area')) el('profile-info-area').textContent = profile.area || 'Not set';
    if (el('profile-info-pincode')) el('profile-info-pincode').textContent = profile.pincode || '410507';
    if (profile.phoneVerified) {
      if (el('profile-phone-verified-badge')) el('profile-phone-verified-badge').style.display = 'inline-flex';
    }
  },

  showRewardsModal() {
    this.openModal(UIComponents.renderRewardsModal());
  },

  showBadgesModal() {
    this.openModal(UIComponents.renderBadgesModal());
  },

  showCertificateModal() {
    this.openModal(UIComponents.renderCertificateModal());
  },

  downloadCertificatePDF() {
    this.showToast("Downloading official PMC Civic Certificate (PDF)...");
    setTimeout(() => {
      this.showToast("Certificate downloaded to device! 📄");
    }, 1200);
  },

  shareCertificate() {
    if (navigator.share) {
      navigator.share({
        title: "PMC Civic Certificate of Excellence",
        text: "I reached 1,000+ points on CityAssist and received the Gold Eco Champion honor!",
        url: window.location.href
      }).catch(() => {});
    } else {
      this.showToast("Certificate link copied to clipboard!");
    }
  },

  showFullScreenRouteMap() {
    this.openModal(UIComponents.renderFullScreenRouteMap());
    
    // Auto-mount interactive Leaflet full-screen route map
    if (typeof LeafletMapEngine !== 'undefined') {
      setTimeout(() => {
        LeafletMapEngine.initFullscreenMap();
        LeafletMapEngine.refreshCheckpoints();
      }, 150);
    }

    if (typeof GPSTrackerEngine !== 'undefined') {
      GPSTrackerEngine.renderCitizenStopsUI();
    }

    // Auto-sync current vehicle pin
    if (typeof GPSTrackerEngine !== 'undefined') {
      const tel = GPSTrackerEngine.driverTelemetry;
      const pct = tel.progressPct || 45;
      const truck = document.getElementById('fs-live-truck-marker');
      if (truck) {
        const tX = 70 + (pct / 100) * 350;
        const tY = 70 + Math.sin((pct / 100) * Math.PI) * 140;
        truck.setAttribute('transform', `translate(${tX}, ${tY})`);
      }
      const telemetryReadout = document.getElementById('fs-telemetry-readout');
      if (telemetryReadout) {
        telemetryReadout.textContent = `GPS: ${tel.lat ? tel.lat.toFixed(4) : '18.5342'}° N, ${tel.lng ? tel.lng.toFixed(4) : '73.8432'}° E • Vehicle #MH-12-EA-4920`;
      }
    }
  },

  filterFullscreenRoute(routeId) {
    document.querySelectorAll('.fs-route-chip').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`chip-route-${routeId}`);
    if (activeBtn) activeBtn.classList.add('active');

    // Filter interactive Leaflet layers
    if (typeof LeafletMapEngine !== 'undefined') {
      LeafletMapEngine.filterRoute(routeId);
    }

    const g4a = document.getElementById('fs-group-route-4a');
    const g4b = document.getElementById('fs-group-route-4b');
    const g4c = document.getElementById('fs-group-route-4c');

    if (routeId === 'all') {
      if (g4a) g4a.style.display = 'block';
      if (g4b) g4b.style.display = 'block';
      if (g4c) g4c.style.display = 'block';
      this.showToast("Displaying all 3 Ward 14 routes");
    } else if (routeId === '4b') {
      if (g4a) g4a.style.display = 'none';
      if (g4b) g4b.style.display = 'block';
      if (g4c) g4c.style.display = 'none';
      this.showToast("Focusing on Active Route 4B (Shivaji Nagar)");
    } else if (routeId === '4a') {
      if (g4a) g4a.style.display = 'block';
      if (g4b) g4b.style.display = 'none';
      if (g4c) g4c.style.display = 'none';
      this.showToast("Focusing on Morning Feeder Route 4A");
    } else if (routeId === '4c') {
      if (g4a) g4a.style.display = 'none';
      if (g4b) g4b.style.display = 'none';
      if (g4c) g4c.style.display = 'block';
      this.showToast("Focusing on Commercial Route 4C");
    }
  },

  recenterFullscreenVehicle() {
    if (typeof LeafletMapEngine !== 'undefined') {
      LeafletMapEngine.panToVehicle();
    }
    this.showToast("🎯 Map centered on Garbage Collection Vehicle #MH-12-EA-4920");
  },

  recenterFullscreenDoorstep() {
    if (typeof LeafletMapEngine !== 'undefined') {
      LeafletMapEngine.panToDoorstep();
    }
    this.showToast("📍 Map centered on your Doorstep (Samta Colony, Talegaon)");
  },

  showResponsibleCitizenModal() {
    this.openModal(UIComponents.renderResponsibleCitizenModal());
  },

  showAddressModal() {
    this.openModal(UIComponents.renderAddressModal());
  },

  openAddAddressModal(autoDetect = false) {
    this.openModal(UIComponents.renderAddAddressModal(autoDetect));
    if (autoDetect) {
      setTimeout(() => {
        this.detectLiveGPSAddress();
      }, 300);
    }
  },

  resolveTalegaonCoords(street = "", city = "", pin = "") {
    const text = `${street} ${city} ${pin}`.toLowerCase();
    
    // Accurate landmark coordinates in Talegaon Dabhade
    if (text.includes('samta') || text.includes('garden')) return { lat: 18.7285, lng: 73.6765, name: "Samta Colony" };
    if (text.includes('mimer') || text.includes('medical') || text.includes('bstr')) return { lat: 18.7305, lng: 73.6810, name: "MIMER Medical College" };
    if (text.includes('dy patil') || text.includes('d.y') || text.includes('patil college')) return { lat: 18.7390, lng: 73.6740, name: "DY Patil Knowledge City" };
    if (text.includes('nutan') || text.includes('nmiet') || text.includes('vishnupuri')) return { lat: 18.7290, lng: 73.6930, name: "NMIET Nutan Campus" };
    if (text.includes('station') || text.includes('railway') || text.includes('bazaar') || text.includes('mandi')) return { lat: 18.7340, lng: 73.6700, name: "Station Road Bazaar" };
    if (text.includes('midc') || text.includes('tech park')) return { lat: 18.7450, lng: 73.6820, name: "Talegaon MIDC" };
    if (text.includes('somatane') || text.includes('phata') || text.includes('bhandara')) return { lat: 18.7180, lng: 73.6920, name: "Somatane Phata" };
    if (text.includes('hospital') || text.includes('general hospital')) return { lat: 18.7312, lng: 73.6775, name: "General Hospital Ward" };
    if (text.includes('pawana') || text.includes('lake') || text.includes('indrayani')) return { lat: 18.7245, lng: 73.6795, name: "Indrayani Lake Area" };
    if (text.includes('jijamata') || text.includes('maruti') || text.includes('chowk')) return { lat: 18.7320, lng: 73.6740, name: "Jijamata Chowk" };
    if (text.includes('chitale') || text.includes('dmart') || text.includes('d-mart')) return { lat: 18.7360, lng: 73.6720, name: "D-Mart Hub" };
    
    // Default center in Talegaon Dabhade
    return { lat: 18.7300, lng: 73.6750, name: "Talegaon Dabhade" };
  },

  detectLiveGPSAddress() {
    const statusPill = document.getElementById('addr-gps-status');
    const coordsPreview = document.getElementById('addr-coords-preview');
    const btnLabel = document.getElementById('gps-btn-label');

    if (statusPill) {
      statusPill.textContent = "Detecting Instantly... 🛰️";
      statusPill.className = "badge-sat-status locking";
    }
    if (btnLabel) {
      btnLabel.textContent = "Detecting...";
    }

    const cleanGeoName = (val) => {
      if (!val || typeof val !== 'string') return '';
      const trimmed = val.trim();
      const lower = trimmed.toLowerCase();
      const blacklist = ['asia', 'india', 'bharat', 'continent', 'world', 'northern hemisphere', 'unnamed road', 'null', 'undefined'];
      if (blacklist.includes(lower) || lower.includes('continent')) return '';
      return trimmed;
    };

    const applyAddressFields = (street, city, pin, flat, lat, lng) => {
      const flatInput = document.getElementById('addr-input-flat');
      const streetInput = document.getElementById('addr-input-street');
      const cityInput = document.getElementById('addr-input-city');
      const pinInput = document.getElementById('addr-input-pin');
      const latInput = document.getElementById('addr-input-lat');
      const lngInput = document.getElementById('addr-input-lng');

      if (flatInput && flat && !flatInput.value) flatInput.value = flat;
      if (streetInput && street) streetInput.value = street;
      if (cityInput && city) cityInput.value = city;
      if (pinInput && pin) pinInput.value = pin;
      if (latInput && lat) latInput.value = lat;
      if (lngInput && lng) lngInput.value = lng;
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = Number(position.coords.latitude.toFixed(6));
          const lng = Number(position.coords.longitude.toFixed(6));
          const acc = Math.round(position.coords.accuracy || 3);

          if (coordsPreview) {
            coordsPreview.textContent = `Live GPS: ${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E (±${acc}m accuracy)`;
          }
          if (statusPill) {
            statusPill.textContent = "Satellites Locked ✓";
            statusPill.className = "badge-sat-status locked";
          }
          if (btnLabel) {
            btnLabel.textContent = "Re-Detect Doorstep Location";
          }

          // Ultra-Fast Parallel Geocoding
          const fetchFastBDC = async () => {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), 2000);
            try {
              const resp = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`, { signal: ctrl.signal });
              clearTimeout(timer);
              return await resp.json();
            } catch (e) {
              return null;
            }
          };

          const fetchNominatim = async () => {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), 2200);
            try {
              const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=en`, { signal: ctrl.signal });
              clearTimeout(timer);
              return await resp.json();
            } catch (e) {
              return null;
            }
          };

          const [bdcData, nomData] = await Promise.all([fetchFastBDC(), fetchNominatim()]);

          let street = "";
          let city = "Talegaon Dabhade, Pune";
          let pin = "410507";
          let flat = "";

          if (nomData && nomData.address) {
            const a = nomData.address;
            const road = cleanGeoName(a.road || a.pedestrian || a.street || a.path);
            const hood = cleanGeoName(a.neighbourhood || a.suburb || a.residential);
            const town = cleanGeoName(a.city || a.town || a.municipality || a.village) || "Talegaon Dabhade, Pune";
            
            street = [road, hood].filter(Boolean).join(', ') || cleanGeoName(nomData.name) || "Samta Colony, Talegaon Dabhade";
            city = town.includes('तळेगाव') ? "Talegaon Dabhade, Pune" : town;
            pin = cleanGeoName(a.postcode) || "410507";
            if (a.house_number || a.amenity) {
              flat = [a.house_number ? `House #${a.house_number}` : '', cleanGeoName(a.amenity)].filter(Boolean).join(', ');
            }
          } else if (bdcData) {
            const loc = cleanGeoName(bdcData.locality) || "Samta Colony";
            const c = cleanGeoName(bdcData.city) || "Talegaon Dabhade, Pune";
            street = `${loc}, Talegaon Dabhade`;
            city = c.includes('तळेगाव') ? "Talegaon Dabhade, Pune" : c;
            pin = cleanGeoName(bdcData.postcode) || "410507";
          } else {
            street = "Samta Colony, Talegaon Dabhade";
            city = "Talegaon Dabhade, Pune";
            pin = "410507";
          }

          if (!street || street.toLowerCase().includes('asia')) {
            street = "Samta Colony, Talegaon Dabhade";
          }

          applyAddressFields(street, city, pin, flat, lat, lng);
          CityAssist.showToast(`📍 GPS Coordinates Captured: ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`);
        },
        (err) => {
          console.warn("Fast GPS Fallback:", err.message);
          const fallback = this.resolveTalegaonCoords("Samta Colony", "Talegaon Dabhade", "410507");
          if (coordsPreview) {
            coordsPreview.textContent = `Local Coords: ${fallback.lat}° N, ${fallback.lng}° E`;
          }
          if (statusPill) {
            statusPill.textContent = "Location Filled ✓";
            statusPill.className = "badge-sat-status locked";
          }
          if (btnLabel) {
            btnLabel.textContent = "Re-Detect Doorstep Location";
          }

          applyAddressFields("Samta Colony, Talegaon Dabhade", "Talegaon Dabhade, Pune", "410507", "", fallback.lat, fallback.lng);
          CityAssist.showToast("📍 Filled local Talegaon coordinates");
        },
        { enableHighAccuracy: true, timeout: 4000, maximumAge: 30000 }
      );
    } else {
      this.showToast("Geolocation not supported.");
    }
  },

  loadSavedAddresses() {
    try {
      const saved = localStorage.getItem('cityassist_saved_addresses');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          CityData.addresses = parsed;
        }
      }
    } catch (e) {
      console.warn('Could not load saved addresses from localStorage:', e);
    }
  },

  persistSavedAddresses() {
    try {
      localStorage.setItem('cityassist_saved_addresses', JSON.stringify(CityData.addresses));
    } catch (e) {
      console.warn('Could not persist addresses to localStorage:', e);
    }
  },

  syncActiveAddressUI() {
    const primary = CityData.addresses.find(a => a.isDefault) || CityData.addresses[0];
    if (!primary) return;

    CityData.user.address = primary.address;

    // Ensure primary address has valid lat & lng coordinates
    if (!primary.lat || !primary.lng) {
      const resolved = this.resolveTalegaonCoords(primary.address, primary.label || "", "");
      primary.lat = resolved.lat;
      primary.lng = resolved.lng;
    }

    // 1. Synchronize GPSTrackerEngine with the newly activated citizen doorstep location!
    if (typeof GPSTrackerEngine !== 'undefined') {
      GPSTrackerEngine.setCitizenLocation(primary.lat, primary.lng, primary.label || "Home", primary.address);
    }

    // 2. Synchronize Leaflet map marker & bounds
    if (typeof LeafletMapEngine !== 'undefined' && LeafletMapEngine.updateCitizenLocation) {
      LeafletMapEngine.updateCitizenLocation(primary.lat, primary.lng, primary.label || "Home", primary.address);
    }

    // 3. Create a clean short display name for top app location pills
    const parts = primary.address.split(',').map(s => s.trim());
    let displayLoc = primary.address;
    if (parts.length >= 2) {
      displayLoc = `${parts[0]}, ${parts[1]}`;
    } else {
      displayLoc = primary.address;
    }

    // 4. Update top location badges and pills across all screens
    const homeLoc = document.getElementById('home-location-text');
    if (homeLoc) homeLoc.textContent = displayLoc;

    const servLoc = document.getElementById('services-location-text');
    if (servLoc) servLoc.textContent = displayLoc;

    const repLoc = document.getElementById('report-location-text');
    if (repLoc) repLoc.textContent = displayLoc;

    const currLoc = document.getElementById('current-location-text');
    if (currLoc) currLoc.textContent = displayLoc;

    // 5. Update Profile screen information card
    const profAddr = document.getElementById('profile-info-address');
    if (profAddr) profAddr.textContent = primary.address;
    const profArea = document.getElementById('profile-info-area');
    if (profArea) profArea.textContent = primary.label || parts[0] || 'Talegaon Dabhade';
    const profPin = document.getElementById('profile-info-pincode');
    if (profPin && primary.pin) profPin.textContent = primary.pin;
    const profCoords = document.getElementById('profile-info-gps-coords');
    if (profCoords && primary.lat && primary.lng) {
      profCoords.textContent = `${primary.lat.toFixed(4)}°N, ${primary.lng.toFixed(4)}°E`;
    }

    // 6. Update user profile in localStorage
    try {
      const userProf = JSON.parse(localStorage.getItem('cityassist_user_profile') || '{}');
      userProf.address = primary.address;
      userProf.area = primary.label || parts[0] || 'Talegaon Dabhade';
      if (primary.pin) userProf.pincode = primary.pin;
      localStorage.setItem('cityassist_user_profile', JSON.stringify(userProf));
    } catch (e) {}

    this.persistSavedAddresses();
  },

  saveNewAddress() {
    const labelEl = document.getElementById('addr-input-label');
    const flatEl = document.getElementById('addr-input-flat');
    const streetEl = document.getElementById('addr-input-street');
    const cityEl = document.getElementById('addr-input-city');
    const pinEl = document.getElementById('addr-input-pin');
    const latEl = document.getElementById('addr-input-lat');
    const lngEl = document.getElementById('addr-input-lng');
    const defEl = document.getElementById('addr-input-default');

    const label = (labelEl && labelEl.value.trim()) || "Home";
    const flat = (flatEl && flatEl.value.trim()) || "";
    const street = (streetEl && streetEl.value.trim()) || "Samta Colony";
    const city = (cityEl && cityEl.value.trim()) || "Talegaon Dabhade, Pune";
    const pin = (pinEl && pinEl.value.trim()) || "410507";
    const isDefault = defEl ? defEl.checked : true;

    // Resolve accurate coordinates
    let lat = latEl && latEl.value ? parseFloat(latEl.value) : null;
    let lng = lngEl && lngEl.value ? parseFloat(lngEl.value) : null;

    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
      const resolved = this.resolveTalegaonCoords(street, city, pin);
      lat = resolved.lat;
      lng = resolved.lng;
    }

    const fullAddr = flat ? `${flat}, ${street}, ${city} - ${pin}` : `${street}, ${city} - ${pin}`;

    if (isDefault) {
      CityData.addresses.forEach(a => a.isDefault = false);
    }

    CityData.addresses.unshift({
      id: 'addr-' + Date.now(),
      label: label,
      address: fullAddr,
      flat: flat,
      street: street,
      city: city,
      pin: pin,
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      isDefault: isDefault
    });

    this.syncActiveAddressUI();
    this.showToast(`Saved "${label}" & switched active tracking location! 📍`);
    this.showAddressModal();
  },

  deleteAddress(index) {
    if (CityData.addresses.length <= 1) {
      this.showToast("You must keep at least one saved address.");
      return;
    }

    const removed = CityData.addresses[index];
    const wasDefault = removed.isDefault;

    CityData.addresses.splice(index, 1);

    if (wasDefault && CityData.addresses.length > 0) {
      CityData.addresses[0].isDefault = true;
    }

    this.syncActiveAddressUI();
    this.showToast(`Deleted "${removed.label}"`);
    this.showAddressModal();
  },

  setDefaultAddress(index) {
    if (!CityData.addresses[index]) return;

    CityData.addresses.forEach((a, i) => {
      a.isDefault = (i === index);
    });

    this.syncActiveAddressUI();
    const active = CityData.addresses[index];
    this.showToast(`Active Doorstep switched to "${active.label}"! 📍`);
    this.showAddressModal();
  },

  recenterGPS() {
    this.detectLiveGPSAddress();
  },

  showNotificationSettings() {
    this.openModal(`
      <div class="modal-header-block">
        <h3 style="font-size:1.3rem; font-weight:800; margin-bottom:4px;">⚙️ Notification Settings</h3>
        <p style="color:#64748B; font-size:0.88rem; margin-bottom:16px;">Customize your real-time alert preferences.</p>
      </div>
      <div style="display:flex; flex-direction:column; gap:14px; margin-bottom:24px;">
        <label style="display:flex; justify-content:space-between; align-items:center; font-size:0.95rem; font-weight:600; cursor:pointer;">
          <span>🚚 Waste Truck Proximity Voice & Chime</span>
          <input type="checkbox" checked onchange="CityAssist.showToast((this.checked ? '🔔 ' : '🔕 ') + 'Waste Truck Proximity: ' + (this.checked ? 'Enabled' : 'Disabled'))" style="width:20px; height:20px; accent-color:#0F7943; cursor:pointer;">
        </label>
        <label style="display:flex; justify-content:space-between; align-items:center; font-size:0.95rem; font-weight:600; cursor:pointer;">
          <span>🛠️ Civic Technician Arrival SMS</span>
          <input type="checkbox" checked onchange="CityAssist.showToast((this.checked ? '📱 ' : '🔕 ') + 'Technician SMS Alerts: ' + (this.checked ? 'Enabled' : 'Disabled'))" style="width:20px; height:20px; accent-color:#0F7943; cursor:pointer;">
        </label>
        <label style="display:flex; justify-content:space-between; align-items:center; font-size:0.95rem; font-weight:600; cursor:pointer;">
          <span>🌿 Community Cleanliness Drives</span>
          <input type="checkbox" onchange="CityAssist.showToast((this.checked ? '📢 ' : '🔕 ') + 'Community Drives: ' + (this.checked ? 'Subscribed' : 'Muted'))" style="width:20px; height:20px; accent-color:#0F7943; cursor:pointer;">
        </label>
        <label style="display:flex; justify-content:space-between; align-items:center; font-size:0.95rem; font-weight:600; cursor:pointer;">
          <span>🚨 Emergency Ward Advisories</span>
          <input type="checkbox" checked onchange="CityAssist.showToast((this.checked ? '🚨 ' : '🔕 ') + 'Emergency Advisories: ' + (this.checked ? 'High Priority' : 'Disabled'))" style="width:20px; height:20px; accent-color:#0F7943; cursor:pointer;">
        </label>
      </div>
      <button class="primary-green-btn" onclick="CityAssist.showToast('✓ Notification preferences saved!'); CityAssist.closeModal();">Save Preferences</button>
    `);
  },

  showHelpModal() {
    this.openModal(`
      <div class="modal-header-block">
        <h3 style="font-size:1.3rem; font-weight:800; margin-bottom:4px;">💬 Help & Support</h3>
        <p style="color:#64748B; font-size:0.88rem; margin-bottom:16px;">Get in touch with CityAssist Civic Care.</p>
      </div>
      <div style="background:#F8FAFC; border-radius:12px; padding:14px; margin-bottom:16px; font-size:0.9rem;">
        <div style="margin-bottom:8px;"><strong>Toll-Free Helpline:</strong><br><a href="tel:18002334567" style="color:#0F7943; font-weight:700;">1800 233 4567</a></div>
        <div style="margin-bottom:8px;"><strong>Citizen WhatsApp Bot:</strong><br><span style="color:#4B5563;">+91 98220 00000</span></div>
        <div><strong>Email:</strong><br><span style="color:#4B5563;">support@cityassist.gov.in</span></div>
      </div>
      <button class="primary-green-btn" onclick="CityAssist.closeModal()">Close</button>
    `);
  },

  showAboutModal() {
    this.openModal(`
      <div style="text-align:center; padding:10px 0 16px;">
        <div style="font-size:2.5rem; margin-bottom:8px;">🏙️</div>
        <h3 style="font-size:1.3rem; font-weight:800; color:#111827; margin-bottom:4px;">CityAssist</h3>
        <p style="font-size:0.85rem; color:#15803D; font-weight:700; margin-bottom:12px;">Together for a Cleaner Tomorrow</p>
        <p style="font-size:0.88rem; color:#4B5563; line-height:1.5; margin-bottom:20px;">
          An integrated municipal portal connecting citizens with sanitation squads, emergency repair technicians, and civic rewards.
        </p>
        <div style="font-size:0.8rem; color:#9CA3AF; margin-bottom:16px;">App Version 2.5.0 Production</div>
        <button class="primary-green-btn" onclick="CityAssist.closeModal()">Close</button>
      </div>
    `);
  },

  showCommunityModal() {
    this.openModal(`
      <div class="modal-header-block">
        <h3 style="font-size:1.3rem; font-weight:800; margin-bottom:4px;">📢 Community Updates</h3>
        <p style="color:#64748B; font-size:0.88rem; margin-bottom:16px;">Neighborhood clean-up drives and events.</p>
      </div>
      <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:20px;">
        <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px; padding:12px;">
          <div style="font-weight:700; color:#111827; margin-bottom:2px;">🌱 Sunday Sector 4 Tree Plantation Drive</div>
          <div style="font-size:0.8rem; color:#16A34A; font-weight:600; margin-bottom:4px;">Sunday, 30 Aug • 7:30 AM</div>
          <div style="font-size:0.85rem; color:#4B5563;">Join over 45 neighbors at Central Park to plant saplings!</div>
        </div>
      </div>
      <button class="primary-green-btn" onclick="CityAssist.showToast('Registered for Community Drive! +50 points'); CityAssist.closeModal();">RSVP for Drive</button>
    `);
  },

  clearNotifications() {
    this.closeModal();
    const dots = document.querySelectorAll('.notification-badge-dot');
    dots.forEach(d => d.style.display = 'none');
    this.showToast("All notifications marked as read ✓");
  },

  showNotificationsModal() {
    this.openModal(UIComponents.renderNotificationsModal());
  },

  openScannerModal() {
    this.openModal(UIComponents.renderScannerModal());
  },

  openCloudSettingsModal() {
    const currentProvider = (typeof CloudRealtime !== 'undefined') ? CloudRealtime.provider : 'supabase';
    const currentConfig = (typeof CloudRealtime !== 'undefined') ? CloudRealtime.config : {};
    const gmapsKey = (typeof GoogleMapsEngine !== 'undefined') ? GoogleMapsEngine.apiKey : '';

    const html = `
      <div class="cloud-settings-modal" style="padding: 10px 4px;">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:16px;">
          <div style="width:40px; height:40px; border-radius:10px; background:#DCFCE7; color:#15803D; display:flex; align-items:center; justify-content:center; font-size:1.3rem;">⚡</div>
          <div>
            <h3 style="font-size:1.15rem; font-weight:800; color:#0F172A; margin:0;">Cloud Realtime & Maps</h3>
            <p style="font-size:0.78rem; color:#64748B; margin:0;">Configure Supabase/Firebase & Google Maps</p>
          </div>
        </div>

        <div style="margin-bottom:14px;">
          <label style="font-size:0.8rem; font-weight:700; color:#334155; display:block; margin-bottom:6px;">Realtime Cloud Provider</label>
          <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px;">
            <button type="button" id="provider-btn-supabase" onclick="CityAssist.selectCloudProvider('supabase')" style="padding:8px 4px; border:2px solid ${currentProvider === 'supabase' ? '#16A34A' : '#E2E8F0'}; background:${currentProvider === 'supabase' ? '#F0FDF4' : '#FFF'}; border-radius:8px; font-weight:700; font-size:0.75rem; color:${currentProvider === 'supabase' ? '#15803D' : '#475569'}; cursor:pointer;">⚡ Supabase</button>
            <button type="button" id="provider-btn-firebase" onclick="CityAssist.selectCloudProvider('firebase')" style="padding:8px 4px; border:2px solid ${currentProvider === 'firebase' ? '#16A34A' : '#E2E8F0'}; background:${currentProvider === 'firebase' ? '#F0FDF4' : '#FFF'}; border-radius:8px; font-weight:700; font-size:0.75rem; color:${currentProvider === 'firebase' ? '#15803D' : '#475569'}; cursor:pointer;">🔥 Firebase</button>
            <button type="button" id="provider-btn-local" onclick="CityAssist.selectCloudProvider('local')" style="padding:8px 4px; border:2px solid ${currentProvider === 'local' ? '#16A34A' : '#E2E8F0'}; background:${currentProvider === 'local' ? '#F0FDF4' : '#FFF'}; border-radius:8px; font-weight:700; font-size:0.75rem; color:${currentProvider === 'local' ? '#15803D' : '#475569'}; cursor:pointer;">🌐 Local Mesh</button>
          </div>
        </div>

        <div id="supabase-config-fields" style="display:${currentProvider === 'supabase' ? 'block' : 'none'}; margin-bottom:12px; background:#F8FAFC; border:1px solid #E2E8F0; padding:12px; border-radius:10px;">
          <label style="font-size:0.75rem; font-weight:700; color:#475569; display:block; margin-bottom:4px;">Supabase Project URL</label>
          <input type="text" id="cfg-supabase-url" value="${currentConfig.supabaseUrl || 'https://mgypwawloputeqofscmg.supabase.co'}" placeholder="https://mgypwawloputeqofscmg.supabase.co" style="width:100%; padding:8px 10px; border:1px solid #CBD5E1; border-radius:6px; font-size:0.8rem; margin-bottom:8px;">

          <label style="font-size:0.75rem; font-weight:700; color:#475569; display:block; margin-bottom:4px;">Supabase Publishable / Anon Key</label>
          <input type="password" id="cfg-supabase-key" value="${currentConfig.supabaseKey || 'sb_publishable_tqmhRn5zoQT9Xf5ipiD6cA_TsPTpdgy'}" placeholder="sb_publishable_..." style="width:100%; padding:8px 10px; border:1px solid #CBD5E1; border-radius:6px; font-size:0.8rem; margin-bottom:8px;">

          <label style="font-size:0.75rem; font-weight:700; color:#475569; display:block; margin-bottom:4px;">Supabase Secret / Service Role Key</label>
          <input type="password" id="cfg-supabase-secret" value="${currentConfig.supabaseSecretKey || 'sb_secret_jjnQn6PwfWL42r50-TqfJg_ba54aStJ'}" placeholder="sb_secret_..." style="width:100%; padding:8px 10px; border:1px solid #CBD5E1; border-radius:6px; font-size:0.8rem;">
        </div>

        <div id="firebase-config-fields" style="display:${currentProvider === 'firebase' ? 'block' : 'none'}; margin-bottom:12px; background:#F8FAFC; border:1px solid #E2E8F0; padding:12px; border-radius:10px;">
          <label style="font-size:0.75rem; font-weight:700; color:#475569; display:block; margin-bottom:4px;">Firebase Realtime DB URL</label>
          <input type="text" id="cfg-firebase-dburl" value="${(currentConfig.firebaseConfig && currentConfig.firebaseConfig.databaseURL) || ''}" placeholder="https://myproject-rtdb.firebaseio.com" style="width:100%; padding:8px 10px; border:1px solid #CBD5E1; border-radius:6px; font-size:0.8rem; margin-bottom:8px;">

          <label style="font-size:0.75rem; font-weight:700; color:#475569; display:block; margin-bottom:4px;">Firebase Project ID</label>
          <input type="text" id="cfg-firebase-projectid" value="${(currentConfig.firebaseConfig && currentConfig.firebaseConfig.projectId) || ''}" placeholder="my-city-assist-app" style="width:100%; padding:8px 10px; border:1px solid #CBD5E1; border-radius:6px; font-size:0.8rem;">
        </div>

        <div style="margin-bottom:16px; background:#F0FDF4; border:1px solid #DCFCE7; padding:12px; border-radius:10px;">
          <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
            <span style="font-size:1rem;">🗺️</span>
            <label style="font-size:0.78rem; font-weight:800; color:#15803D;">Interactive Map Engine: Leaflet OpenStreetMap</label>
          </div>
          <p style="font-size:0.72rem; color:#166534; margin:0; line-height:1.4;">
            ✓ Active & Free: High-performance CARTO Voyager, ESRI Satellite, and Dark Matter vector tiles. <strong>No API keys or billing required!</strong>
          </p>
        </div>

        <div style="display:flex; gap:8px;">
          <button type="button" onclick="CityAssist.saveCloudSettings()" class="primary-green-btn" style="flex:1;">Save & Sync Cloud ⚡</button>
          <button type="button" onclick="CityAssist.closeModal()" style="background:#F1F5F9; color:#475569; border:none; padding:10px 16px; border-radius:10px; font-weight:700; cursor:pointer;">Cancel</button>
        </div>
      </div>
    `;

    this.openModal(html);
  },

  selectCloudProvider(provider) {
    window._selectedProvider = provider;
    ['supabase', 'firebase', 'local'].forEach(p => {
      const btn = document.getElementById(`provider-btn-${p}`);
      if (btn) {
        if (p === provider) {
          btn.style.borderColor = '#16A34A';
          btn.style.background = '#F0FDF4';
          btn.style.color = '#15803D';
        } else {
          btn.style.borderColor = '#E2E8F0';
          btn.style.background = '#FFF';
          btn.style.color = '#475569';
        }
      }
    });

    const supFields = document.getElementById('supabase-config-fields');
    const fireFields = document.getElementById('firebase-config-fields');
    if (supFields) supFields.style.display = provider === 'supabase' ? 'block' : 'none';
    if (fireFields) fireFields.style.display = provider === 'firebase' ? 'block' : 'none';
  },

  saveCloudSettings() {
    const provider = window._selectedProvider || ((typeof CloudRealtime !== 'undefined') ? CloudRealtime.provider : 'supabase');
    const supUrl = document.getElementById('cfg-supabase-url') ? document.getElementById('cfg-supabase-url').value.trim() : '';
    const supKey = document.getElementById('cfg-supabase-key') ? document.getElementById('cfg-supabase-key').value.trim() : '';
    const supSecret = document.getElementById('cfg-supabase-secret') ? document.getElementById('cfg-supabase-secret').value.trim() : '';
    const fireDb = document.getElementById('cfg-firebase-dburl') ? document.getElementById('cfg-firebase-dburl').value.trim() : '';
    const firePid = document.getElementById('cfg-firebase-projectid') ? document.getElementById('cfg-firebase-projectid').value.trim() : '';
    const gmapsKey = document.getElementById('cfg-gmaps-key') ? document.getElementById('cfg-gmaps-key').value.trim() : '';

    if (typeof CloudRealtime !== 'undefined') {
      CloudRealtime.saveConfig({
        provider: provider,
        supabaseUrl: supUrl || CloudRealtime.config.supabaseUrl,
        supabaseKey: supKey || CloudRealtime.config.supabaseKey,
        supabaseSecretKey: supSecret || CloudRealtime.config.supabaseSecretKey,
        firebaseConfig: {
          ...CloudRealtime.config.firebaseConfig,
          databaseURL: fireDb || CloudRealtime.config.firebaseConfig.databaseURL,
          projectId: firePid || CloudRealtime.config.firebaseConfig.projectId
        }
      });
    }

    if (gmapsKey && typeof GoogleMapsEngine !== 'undefined') {
      GoogleMapsEngine.setApiKey(gmapsKey);
    }

    this.closeModal();
    this.showToast(`⚡ Cloud Realtime & Maps configured (${provider.toUpperCase()})`);
  },

  handleLogout() {
    if (confirm("Are you sure you want to log out of CityAssist?")) {
      this.showToast("Logged out successfully");
      this.closeDrawer();
    }
  },

  _toastTimer: null,

  showToast(message) {
    const toast = document.getElementById('app-toast');
    const text = document.getElementById('toast-text');
    const iconEl = toast ? toast.querySelector('.toast-icon') : null;
    if (toast && text) {
      const emojiMatch = message.match(/^([\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF]|[\u{1F300}-\u{1F9FF}]|\p{Emoji_Presentation}|\p{Extended_Pictographic})/u);
      if (emojiMatch && iconEl) {
        iconEl.textContent = emojiMatch[0];
        text.textContent = message.replace(emojiMatch[0], '').trim();
      } else {
        if (iconEl) iconEl.textContent = '✓';
        text.textContent = message;
      }

      toast.classList.remove('visible');
      void toast.offsetWidth; // force reflow for pop animation
      toast.classList.add('visible');
      if (this._toastTimer) clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => {
        toast.classList.remove('visible');
      }, 2800);
    }
  }
};

/**
 * Real-Time Driver Engine & GPS Live Tracking
 */
const DriverEngine = {
  trackingMode: 'hardware',

  startCollection(mode = 'hardware') {
    this.trackingMode = mode;
    this.executeStart(mode);
  },

  executeStart(mode = 'hardware') {
    CityData.driver.status = "in_progress";
    CityData.driver.statusLabel = "In Progress";

    // Unlock Web Audio & Speech synthesis on user button tap
    if (typeof AudioAnnouncerEngine !== 'undefined') {
      AudioAnnouncerEngine.unlockAudio();
    }

    // UI Updates
    const startActions = document.getElementById('driver-start-actions');
    const startBtn = document.getElementById('btn-driver-start');
    if (startActions) startActions.style.display = 'none';
    else if (startBtn) startBtn.style.display = 'none';

    document.getElementById('driver-active-controls').style.display = 'grid';
    document.getElementById('btn-driver-pause').style.display = 'flex';
    document.getElementById('btn-driver-resume').style.display = 'none';
    
    document.getElementById('driver-gps-dot').classList.add('active');
    
    this.updateStatusBadge('in_progress');

    if (mode === 'hardware') {
      CityAssist.showToast("🛰️ Real Hardware GPS Active! Broadcasting real device coordinates.");
      if (typeof GPSTrackerEngine !== 'undefined') {
        GPSTrackerEngine.startLiveTracking('hardware');
      }
    } else {
      CityAssist.showToast("🚗 Demo Route Simulation Started! Audio alert armed for 300m approach.");
      if (typeof GPSTrackerEngine !== 'undefined') {
        GPSTrackerEngine.startLiveTracking('simulation');
      }
    }
  },

  pauseCollection() {
    CityData.driver.status = "paused";
    CityData.driver.statusLabel = "Paused";
    CityData.driver.speed = 0;

    document.getElementById('btn-driver-pause').style.display = 'none';
    document.getElementById('btn-driver-resume').style.display = 'flex';

    this.updateStatusBadge('paused');
    if (typeof GPSTrackerEngine !== 'undefined') {
      GPSTrackerEngine.pauseTracking();
    }

    CityAssist.showToast("Collection Paused by Driver");
  },

  resumeCollection() {
    CityData.driver.status = "in_progress";
    CityData.driver.statusLabel = "In Progress";

    document.getElementById('btn-driver-pause').style.display = 'flex';
    document.getElementById('btn-driver-resume').style.display = 'none';

    this.updateStatusBadge('in_progress');
    if (typeof GPSTrackerEngine !== 'undefined') {
      GPSTrackerEngine.resumeTracking();
    }
    CityAssist.showToast("Collection Resumed");
  },

  endCollection() {
    if (confirm("End collection shift and submit route log?")) {
      if (typeof GPSTrackerEngine !== 'undefined') {
        GPSTrackerEngine.stopLiveTracking();
      }
      CityData.driver.status = "completed";
      CityData.driver.statusLabel = "Completed";
      CityData.driver.speed = 0;
      CityData.driver.progressPct = 100;
      CityData.driver.etaMinutes = 0;

      this.updateStatusBadge('completed');
      
      document.getElementById('driver-gps-dot').classList.remove('active');
      const startActions = document.getElementById('driver-start-actions');
      const startBtn = document.getElementById('btn-driver-start');
      if (startActions) startActions.style.display = 'flex';
      else if (startBtn) startBtn.style.display = 'flex';
      document.getElementById('driver-active-controls').style.display = 'none';

      // Mark all stops done
      [0, 1, 2, 3].forEach(idx => {
        const item = document.getElementById(`stop-row-${idx}`);
        const tag = document.getElementById(`stop-status-${idx}`);
        if (item && tag) {
          item.className = 'driver-stop-item completed';
          tag.className = 'stop-status-tag done';
          tag.textContent = 'Completed';
        }
      });

      // Open shift summary modal
      CityAssist.openModal(`
        <div style="text-align:center; padding:10px 0 16px;">
          <div style="width:65px; height:65px; background:#DCFCE7; border-radius:50%; margin:0 auto 14px; display:flex; align-items:center; justify-content:center; font-size:2rem;">
            ✅
          </div>
          <h3 style="font-size:1.35rem; font-weight:800; color:#15803D; margin-bottom:6px;">Shift Completed!</h3>
          <p style="font-size:0.88rem; color:#4B5563; margin-bottom:16px;">
            Great job, <strong>Ramesh Shinde</strong>! All 4 waste checkpoints successfully serviced on Route 4B.
          </p>
          <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px; padding:14px; text-align:left; font-size:0.85rem; margin-bottom:20px;">
            <div><strong>Total Bins Collected:</strong> 135 Bins</div>
            <div style="margin-top:4px;"><strong>Waste Weight:</strong> ~ 4.8 Metric Tons</div>
            <div style="margin-top:4px;"><strong>Discharge Location:</strong> Sector 4 Processing Unit</div>
          </div>
          <button class="primary-green-btn" onclick="CityAssist.closeModal(); CityAssist.navigateTo('home');">
            Return to Citizen View
          </button>
        </div>
      `);
    }
  },

  updateStatusBadge(status) {
    const pill = document.getElementById('driver-status-pill');
    if (!pill) return;

    pill.className = `driver-status-badge status-${status.replace('_', '-')}`;
    if (status === 'in_progress') pill.textContent = 'In Progress';
    else if (status === 'paused') pill.textContent = 'Paused';
    else if (status === 'completed') pill.textContent = 'Completed';
    else pill.textContent = 'Not Started';
  },

  syncDriverDashboard(point) {
    // 1. Move Driver SVG Truck Pin
    const pin = document.getElementById('driver-moving-truck-pin');
    if (pin) {
      pin.setAttribute('transform', `translate(${point.x - 12}, ${point.y - 12})`);
    }

    // 2. Telemetry & Speed
    const coordsEl = document.getElementById('driver-telemetry-coords');
    if (coordsEl) coordsEl.textContent = `GPS: ${point.lat}° N, ${point.lng}° E`;

    const speedEl = document.getElementById('driver-speed-readout');
    if (speedEl) speedEl.textContent = `${point.speed} km/h`;

    const etaEl = document.getElementById('driver-eta-display');
    if (etaEl) etaEl.textContent = point.eta === 0 ? 'Arrived' : `${point.eta} mins`;

    // 3. Progress Bar & Stops Count
    const bar = document.getElementById('driver-progress-bar');
    if (bar) bar.style.width = `${point.pct}%`;

    const stopsCount = document.getElementById('driver-stops-count');
    if (stopsCount) stopsCount.textContent = `${point.stopIdx + 1} / 4 Stops`;

    const nextStopText = document.getElementById('driver-current-stop-name');
    if (nextStopText) {
      const stopObj = CityData.driver.stops[point.stopIdx];
      nextStopText.textContent = `Current: ${stopObj.name}`;
    }

    // 4. Update Stops Checklist
    [0, 1, 2, 3].forEach(idx => {
      const row = document.getElementById(`stop-row-${idx}`);
      const tag = document.getElementById(`stop-status-${idx}`);
      if (row && tag) {
        if (idx < point.stopIdx) {
          row.className = 'driver-stop-item completed';
          tag.className = 'stop-status-tag done';
          tag.textContent = 'Done';
        } else if (idx === point.stopIdx) {
          row.className = 'driver-stop-item active';
          tag.className = 'stop-status-tag current';
          tag.textContent = 'Current';
        } else {
          row.className = 'driver-stop-item';
          tag.className = 'stop-status-tag';
          tag.textContent = 'Pending';
        }
      }
    });
  },

  syncCitizenHomeMap(point) {
    // 1. Move Citizen SVG Mini Map Truck Marker
    const citizenMarker = document.getElementById('citizen-truck-marker');
    if (citizenMarker) {
      // Map percentage (0 to 100%) to citizen mini route (x: 30 to 250, y: 55 to 30)
      const citizenX = 30 + (point.pct / 100) * 220;
      const citizenY = 55 - Math.sin((point.pct / 100) * Math.PI) * 20;
      citizenMarker.setAttribute('transform', `translate(${citizenX}, ${citizenY})`);
    }

    // 2. Update Citizen ETA Pill
    const etaPill = document.getElementById('citizen-eta-pill');
    if (etaPill) {
      if (point.eta === 0) {
        etaPill.textContent = 'Arrived at your sector!';
        etaPill.style.background = '#DCFCE7';
        etaPill.style.color = '#15803D';
      } else {
        etaPill.textContent = `Arriving in ${point.eta} mins`;
        etaPill.style.background = '#EFF6FF';
        etaPill.style.color = '#1D4ED8';
      }
    }

    // 3. Update Status indicator in Citizen Home
    const statusText = document.getElementById('citizen-status-text');
    if (statusText) {
      if (CityData.driver.status === 'in_progress') {
        statusText.textContent = 'Live Tracking (Driver Active)';
      } else if (CityData.driver.status === 'paused') {
        statusText.textContent = 'Vehicle Temporarily Stopped';
      } else if (CityData.driver.status === 'completed') {
        statusText.textContent = 'Daily Collection Completed';
      }
    }

    // 4. Also update Municipality Fleet live position
    const muniTruck = document.getElementById('muni-truck-1');
    if (muniTruck) {
      const muniX = 40 + (point.pct / 100) * 220;
      const muniY = 48 + Math.sin((point.pct / 100) * Math.PI) * 35;
      muniTruck.setAttribute('transform', `translate(${muniX}, ${muniY})`);
    }

    // 5. Also update Dedicated Garbage Tracking Screen (#screen-garbage)
    const gtDistance = document.getElementById('gt-distance-text');
    const gtEta = document.getElementById('gt-eta-text');
    const gtFill = document.getElementById('gt-stepper-fill');
    const gtTruckMarker = document.getElementById('gt-map-truck-marker');

    if (gtDistance && gtEta) {
      if (point.pct >= 90) {
        gtDistance.textContent = 'Vehicle is 100 m away';
        gtEta.textContent = 'Arrived at your sector!';
        if (gtFill) gtFill.style.width = '100%';
        this.updateGtStepper(3);
      } else if (point.pct >= 60) {
        gtDistance.textContent = 'Vehicle is 0.6 km away';
        gtEta.textContent = `Expected in ${point.eta || 2} mins`;
        if (gtFill) gtFill.style.width = '66%';
        this.updateGtStepper(2);
      } else if (point.pct >= 30) {
        gtDistance.textContent = 'Vehicle is 1.2 km away';
        gtEta.textContent = `Expected in ${point.eta || 5} mins`;
        if (gtFill) gtFill.style.width = '33%';
        this.updateGtStepper(1);
      } else {
        gtDistance.textContent = 'Vehicle is 2.4 km away';
        gtEta.textContent = `Expected in ${point.eta || 14} mins`;
        if (gtFill) gtFill.style.width = '15%';
        this.updateGtStepper(0);
      }
    }

    if (gtTruckMarker) {
      const mapX = 220 - (point.pct / 100) * 135;
      const mapY = 15 + (point.pct / 100) * 170;
      gtTruckMarker.setAttribute('transform', `translate(${mapX}, ${mapY})`);
    }

    // Trigger Audio Announcer Proximity Chime
    if (window.AudioAnnouncerEngine && CityData.driver.status === 'in_progress') {
      const distKm = point.pct >= 90 ? 0.1 : (point.pct >= 60 ? 0.6 : (point.pct >= 30 ? 1.2 : 2.4));
      AudioAnnouncerEngine.onProximityUpdate(distKm, point.eta || 5, CityData.driver.status);
    }

    // 6. Also update Home Screen mini map preview
    const homeProximity = document.getElementById('home-proximity-text');
    const homeMiniTruck = document.getElementById('home-mini-truck-marker');
    if (homeProximity) {
      if (point.pct >= 90) {
        homeProximity.innerHTML = 'Vehicle is 100<br>m away';
      } else if (point.pct >= 60) {
        homeProximity.innerHTML = 'Vehicle is 0.6<br>km away';
      } else if (point.pct >= 30) {
        homeProximity.innerHTML = 'Vehicle is 1.2<br>km away';
      } else {
        homeProximity.innerHTML = 'Vehicle is 2.4<br>km away';
      }
    }
    if (homeMiniTruck) {
      const hX = 25 + (point.pct / 100) * 90;
      const hY = 78 - (point.pct / 100) * 45;
      homeMiniTruck.setAttribute('transform', `translate(${hX}, ${hY})`);
    }
  },

  updateGtStepper(activeIdx) {
    [0, 1, 2, 3].forEach(idx => {
      const step = document.getElementById(`gt-step-${idx}`);
      if (step) {
        step.className = 'gt-step-item';
        const circle = step.querySelector('.gt-step-circle');
        const label = step.querySelector('.gt-step-label');
        if (idx < activeIdx) {
          step.classList.add('completed');
          if (circle) circle.className = 'gt-step-circle';
          if (label) label.className = 'gt-step-label';
        } else if (idx === activeIdx) {
          step.classList.add('active');
          if (circle) circle.className = 'gt-step-circle solid-green';
          if (label) label.className = 'gt-step-label active-bold';
        } else {
          if (circle) circle.className = 'gt-step-circle pending-grey';
          if (label) label.className = 'gt-step-label';
        }
      }
    });
  }
};

/**
 * Municipality Authority Command Center Controller
 */
const MunicipalityEngine = {
  init() {
    this.renderTriageList();
    this.renderStats();
  },

  renderStats() {
    const fleetEl = document.getElementById('muni-kpi-fleet');
    if (fleetEl) fleetEl.textContent = `${CityData.municipality.activeFleetCount} / ${CityData.municipality.totalFleetCount}`;

    const tonsEl = document.getElementById('muni-kpi-tons');
    if (tonsEl) tonsEl.textContent = `${CityData.municipality.dailyTonsCollected} T`;

    const repEl = document.getElementById('muni-kpi-reports');
    if (repEl) repEl.textContent = `${CityData.municipality.openReportsCount} Open`;

    const sosEl = document.getElementById('muni-kpi-sos');
    if (sosEl) sosEl.textContent = `${CityData.municipality.activeSosCount} Alert`;
  },

  renderTriageList() {
    const list = document.getElementById('muni-triage-list');
    const queueBadge = document.getElementById('muni-queue-count');
    if (!list) return;

    const pendingCount = CityData.municipality.triageQueue.filter(i => i.status === 'pending').length;
    if (queueBadge) queueBadge.textContent = `${pendingCount} Pending Triage`;

    list.innerHTML = CityData.municipality.triageQueue.map(item => `
      <div class="muni-triage-card" data-triage-id="${item.id}">
        <div class="triage-top-row">
          <span class="triage-id-tag">${item.id}</span>
          <span class="triage-category-pill">${item.category}</span>
          ${item.priority ? `
            <span style="font-size:0.7rem; font-weight:800; padding:2px 8px; border-radius:10px; background:${item.priority.includes('Critical') ? '#FEE2E2' : '#FEF3C7'}; color:${item.priority.includes('Critical') ? '#DC2626' : '#D97706'};">
              ${item.priority}
            </span>
          ` : ''}
        </div>
        
        <div class="triage-desc">${item.title}</div>
        
        <div style="font-size:0.75rem; color:#60A5FA; margin-bottom:4px; font-weight:700;">
          🤖 AI Triage: ${item.aiConfidence || '95%'} confidence • ${item.department || 'PMC Sanitation Squad'}
        </div>

        <div class="triage-location">📍 ${item.location} • <span style="color:#64748B;">${item.time}</span></div>
        
        <div class="triage-actions-row">
          <div>
            ${item.assignedSquad ? `
              <span style="font-size:0.75rem; color:#34D399; font-weight:700;">✓ Assigned: ${item.assignedSquad}</span>
            ` : `
              <span style="font-size:0.75rem; color:#F59E0B; font-weight:700;">● Unassigned</span>
            `}
          </div>
          <div style="display:flex; gap:6px;">
            ${item.status === 'pending' ? `
              <button class="btn-assign-squad" onclick="MunicipalityEngine.assignSquad('${item.id}')">
                Assign Squad
              </button>
            ` : (item.status === 'assigned' ? `
              <button class="btn-resolve-ticket" onclick="MunicipalityEngine.resolveTicket('${item.id}')">
                Mark Resolved & Award Citizen (+50 Pts)
              </button>
            ` : `
              <span style="font-size:0.75rem; color:#10B981; font-weight:800;">✓ Resolved & Rewarded (+50 Pts)</span>
            `)}
          </div>
        </div>
      </div>
    `).join('');
  },

  assignSquad(itemId) {
    const item = CityData.municipality.triageQueue.find(i => i.id === itemId);
    if (item) {
      item.status = 'assigned';
      item.assignedSquad = "Sector 2 Rapid Squad #1";
      this.renderTriageList();
      CityAssist.showToast(`Sanitation Squad assigned to ${itemId}`);
    }
  },

  resolveTicket(itemId) {
    const item = CityData.municipality.triageQueue.find(i => i.id === itemId);
    if (item) {
      item.status = 'resolved';
      if (CityData.municipality.openReportsCount > 0) {
        CityData.municipality.openReportsCount--;
      }

      // Close the Reward Loop: Award +50 Civic Points to reporting citizen
      CityData.user.points += 50;

      // Update points everywhere on UI
      document.querySelectorAll('.bold-num').forEach(el => {
        if (el.textContent.includes('1,')) {
          el.textContent = CityData.user.points.toLocaleString();
        }
      });

      // Update citizen requests list
      const req = CityData.requests.find(r => r.id === itemId);
      if (req) {
        req.status = 'resolved';
        req.statusLabel = 'Resolved';
        req.filterGroup = 'resolved';
      }

      // Add push notification for citizen
      CityData.notifications.unshift({
        id: Date.now(),
        title: "Civic Reward Credited! 🏆",
        desc: `PMC verified and resolved ${itemId}. +50 Civic Points added to your wallet!`,
        time: "Just now",
        unread: true
      });

      this.renderStats();
      this.renderTriageList();
      CityAssist.renderRequestsList();
      
      CityAssist.showToast(`🎉 Ticket ${itemId} Resolved! +50 Civic Points awarded to citizen.`);
    }
  }
};

// Hook into CityAssist for global buttons
CityAssist.refreshMuniData = function() {
  CityData.municipality.dailyTonsCollected = Number((CityData.municipality.dailyTonsCollected + 0.3).toFixed(1));
  MunicipalityEngine.renderStats();
  MunicipalityEngine.renderTriageList();
  CityAssist.showToast("Command center telemetry refreshed");
};

CityAssist.broadcastCityAlert = function() {
  const msg = prompt("Enter municipal advisory message for citizen broadcasts:", "Reminder: Segregate dry and wet waste today for door-to-door collection.");
  if (msg) {
    CityData.notifications.unshift({
      id: Date.now(),
      title: "📢 PMC Ward Advisory",
      time: "Just now",
      desc: msg
    });
    CityAssist.showToast("Advisory broadcasted to all citizens in Ward 4");
  }
};

CityAssist.toggleCommunitySearch = function() {
  const box = document.getElementById('community-search-box');
  if (box) {
    box.style.display = box.style.display === 'none' ? 'block' : 'none';
    if (box.style.display === 'block') {
      const input = document.getElementById('community-search-input');
      if (input) input.focus();
    }
  }
};

CityAssist.viewFullImage = function(src) {
  CityAssist.openModal(`
    <div style="text-align:center;">
      <img src="${src}" style="width:100%; max-height:60vh; border-radius:14px; object-fit:cover; margin-bottom:12px;" alt="Full image">
      <button class="primary-green-btn" onclick="CityAssist.closeModal()">Close</button>
    </div>
  `);
};

/**
 * Community Feed Engine
 */
const CommunityEngine = {
  currentCategory: 'all',
  uploadedPhoto: null,

  init() {
    this.renderFeed();
  },

  renderFeed(filtered = null) {
    const feed = document.getElementById('community-posts-feed');
    if (!feed) return;

    const posts = filtered || this.getFilteredPosts();

    if (posts.length === 0) {
      feed.innerHTML = `
        <div style="text-align:center; padding:40px 20px; color:#6B7280;">
          <div style="font-size:2.5rem; margin-bottom:10px;">💬</div>
          <h3 style="font-size:1.1rem; font-weight:700; color:#111827;">No posts in this category</h3>
          <p style="font-size:0.85rem; margin-top:4px;">Be the first to share an update or appreciation!</p>
        </div>
      `;
      return;
    }

    feed.innerHTML = posts.map(post => UIComponents.renderCommunityPost(post)).join('');
  },

  getFilteredPosts() {
    if (this.currentCategory === 'all') {
      return CityData.communityPosts;
    }
    return CityData.communityPosts.filter(p => p.category === this.currentCategory);
  },

  filterCategory(category, element) {
    this.currentCategory = category;
    
    // Update active tile
    document.querySelectorAll('.comm-category-tile').forEach(tile => {
      tile.classList.remove('active');
    });
    if (element) element.classList.add('active');

    this.renderFeed();
  },

  handleSearch(query) {
    const q = query.toLowerCase().trim();
    if (!q) {
      this.renderFeed();
      return;
    }
    const filtered = CityData.communityPosts.filter(p => 
      p.text.toLowerCase().includes(q) || 
      p.author.name.toLowerCase().includes(q) ||
      p.badgeText.toLowerCase().includes(q)
    );
    this.renderFeed(filtered);
  },

  toggleLike(postId) {
    const post = CityData.communityPosts.find(p => p.id === postId);
    if (post) {
      post.isLiked = !post.isLiked;
      post.likes += post.isLiked ? 1 : -1;
      this.renderFeed();
      if (post.isLiked) CityAssist.showToast("Liked post ❤️");
    }
  },

  toggleBookmark(postId) {
    const post = CityData.communityPosts.find(p => p.id === postId);
    if (post) {
      post.isBookmarked = !post.isBookmarked;
      this.renderFeed();
      CityAssist.showToast(post.isBookmarked ? "Post saved to bookmarks" : "Post removed from bookmarks");
    }
  },

  openCommentsModal(postId) {
    const post = CityData.communityPosts.find(p => p.id === postId);
    if (!post) return;

    CityAssist.openModal(`
      <div class="modal-header-block">
        <h3 style="font-size:1.25rem; font-weight:800; margin-bottom:4px;">💬 Comments (${post.comments})</h3>
        <p style="color:#64748B; font-size:0.85rem; margin-bottom:14px;">Discussion on "${post.author.name}'s" post</p>
      </div>

      <div style="display:flex; flex-direction:column; gap:12px; max-height:220px; overflow-y:auto; margin-bottom:16px;">
        <div style="background:#F8FAFC; border:1px solid #E2E8F0; padding:10px 12px; border-radius:10px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
            <strong style="font-size:0.85rem;">Sunil Joshi</strong>
            <span style="font-size:0.75rem; color:#94A3B8;">1h ago</span>
          </div>
          <p style="font-size:0.82rem; color:#4B5563;">Totally agree! Sector 2 is looking much cleaner lately.</p>
        </div>
        <div style="background:#F8FAFC; border:1px solid #E2E8F0; padding:10px 12px; border-radius:10px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
            <strong style="font-size:0.85rem;">Pooja Kulkarni</strong>
            <span style="font-size:0.75rem; color:#94A3B8;">45m ago</span>
          </div>
          <p style="font-size:0.82rem; color:#4B5563;">Kudos to the entire municipal team! 👏</p>
        </div>
      </div>

      <div style="display:flex; gap:8px;">
        <input type="text" id="add-comment-input" placeholder="Write a comment..." style="flex:1; padding:10px 12px; border:1px solid #CBD5E1; border-radius:10px; font-size:0.88rem; outline:none;">
        <button onclick="CommunityEngine.postComment('${post.id}')" style="background:#0F7943; color:#fff; border:none; padding:10px 16px; border-radius:10px; font-weight:700; cursor:pointer;">Send</button>
      </div>
    `);
  },

  postComment(postId) {
    const input = document.getElementById('add-comment-input');
    if (input && input.value.trim()) {
      const post = CityData.communityPosts.find(p => p.id === postId);
      if (post) {
        post.comments++;
        this.renderFeed();
      }
      CityAssist.closeModal();
      CityAssist.showToast("Comment posted!");
    }
  },

  handlePointerStart(e, postId) {
    if (e.target && e.target.setPointerCapture) {
      try { e.target.setPointerCapture(e.pointerId); } catch(err){}
    }
    this.handleSliderMove(e, postId);
  },

  handleSliderMove(e, postId) {
    const container = document.getElementById(`ba-container-${postId}`);
    const beforeLayer = document.getElementById(`ba-before-layer-${postId}`);
    const handle = document.getElementById(`ba-handle-${postId}`);
    if (!container || !beforeLayer || !handle) return;

    const rect = container.getBoundingClientRect();
    const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : rect.left + rect.width / 2);
    const x = clientX - rect.left;
    let pct = (x / rect.width) * 100;
    pct = Math.max(0, Math.min(100, pct));

    beforeLayer.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
    handle.style.left = `${pct}%`;
  },

  handleSliderTouch(e, postId) {
    if (e.touches && e.touches[0]) {
      this.handleSliderMove(e.touches[0], postId);
    }
  },

  postFormat: 'standard',
  uploadedPhoto: null,
  uploadedBeforePhoto: null,
  uploadedAfterPhoto: null,

  openCreatePostModal() {
    this.postFormat = 'standard';
    this.uploadedPhoto = null;
    this.uploadedBeforePhoto = null;
    this.uploadedAfterPhoto = null;
    CityAssist.openModal(UIComponents.renderCreatePostModal());
  },

  setPostFormat(format) {
    this.postFormat = format;
    const btnStd = document.getElementById('tab-post-format-standard');
    const btnBA = document.getElementById('tab-post-format-beforeafter');
    const secStd = document.getElementById('section-upload-standard');
    const secBA = document.getElementById('section-upload-beforeafter');

    if (format === 'beforeafter') {
      if (btnStd) {
        btnStd.style.background = '#F8FAFC';
        btnStd.style.borderColor = '#E2E8F0';
        btnStd.style.color = '#64748B';
      }
      if (btnBA) {
        btnBA.style.background = '#F0FDF4';
        btnBA.style.borderColor = '#0F7943';
        btnBA.style.color = '#15803D';
      }
      if (secStd) secStd.style.display = 'none';
      if (secBA) secBA.style.display = 'block';
    } else {
      if (btnStd) {
        btnStd.style.background = '#F0FDF4';
        btnStd.style.borderColor = '#0F7943';
        btnStd.style.color = '#15803D';
      }
      if (btnBA) {
        btnBA.style.background = '#F8FAFC';
        btnBA.style.borderColor = '#E2E8F0';
        btnBA.style.color = '#64748B';
      }
      if (secStd) secStd.style.display = 'block';
      if (secBA) secBA.style.display = 'none';
    }
  },

  handlePostPhoto(event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.uploadedPhoto = e.target.result;
        const box = document.getElementById('post-photo-preview-box');
        if (box) {
          box.innerHTML = `
            <img src="${this.uploadedPhoto}" style="max-height:80px; border-radius:8px; object-fit:cover;" alt="Preview">
            <div style="font-size:0.75rem; color:#15803D; font-weight:700; margin-top:4px;">Photo attached • Analyzing...</div>
          `;
        }

        // Analyze image filename / content to guess intent
        const fileName = (file.name || '').toLowerCase();
        let detectedIntent = 'complaint';
        let detectedSub = 'bin_overflow';

        if (fileName.includes('tree') || fileName.includes('plant') || fileName.includes('garden') || fileName.includes('green') || fileName.includes('clean')) {
          detectedIntent = 'appreciation';
          detectedSub = 'plantation';
        } else if (fileName.includes('pothole') || fileName.includes('road')) {
          detectedIntent = 'complaint';
          detectedSub = 'pothole';
        } else if (fileName.includes('light') || fileName.includes('bulb') || fileName.includes('dark')) {
          detectedIntent = 'complaint';
          detectedSub = 'streetlight';
        } else if (fileName.includes('worker') || fileName.includes('staff')) {
          detectedIntent = 'appreciation';
          detectedSub = 'sanitation_kudos';
        }

        this.triggerCommunityAIVision(detectedIntent, detectedSub);
      };
      reader.readAsDataURL(file);
    }
  },

  handleBeforePhoto(event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.uploadedBeforePhoto = e.target.result;
        const box = document.getElementById('post-before-preview-box');
        if (box) {
          box.innerHTML = `
            <img src="${this.uploadedBeforePhoto}" style="width:100%; height:75px; border-radius:8px; object-fit:cover;" alt="Before Preview">
            <div style="font-size:0.7rem; color:#DC2626; font-weight:800; margin-top:3px;">✓ Before Photo Ready</div>
          `;
        }
      };
      reader.readAsDataURL(file);
    }
  },

  handleAfterPhoto(event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.uploadedAfterPhoto = e.target.result;
        const box = document.getElementById('post-after-preview-box');
        if (box) {
          box.innerHTML = `
            <img src="${this.uploadedAfterPhoto}" style="width:100%; height:75px; border-radius:8px; object-fit:cover;" alt="After Preview">
            <div style="font-size:0.7rem; color:#15803D; font-weight:800; margin-top:3px;">✓ After Photo Ready</div>
          `;
        }
      };
      reader.readAsDataURL(file);
    }
  },

  loadSampleBeforeAfter() {
    this.uploadedBeforePhoto = "https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?w=700&auto=format&fit=crop&q=80";
    this.uploadedAfterPhoto = "https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=700&auto=format&fit=crop&q=80";

    const boxBefore = document.getElementById('post-before-preview-box');
    if (boxBefore) {
      boxBefore.innerHTML = `
        <img src="${this.uploadedBeforePhoto}" style="width:100%; height:75px; border-radius:8px; object-fit:cover;" alt="Before Preview">
        <div style="font-size:0.7rem; color:#DC2626; font-weight:800; margin-top:3px;">✓ Before Sample Loaded</div>
      `;
    }

    const boxAfter = document.getElementById('post-after-preview-box');
    if (boxAfter) {
      boxAfter.innerHTML = `
        <img src="${this.uploadedAfterPhoto}" style="width:100%; height:75px; border-radius:8px; object-fit:cover;" alt="After Preview">
        <div style="font-size:0.7rem; color:#15803D; font-weight:800; margin-top:3px;">✓ After Sample Loaded</div>
      `;
    }

    const textInput = document.getElementById('new-post-text-input');
    if (textInput && !textInput.value) {
      textInput.value = "Transforming our local lane! We gathered 8 neighbors to clear the illegal debris corner and planted fresh bougainvillea pots.";
    }

    CityAssist.showToast("Sample Before & After photos loaded! 🌿");
  },

  presetScenarios: {
    overflowing_bin: {
      url: 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?w=700&auto=format&fit=crop&q=80',
      label: '🚨 Overflowing Garbage Bin',
      intent: 'complaint',
      subCategory: 'bin_overflow'
    },
    road_pothole: {
      url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=700&auto=format&fit=crop&q=80',
      label: '🕳️ Hazardous Road Pothole',
      intent: 'complaint',
      subCategory: 'pothole'
    },
    broken_streetlight: {
      url: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=700&auto=format&fit=crop&q=80',
      label: '💡 Dark Blindspot / Streetlight Down',
      intent: 'complaint',
      subCategory: 'streetlight'
    },
    tree_plantation: {
      url: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=700&auto=format&fit=crop&q=80',
      label: '🌺 Neighborhood Tree Plantation',
      intent: 'appreciation',
      subCategory: 'plantation'
    },
    sanitation_gratitude: {
      url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=700&auto=format&fit=crop&q=80',
      label: '💛 Sanitation Staff Appreciation',
      intent: 'appreciation',
      subCategory: 'sanitation_kudos'
    }
  },

  loadPresetScenario(key) {
    const scenario = this.presetScenarios[key];
    if (!scenario) return;

    this.postFormat = 'standard';
    this.uploadedPhoto = scenario.url;
    this.currentDetectedScenario = scenario;

    const box = document.getElementById('post-photo-preview-box');
    if (box) {
      box.innerHTML = `
        <img src="${this.uploadedPhoto}" style="max-height:80px; border-radius:8px; object-fit:cover;" alt="Preview">
        <div style="font-size:0.75rem; color:${scenario.intent === 'complaint' ? '#DC2626' : '#15803D'}; font-weight:800; margin-top:4px;">
          ✓ ${scenario.label}
        </div>
      `;
    }
    this.triggerCommunityAIVision(scenario.intent, scenario.subCategory);
  },

  loadSampleComplaint() {
    this.loadPresetScenario('overflowing_bin');
  },

  loadSampleAppreciation() {
    this.loadPresetScenario('tree_plantation');
  },

  /**
   * Dynamic Natural Language Generation (NLG) based on detected visual scene
   */
  generateCivicDescription(intent, subCategory, userText = '') {
    const landmarks = ['Samta Colony Gate 2', 'Jijamata Chowk', 'Talegaon Station Road', 'Maratha Colony', 'Swarajya Chowk', 'Ward 2 Market Area'];
    const randomLandmark = landmarks[Math.floor(Math.random() * landmarks.length)];

    const complaintCatalogs = {
      bin_overflow: {
        title: 'Overflowing Municipal Dumpster',
        templates: [
          `⚠️ Urgent Civic Attention Needed in Talegaon (${randomLandmark}): The community collection dumpster is completely filled beyond capacity with garbage spilling onto the sidewalk. Requesting prompt clearing by PMC sanitization team to maintain public hygiene.`,
          `🚨 Sanitation Grievance (${randomLandmark}): Waste collection bin has been overflowing for the past 24 hours. Stray animals are scattering plastic waste across the street. Immediate municipal loader dispatch requested.`,
          `⚠️ Public Health Concern: Severe garbage buildup observed around the collection point at ${randomLandmark}, Talegaon. Urging municipal waste management authorities for quick clearance.`
        ],
        hashtags: '#TalegaonCivicIssue #BinOverflow #CleanTalegaon #Ward2Sanitation #MunicipalActionNeeded'
      },
      pothole: {
        title: 'Hazardous Road Pothole & Waterlogging',
        templates: [
          `⚠️ Road Safety Hazard in Talegaon (${randomLandmark}): Dangerous deep potholes formed on the main transit lane, posing a severe skid risk to two-wheeler commuters. Asphalt leveling and cold-mix patch repair requested immediately.`,
          `🚨 Commuter Safety Alert: Deep road crater near ${randomLandmark} is worsening with daily vehicle traffic. Immediate bituminous resurfacing needed from the PMC engineering division before rain causes accidents.`,
          `⚠️ Infrastructure Defect Notice: Large asphalt depression at ${randomLandmark} causing traffic bottlenecks and vehicle suspension damage. Urgent civic restoration requested.`
        ],
        hashtags: '#TalegaonRoadSafety #PotholeAlert #SafeStreets #CivicRepairs #PMCInfrastructure'
      },
      streetlight: {
        title: 'Non-Functional Streetlight / Dark Safety Zone',
        templates: [
          `⚠️ Public Safety Notice (${randomLandmark}): Streetlight fixture is completely non-functional, creating a dark hazard zone for evening pedestrians and senior citizens. Urgent LED bulb replacement requested.`,
          `🚨 Night Security Concern: Two consecutive streetlights out along ${randomLandmark}, Talegaon. Requesting the municipal electrical maintenance division to inspect and restore street illumination.`,
          `⚠️ Civic Utility Breakdown: Dark corridor created due to blown streetlamp at ${randomLandmark}. Please schedule a maintenance ladder van to fix the illumination.`
        ],
        hashtags: '#StreetlightFix #TalegaonNightSafety #Ward2Utilities #SafeNeighborhood #PMCElectrical'
      },
      water_leak: {
        title: 'Potable Drinking Water Pipeline Leakage',
        templates: [
          `⚠️ Clean Water Wastage Alert (${randomLandmark}): Underground municipal supply pipe joint is leaking heavily. Clean drinking water has been flooding the pavement since morning. Urgent valve clamp repair needed.`,
          `🚨 Water Infrastructure Issue: Pipeline burst near ${randomLandmark}, Talegaon causing localized flooding and water pressure drop in nearby residences. Requesting prompt PMC Water Works repair.`,
          `⚠️ Water Conservation Notice: Continuous pipeline overflow observed at ${randomLandmark}. Immediate technician dispatch requested to prevent clean water loss.`
        ],
        hashtags: '#SaveWaterTalegaon #WaterLeakAlert #PMCWaterWorks #ConserveWater #TalegaonCivic'
      },
      general_complaint: {
        title: 'Civic Issue & Public Maintenance Request',
        templates: [
          `⚠️ Civic Maintenance Needed at ${randomLandmark}, Talegaon: Observed unaddressed municipal maintenance defect impacting local residents. Requesting prompt inspection by the ward officer.`,
          `🚨 Citizen Civic Report: Public amenity issue spotted in ${randomLandmark}. Urging Talegaon Municipal Corporation for timely resolution and site cleanup.`
        ],
        hashtags: '#TalegaonCivicAlert #Ward2Action #CleanCity #CitizenVoice #MunicipalSupport'
      }
    };

    const appreciationCatalogs = {
      plantation: {
        title: 'Neighborhood Green Tree Plantation',
        templates: [
          `🌺 Green Talegaon Initiative (${randomLandmark}): Local residents and volunteers came together to plant native flowering saplings and bougainvillea along our street. Creating a greener, healthier community for everyone!`,
          `🌿 Community Greenery Drive: Proud of our neighborhood teamwork in ${randomLandmark}! We transformed a barren street curb into a vibrant green micro-garden. Let us nurture and protect our urban trees.`,
          `🌳 Swachh Talegaon Pride: Adding more greenery to Ward 2! Inspiring weekend tree adoption drive completed by local youth and seniors. Every tree counts!`
        ],
        hashtags: '#GreenTalegaon #TreePlantation #SwachhBharat #EcoFriendlyTalegaon #CommunityPride'
      },
      sanitation_kudos: {
        title: 'PMC Sanitation Workers Appreciation',
        templates: [
          `💛 Sincere Gratitude to PMC Sanitation Squad #4! Punctual doorstep collection and thorough street sweeping around ${randomLandmark} this morning. Unsung heroes keeping Talegaon spotless every day!`,
          `👏 Appreciation Post: Impressed by the rapid, courteous response of the Talegaon municipal sanitization crew. Cleared our community point within 45 minutes of request. Outstanding dedication!`,
          `🌟 Big thanks to our daily municipal workers for keeping Talegaon Dabhade hygienic and clean, rain or shine. Let us support them by practicing 100% waste segregation at home!`
        ],
        hashtags: '#SanitationHeroes #TalegaonPMC #CleanCityChampion #GratitudeToWorkers #RespectSanitation'
      },
      before_after: {
        title: 'Community Clean-Up Transformation',
        templates: [
          `🌱 Remarkable Before & After at ${randomLandmark}, Talegaon! Together with neighborhood volunteers, we cleared 40kg of discarded plastics and beautified the space with flowering pots. Proud of our community spirit!`,
          `✨ Check out this amazing transformation! What was once a littered corner near ${randomLandmark} is now clean, green, and completely transformed. Citizen teamwork makes all the difference!`,
          `🌿 Before vs After Community Action: Transformed an illegal dumping corner into a pristine neighborhood space. Proud to keep Talegaon clean and green!`
        ],
        hashtags: '#BeforeAndAfter #CleanTalegaon #ZeroLitter #CommunityAction #SwachhTalegaon'
      },
      general_appreciation: {
        title: 'Community Cleanliness Appreciation',
        templates: [
          `✨ Wonderful community cleanliness update from ${randomLandmark}! Great coordination between active residents and municipal staff to maintain our neighborhood.`,
          `💛 Clean Talegaon Pride: Inspiring community efforts in ${randomLandmark}. Let's continue supporting civic hygiene and eco-friendly living!`
        ],
        hashtags: '#TalegaonCleanAndGreen #SwachhTalegaon #CommunitySpirit #ResponsibleCitizen'
      }
    };

    let catalogGroup = intent === 'complaint' ? complaintCatalogs : appreciationCatalogs;
    let selectedCatalog = catalogGroup[subCategory] || (intent === 'complaint' ? catalogGroup.bin_overflow : catalogGroup.plantation);

    const templates = selectedCatalog.templates;
    const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
    const fullText = `${randomTemplate}\n\n${selectedCatalog.hashtags}`;

    return {
      title: selectedCatalog.title,
      text: fullText,
      hashtags: selectedCatalog.hashtags
    };
  },

  /**
   * HTML5 Canvas Image Pixel Analysis Engine
   */
  analyzeImagePixelsAsync(imageSrc, callback) {
    if (!imageSrc) {
      callback({ intent: 'complaint', subCategory: 'bin_overflow', confidence: 96.5 });
      return;
    }

    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const size = 64;
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);

        const imgData = ctx.getImageData(0, 0, size, size);
        const data = imgData.data;
        const total = size * size;

        let green = 0, dark = 0, bright = 0, gray = 0, blue = 0, warmDebris = 0;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i+1], b = data[i+2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;

          if (g > r * 1.15 && g > b * 1.15 && g > 45) green++;
          if (lum < 40) dark++;
          if (lum > 210) bright++;
          if (Math.abs(r - g) < 18 && Math.abs(g - b) < 18 && lum > 40 && lum < 170) gray++;
          if (b > r * 1.25 && b > g * 1.05 && b > 60) blue++;
          if ((r > 130 && g < 100 && b < 100) || (r > 140 && g > 120 && b < 80)) warmDebris++;
        }

        const greenRatio = green / total;
        const darkRatio = dark / total;
        const brightRatio = bright / total;
        const grayRatio = gray / total;
        const blueRatio = blue / total;
        const debrisRatio = warmDebris / total;

        let intent = 'complaint';
        let subCategory = 'bin_overflow';
        let conf = 97.5;

        if (greenRatio > 0.18) {
          intent = 'appreciation';
          subCategory = 'plantation';
          conf = Math.min(99.4, 94 + greenRatio * 20);
        } else if (darkRatio > 0.45 && (brightRatio > 0.01 || darkRatio > 0.65)) {
          intent = 'complaint';
          subCategory = 'streetlight';
          conf = 98.2;
        } else if (blueRatio > 0.18) {
          intent = 'complaint';
          subCategory = 'water_leak';
          conf = 96.8;
        } else if (grayRatio > 0.30 && greenRatio < 0.10) {
          intent = 'complaint';
          subCategory = 'pothole';
          conf = 98.6;
        } else if (debrisRatio > 0.12 || greenRatio < 0.10) {
          intent = 'complaint';
          subCategory = 'bin_overflow';
          conf = 98.8;
        }

        callback({ intent, subCategory, confidence: Number(conf.toFixed(1)) });
      } catch (e) {
        callback({ intent: 'complaint', subCategory: 'bin_overflow', confidence: 96.0 });
      }
    };
    img.onerror = () => {
      callback({ intent: 'complaint', subCategory: 'bin_overflow', confidence: 95.0 });
    };
    img.src = imageSrc;
  },

  triggerCommunityAIVision(forcedIntent = null, forcedSubCategory = null) {
    const isBA = this.postFormat === 'beforeafter' || (this.uploadedBeforePhoto && this.uploadedAfterPhoto);
    const scannerWrap = document.getElementById('comm-ai-scanner-wrap');
    const statusText = document.getElementById('comm-ai-status-text');
    const textInput = document.getElementById('new-post-text-input');
    const triageBadge = document.getElementById('comm-ai-triage-badge');

    if (!this.uploadedPhoto && !this.uploadedBeforePhoto) {
      if (this.postFormat === 'beforeafter') {
        this.loadSampleBeforeAfter();
      } else {
        this.loadPresetScenario('overflowing_bin');
        return;
      }
    }

    if (scannerWrap) {
      scannerWrap.style.display = 'block';
      if (statusText) statusText.textContent = "🔍 Ingesting visual scene telemetry & analyzing pixel layers...";
    }
    if (triageBadge) triageBadge.style.display = 'none';

    setTimeout(() => {
      if (statusText) statusText.textContent = "⚡ Running RGB feature extractor & civic hazard detection...";
    }, 600);

    setTimeout(() => {
      if (statusText) statusText.textContent = "✨ Generating tailored narrative & hashtags...";
    }, 1200);

    setTimeout(() => {
      // Use pixel analysis or forced params
      const processResults = (intent, subCat, confVal = 98.4) => {
        if (scannerWrap) scannerWrap.style.display = 'none';

        const generated = this.generateCivicDescription(intent, subCat, textInput ? textInput.value : '');

        if (textInput) {
          textInput.value = generated.text;
        }

        // Set category radio
        const radioVal = intent === 'complaint' ? 'report' : 'appreciate';
        const radio = document.querySelector(`input[name="comm-post-cat"][value="${radioVal}"]`);
        if (radio) radio.checked = true;

        // Render interactive topic refinement HUD
        if (triageBadge) {
          const isComp = intent === 'complaint';
          triageBadge.style.background = isComp ? '#FEF2F2' : '#F0FDF4';
          triageBadge.style.border = isComp ? '1.5px solid #FECACA' : '1.5px solid #BBF7D0';
          triageBadge.style.display = 'block';

          triageBadge.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <div style="display:flex; align-items:center; gap:6px; color:${isComp ? '#DC2626' : '#15803D'}; font-weight:800;">
                <span>${isComp ? '🚨' : '💛'}</span>
                <span>AI Detected: <strong>${generated.title}</strong> (${confVal}% conf)</span>
              </div>
            </div>
            <div style="font-size:0.72rem; color:#64748B; font-weight:700; margin-bottom:5px;">🎯 Detected Topic (Tap to switch scenario):</div>
            <div style="display:flex; gap:5px; flex-wrap:wrap;">
              <button type="button" onclick="CommunityEngine.refineDetectedTopic('bin_overflow', 'complaint')" style="background:${subCat === 'bin_overflow' ? '#DC2626' : '#FFFFFF'}; color:${subCat === 'bin_overflow' ? '#FFF' : '#DC2626'}; border:1px solid #FECACA; padding:3px 8px; border-radius:8px; font-size:0.72rem; font-weight:700; cursor:pointer;">
                🗑️ Waste Overflow
              </button>
              <button type="button" onclick="CommunityEngine.refineDetectedTopic('pothole', 'complaint')" style="background:${subCat === 'pothole' ? '#D97706' : '#FFFFFF'}; color:${subCat === 'pothole' ? '#FFF' : '#D97706'}; border:1px solid #FDE68A; padding:3px 8px; border-radius:8px; font-size:0.72rem; font-weight:700; cursor:pointer;">
                🕳️ Road Pothole
              </button>
              <button type="button" onclick="CommunityEngine.refineDetectedTopic('streetlight', 'complaint')" style="background:${subCat === 'streetlight' ? '#374151' : '#FFFFFF'}; color:${subCat === 'streetlight' ? '#FFF' : '#374151'}; border:1px solid #E5E7EB; padding:3px 8px; border-radius:8px; font-size:0.72rem; font-weight:700; cursor:pointer;">
                💡 Broken Light
              </button>
              <button type="button" onclick="CommunityEngine.refineDetectedTopic('water_leak', 'complaint')" style="background:${subCat === 'water_leak' ? '#2563EB' : '#FFFFFF'}; color:${subCat === 'water_leak' ? '#FFF' : '#2563EB'}; border:1px solid #BFDBFE; padding:3px 8px; border-radius:8px; font-size:0.72rem; font-weight:700; cursor:pointer;">
                💧 Water Leak
              </button>
              <button type="button" onclick="CommunityEngine.refineDetectedTopic('plantation', 'appreciation')" style="background:${subCat === 'plantation' ? '#15803D' : '#FFFFFF'}; color:${subCat === 'plantation' ? '#FFF' : '#15803D'}; border:1px solid #BBF7D0; padding:3px 8px; border-radius:8px; font-size:0.72rem; font-weight:700; cursor:pointer;">
                🌺 Tree Planting
              </button>
              <button type="button" onclick="CommunityEngine.refineDetectedTopic('sanitation_kudos', 'appreciation')" style="background:${subCat === 'sanitation_kudos' ? '#059669' : '#FFFFFF'}; color:${subCat === 'sanitation_kudos' ? '#FFF' : '#059669'}; border:1px solid #A7F3D0; padding:3px 8px; border-radius:8px; font-size:0.72rem; font-weight:700; cursor:pointer;">
                💛 Worker Kudos
              </button>
            </div>
          `;
        }

        if (typeof AudioAnnouncerEngine !== 'undefined') {
          AudioAnnouncerEngine.playChimeSound('high');
        }
        CityAssist.showToast(`🎯 AI Detected: ${generated.title}`);
      };

      if (forcedIntent && forcedSubCategory) {
        processResults(forcedIntent, forcedSubCategory, 99.2);
      } else if (isBA) {
        processResults('appreciation', 'before_after', 99.4);
      } else {
        this.analyzeImagePixelsAsync(this.uploadedPhoto, (res) => {
          processResults(res.intent, res.subCategory, res.confidence);
        });
      }
    }, 1700);
  },

  refineDetectedTopic(subCategory, intent) {
    this.triggerCommunityAIVision(intent, subCategory);
  },

  publishPost() {
    const text = document.getElementById('new-post-text-input').value.trim();
    if (!text) {
      alert("Please write some text before publishing.");
      return;
    }

    const isBeforeAfter = this.postFormat === 'beforeafter' || (this.uploadedBeforePhoto && this.uploadedAfterPhoto);
    
    if (this.postFormat === 'beforeafter' && (!this.uploadedBeforePhoto || !this.uploadedAfterPhoto)) {
      alert("Please select both 'Before' and 'After' photos for a transformation post.");
      return;
    }

    const selectedCategory = document.querySelector('input[name="comm-post-cat"]:checked').value;
    
    let badgeText = isBeforeAfter ? "Transformation" : "Appreciation";
    let badgeType = isBeforeAfter ? "appreciation" : "appreciation";
    if (selectedCategory === 'report') { badgeText = "Report"; badgeType = "report"; }
    else if (selectedCategory === 'updates') { badgeText = "Update"; badgeType = "update"; }
    else if (selectedCategory === 'events') { badgeText = "Event"; badgeType = "event"; }

    const newPost = {
      id: `POST-${Date.now()}`,
      author: {
        name: CityData.user.name,
        role: "Active Citizen",
        avatar: CityData.user.avatar,
        isOfficial: false
      },
      time: "Just now",
      category: selectedCategory,
      badgeText: badgeText,
      badgeType: badgeType,
      text: text,
      isBeforeAfter: isBeforeAfter,
      beforeImage: isBeforeAfter ? this.uploadedBeforePhoto : null,
      afterImage: isBeforeAfter ? this.uploadedAfterPhoto : null,
      image: !isBeforeAfter ? (this.uploadedPhoto || null) : null,
      likes: 1,
      comments: 0,
      isLiked: true,
      isBookmarked: false
    };

    CityData.communityPosts.unshift(newPost);
    CityData.user.points += isBeforeAfter ? 35 : 15; // bonus points for Before & After transformation
    
    CityAssist.closeModal();
    this.currentCategory = 'all';
    
    // Update active category tile to all
    document.querySelectorAll('.comm-category-tile').forEach(tile => {
      tile.classList.remove('active');
      if (tile.dataset.category === 'all') tile.classList.add('active');
    });

    this.renderFeed();
    CityAssist.showToast("Post published to Community! +15 Points Earned ⭐");
  }
};

/**
 * Services & Technicians Engine
 */
const ServicesEngine = {
  currentCategory: 'all',

  init() {
    this.renderProfessionals();
  },

  renderProfessionals(filtered = null) {
    const container = document.getElementById('professionals-list-feed');
    if (!container) return;

    const list = filtered || this.getFilteredPros();

    if (list.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:30px 10px; color:#64748B;">
          <div style="font-size:2rem; margin-bottom:8px;">🔍</div>
          <p style="font-size:0.9rem; font-weight:700; color:#1E293B;">No service professionals found</p>
          <p style="font-size:0.8rem; margin-top:2px;">Try searching for "electrician", "plumber", or "painter".</p>
        </div>
      `;
      return;
    }

    container.innerHTML = list.map(pro => `
      <div class="pro-service-card" onclick="ServicesEngine.callProfessional('${pro.id}')">
        <div class="pro-avatar-wrapper">
          <img src="${pro.avatar}" class="pro-avatar-img" alt="${pro.name}">
          <span class="pro-online-badge"></span>
        </div>
        
        <div class="pro-info-details">
          <h4 class="pro-name-title">${pro.name}</h4>
          <div class="pro-rating-row">
            <span class="pro-star-icon">★</span>
            <span class="pro-score-bold">${pro.rating}</span>
            <span class="pro-reviews-count">(${pro.reviews})</span>
          </div>
          <div class="pro-distance-meta">${pro.distance}</div>
          <div class="pro-availability-status">${pro.status}</div>
        </div>

        <button class="pro-call-action-btn" onclick="event.stopPropagation(); ServicesEngine.callProfessional('${pro.id}')" title="Call Professional">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
          </svg>
        </button>
      </div>
    `).join('');
  },

  getFilteredPros() {
    if (this.currentCategory === 'all') {
      return CityData.professionals;
    }
    return CityData.professionals.filter(p => p.category === this.currentCategory);
  },

  filterCategory(category, element) {
    this.currentCategory = category;

    // Highlight active tile
    document.querySelectorAll('.service-cat-tile').forEach(tile => {
      tile.classList.remove('active');
    });
    if (element) element.classList.add('active');

    this.renderProfessionals();
    CityAssist.showToast(`Filtered: ${category.replace('_', ' ').toUpperCase()}`);
  },

  showAllCategories() {
    this.currentCategory = 'all';
    document.querySelectorAll('.service-cat-tile').forEach(tile => {
      tile.classList.remove('active');
    });
    const searchInput = document.getElementById('services-search-input');
    if (searchInput) searchInput.value = '';
    this.renderProfessionals();
    CityAssist.showToast("Showing all nearby professionals");
  },

  handleSearch(query) {
    const q = query.toLowerCase().trim();
    if (!q) {
      this.renderProfessionals();
      return;
    }
    const filtered = CityData.professionals.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.categoryLabel.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
    this.renderProfessionals(filtered);
  },

  callProfessional(proId) {
    const pro = CityData.professionals.find(p => p.id === proId);
    if (!pro) return;

    CityAssist.openModal(`
      <div class="modal-header-block" style="text-align:center;">
        <div style="width:70px; height:70px; margin:0 auto 12px; position:relative;">
          <img src="${pro.avatar}" style="width:100%; height:100%; border-radius:50%; border:3px solid #16A34A; object-fit:cover;" alt="${pro.name}">
          <span style="position:absolute; bottom:2px; right:4px; width:14px; height:14px; background:#16A34A; border:2px solid #fff; border-radius:50%;"></span>
        </div>
        <h3 style="font-size:1.3rem; font-weight:800; color:#111827; margin-bottom:2px;">${pro.name}</h3>
        <span style="display:inline-block; background:#DCFCE7; color:#15803D; font-size:0.75rem; font-weight:800; padding:2px 10px; border-radius:12px; margin-bottom:12px;">
          PMC Verified Partner ✓
        </span>
      </div>

      <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:14px; padding:14px; margin-bottom:16px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:0.88rem;">
          <span style="color:#64748B;">Category:</span>
          <strong style="color:#111827;">${pro.categoryLabel}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:0.88rem;">
          <span style="color:#64748B;">Rating:</span>
          <strong style="color:#D97706;">★ ${pro.rating} (${pro.reviews} reviews)</strong>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:0.88rem;">
          <span style="color:#64748B;">Distance:</span>
          <strong style="color:#111827;">${pro.distance}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:0.88rem;">
          <span style="color:#64748B;">Experience:</span>
          <strong style="color:#111827;">${pro.experience}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:0.88rem;">
          <span style="color:#64748B;">Standard Inspection:</span>
          <strong style="color:#15803D;">${pro.rate}</strong>
        </div>
      </div>

      <div style="display:flex; gap:10px;">
        <a href="tel:${pro.phone}" onclick="CityAssist.showToast('Calling ${pro.name}... 📞'); CityAssist.closeModal();" class="primary-green-btn" style="flex:1; text-align:center; text-decoration:none; display:flex; align-items:center; justify-content:center; gap:6px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="18" height="18"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          Call Now (${pro.phone})
        </a>
        <button onclick="CityAssist.closeModal()" style="background:#F1F5F9; color:#475569; border:none; padding:12px 16px; border-radius:10px; font-weight:700; cursor:pointer;">Cancel</button>
      </div>
    `);
  },

  /**
   * Share route completion report via WhatsApp/Web Share API
   */
  shareRouteCompletionReport() {
    const stops = (typeof GPSTrackerEngine !== 'undefined') ? GPSTrackerEngine.getRouteStops() : [];
    const totalStops = stops.length;
    const totalBins = stops.reduce((s, x) => s + (x.bins || 0), 0);
    const now = new Date().toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    const reportText = `🚚 CityAssist Route Completion Report
📅 ${new Date().toLocaleDateString('en-IN')} | ⏰ ${now}
Driver: Ramesh Shinde (ID: PMC-DRV-884)
Vehicle: #MH-12-EA-4920

✅ Total Stops Completed: ${totalStops}
🗑️ Total Bins Collected: ${totalBins}
📍 Route: Talegaon Station → Sector 4 Depot

Powered by CityAssist — Smart Municipal App`;

    if (navigator.share) {
      navigator.share({ title: 'CityAssist Route Report', text: reportText })
        .then(() => this.showToast('Report shared successfully! 📤'))
        .catch(() => this.shareViaClipboard(reportText));
    } else {
      this.shareViaClipboard(reportText);
    }
  },

  shareViaClipboard(text) {
    try {
      navigator.clipboard.writeText(text);
      this.showToast('📋 Report copied to clipboard! Paste anywhere to share.');
    } catch (e) {
      this.showToast('Report ready. Long-press to copy.');
    }
  },

  /**
   * Show a brief toast notification at the bottom of the screen
   * @param {string} message - The message to show
   * @param {number} duration - How long in ms (default 3200ms)
   */
  showToast(message, duration = 3200) {
    let toastContainer = document.getElementById('cityassist-toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'cityassist-toast-container';
      toastContainer.style.cssText = 'position:fixed; bottom:88px; left:50%; transform:translateX(-50%); z-index:100000; display:flex; flex-direction:column; align-items:center; gap:8px; pointer-events:none; max-width:88vw;';
      document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    toast.style.cssText = 'background:rgba(15,23,42,0.93); color:#FFFFFF; padding:10px 18px; border-radius:22px; font-family:\'Plus Jakarta Sans\',sans-serif; font-size:0.84rem; font-weight:700; box-shadow:0 6px 24px rgba(0,0,0,0.35); backdrop-filter:blur(10px); white-space:nowrap; opacity:0; transform:translateY(12px); transition:all 0.25s ease; max-width:88vw; overflow:hidden; text-overflow:ellipsis;';
    toast.textContent = message;
    toastContainer.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(12px)';
      setTimeout(() => {
        try { toastContainer.removeChild(toast); } catch (e) {}
      }, 300);
    }, duration);
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  CityAssist.init();
  MunicipalityEngine.init();
  CommunityEngine.init();
  ServicesEngine.init();
});


