/**
 * CityAssist - Internationalization & Multi-Language Engine (i18n)
 * Supports: English (en), मराठी (mr), हिन्दी (hi)
 */

const I18nEngine = {
  currentLang: 'en',

  languages: {
    en: {
      code: 'en',
      name: 'English',
      nativeName: 'English',
      flag: '🇬🇧',
      sublabel: 'Default • Municipal Standard'
    },
    mr: {
      code: 'mr',
      name: 'Marathi',
      nativeName: 'मराठी',
      flag: '🚩',
      sublabel: 'तळेगाव दाभाडे नगरपरिषद • राजभाषा'
    },
    hi: {
      code: 'hi',
      name: 'Hindi',
      nativeName: 'हिन्दी',
      flag: '🇮🇳',
      sublabel: 'राष्ट्रभाषा • सर्वसमावेशक'
    }
  },

  translations: {
    en: {
      // Top & Nav
      nav_home: "Home",
      nav_garbage: "Garbage",
      nav_services: "Services",
      nav_community: "Community",
      nav_profile: "Profile",
      nav_requests: "Requests",

      // Doorstep Alert
      doorstep_alert_title: "🔔 Doorstep Waste Collection Alert",
      doorstep_alert_desc: "Vehicle is within 250m (~2 mins away). Keep waste ready!",

      // Auth Screen
      auth_title: "CityAssist",
      auth_subtitle: "Smart Civic Waste & Live Fleet Operations",
      auth_muni_tag: "",
      auth_select_role: "Select Your Role",
      role_resident: "Resident",
      role_driver: "Driver",
      role_officer: "Officer",
      auth_tab_otp: "📱 Mobile OTP",
      auth_tab_email: "📧 Email / Pass",
      auth_label_mobile: "Mobile Number",
      auth_label_fullname: "Full Name (Optional)",
      auth_btn_send_otp: "Send Verification OTP ➜",
      auth_or_continue: "OR CONTINUE WITH",
      auth_btn_google: "Continue with Google",
      auth_demo_title: "⚡ INSTANT 1-TAP DEMO ACCESS",
      auth_demo_sub: "Skip SMS / OTP for Instant Testing",
      auth_demo_resident: "Resident (Siddhant)",
      auth_demo_driver: "Driver (Ramesh - MH-12)",
      auth_demo_officer: "PMC Officer (Deshmukh)",
      auth_terms: "By continuing, you agree to Municipal Civic Terms & Privacy Policy.",

      // Home Screen
      home_greeting_morning: "Good Morning,",
      home_greeting_afternoon: "Good Afternoon,",
      home_greeting_evening: "Good Evening,",
      home_todays_collection: "Today's Collection",
      home_live_dispatch: "LIVE DISPATCH",
      home_dry_waste: "♻️ Dry Waste",
      home_wet_waste: "🌱 Wet Waste",
      home_collection_time: "10:30 AM – 11:00 AM",
      home_track_route: "TRACK LIVE ROUTE",
      home_hear_alert: "🔊 Hear Alert ➜",
      home_chime_subtext: "Truck Arrival Chime & Voice Alert",
      home_quick_actions: "Quick Actions",
      home_see_all: "SEE ALL",
      home_action_report: "REPORT\nISSUE",
      home_action_notices: "MUNICIPAL\nNOTICES",
      home_action_find_tech: "FIND\nTECHNICIAN",
      home_action_civic: "CIVIC\nSERVICES",
      home_action_rewards: "ECO\nREWARDS",
      home_guide_banner: "🌿 Responsible Citizen Guide",
      home_guide_banner_sub: "Daily Segregation • Eco-Points • Guidelines",
      home_emergency_title: "Need Urgent Help?",
      home_emergency_sub: "Tap here for 24/7 Emergency Services",

      // Garbage Tracking Screen
      gt_title: "Garbage Tracking",
      gt_vehicle_status: "Collection Vehicle Status",
      gt_expected_eta: "Expected in 5 mins",
      gt_stage_on_way: "On the Way",
      gt_stage_nearby: "Nearby",
      gt_stage_arrived_soon: "Arrived Soon",
      gt_stage_completed: "Completed",
      gt_eta_title: "🛰️ Live ETA to Your Doorstep",
      gt_live_radar_title: "Live Fleet Radar",
      gt_focus_truck: "🚚 Focus Truck",
      gt_doorstep: "📍 Doorstep",
      gt_proximity_notice: "Garbage collector will arrive in your area within 5 mins.",
      gt_keep_waste_ready: "Please keep your waste ready.",
      gt_melody_title: "Arrival Melody & Voice Alert",
      gt_melody_sub: "Plays arrival chime & voice at 2-min ETA",
      gt_btn_studio: "Voice Studio",
      gt_btn_download: "Download",
      gt_btn_test: "Test Alert",
      gt_live_checkpoints: "Live Vehicle Checkpoints",

      // Services Screen
      services_title: "Services",
      services_search_placeholder: "Search for a service...",
      services_nearby_pros: "Nearby Professionals",

      // Community Screen
      comm_title: "Community",
      comm_search_placeholder: "Search posts, topics, or citizens...",
      comm_cat_all: "All",
      comm_cat_waste: "Waste & Cleanliness",
      comm_cat_announcements: "PMC Alerts",
      comm_cat_initiatives: "Green Drives",

      // Report Screen
      report_title: "Report an Issue",
      report_headline: "What issue do you want to report?",
      report_add_photos: "Add Photos",
      report_description: "Description (Optional)",
      report_submit_btn: "Submit Report & Dispatch Squad",

      // Profile Screen
      profile_title: "Profile",
      profile_edit_btn: "Edit Profile",
      profile_personal_info: "Personal Information",
      profile_full_name: "Full Name",
      profile_mobile_no: "Mobile Number",
      profile_email_address: "Email Address (Optional)",
      profile_location_card: "Location & Address",
      profile_current_loc: "Current Location",
      profile_home_address: "Home Address",
      profile_area_locality: "Area / Locality",
      profile_pincode: "Pincode",
      profile_my_points: "My Points",
      profile_my_badges: "My Badges",
      profile_civic_eco_card: "Civic Eco-Card",
      profile_my_addresses: "My Addresses",
      profile_test_alerts: "Test Live Mobile Alerts",
      profile_notif_settings: "Notification Settings",
      profile_app_lang: "App Language / भाषा",
      profile_help_support: "Help & Support",
      profile_logout: "Log Out / Switch Account",

      // Language Modal
      lang_modal_title: "Choose App Language",
      lang_modal_sub: "Select your preferred interface language",
      lang_applied_toast: "App language switched to English",
      lang_close: "Close"
    },

    mr: {
      // Top & Nav
      nav_home: "मुख्यपृष्ठ",
      nav_garbage: "कचरा गाडी",
      nav_services: "नागरी सेवा",
      nav_community: "समुदाय",
      nav_profile: "प्रोफाइल",
      nav_requests: "माझ्या विनंत्या",

      // Doorstep Alert
      doorstep_alert_title: "🔔 दाराशी कचरा संकलन सूचना",
      doorstep_alert_desc: "कचरा गाडी २५० मीटरवर (~२ मिनिटे) आहे. कृपया कचरा तयार ठेवा!",

      // Auth Screen
      auth_title: "CityAssist",
      auth_subtitle: "स्मार्ट नागरी कचरा आणि थेट फ्लीट व्यवस्थापन",
      auth_muni_tag: "",
      auth_select_role: "तुमची भूमिका निवडा",
      role_resident: "नागरिक",
      role_driver: "चालक",
      role_officer: "अधिकारी",
      auth_tab_otp: "📱 मोबाईल OTP",
      auth_tab_email: "📧 ईमेल / पासवर्ड",
      auth_label_mobile: "मोबाईल नंबर",
      auth_label_fullname: "पूर्ण नाव (ऐच्छिक)",
      auth_btn_send_otp: "सत्यापन OTP पाठवा ➜",
      auth_or_continue: "किंवा यासह पुढे जा",
      auth_btn_google: "Google सह पुढे जा",
      auth_demo_title: "⚡ झटपट १-टॅप डेमो प्रवेश",
      auth_demo_sub: "चाचणीसाठी SMS / OTP वगळा",
      auth_demo_resident: "नागरिक (सिद्धार्थ)",
      auth_demo_driver: "चालक (रमेश - MH-12)",
      auth_demo_officer: "मुख्याधिकारी (देशमुख)",
      auth_terms: "पुढे चालू ठेवून, आपण नागरी अटी व गोपनीयता धोरणास सहमती देता.",

      // Home Screen
      home_greeting_morning: "शुभ प्रभात,",
      home_greeting_afternoon: "शुभ दुपार,",
      home_greeting_evening: "शुभ संध्याकाळ,",
      home_todays_collection: "आजचे कचरा संकलन",
      home_live_dispatch: "थेट प्रेषण",
      home_dry_waste: "♻️ सुका कचरा",
      home_wet_waste: "🌱 ओला कचरा",
      home_collection_time: "सकाळी १०:३० – ११:००",
      home_track_route: "गाडी थेट ट्रॅक करा",
      home_hear_alert: "🔊 आवाज ऐका ➜",
      home_chime_subtext: "गाडी आगमन संगीत व व्हॉईस अलर्ट",
      home_quick_actions: "जलद कृती",
      home_see_all: "सर्व पहा",
      home_action_report: "तक्रार\nनोंदवा",
      home_action_notices: "महापालिका\nसूचना",
      home_action_find_tech: "कारागीर\nशोधा",
      home_action_civic: "नागरी\nसेवा",
      home_action_rewards: "पर्यावरण\nबक्षीसे",
      home_guide_banner: "🌿 जबाबदार नागरिक मार्गदर्शक",
      home_guide_banner_sub: "कचरा वर्गीकरण • इको पॉईंट्स • नियम",
      home_emergency_title: "तातडीची मदत हवी आहे का?",
      home_emergency_sub: "२४/७ आपत्कालीन सेवेसाठी येथे टॅप करा",

      // Garbage Tracking Screen
      gt_title: "कचरा गाडी ट्रॅकिंग",
      gt_vehicle_status: "कचरा गाडीचे थेट स्थान",
      gt_expected_eta: "५ मिनिटांत आगमन अपेक्षित",
      gt_stage_on_way: "मार्गावर आहे",
      gt_stage_nearby: "जवळ आले आहे",
      gt_stage_arrived_soon: "लवकरच पोहोचेल",
      gt_stage_completed: "पूर्ण झाले",
      gt_eta_title: "🛰️ तुमच्या दारापर्यंत थेट वेळ (ETA)",
      gt_live_radar_title: "थेट फ्लीट रडार",
      gt_focus_truck: "🚚 गाडी पहा",
      gt_doorstep: "📍 माझे घर",
      gt_proximity_notice: "कचरा संकलन गाडी ५ मिनिटांत आपल्या भागात येत आहे.",
      gt_keep_waste_ready: "कृपया ओला व सुका कचरा वेगळा ठेवा.",
      gt_melody_title: "आगमन धून आणि व्हॉईस अलर्ट",
      gt_melody_sub: "गाडी २ मिनिटांवर असताना 'कचरा गाडी आली' घोषणा",
      gt_btn_studio: "व्हॉईस स्टुडिओ",
      gt_btn_download: "डाउनलोड",
      gt_btn_test: "अलर्ट चाचणी",
      gt_live_checkpoints: "थेट वाहन थांबे",

      // Services Screen
      services_title: "नागरी सेवा",
      services_search_placeholder: "आवश्यक सेवा शोधा...",
      services_nearby_pros: "जवळपासचे अधिकृत कारागीर",

      // Community Screen
      comm_title: "नागरी समुदाय",
      comm_search_placeholder: "पोस्ट किंवा चर्चा शोधा...",
      comm_cat_all: "सर्व",
      comm_cat_waste: "कचरा व स्वच्छता",
      comm_cat_announcements: "नगरपरिषद सूचना",
      comm_cat_initiatives: "हरित उपक्रम",

      // Report Screen
      report_title: "समस्या नोंदवा",
      report_headline: "तुम्हाला कोणती समस्या नोंदवायची आहे?",
      report_add_photos: "फोटो जोडा",
      report_description: "तपशील (ऐच्छिक)",
      report_submit_btn: "तक्रार नोंदवा व पथक पाठवा",

      // Profile Screen
      profile_title: "माझे प्रोफाइल",
      profile_edit_btn: "प्रोफाइल संपादित करा",
      profile_personal_info: "वैयक्तिक माहिती",
      profile_full_name: "पूर्ण नाव",
      profile_mobile_no: "मोबाईल नंबर",
      profile_email_address: "ईमेल पत्ता (ऐच्छिक)",
      profile_location_card: "स्थान आणि पत्ता",
      profile_current_loc: "सध्याचे स्थान",
      profile_home_address: "घराचा पत्ता",
      profile_area_locality: "विभाग / प्रभाग",
      profile_pincode: "पिनकोड",
      profile_my_points: "माझे गुण (पॉईंट्स)",
      profile_my_badges: "माझे बॅजेस",
      profile_civic_eco_card: "नागरी इको-कार्ड",
      profile_my_addresses: "माझे जतन केलेले पत्ते",
      profile_test_alerts: "थेट मोबाईल अलर्ट चाचणी",
      profile_notif_settings: "सूचना सेटिंग्ज",
      profile_app_lang: "अॅपची भाषा (Language)",
      profile_help_support: "मदत आणि संपर्क",
      profile_logout: "लॉग आऊट / खाते बदला",

      // Language Modal
      lang_modal_title: "अॅपची भाषा निवडा",
      lang_modal_sub: "आपल्या पसंतीची भाषा निवडा",
      lang_applied_toast: "अॅपची भाषा मराठीमध्ये बदलली आहे",
      lang_close: "बंद करा"
    },

    hi: {
      // Top & Nav
      nav_home: "होम",
      nav_garbage: "कचरा गाड़ी",
      nav_services: "नागरिक सेवाएं",
      nav_community: "समुदाय",
      nav_profile: "प्रोफाइल",
      nav_requests: "मेरे अनुरोध",

      // Doorstep Alert
      doorstep_alert_title: "🔔 डोरस्टेप कचरा संग्रहण अलर्ट",
      doorstep_alert_desc: "कचरा गाड़ी २५० मीटर (~२ मिनट) पर है। कचरा तैयार रखें!",

      // Auth Screen
      auth_title: "CityAssist",
      auth_subtitle: "स्मार्ट नागरिक कचरा और लाइव फ्लीट संचालन",
      auth_muni_tag: "",
      auth_select_role: "अपनी भूमिका चुनें",
      role_resident: "नागरिक",
      role_driver: "चालक",
      role_officer: "अधिकारी",
      auth_tab_otp: "📱 मोबाइल OTP",
      auth_tab_email: "📧 ईमेल / पासवर्ड",
      auth_label_mobile: "मोबाइल नंबर",
      auth_label_fullname: "पूरा नाम (वैकल्पिक)",
      auth_btn_send_otp: "सत्यापन OTP भेजें ➜",
      auth_or_continue: "या इसके साथ जारी रखें",
      auth_btn_google: "Google के साथ जारी रखें",
      auth_demo_title: "⚡ त्वरित १-टैप डेमो प्रवेश",
      auth_demo_sub: "टेस्टिंग के लिए SMS / OTP छोड़ें",
      auth_demo_resident: "नागरिक (सिद्धांत)",
      auth_demo_driver: "ड्राइवर (रमेश - MH-12)",
      auth_demo_officer: "नगर अधिकारी (देशमुख)",
      auth_terms: "जारी रखकर, आप नागरिक नियमों और गोपनीयता नीति से सहमत होते हैं।",

      // Home Screen
      home_greeting_morning: "शुभ प्रभात,",
      home_greeting_afternoon: "शुभ दोपहर,",
      home_greeting_evening: "शुभ संध्या,",
      home_todays_collection: "आज का कचरा संग्रहण",
      home_live_dispatch: "लाइव डिस्पैच",
      home_dry_waste: "♻️ सूखा कचरा",
      home_wet_waste: "🌱 गीला कचरा",
      home_collection_time: "सुबह १०:३० – ११:००",
      home_track_route: "गाड़ी लाइव ट्रैक करें",
      home_hear_alert: "🔊 अलर्ट सुनें ➜",
      home_chime_subtext: "गाड़ी आगमन धुन और वॉइस अलर्ट",
      home_quick_actions: "त्वरित कार्य",
      home_see_all: "सभी देखें",
      home_action_report: "शिकायत\nदर्ज करें",
      home_action_notices: "नगरपालिका\nसूचनाएं",
      home_action_find_tech: "कारीगर\nखोजें",
      home_action_civic: "नागरिक\nसेवाएं",
      home_action_rewards: "पर्यावरण\nइनाम",
      home_guide_banner: "🌿 जिम्मेदार नागरिक गाइड",
      home_guide_banner_sub: "कचरा पृथक्करण • इको पॉइंट्स • नियम",
      home_emergency_title: "तुरंत मदद चाहिए?",
      home_emergency_sub: "२४/७ आपातकालीन सेवाओं के लिए टैप करें",

      // Garbage Tracking Screen
      gt_title: "कचरा गाड़ी ट्रैकिंग",
      gt_vehicle_status: "कचरा वाहन की स्थिति",
      gt_expected_eta: "५ मिनट में आगमन अपेक्षित",
      gt_stage_on_way: "रास्ते में है",
      gt_stage_nearby: "नजदीक है",
      gt_stage_arrived_soon: "जल्द पहुंचेगा",
      gt_stage_completed: "पूर्ण हुआ",
      gt_eta_title: "🛰️ आपके दरवाजे तक लाइव समय (ETA)",
      gt_live_radar_title: "लाइव फ्लीट रडार",
      gt_focus_truck: "🚚 गाड़ी देखें",
      gt_doorstep: "📍 मेरा घर",
      gt_proximity_notice: "कचरा संग्रहण गाड़ी ५ मिनट में आपके क्षेत्र में आ रही है।",
      gt_keep_waste_ready: "कृपया गीला व सूखा कचरा अलग रखें।",
      gt_melody_title: "आगमन धुन और वॉइस अलर्ट",
      gt_melody_sub: "गाड़ी २ मिनट दूर होने पर 'कचरा गाड़ी आई' आवाज",
      gt_btn_studio: "वॉइस स्टूडियो",
      gt_btn_download: "डाउनलोड",
      gt_btn_test: "अलर्ट टेस्ट",
      gt_live_checkpoints: "लाइव वाहन चेकपॉइंट्स",

      // Services Screen
      services_title: "नागरिक सेवाएं",
      services_search_placeholder: "सेवा खोजें...",
      services_nearby_pros: "आसपास के प्रमाणित कारीगर",

      // Community Screen
      comm_title: "नागरिक समुदाय",
      comm_search_placeholder: "पोस्ट या चर्चा खोजें...",
      comm_cat_all: "सभी",
      comm_cat_waste: "कचरा व स्वच्छता",
      comm_cat_announcements: "नगर परिषद अलर्ट",
      comm_cat_initiatives: "हरित अभियान",

      // Report Screen
      report_title: "शिकायत दर्ज करें",
      report_headline: "आप कौन सी समस्या दर्ज करना चाहते हैं?",
      report_add_photos: "फोटो जोड़ें",
      report_description: "विवरण (वैकल्पिक)",
      report_submit_btn: "शिकायत दर्ज करें और दल भेजें",

      // Profile Screen
      profile_title: "मेरी प्रोफाइल",
      profile_edit_btn: "प्रोफाइल संपादित करें",
      profile_personal_info: "व्यक्तिगत जानकारी",
      profile_full_name: "पूरा नाम",
      profile_mobile_no: "मोबाइल नंबर",
      profile_email_address: "ईमेल पता (वैकल्पिक)",
      profile_location_card: "स्थान और पता",
      profile_current_loc: "वर्तमान स्थान",
      profile_home_address: "घर का पता",
      profile_area_locality: "वार्ड / क्षेत्र",
      profile_pincode: "पिनकोड",
      profile_my_points: "मेरे पॉइंट्स",
      profile_my_badges: "मेरे बैज",
      profile_civic_eco_card: "नागरिक इको-कार्ड",
      profile_my_addresses: "मेरे सहेजे गए पते",
      profile_test_alerts: "लाइव मोबाइल अलर्ट टेस्ट करें",
      profile_notif_settings: "अधिसूचना सेटिंग्स",
      profile_app_lang: "ऐप की भाषा (Language)",
      profile_help_support: "सहायता और संपर्क",
      profile_logout: "लॉग आउट / खाता बदलें",

      // Language Modal
      lang_modal_title: "ऐप की भाषा चुनें",
      lang_modal_sub: "अपनी पसंदीदा भाषा चुनें",
      lang_applied_toast: "ऐप की भाषा हिन्दी में बदल दी गई है",
      lang_close: "बंद करें"
    }
  },

  /**
   * Initialize i18n
   */
  init() {
    const saved = localStorage.getItem('cityassist_lang');
    if (saved && this.translations[saved]) {
      this.currentLang = saved;
    } else {
      this.currentLang = 'en';
    }
    this.applyTranslations(this.currentLang);
  },

  /**
   * Translate a key
   */
  t(key, fallback = '') {
    const dict = this.translations[this.currentLang] || this.translations['en'];
    return dict[key] || fallback || key;
  },

  /**
   * Get current language info
   */
  getLanguage() {
    return this.currentLang;
  },

  /**
   * Switch Language
   */
  setLanguage(lang, showToast = true) {
    if (!this.translations[lang]) return;
    this.currentLang = lang;
    try {
      localStorage.setItem('cityassist_lang', lang);
    } catch(e) {}

    // Sync Audio Announcer Voice Language
    if (typeof AudioAnnouncerEngine !== 'undefined' && AudioAnnouncerEngine.selectLanguage) {
      AudioAnnouncerEngine.selectedLang = lang;
      const langPill = document.getElementById(`lang-pill-${lang}`);
      if (langPill) {
        document.querySelectorAll('.lang-option-pill').forEach(p => p.classList.remove('selected'));
        langPill.classList.add('selected');
      }
    }

    this.applyTranslations(lang);
    this.closeLanguageModal();

    if (showToast && typeof CityAssist !== 'undefined' && CityAssist.showToast) {
      const toastMsg = this.t('lang_applied_toast', `Language switched to ${this.languages[lang].nativeName}`);
      CityAssist.showToast(toastMsg);
    }
  },

  /**
   * Apply translations to the DOM
   */
  applyTranslations(lang) {
    const dict = this.translations[lang] || this.translations['en'];

    // 1. Elements with data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) {
        el.innerText = dict[key];
      }
    });

    // 2. Elements with data-i18n-html
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      if (dict[key]) {
        el.innerHTML = dict[key];
      }
    });

    // 3. Placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (dict[key]) {
        el.setAttribute('placeholder', dict[key]);
      }
    });

    // 4. Update Quick Lang Badges across UI
    const langObj = this.languages[lang] || this.languages.en;

    // Header Pill
    const headerPill = document.getElementById('current-lang-pill-text');
    if (headerPill) headerPill.textContent = lang.toUpperCase();

    // Auth Screen Pill
    const authLangText = document.getElementById('auth-current-lang-text');
    if (authLangText) authLangText.textContent = langObj.nativeName;

    // Drawer Lang Badge
    const drawerBadge = document.getElementById('drawer-lang-badge');
    if (drawerBadge) drawerBadge.textContent = langObj.nativeName;

    // Profile Settings Pill
    const profilePill = document.getElementById('profile-lang-pill');
    if (profilePill) profilePill.textContent = langObj.nativeName;

    // Update Bottom Navigation Tab Labels directly
    const tabLabels = {
      home: dict.nav_home,
      garbage: dict.nav_garbage,
      services: dict.nav_services,
      community: dict.nav_community,
      profile: dict.nav_profile
    };
    document.querySelectorAll('.bottom-navigation-bar .nav-tab-item').forEach(tab => {
      const tabName = tab.getAttribute('data-tab');
      const labelSpan = tab.querySelector('.tab-label');
      if (labelSpan && tabLabels[tabName]) {
        labelSpan.textContent = tabLabels[tabName];
      }
    });

    // Update Header Titles on standard screens
    const screenHeaders = {
      'screen-garbage': dict.gt_title,
      'screen-services': dict.services_title,
      'screen-community': dict.comm_title,
      'screen-report-issue': dict.report_title,
      'screen-profile': dict.profile_title
    };
    Object.keys(screenHeaders).forEach(id => {
      const sec = document.getElementById(id);
      if (sec) {
        const titleEl = sec.querySelector('.header-title');
        if (titleEl) titleEl.textContent = screenHeaders[id];
      }
    });

    // Update Greeting dynamically
    if (typeof CityAssist !== 'undefined' && CityAssist.getGreetingPrefix) {
      const greetingSub = document.querySelector('.greeting-sub');
      if (greetingSub) {
        greetingSub.textContent = CityAssist.getGreetingPrefix();
      }
    }
  },

  /**
   * Open the Language Selection Bottom Sheet Modal
   */
  openLanguageModal() {
    const current = this.currentLang;
    const isEn = current === 'en';
    const isMr = current === 'mr';
    const isHi = current === 'hi';

    const modalHTML = `
      <div class="lang-modal-wrapper" style="padding: 10px 4px 16px 4px;">
        <!-- Header -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:1.4rem;">🌐</span>
              <h3 style="margin:0; font-size:1.15rem; font-weight:800; color:#0F172A;">
                ${this.t('lang_modal_title', 'Choose App Language')}
              </h3>
            </div>
            <p style="margin:4px 0 0 0; font-size:0.78rem; color:#64748B;">
              ${this.t('lang_modal_sub', 'Select your preferred interface language')}
            </p>
          </div>
          <button type="button" onclick="CityAssist.closeModal()" style="background:#F1F5F9; border:none; width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:800; color:#475569; cursor:pointer;">✕</button>
        </div>

        <!-- Language Options List -->
        <div class="lang-options-grid" style="display:flex; flex-direction:column; gap:10px; margin-top:14px;">
          
          <!-- 1. ENGLISH -->
          <div class="lang-card ${isEn ? 'selected' : ''}" onclick="I18nEngine.setLanguage('en')" style="display:flex; align-items:center; justify-content:space-between; padding:14px 16px; border-radius:14px; border:2px solid ${isEn ? '#0F7943' : '#E2E8F0'}; background:${isEn ? '#F0FDF4' : '#FFFFFF'}; cursor:pointer; transition:all 0.2s ease; box-shadow:${isEn ? '0 4px 12px rgba(15,121,67,0.12)' : 'none'};">
            <div style="display:flex; align-items:center; gap:12px;">
              <div style="font-size:1.6rem; width:40px; height:40px; border-radius:10px; background:${isEn ? '#DCFCE7' : '#F8FAFC'}; display:flex; align-items:center; justify-content:center;">
                🇬🇧
              </div>
              <div>
                <div style="font-size:0.95rem; font-weight:800; color:#0F172A;">English</div>
                <div style="font-size:0.75rem; color:${isEn ? '#15803D' : '#64748B'}; font-weight:600;">Default • Municipal Standard</div>
              </div>
            </div>
            <div style="width:24px; height:24px; border-radius:50%; border:2px solid ${isEn ? '#0F7943' : '#CBD5E1'}; background:${isEn ? '#0F7943' : '#FFF'}; display:flex; align-items:center; justify-content:center; color:#FFF; font-size:0.8rem; font-weight:900;">
              ${isEn ? '✓' : ''}
            </div>
          </div>

          <!-- 2. MARATHI (मराठी) -->
          <div class="lang-card ${isMr ? 'selected' : ''}" onclick="I18nEngine.setLanguage('mr')" style="display:flex; align-items:center; justify-content:space-between; padding:14px 16px; border-radius:14px; border:2px solid ${isMr ? '#0F7943' : '#E2E8F0'}; background:${isMr ? '#F0FDF4' : '#FFFFFF'}; cursor:pointer; transition:all 0.2s ease; box-shadow:${isMr ? '0 4px 12px rgba(15,121,67,0.12)' : 'none'};">
            <div style="display:flex; align-items:center; gap:12px;">
              <div style="font-size:1.6rem; width:40px; height:40px; border-radius:10px; background:${isMr ? '#DCFCE7' : '#F8FAFC'}; display:flex; align-items:center; justify-content:center;">
                🚩
              </div>
              <div>
                <div style="font-size:1.05rem; font-weight:800; color:#0F172A;">मराठी (Marathi)</div>
                <div style="font-size:0.75rem; color:${isMr ? '#15803D' : '#64748B'}; font-weight:600;">तळेगाव दाभाडे नगरपरिषद • राजभाषा</div>
              </div>
            </div>
            <div style="width:24px; height:24px; border-radius:50%; border:2px solid ${isMr ? '#0F7943' : '#CBD5E1'}; background:${isMr ? '#0F7943' : '#FFF'}; display:flex; align-items:center; justify-content:center; color:#FFF; font-size:0.8rem; font-weight:900;">
              ${isMr ? '✓' : ''}
            </div>
          </div>

          <!-- 3. HINDI (हिन्दी) -->
          <div class="lang-card ${isHi ? 'selected' : ''}" onclick="I18nEngine.setLanguage('hi')" style="display:flex; align-items:center; justify-content:space-between; padding:14px 16px; border-radius:14px; border:2px solid ${isHi ? '#0F7943' : '#E2E8F0'}; background:${isHi ? '#F0FDF4' : '#FFFFFF'}; cursor:pointer; transition:all 0.2s ease; box-shadow:${isHi ? '0 4px 12px rgba(15,121,67,0.12)' : 'none'};">
            <div style="display:flex; align-items:center; gap:12px;">
              <div style="font-size:1.6rem; width:40px; height:40px; border-radius:10px; background:${isHi ? '#DCFCE7' : '#F8FAFC'}; display:flex; align-items:center; justify-content:center;">
                🇮🇳
              </div>
              <div>
                <div style="font-size:1.05rem; font-weight:800; color:#0F172A;">हिन्दी (Hindi)</div>
                <div style="font-size:0.75rem; color:${isHi ? '#15803D' : '#64748B'}; font-weight:600;">राष्ट्रभाषा • सर्वसमावेशक</div>
              </div>
            </div>
            <div style="width:24px; height:24px; border-radius:50%; border:2px solid ${isHi ? '#0F7943' : '#CBD5E1'}; background:${isHi ? '#0F7943' : '#FFF'}; display:flex; align-items:center; justify-content:center; color:#FFF; font-size:0.8rem; font-weight:900;">
              ${isHi ? '✓' : ''}
            </div>
          </div>

        </div>

        <!-- Municipal Guarantee Footnote -->
        <div style="margin-top:16px; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px; padding:10px 14px; display:flex; align-items:center; gap:8px;">
          <span style="font-size:1.1rem;">🏛️</span>
          <span style="font-size:0.72rem; color:#64748B; line-height:1.4;">
            All municipal announcements, waste alarms, and service workflows adapt instantly to your selected language.
          </span>
        </div>
      </div>
    `;

    if (typeof CityAssist !== 'undefined' && CityAssist.openModal) {
      CityAssist.openModal(modalHTML);
    }
  },

  /**
   * Close modal helper
   */
  closeLanguageModal() {
    if (typeof CityAssist !== 'undefined' && CityAssist.closeModal) {
      CityAssist.closeModal();
    }
  }
};

// Auto-initialize when script loads
if (typeof window !== 'undefined') {
  window.I18nEngine = I18nEngine;
}
