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
    this.loadCustomGoogleAccounts();
    this.restoreSession();
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

  /**
   * Trigger Google Sign-In Account Chooser Modal
   */
  triggerGoogleSignIn() {
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
        this.currentUser = this.demoAccounts.citizen;
      }
    } else {
      // Default to citizen demo account for seamless experience
      this.currentUser = this.demoAccounts.citizen;
      this.saveSession();
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
   * Switch Login Role selector
   */
  setRole(role) {
    this.selectedRole = role;
    document.querySelectorAll('.auth-role-pill').forEach(pill => {
      pill.classList.toggle('active', pill.dataset.role === role);
    });
  },

  /**
   * Switch between Mobile OTP and Email Login Tabs
   */
  setLoginTab(tab) {
    this.activeLoginTab = tab;
    const tabOtp = document.getElementById('auth-tab-otp');
    const tabEmail = document.getElementById('auth-tab-email');
    const secOtp = document.getElementById('auth-section-otp');
    const secEmail = document.getElementById('auth-section-email');

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

  /**
   * Send Mobile OTP
   */
  sendMobileOTP() {
    const phoneInput = document.getElementById('auth-mobile-input');
    const phone = phoneInput ? phoneInput.value.trim() : '';

    if (!phone || phone.length < 10) {
      if (typeof CityAssist !== 'undefined') {
        CityAssist.showToast("⚠️ Please enter a valid 10-digit mobile number");
      }
      return;
    }

    this.pendingPhone = phone;
    this.pendingOTP = "4920"; // Simulated deterministic OTP for instant testing

    // Open OTP Verification Modal
    if (typeof UIComponents !== 'undefined' && typeof CityAssist !== 'undefined') {
      CityAssist.openModal(UIComponents.renderOTPVerificationModal(phone, this.pendingOTP));
    }
  },

  /**
   * Verify entered 4-digit OTP
   */
  verifyOTP() {
    const otp1 = document.getElementById('otp-digit-1')?.value || '';
    const otp2 = document.getElementById('otp-digit-2')?.value || '';
    const otp3 = document.getElementById('otp-digit-3')?.value || '';
    const otp4 = document.getElementById('otp-digit-4')?.value || '';
    const fullOtp = `${otp1}${otp2}${otp3}${otp4}`;

    if (fullOtp.length !== 4) {
      if (typeof CityAssist !== 'undefined') {
        CityAssist.showToast("⚠️ Please enter the complete 4-digit OTP");
      }
      return;
    }

    // Match OTP (or accept demo 4920)
    if (fullOtp === this.pendingOTP || fullOtp === "4920" || fullOtp === "1234") {
      // Find matching demo account or create session
      let account = this.demoAccounts[this.selectedRole] || this.demoAccounts.citizen;
      this.currentUser = {
        ...account,
        phone: `+91 ${this.pendingPhone}`
      };
      this.saveSession();

      if (typeof CityAssist !== 'undefined') {
        CityAssist.closeModal();
        CityAssist.showToast(`✓ Phone Verified! Welcome back, ${this.currentUser.name} 🎉`);
        
        if (this.selectedRole === 'driver') {
          CityAssist.navigateTo('driver');
        } else if (this.selectedRole === 'officer') {
          CityAssist.navigateTo('municipality');
        } else {
          CityAssist.navigateTo('home');
        }
      }
    } else {
      if (typeof CityAssist !== 'undefined') {
        CityAssist.showToast("❌ Incorrect OTP. Hint: Use demo OTP 4920");
      }
    }
  },

  /**
   * Email & Password Login
   */
  loginWithEmail() {
    const emailInput = document.getElementById('auth-email-input');
    const passInput = document.getElementById('auth-password-input');

    const email = emailInput ? emailInput.value.trim() : '';
    const pass = passInput ? passInput.value.trim() : '';

    if (!email || !email.includes('@')) {
      if (typeof CityAssist !== 'undefined') {
        CityAssist.showToast("⚠️ Please enter a valid email address");
      }
      return;
    }
    if (!pass || pass.length < 4) {
      if (typeof CityAssist !== 'undefined') {
        CityAssist.showToast("⚠️ Password must be at least 4 characters");
      }
      return;
    }

    // Authenticate
    let account = this.demoAccounts[this.selectedRole] || this.demoAccounts.citizen;
    this.currentUser = {
      ...account,
      email: email
    };
    this.saveSession();

    if (typeof CityAssist !== 'undefined') {
      CityAssist.showToast(`✓ Welcome back, ${this.currentUser.name}!`);
      
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
   * Register a new user
   */
  handleSignup() {
    const name = document.getElementById('signup-name-input')?.value.trim();
    const phone = document.getElementById('signup-phone-input')?.value.trim();
    const email = document.getElementById('signup-email-input')?.value.trim();
    const ward = document.getElementById('signup-ward-select')?.value || 'Ward 2';
    const address = document.getElementById('signup-address-input')?.value.trim() || 'Samta Colony, Talegaon';
    const role = document.querySelector('input[name="signup-role"]:checked')?.value || 'citizen';

    if (!name || name.length < 2) {
      if (typeof CityAssist !== 'undefined') CityAssist.showToast("⚠️ Please enter your full name");
      return;
    }
    if (!phone || phone.length < 10) {
      if (typeof CityAssist !== 'undefined') CityAssist.showToast("⚠️ Please enter a valid 10-digit mobile number");
      return;
    }

    const roleLabels = {
      citizen: 'Resident Citizen',
      driver: 'Municipal Driver',
      officer: 'Ward Officer'
    };

    this.currentUser = {
      id: `USR-${Math.floor(1000 + Math.random() * 9000)}`,
      name: name,
      phone: phone.startsWith('+91') ? phone : `+91 ${phone}`,
      email: email || `${name.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
      role: role,
      roleLabel: roleLabels[role] || 'Resident Citizen',
      ward: `${ward} (Talegaon Dabhade)`,
      address: address,
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&auto=format&fit=crop&q=80",
      points: 100, // Signup welcome bonus!
      badgesCount: 1,
      co2SavedKg: 0,
      segregationScore: "100%"
    };

    this.saveSession();

    if (typeof CityAssist !== 'undefined') {
      CityAssist.showToast(`🎉 Registration Complete! +100 Welcome Points awarded 🌟`);
      
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
   * User Logout / Switch to Default Resident
   */
  logout() {
    this.currentUser = this.demoAccounts.citizen;
    this.saveSession();

    if (typeof CityAssist !== 'undefined') {
      CityAssist.closeModal();
      CityAssist.closeDrawer();
      CityAssist.showToast("Account reset to default resident. 👋");
      CityAssist.navigateTo('home');
    }
  }
};

// Initialize on script execution
AuthEngine.init();
