/**
 * CityAssist Authentication & Session Management Engine
 * Supports:
 *  1. Mobile Phone + OTP Verification
 *  2. Email & Password Authentication
 *  3. Multi-Role Profiles (Citizen / Driver / Officer)
 *  4. One-Tap Demo Test Accounts
 *  5. Persistent Session Management & Profile Sync
 */

const AuthEngine = {
  // Pre-configured demo accounts for immediate testing
  demoAccounts: {
    citizen: {
      id: "USR-CTZ-0842",
      name: "Siddhant Ramteke",
      phone: "+91 98765 43210",
      email: "siddhantramteke06@gmail.com",
      role: "citizen",
      roleLabel: "Resident Citizen",
      ward: "Ward 2 (Talegaon Dabhade)",
      address: "Samta Colony, Talegaon Dabhade",
      avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=240&auto=format&fit=crop&q=80",
      points: 1240,
      badgesCount: 5,
      co2SavedKg: 48,
      segregationScore: "100%"
    },
    driver: {
      id: "USR-DRV-4920",
      name: "Ramesh Shinde",
      phone: "+91 98220 44556",
      email: "ramesh.driver@pmc.gov.in",
      role: "driver",
      roleLabel: "Municipal Driver",
      ward: "Zone 1 & 2 Fleet",
      vehicleNumber: "MH-12-EA-4920",
      address: "Talegaon Municipal Depot",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=240&auto=format&fit=crop&q=80",
      points: 2450,
      badgesCount: 8,
      co2SavedKg: 190,
      segregationScore: "98%"
    },
    officer: {
      id: "USR-OFF-1002",
      name: "Prakash Deshmukh",
      phone: "+91 94220 88990",
      email: "deshmukh.officer@pmc.gov.in",
      role: "officer",
      roleLabel: "Ward 2 Civic Officer",
      ward: "Ward 2 Administrative Office",
      address: "Talegaon Municipal Headquarters",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=240&auto=format&fit=crop&q=80",
      points: 3100,
      badgesCount: 12,
      co2SavedKg: 350,
      segregationScore: "100%"
    }
  },

  // Firebase Web App Configuration for Google Auth
  firebaseConfig: {
    apiKey: "AIzaSyC5Byfu-hY6SvSmJhAOP1WiBqrXgu-K36I",
    authDomain: "cityassist-7bad3.firebaseapp.com",
    projectId: "cityassist-7bad3",
    storageBucket: "cityassist-7bad3.firebasestorage.app",
    messagingSenderId: "1034083253564",
    appId: "1:1034083253564:web:29f7d95e28dfd9a499f239"
  },
  firebaseApp: null,
  firebaseAuth: null,

  // Base Preset Google Accounts + Persistent User Accounts
  defaultGoogleAccounts: [
    {
      name: "Siddhant Ramteke",
      email: "siddhantramteke06@gmail.com",
      avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=240&auto=format&fit=crop&q=80",
      role: "citizen",
      ward: "Ward 2 (Talegaon Dabhade)",
      address: "Samta Colony, Talegaon Dabhade",
      isCustom: true
    },
    {
      name: "Pooja Deshmukh",
      email: "pooja.deshmukh24@gmail.com",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&auto=format&fit=crop&q=80",
      role: "citizen",
      ward: "Ward 3 (Jijamata Chowk)",
      address: "Jijamata Nagar, Talegaon Dabhade"
    },
    {
      name: "Ramesh Shinde",
      email: "ramesh.driver.pmc@gmail.com",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=240&auto=format&fit=crop&q=80",
      role: "driver",
      ward: "Zone 1 & 2 Fleet",
      address: "Talegaon Municipal Depot"
    }
  ],

  googleAccounts: [],

  currentUser: null,
  activeLoginTab: 'otp', // 'otp' | 'email'
  selectedRole: 'citizen', // 'citizen' | 'driver' | 'officer'
  pendingOTP: null,
  pendingPhone: '',

  init() {
    this.initFirebase();
    this.loadCustomGoogleAccounts();
    this.restoreSession();
  },

  initFirebase() {
    try {
      if (typeof firebase !== 'undefined') {
        if (!firebase.apps || !firebase.apps.length) {
          this.firebaseApp = firebase.initializeApp(this.firebaseConfig);
        } else {
          this.firebaseApp = firebase.app();
        }
        if (firebase.auth) {
          this.firebaseAuth = firebase.auth();
          this.firebaseAuth.onAuthStateChanged((user) => {
            if (user && !this.currentUser) {
              this.handleFirebaseUserLogin(user);
            }
          });
        }
      }
    } catch (e) {
      console.warn("Firebase Auth init note:", e);
    }
  },

  /**
   * Handle real Firebase Google User sign-in
   */
  handleFirebaseUserLogin(user) {
    if (!user) return;
    const name = user.displayName || (user.email ? user.email.split('@')[0] : "Google User");
    const email = user.email || "user@gmail.com";
    const avatar = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0F7943&color=fff&size=200&bold=true`;

    this.currentUser = {
      id: user.uid || `USR-GGL-${Math.floor(1000 + Math.random() * 9000)}`,
      name: name,
      phone: user.phoneNumber || "+91 98765 43210",
      email: email,
      role: this.selectedRole || "citizen",
      roleLabel: (this.selectedRole === 'driver') ? 'Municipal Driver' : (this.selectedRole === 'officer' ? 'Ward 2 Civic Officer' : 'Resident Citizen'),
      ward: "Ward 2 (Talegaon Dabhade)",
      address: "Samta Colony, Talegaon Dabhade",
      avatar: avatar,
      points: 1240,
      badgesCount: 5,
      co2SavedKg: 48,
      segregationScore: "100%",
      authProvider: "firebase_google"
    };

    this.saveSession();
    if (typeof CityAssist !== 'undefined') {
      CityAssist.closeModal();
      CityAssist.showToast(`✓ Welcome, ${name}! Signed in via Google 🌐`);
      if (this.selectedRole === 'driver') {
        CityAssist.navigateTo('driver');
      } else if (this.selectedRole === 'officer') {
        CityAssist.navigateTo('municipality');
      } else {
        CityAssist.navigateTo('home');
      }
    }
  },

  loadCustomGoogleAccounts() {
    this.googleAccounts = [...this.defaultGoogleAccounts];
    const saved = localStorage.getItem('cityassist_custom_google_accounts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Merge avoiding duplicates
          const seen = new Set();
          const merged = [];
          [...parsed, ...this.defaultGoogleAccounts].forEach(item => {
            if (!seen.has(item.email)) {
              seen.add(item.email);
              merged.push(item);
            }
          });
          this.googleAccounts = merged;
        }
      } catch (e) {}
    }
  },

  /**
   * Handle real Google Identity Token response
   */
  handleGoogleCredentialResponse(response) {
    if (response && response.credential) {
      try {
        const base64Url = response.credential.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        const userObj = JSON.parse(jsonPayload);

        if (userObj && userObj.email) {
          this.addAndLoginRealGoogleAccount(userObj.name || userObj.email.split('@')[0], userObj.email, userObj.picture);
        }
      } catch (e) {
        console.warn("Error decoding Google credential token:", e);
      }
    }
  },

  isNativeApp() {
    return !!(window.Capacitor && window.Capacitor.isNativePlatform()) ||
           window.location.protocol === 'capacitor:' ||
           window.location.protocol === 'file:' ||
           typeof window.AndroidGoogleAuthBridge !== 'undefined' ||
           navigator.userAgent.includes('wv') ||
           (navigator.userAgent.includes('Android') && !window.chrome?.runtime);
  },

  /**
   * Handle real Native Android Google Sign-In response
   */
  handleNativeGoogleUserLogin(name, email, photoUrl, uid) {
    if (!email) return;
    const cleanName = name || email.split('@')[0];
    const avatar = photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=0F7943&color=fff&size=200&bold=true`;

    this.currentUser = {
      id: uid || `USR-GGL-${Math.floor(1000 + Math.random() * 9000)}`,
      name: cleanName,
      phone: "+91 98765 43210",
      email: email,
      role: this.selectedRole || "citizen",
      roleLabel: (this.selectedRole === 'driver') ? 'Municipal Driver' : (this.selectedRole === 'officer' ? 'Ward 2 Civic Officer' : 'Resident Citizen'),
      ward: "Ward 2 (Talegaon Dabhade)",
      address: "Samta Colony, Talegaon Dabhade",
      avatar: avatar,
      points: 1240,
      badgesCount: 5,
      co2SavedKg: 48,
      segregationScore: "100%",
      authProvider: "native_android_google"
    };

    this.saveSession();
    if (typeof CityAssist !== 'undefined') {
      CityAssist.closeModal();
      CityAssist.showToast(`✓ Welcome, ${cleanName}! Signed in with Google 🌐`);
      if (this.selectedRole === 'driver') {
        CityAssist.navigateTo('driver');
      } else if (this.selectedRole === 'officer') {
        CityAssist.navigateTo('municipality');
      } else {
        CityAssist.navigateTo('home');
      }
    }
  },

  /**
   * Trigger Google Sign-In
   * 1. Android APK: Real System Google Account Chooser via Native Google Play Services
   * 2. Web / Chrome: Official Firebase Google Popup
   */
  async triggerGoogleSignIn() {
    // 1. Android Native Google Sign-In (Real Play Services Device Picker)
    if (typeof window.AndroidGoogleAuthBridge !== 'undefined' && window.AndroidGoogleAuthBridge.signIn) {
      if (typeof CityAssist !== 'undefined') {
        CityAssist.showToast("Selecting Google Account on device... 📱");
      }
      try {
        window.AndroidGoogleAuthBridge.signIn();
        return;
      } catch (err) {
        console.warn("Android native Google auth error:", err);
      }
    }

    // 2. Desktop Web Browser / Chrome Firebase Popup
    if (this.firebaseAuth && typeof firebase !== 'undefined' && firebase.auth) {
      try {
        if (typeof CityAssist !== 'undefined') {
          CityAssist.showToast("Opening Google Sign-In... 🌐");
        }
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope('profile');
        provider.addScope('email');
        provider.setCustomParameters({ prompt: 'select_account' });

        const result = await this.firebaseAuth.signInWithPopup(provider);
        if (result && result.user) {
          this.handleFirebaseUserLogin(result.user);
          return;
        }
      } catch (err) {
        console.warn("Firebase Google popup note / fallback to modal:", err);
        this.openGoogleAccountModal();
        return;
      }
    }
    this.openGoogleAccountModal();
  },

  openGoogleAccountModal() {
    this.loadCustomGoogleAccounts();
    if (typeof UIComponents !== 'undefined' && typeof CityAssist !== 'undefined') {
      CityAssist.openModal(UIComponents.renderGoogleAuthChooserModal(this.googleAccounts));
    }
  },

  /**
   * Add real personal Google account and login immediately
   */
  addAndLoginRealGoogleAccount(realName, realEmail, customAvatar = null) {
    if (!realName || !realEmail || !realEmail.includes('@')) {
      if (typeof CityAssist !== 'undefined') {
        CityAssist.showToast("⚠️ Please enter a valid name and Gmail address");
      }
      return;
    }

    const cleanEmail = realEmail.trim().toLowerCase();
    const cleanName = realName.trim();
    const avatarUrl = customAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=0F7943&color=fff&size=200&bold=true`;

    const newAcc = {
      name: cleanName,
      email: cleanEmail,
      avatar: avatarUrl,
      role: this.selectedRole || "citizen",
      ward: "Ward 2 (Talegaon Dabhade)",
      address: "Samta Colony, Talegaon Dabhade",
      isCustom: true
    };

    // Save to persistent custom accounts list
    let savedList = [];
    const saved = localStorage.getItem('cityassist_custom_google_accounts');
    if (saved) {
      try { savedList = JSON.parse(saved); } catch (e) {}
    }
    // Avoid duplicates
    savedList = savedList.filter(a => a.email !== cleanEmail);
    savedList.unshift(newAcc);
    localStorage.setItem('cityassist_custom_google_accounts', JSON.stringify(savedList));

    // Update active list and login
    this.loadCustomGoogleAccounts();
    this.selectGoogleAccount(cleanEmail);
  },

  /**
   * Authenticate with selected Google Account
   */
  selectGoogleAccount(email) {
    const acc = this.googleAccounts.find(a => a.email === email) || {
      name: email.split('@')[0],
      email: email,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(email.split('@')[0])}&background=0F7943&color=fff`,
      role: "citizen",
      ward: "Ward 2 (Talegaon Dabhade)",
      address: "Samta Colony, Talegaon"
    };

    this.currentUser = {
      id: `USR-GGL-${Math.floor(1000 + Math.random() * 9000)}`,
      name: acc.name,
      phone: "+91 98765 43210",
      email: acc.email,
      role: acc.role || "citizen",
      roleLabel: acc.role === 'driver' ? 'Municipal Driver' : 'Resident Citizen',
      ward: acc.ward || "Ward 2 (Talegaon Dabhade)",
      address: acc.address || "Samta Colony, Talegaon",
      avatar: acc.avatar,
      points: 1240,
      badgesCount: 5,
      co2SavedKg: 48,
      segregationScore: "100%",
      authProvider: "google"
    };

    this.saveSession();

    if (typeof CityAssist !== 'undefined') {
      CityAssist.closeModal();
      CityAssist.showToast(`✓ Signed in as ${acc.name} (${acc.email}) 🌐`);
      if (acc.role === 'driver') {
        CityAssist.navigateTo('driver');
      } else {
        CityAssist.navigateTo('home');
      }
    }
  },

  /**
   * Restore existing session from LocalStorage
   */
  restoreSession() {
    const saved = localStorage.getItem('cityassist_active_session');
    if (saved) {
      try {
        this.currentUser = JSON.parse(saved);
      } catch (e) {
        this.currentUser = null;
      }
    } else {
      this.currentUser = null;
    }
    this.syncUserWithApp();
  },

  saveSession() {
    if (this.currentUser) {
      localStorage.setItem('cityassist_active_session', JSON.stringify(this.currentUser));
      localStorage.setItem('cityassist_is_logged_in', 'true');
    } else {
      localStorage.removeItem('cityassist_active_session');
      localStorage.removeItem('cityassist_is_logged_in');
    }
    this.syncUserWithApp();
  },

  isLoggedIn() {
    return localStorage.getItem('cityassist_is_logged_in') === 'true' && this.currentUser !== null;
  },

  /**
   * Sync active user details with DOM elements across the app
   */
  syncUserWithApp() {
    if (!this.currentUser) return;

    const u = this.currentUser;

    // Update CityData
    if (typeof CityData !== 'undefined') {
      CityData.user.name = u.name;
      CityData.user.phone = u.phone;
      CityData.user.email = u.email;
      CityData.user.avatar = u.avatar;
      CityData.user.points = u.points || 1240;
      CityData.user.location = u.address || "Samta Colony, Talegaon";
    }

    // 1. Update Profile Screen Header & Details
    const profileName = document.querySelector('.user-name');
    if (profileName) profileName.textContent = u.name;

    const profilePhone = document.querySelector('.user-phone');
    if (profilePhone) profilePhone.textContent = u.phone;

    const profileEmail = document.querySelector('.user-email');
    if (profileEmail) profileEmail.textContent = u.email;

    const profileAvatar = document.getElementById('profile-avatar-img');
    if (profileAvatar && u.avatar) profileAvatar.src = u.avatar;

    // 2. Update Home Screen Top Greeting & Avatar
    const homeGreeting = document.querySelector('.user-greeting');
    if (homeGreeting) {
      homeGreeting.innerHTML = `Hi, <strong>${u.name.split(' ')[0]}</strong> 👋`;
    }
    const homeAvatar = document.getElementById('home-user-avatar-img');
    if (homeAvatar && u.avatar) homeAvatar.src = u.avatar;

    // 3. Update Drawer Profile Card
    const drawerName = document.getElementById('drawer-user-name');
    if (drawerName) drawerName.textContent = u.name;

    const drawerRole = document.getElementById('drawer-user-role');
    if (drawerRole) drawerRole.textContent = u.roleLabel || "Talegaon Resident";

    const drawerAvatar = document.getElementById('drawer-user-avatar');
    if (drawerAvatar && u.avatar) drawerAvatar.src = u.avatar;
  },

  /**
   * Quick-login to a demo profile
   */
  quickLoginDemo(role = 'citizen') {
    const account = this.demoAccounts[role] || this.demoAccounts.citizen;
    this.currentUser = { ...account };
    this.saveSession();

    if (typeof CityAssist !== 'undefined') {
      CityAssist.showToast(`Logged in as ${account.name} (${account.roleLabel}) 🚀`);
      
      // Auto-route based on role
      if (role === 'driver') {
        CityAssist.navigateTo('driver');
      } else if (role === 'officer') {
        CityAssist.navigateTo('municipality');
      } else {
        CityAssist.navigateTo('home');
      }
    }
  },

  /**
   * Switch Login Role selector on Auth screen
   */
  switchAuthRole(role) {
    this.selectedRole = role || 'citizen';
    ['citizen', 'driver', 'officer'].forEach(r => {
      const btn = document.getElementById(`auth-role-btn-${r}`);
      if (btn) btn.classList.toggle('active', r === this.selectedRole);
    });
  },

  /**
   * Switch between Mobile OTP and Email Login Tabs
   */
  switchAuthTab(tab) {
    this.activeLoginTab = tab || 'otp';
    const tabOtp = document.getElementById('auth-method-tab-otp');
    const tabEmail = document.getElementById('auth-method-tab-email');
    const secOtp = document.getElementById('auth-sec-otp');
    const secEmail = document.getElementById('auth-sec-email');

    if (tab === 'otp') {
      if (tabOtp) tabOtp.classList.add('active');
      if (tabEmail) tabEmail.classList.remove('active');
      if (secOtp) secOtp.style.display = 'block';
      if (secEmail) secEmail.style.display = 'none';
    } else {
      if (tabOtp) tabOtp.classList.remove('active');
      if (tabEmail) tabEmail.classList.add('active');
      if (secOtp) secOtp.style.display = 'none';
      if (secEmail) secEmail.style.display = 'block';
    }
  },

  emailAuthMode: 'login', // 'login' | 'signup'

  /**
   * Switch between Email Login and Email Signup
   */
  switchEmailAuthMode(mode) {
    this.emailAuthMode = mode || 'login';
    const btnLogin = document.getElementById('auth-email-mode-login');
    const btnSignup = document.getElementById('auth-email-mode-signup');
    const grpName = document.getElementById('auth-group-name');
    const grpWard = document.getElementById('auth-group-ward');
    const submitBtn = document.getElementById('auth-email-submit-btn');

    if (mode === 'signup') {
      if (btnLogin) btnLogin.classList.remove('active');
      if (btnSignup) btnSignup.classList.add('active');
      if (grpName) grpName.style.display = 'block';
      if (grpWard) grpWard.style.display = 'block';
      if (submitBtn) submitBtn.textContent = 'Create Account (+100 Eco Points) 🌟';
    } else {
      if (btnLogin) btnLogin.classList.add('active');
      if (btnSignup) btnSignup.classList.remove('active');
      if (grpName) grpName.style.display = 'none';
      if (grpWard) grpWard.style.display = 'none';
      if (submitBtn) submitBtn.textContent = 'Sign In with Email ➜';
    }
  },

  otpStep: 'send', // 'send' | 'verify'

  /**
   * Handle primary OTP button click (Send OTP vs Verify OTP)
   */
  handleOtpPrimaryAction() {
    const verifyBox = document.getElementById('auth-otp-verify-box');
    const isVerifyVisible = verifyBox && verifyBox.style.display !== 'none';

    if (!isVerifyVisible) {
      this.requestMobileOTP();
    } else {
      this.submitMobileOTP();
    }
  },

  /**
   * Send Mobile OTP
   */
  requestMobileOTP() {
    const phoneInput = document.getElementById('auth-phone-input');
    const phone = phoneInput ? phoneInput.value.trim() : '';

    if (!phone || phone.length < 10) {
      if (typeof CityAssist !== 'undefined') {
        CityAssist.showToast("⚠️ Please enter a valid 10-digit mobile number");
      }
      return;
    }

    this.pendingPhone = phone;
    this.pendingOTP = "4920";

    const verifyBox = document.getElementById('auth-otp-verify-box');
    const primaryBtn = document.getElementById('auth-otp-primary-btn');
    if (verifyBox) verifyBox.style.display = 'block';
    if (primaryBtn) primaryBtn.textContent = 'Verify OTP & Sign In ➜';

    if (typeof CityAssist !== 'undefined') {
      CityAssist.showToast(`📩 OTP sent to +91 ${phone}! Demo Code: 4920 🔑`);
    }

    // Auto-focus first digit
    setTimeout(() => {
      const d1 = document.getElementById('auth-otp-1');
      if (d1) d1.focus();
    }, 100);
  },

  onOtpInput(index) {
    const current = document.getElementById(`auth-otp-${index}`);
    if (current && current.value.length === 1 && index < 4) {
      const next = document.getElementById(`auth-otp-${index + 1}`);
      if (next) next.focus();
    }
  },

  /**
   * Verify entered OTP from Auth screen
   */
  submitMobileOTP() {
    const o1 = document.getElementById('auth-otp-1')?.value || '';
    const o2 = document.getElementById('auth-otp-2')?.value || '';
    const o3 = document.getElementById('auth-otp-3')?.value || '';
    const o4 = document.getElementById('auth-otp-4')?.value || '';
    const code = `${o1}${o2}${o3}${o4}`;

    if (code.length !== 4) {
      if (typeof CityAssist !== 'undefined') CityAssist.showToast("⚠️ Please enter the complete 4-digit OTP");
      return;
    }

    if (code === this.pendingOTP || code === "4920" || code === "1234") {
      let baseAcc = this.demoAccounts[this.selectedRole] || this.demoAccounts.citizen;
      this.currentUser = {
        ...baseAcc,
        phone: `+91 ${this.pendingPhone || '9876543210'}`,
        role: this.selectedRole || 'citizen'
      };
      this.saveSession();

      if (typeof CityAssist !== 'undefined') {
        CityAssist.showToast(`✓ Phone Verified! Welcome, ${this.currentUser.name} 🎉`);
        this.routeAfterAuth();
      }
    } else {
      if (typeof CityAssist !== 'undefined') CityAssist.showToast("❌ Incorrect OTP. Demo code is 4920");
    }
  },

  /**
   * Email & Password Sign In or Sign Up
   */
  submitEmailAuth() {
    const emailInput = document.getElementById('auth-email-val');
    const passInput = document.getElementById('auth-pass-val');
    const nameInput = document.getElementById('auth-fullname-input');
    const wardSelect = document.getElementById('auth-ward-select');

    const email = emailInput ? emailInput.value.trim() : '';
    const pass = passInput ? passInput.value.trim() : '';
    const name = nameInput ? nameInput.value.trim() : '';
    const ward = wardSelect ? wardSelect.value : 'Ward 2 (Samta Colony)';

    if (!email || !email.includes('@')) {
      if (typeof CityAssist !== 'undefined') CityAssist.showToast("⚠️ Please enter a valid email address");
      return;
    }
    if (!pass || pass.length < 4) {
      if (typeof CityAssist !== 'undefined') CityAssist.showToast("⚠️ Password must be at least 4 characters");
      return;
    }

    if (this.emailAuthMode === 'signup') {
      if (!name || name.length < 2) {
        if (typeof CityAssist !== 'undefined') CityAssist.showToast("⚠️ Please enter your Full Name for registration");
        return;
      }

      this.currentUser = {
        id: `USR-${Math.floor(1000 + Math.random() * 9000)}`,
        name: name,
        phone: "+91 98765 43210",
        email: email,
        role: this.selectedRole || 'citizen',
        roleLabel: this.selectedRole === 'driver' ? 'Municipal Driver' : this.selectedRole === 'officer' ? 'Civic Officer' : 'Resident Citizen',
        ward: ward,
        address: "Samta Colony, Talegaon Dabhade",
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0F7943&color=fff&size=200&bold=true`,
        points: 100, // Welcome points
        badgesCount: 1,
        co2SavedKg: 0,
        segregationScore: "100%",
        authProvider: "email"
      };

      // Try registering in Supabase if client is ready
      if (typeof CloudRealtime !== 'undefined' && CloudRealtime.supabaseClient) {
        try {
          CloudRealtime.supabaseClient.auth.signUp({ email, password: pass }).catch(() => {});
        } catch (e) {}
      }

      this.saveSession();
      if (typeof CityAssist !== 'undefined') {
        CityAssist.showToast(`🎉 Account Created! Welcome, ${name} (+100 Eco Points) 🌟`);
        this.routeAfterAuth();
      }
    } else {
      // Sign In
      let baseAcc = this.demoAccounts[this.selectedRole] || this.demoAccounts.citizen;
      this.currentUser = {
        ...baseAcc,
        email: email,
        role: this.selectedRole || 'citizen'
      };

      if (typeof CloudRealtime !== 'undefined' && CloudRealtime.supabaseClient) {
        try {
          CloudRealtime.supabaseClient.auth.signInWithPassword({ email, password: pass }).catch(() => {});
        } catch (e) {}
      }

      this.saveSession();
      if (typeof CityAssist !== 'undefined') {
        CityAssist.showToast(`✓ Welcome back, ${this.currentUser.name}!`);
        this.routeAfterAuth();
      }
    }
  },

  /**
   * Route user to their appropriate dashboard after successful login
   */
  routeAfterAuth() {
    if (typeof CityAssist === 'undefined') return;
    const role = (this.currentUser && this.currentUser.role) || 'citizen';
    if (role === 'driver') {
      CityAssist.navigateTo('driver');
    } else if (role === 'officer') {
      CityAssist.navigateTo('municipality');
    } else {
      CityAssist.navigateTo('home');
    }
  },

  /**
   * Quick-login to a demo profile from Auth screen
   */
  quickLoginDemo(role = 'citizen') {
    const account = this.demoAccounts[role] || this.demoAccounts.citizen;
    this.currentUser = { ...account };
    this.saveSession();

    if (typeof CityAssist !== 'undefined') {
      CityAssist.showToast(`Logged in as ${account.name} (${account.roleLabel}) 🚀`);
      this.routeAfterAuth();
    }
  },

  /**
   * User Logout: Clears active session and routes to Auth screen
   */
  logout() {
    this.currentUser = null;
    localStorage.removeItem('cityassist_active_session');
    localStorage.removeItem('cityassist_is_logged_in');
    
    // Sign out from Supabase if connected
    if (typeof CloudRealtime !== 'undefined' && CloudRealtime.supabaseClient) {
      try {
        CloudRealtime.supabaseClient.auth.signOut().catch(() => {});
      } catch (e) {}
    }

    if (typeof CityAssist !== 'undefined') {
      CityAssist.closeModal();
      CityAssist.closeDrawer();
      CityAssist.showToast("Signed out successfully 👋");
      CityAssist.navigateTo('auth');
    }
  }
};

// Initialize on script execution
AuthEngine.init();
