/**
 * Leaflet Interactive Maps Engine for CityAssist
 * Advanced Civic Mapping Engine with Multi-Layer Tile Switching,
 * Rich Interactive Landmarks (Colleges, Hospitals, Shops, Transit),
 * Dynamic Vehicle Heading Rotations, Live Radar, and Real-time Citizen Synchronization.
 */

const LeafletMapEngine = {
  isLoaded: false,
  citizenMap: null,
  fullscreenMap: null,
  driverMap: null,
  muniMap: null,
  reportMap: null,

  // Active Tile Layers
  currentTileType: 'osm', // 'osm' | 'esri_street' | 'carto_voyager' | 'satellite' | 'dark'
  citizenTileLayer: null,
  fullscreenTileLayer: null,
  driverTileLayer: null,
  muniTileLayer: null,
  reportTileLayer: null,

  // Marker & Layer References
  citizenMarker: null,
  citizenMarkerFullscreen: null,
  reportMarker: null,
  truckMarkerCitizen: null,
  truckMarkerFullscreen: null,
  truckMarkerDriver: null,
  muniTruckMarkers: {},
  routePolylines: {},
  checkpointMarkers: [],

  // Landmark POI Layers & Configuration
  showLandmarks: true,
  activeLandmarkCategory: 'all',
  citizenLandmarkLayer: null,
  fsLandmarkLayer: null,

  // Curated Landmark Directory for Talegaon Dabhade
  landmarks: [
    // 🎓 Colleges & Educational Institutions
    {
      id: "mimer-college",
      name: "MIMER Medical College & Hospital",
      category: "college",
      categoryName: "Medical College & Hospital",
      emoji: "🎓",
      color: "#8B5CF6",
      bgGradient: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
      lat: 18.7305,
      lng: 73.6810,
      address: "MIMER Campus, Near Railway Station, Talegaon Dabhade",
      desc: "Premier medical college, research center & 700+ bed tertiary hospital"
    },
    {
      id: "dy-patil-college",
      name: "D.Y. Patil College of Engineering (DYP)",
      category: "college",
      categoryName: "Engineering & Poly Campus",
      emoji: "🎓",
      color: "#8B5CF6",
      bgGradient: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
      lat: 18.7390,
      lng: 73.6740,
      address: "DY Patil Knowledge City, Talegaon-Chakan Highway",
      desc: "Engineering, polytechnic & innovation research campus"
    },
    {
      id: "nutan-nmiet",
      name: "Nutan Maharashtra Institute of Engg (NMIET)",
      category: "college",
      categoryName: "Engineering Institute",
      emoji: "🎓",
      color: "#8B5CF6",
      bgGradient: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
      lat: 18.7290,
      lng: 73.6930,
      address: "Samarth Vidya Sankul, Vishnupuri, Talegaon",
      desc: "NBA accredited engineering college & research labs"
    },
    {
      id: "indrayani-college",
      name: "Indrayani Mahavidyalaya",
      category: "college",
      categoryName: "Arts, Commerce & Science",
      emoji: "🏫",
      color: "#8B5CF6",
      bgGradient: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
      lat: 18.7320,
      lng: 73.6820,
      address: "Indrayani Vidya Mandir, Talegaon Dabhade",
      desc: "Historic higher education institution of Maval region"
    },
    {
      id: "podar-school",
      name: "Podar International School",
      category: "college",
      categoryName: "International School",
      emoji: "🏫",
      color: "#8B5CF6",
      bgGradient: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
      lat: 18.7420,
      lng: 73.6680,
      address: "Survey No. 102, Near MIDC Road, Talegaon",
      desc: "CBSE school campus with athletics and sports pavilion"
    },

    // 🏥 Hospitals & Healthcare
    {
      id: "general-hospital",
      name: "Talegaon General Sub-District Hospital",
      category: "hospital",
      categoryName: "Govt Sub-District Hospital",
      emoji: "🏥",
      color: "#EF4444",
      bgGradient: "linear-gradient(135deg, #EF4444, #B91C1C)",
      lat: 18.7312,
      lng: 73.6775,
      address: "Municipal Hospital Road, Talegaon",
      desc: "24x7 Emergency, Trauma care, ICU and Municipal OPD"
    },
    {
      id: "pawana-hospital",
      name: "Pawana Multispeciality Hospital",
      category: "hospital",
      categoryName: "Multispeciality Hospital",
      emoji: "🏥",
      color: "#EF4444",
      bgGradient: "linear-gradient(135deg, #EF4444, #B91C1C)",
      lat: 18.7230,
      lng: 73.6890,
      address: "Somatane Toll Post Road, Talegaon",
      desc: "Advanced cardiac care, emergency ICU & radiology"
    },
    {
      id: "sevadham-hospital",
      name: "Sevadham Hospital & Research Center",
      category: "hospital",
      categoryName: "Charitable Hospital",
      emoji: "🏥",
      color: "#EF4444",
      bgGradient: "linear-gradient(135deg, #EF4444, #B91C1C)",
      lat: 18.7265,
      lng: 73.6830,
      address: "Near Indrayani Park, Talegaon",
      desc: "Affordable healthcare, ophthalmology & dialysis center"
    },
    {
      id: "apollo-pharmacy",
      name: "Apollo Pharmacy 24x7 & Wellness",
      category: "hospital",
      categoryName: "24x7 Pharmacy & Medicals",
      emoji: "💊",
      color: "#EF4444",
      bgGradient: "linear-gradient(135deg, #EF4444, #B91C1C)",
      lat: 18.7295,
      lng: 73.6755,
      address: "Shop 4, Samta Colony Main Gate",
      desc: "24x7 all prescription medicines & healthcare equipment"
    },

    // 🛒 Shops, Markets, Food & Commercial
    {
      id: "dmart-talegaon",
      name: "D-Mart & Reliance Smart Supermarket",
      category: "shop",
      categoryName: "Supermarket & Groceries",
      emoji: "🛒",
      color: "#F59E0B",
      bgGradient: "linear-gradient(135deg, #F59E0B, #D97706)",
      lat: 18.7360,
      lng: 73.6720,
      address: "Station Road, Near Railway Overbridge, Talegaon",
      desc: "Fresh groceries, dairy, household essentials and shopping"
    },
    {
      id: "station-mandi",
      name: "Talegaon Municipal Vegetable & Fish Mandi",
      category: "shop",
      categoryName: "Municipal Fresh Produce Market",
      emoji: "🛍️",
      color: "#F59E0B",
      bgGradient: "linear-gradient(135deg, #F59E0B, #D97706)",
      lat: 18.7335,
      lng: 73.6705,
      address: "Station Road Bazaar, Talegaon",
      desc: "Fresh daily farm produce, fruits and organic vegetables"
    },
    {
      id: "chitale-sweets",
      name: "Chitale Bandhu Mithaiwale & Bakery",
      category: "shop",
      categoryName: "Sweets & Traditional Snacks",
      emoji: "🏪",
      color: "#F59E0B",
      bgGradient: "linear-gradient(135deg, #F59E0B, #D97706)",
      lat: 18.7328,
      lng: 73.6712,
      address: "Jijamata Chowk, Station Road, Talegaon",
      desc: "Famous Bakarwadi, sweets, dairy and fresh mango pulp"
    },
    {
      id: "cafe-katta",
      name: "Cafe Katta & Food Plaza",
      category: "shop",
      categoryName: "Cafe & Multi-Cuisine Food",
      emoji: "☕",
      color: "#F59E0B",
      bgGradient: "linear-gradient(135deg, #F59E0B, #D97706)",
      lat: 18.7345,
      lng: 73.6730,
      address: "Maruti Mandir Complex, Station Road",
      desc: "Youth hotspot for snacks, filter coffee, tea & pizza"
    },
    {
      id: "city-center-mall",
      name: "Talegaon City Center Commercial Mall",
      category: "shop",
      categoryName: "Shopping Mall & ATMs",
      emoji: "🏬",
      color: "#F59E0B",
      bgGradient: "linear-gradient(135deg, #F59E0B, #D97706)",
      lat: 18.7355,
      lng: 73.6750,
      address: "Talegaon-Chakan Highway Junction",
      desc: "Clothing retail showrooms, electronics, banks & ATMs"
    },

    // 🏛️ Civic, Transit, Parks & Heritage
    {
      id: "railway-station",
      name: "Talegaon Railway Station",
      category: "civic",
      categoryName: "Suburban Railway Terminal",
      emoji: "🚆",
      color: "#3B82F6",
      bgGradient: "linear-gradient(135deg, #3B82F6, #1D4ED8)",
      lat: 18.7350,
      lng: 73.6690,
      address: "Station Road, Talegaon Dabhade",
      desc: "Pune-Mumbai local suburban train terminal & junction"
    },
    {
      id: "municipal-council",
      name: "Talegaon Dabhade Municipal Council (TMC)",
      category: "civic",
      categoryName: "Municipal Administrative HQ",
      emoji: "🏛️",
      color: "#3B82F6",
      bgGradient: "linear-gradient(135deg, #3B82F6, #1D4ED8)",
      lat: 18.7315,
      lng: 73.6750,
      address: "Nagar Parishad Bhavan, Shivaji Chowk, Talegaon",
      desc: "Civic governance, waste squad command & public services"
    },
    {
      id: "st-bus-depot",
      name: "MSRTC Talegaon ST Bus Stand",
      category: "civic",
      categoryName: "State Transport Bus Depot",
      emoji: "🚏",
      color: "#3B82F6",
      bgGradient: "linear-gradient(135deg, #3B82F6, #1D4ED8)",
      lat: 18.7340,
      lng: 73.6675,
      address: "Opp. Railway Station, Talegaon",
      desc: "Intercity bus depot connecting Pune, Chakan & Lonavala"
    },
    {
      id: "indrayani-park",
      name: "Indrayani Lake & Municipal Eco Park",
      category: "civic",
      categoryName: "Public Park & Botanical Garden",
      emoji: "🌳",
      color: "#10B981",
      bgGradient: "linear-gradient(135deg, #10B981, #059669)",
      lat: 18.7245,
      lng: 73.6795,
      address: "Lakeside Promenade, Samta Colony Sector 4",
      desc: "Scenic jogging promenade, children play zone & open gym"
    },
    {
      id: "bhandara-arch",
      name: "Bhandara Dongar Tukaram Mandir Arch",
      category: "civic",
      categoryName: "Historical & Pilgrim Landmark",
      emoji: "🛕",
      color: "#F59E0B",
      bgGradient: "linear-gradient(135deg, #F59E0B, #D97706)",
      lat: 18.7180,
      lng: 73.6880,
      address: "Bhandara Road, Somatane",
      desc: "Historic meditation hill & temple arch of Sant Tukaram Maharaj"
    }
  ],

  // Active Tile Layers
  currentTileType: 'google_streets', // 'google_streets' | 'google_traffic' | 'google_hybrid' | 'osm' | 'satellite'
  citizenTileLayer: null,
  fullscreenTileLayer: null,
  driverTileLayer: null,
  muniTileLayer: null,
  reportTileLayer: null,

  tileProviders: {
    google_streets: {
      url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
      options: {
        attribution: 'Map &copy; Google Maps',
        maxZoom: 21,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
      }
    },
    google_traffic: {
      url: 'https://mt1.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}',
      options: {
        attribution: 'Traffic &copy; Google Maps Live Traffic',
        maxZoom: 21,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
      }
    },
    google_hybrid: {
      url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      options: {
        attribution: 'Imagery &copy; Google Satellite with Labels',
        maxZoom: 21,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
      }
    },
    satellite: {
      url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      options: {
        attribution: 'Map &copy; High-Res Satellite Imagery with Labels',
        maxZoom: 21
      }
    },
    osm: {
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      options: {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19
      }
    },
    clean: {
      url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
      options: {
        attribution: '&copy; OpenStreetMap contributors',
        subdomains: 'abc',
        maxZoom: 19
      }
    }
  },

  init() {
    if (typeof L !== 'undefined') {
      this.isLoaded = true;
      console.log("✓ Google Maps & Leaflet High-Detail Civic Engine initialized");
    }
  },

  /**
   * Switch Map Tile Theme (Google Streets, Live Traffic, Google Satellite, OSM)
   */
  setMapTheme(themeName) {
    if (!this.tileProviders[themeName]) themeName = 'google_streets';
    this.currentTileType = themeName;
    const provider = this.tileProviders[themeName];

    // Update active UI chips
    document.querySelectorAll('.map-theme-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.theme === themeName);
    });

    if (this.citizenMap && this.citizenTileLayer) {
      this.citizenMap.removeLayer(this.citizenTileLayer);
      this.citizenTileLayer = L.tileLayer(provider.url, provider.options).addTo(this.citizenMap);
    }
    if (this.fullscreenMap && this.fullscreenTileLayer) {
      this.fullscreenMap.removeLayer(this.fullscreenTileLayer);
      this.fullscreenTileLayer = L.tileLayer(provider.url, provider.options).addTo(this.fullscreenMap);
    }
    if (this.driverMap && this.driverTileLayer) {
      this.driverMap.removeLayer(this.driverTileLayer);
      this.driverTileLayer = L.tileLayer(provider.url, provider.options).addTo(this.driverMap);
    }
    if (this.reportMap && this.reportTileLayer) {
      this.reportMap.removeLayer(this.reportTileLayer);
      this.reportTileLayer = L.tileLayer(provider.url, provider.options).addTo(this.reportMap);
    }

    if (typeof CityAssist !== 'undefined') {
      const names = {
        google_streets: 'Google Maps (Streets & Localities)',
        google_traffic: 'Google Maps (Live Traffic Flow 🚦)',
        google_hybrid: 'Google Satellite (High-Res Aerial 🛰️)',
        satellite: 'Google Satellite (High-Res Aerial 🛰️)',
        osm: 'OpenStreetMap (Detailed)'
      };
      CityAssist.showToast(`Map switched to ${names[themeName] || 'Google Map Layer'} 🗺️`);
    }
  },

  /**
   * Render Landmarks POI Layer on Map
   */
  renderLandmarksLayer(mapInstance, isFullscreen = false) {
    if (!mapInstance || typeof L === 'undefined') return null;

    const layerGroup = L.layerGroup();
    const citizen = (typeof GPSTrackerEngine !== 'undefined') ? GPSTrackerEngine.citizenLocation : { lat: 18.7285, lng: 73.6765 };

    this.landmarks.forEach(lm => {
      if (this.activeLandmarkCategory !== 'all' && lm.category !== this.activeLandmarkCategory) {
        return;
      }

      // Calculate real distance to citizen home
      let distText = "";
      if (typeof GPSTrackerEngine !== 'undefined') {
        const d = GPSTrackerEngine.calculateHaversineDistance(citizen.lat, citizen.lng, lm.lat, lm.lng);
        distText = d < 1 ? `${Math.round(d * 1000)}m from your home` : `${d.toFixed(1)} km from your home`;
      }

      // Compact, ultra-clean custom pin icon
      const landmarkIcon = L.divIcon({
        className: 'leaflet-landmark-pin-node',
        html: `
          <div class="leaflet-landmark-pin" style="background:${lm.bgGradient}; box-shadow:0 3px 10px rgba(0,0,0,0.25);">
            <span class="landmark-emoji">${lm.emoji}</span>
          </div>
          <div class="leaflet-landmark-label">${lm.name.split(' ')[0]}</div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker([lm.lat, lm.lng], { icon: landmarkIcon });

      marker.bindPopup(`
        <div style="font-family:'Plus Jakarta Sans',sans-serif; padding:6px 2px; min-width:210px;">
          <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
            <span style="font-size:1.2rem;">${lm.emoji}</span>
            <div>
              <div style="font-weight:900; color:#0F172A; font-size:13px; line-height:1.2;">${lm.name}</div>
              <span style="background:${lm.color}15; color:${lm.color}; font-size:10px; font-weight:800; padding:1px 6px; border-radius:6px; display:inline-block; margin-top:2px;">
                ${lm.categoryName}
              </span>
            </div>
          </div>
          <div style="font-size:11px; color:#475569; margin-top:4px; line-height:1.3;">${lm.desc}</div>
          <div style="font-size:10.5px; color:#64748B; margin-top:3px;">📍 ${lm.address}</div>
          ${distText ? `<div style="font-size:11px; font-weight:800; color:#15803D; margin-top:5px;">● ${distText}</div>` : ''}
          
          <div style="display:flex; gap:6px; margin-top:8px;">
            <button type="button" onclick="LeafletMapEngine.setAsHomeLocation(${lm.lat}, ${lm.lng}, '${lm.name.replace(/'/g, "\\'")}', '${lm.address.replace(/'/g, "\\'")}')" style="flex:1; background:#DCFCE7; border:1px solid #86EFAC; color:#15803D; font-weight:800; font-size:11px; padding:6px 8px; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px;">
              📍 Set as My Address
            </button>
          </div>
        </div>
      `);

      layerGroup.addLayer(marker);
    });

    if (this.showLandmarks) {
      layerGroup.addTo(mapInstance);
    }
    return layerGroup;
  },

  /**
   * Set landmark as citizen's home address directly from map
   */
  setAsHomeLocation(lat, lng, name, address) {
    if (typeof CityAssist !== 'undefined') {
      const fullAddr = `${name}, ${address}`;
      // Add or set default
      CityData.addresses.unshift({
        id: 'addr-' + Date.now(),
        label: name.split(' ')[0] || "Home",
        address: fullAddr,
        lat: lat,
        lng: lng,
        isDefault: true
      });
      CityData.addresses.forEach((a, i) => { if (i > 0) a.isDefault = false; });
      CityAssist.syncActiveAddressUI();
      CityAssist.showToast(`📍 Set "${name}" as your active doorstep address!`);
    }
  },

  /**
   * Filter Landmark categories
   */
  filterLandmarkCategory(category) {
    this.activeLandmarkCategory = category;
    
    // Update category chips in UI
    document.querySelectorAll('.landmark-filter-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.cat === category);
    });

    // Refresh citizen map landmarks
    if (this.citizenMap && this.citizenLandmarkLayer) {
      this.citizenMap.removeLayer(this.citizenLandmarkLayer);
      this.citizenLandmarkLayer = this.renderLandmarksLayer(this.citizenMap, false);
    }

    // Refresh fullscreen map landmarks
    if (this.fullscreenMap && this.fsLandmarkLayer) {
      this.fullscreenMap.removeLayer(this.fsLandmarkLayer);
      this.fsLandmarkLayer = this.renderLandmarksLayer(this.fullscreenMap, true);
    }

    if (typeof CityAssist !== 'undefined') {
      const names = { all: 'All Landmarks', college: 'Colleges & Schools', hospital: 'Hospitals', shop: 'Shops & Markets', civic: 'Civic & Transit' };
      CityAssist.showToast(`Showing: ${names[category] || category}`);
    }
  },

  /**
   * Toggle Landmarks Visibility
   */
  toggleLandmarks() {
    this.showLandmarks = !this.showLandmarks;
    
    if (this.citizenMap && this.citizenLandmarkLayer) {
      if (this.showLandmarks) {
        this.citizenLandmarkLayer.addTo(this.citizenMap);
      } else {
        this.citizenMap.removeLayer(this.citizenLandmarkLayer);
      }
    }

    if (this.fullscreenMap && this.fsLandmarkLayer) {
      if (this.showLandmarks) {
        this.fsLandmarkLayer.addTo(this.fullscreenMap);
      } else {
        this.fullscreenMap.removeLayer(this.fsLandmarkLayer);
      }
    }

    const btn = document.getElementById('btn-toggle-landmarks');
    if (btn) {
      btn.style.background = this.showLandmarks ? '#DCFCE7' : '#F1F5F9';
      btn.style.color = this.showLandmarks ? '#15803D' : '#64748B';
    }

    if (typeof CityAssist !== 'undefined') {
      CityAssist.showToast(this.showLandmarks ? "🏛️ Landmarks visible on map" : "Landmarks hidden");
    }
  },

  /**
   * Update Citizen Location Marker across all active Leaflet maps
   */
  updateCitizenLocation(lat, lng, name = "My Home", address = "") {
    const loc = [lat, lng];

    // 1. Update on Citizen Tracking Map
    if (this.citizenMarker && this.citizenMap) {
      this.citizenMarker.setLatLng(loc);
      this.citizenMarker.bindPopup(`
        <div style="font-family:'Plus Jakarta Sans',sans-serif; padding:4px 2px;">
          <div style="font-weight:900; color:#1D4ED8; font-size:13px; margin-bottom:2px;">📍 ${name || 'Your Doorstep'}</div>
          <div style="font-size:11px; color:#475569;">${address || 'Talegaon Dabhade'}</div>
          <div style="font-size:11px; color:#15803D; font-weight:800; margin-top:4px;">● Scheduled Pickup Today: 08:30 AM</div>
        </div>
      `);
      this.fitCitizenView();
    }

    // 2. Update on Fullscreen Map
    if (this.citizenMarkerFullscreen && this.fullscreenMap) {
      this.citizenMarkerFullscreen.setLatLng(loc);
      this.citizenMarkerFullscreen.bindPopup(`
        <div style="font-family:'Plus Jakarta Sans',sans-serif; padding:4px 2px;">
          <div style="font-weight:900; color:#1D4ED8; font-size:13px;">📍 ${name || 'Your Doorstep'}</div>
          <div style="font-size:11px; color:#475569;">${address || 'Talegaon Dabhade'}</div>
        </div>
      `);
    }

    // 3. Update Report Map if active
    if (this.reportMarker && this.reportMap) {
      this.reportMarker.setLatLng(loc);
      this.reportMap.panTo(loc, { animate: true });
    }
  },

  /**
   * Initialize Citizen Garbage Tracking Screen Map
   */
  initCitizenMap() {
    const container = document.getElementById('gt-leaflet-map-container');
    if (!container || typeof L === 'undefined') return;

    if (this.citizenMap) {
      this.citizenMap.remove();
      this.citizenMap = null;
    }

    const citizen = (typeof GPSTrackerEngine !== 'undefined') 
      ? GPSTrackerEngine.citizenLocation 
      : { lat: 18.7285, lng: 73.6765, name: "Samta Colony" };

    const telemetry = (typeof GPSTrackerEngine !== 'undefined') 
      ? GPSTrackerEngine.driverTelemetry 
      : { lat: 18.7340, lng: 73.6700, speed: 22, heading: 135 };

    this.citizenMap = L.map(container, {
      center: [citizen.lat, citizen.lng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false
    });

    const provider = this.tileProviders[this.currentTileType];
    this.citizenTileLayer = L.tileLayer(provider.url, provider.options).addTo(this.citizenMap);
    L.control.zoom({ position: 'bottomright' }).addTo(this.citizenMap);

    // 1. Citizen Doorstep Pin (Blue Radar Pulse Ring)
    const citizenIcon = L.divIcon({
      className: 'leaflet-citizen-pin',
      html: `
        <div class="leaflet-pin-wrap">
          <span class="leaflet-radar-ring"></span>
          <div class="leaflet-pin-core blue">📍</div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });
    this.citizenMarker = L.marker([citizen.lat, citizen.lng], { icon: citizenIcon })
      .addTo(this.citizenMap)
      .bindPopup(`
        <div style="font-family:'Plus Jakarta Sans',sans-serif; padding:4px 2px;">
          <div style="font-weight:900; color:#1D4ED8; font-size:13px; margin-bottom:2px;">📍 ${citizen.name || 'Your Doorstep'}</div>
          <div style="font-size:11px; color:#475569;">${citizen.address || 'Talegaon Dabhade, Pune'}</div>
          <div style="font-size:11px; color:#15803D; font-weight:800; margin-top:4px;">● Scheduled Pickup: 08:30 AM</div>
        </div>
      `);

    // 2. Interactive Garbage Vehicle Pin (3-Wave Radar + Heading Beam + Live Speed Tag)
    const truckIcon = L.divIcon({
      className: 'leaflet-truck-interactive-wrap',
      html: `
        <div class="leaflet-truck-interactive">
          <span class="leaflet-radar-ring green wave-1"></span>
          <span class="leaflet-radar-ring green wave-2"></span>
          <span class="leaflet-radar-ring green wave-3"></span>
          <div class="leaflet-heading-beam" id="citizen-heading-beam" style="transform: translate(-50%, -50%) rotate(${telemetry.heading || 0}deg) translateY(-22px);"></div>
          <div class="leaflet-pin-core interactive-truck">🚚</div>
          <div class="leaflet-live-speed-tag" id="citizen-truck-speed">
            <span class="live-dot"></span>
            <span id="citizen-truck-speed-text">${telemetry.speed ? `${Math.round(telemetry.speed)} km/h` : 'LIVE'}</span>
          </div>
        </div>
      `,
      iconSize: [54, 54],
      iconAnchor: [27, 27]
    });
    this.truckMarkerCitizen = L.marker([telemetry.lat, telemetry.lng], { icon: truckIcon })
      .addTo(this.citizenMap)
      .bindPopup(`
        <div style="font-family:'Plus Jakarta Sans',sans-serif; padding:6px 2px;">
          <div style="font-weight:900; color:#15803D; font-size:14px; margin-bottom:3px; display:flex; align-items:center; gap:5px;">
            <span>🚚</span> Vehicle #MH-12-EA-4920
          </div>
          <div style="font-size:12px; color:#475569;">Talegaon Municipal Route • Ramesh Shinde</div>
          <div style="display:flex; gap:8px; margin-top:8px;">
            <button type="button" onclick="AudioAnnouncerEngine.triggerTestAnnouncement()" style="background:#DCFCE7; border:1px solid #86EFAC; color:#15803D; font-weight:800; font-size:11px; padding:4px 8px; border-radius:8px; cursor:pointer;">
              🔊 Play Voice Alert
            </button>
            <button type="button" onclick="LeafletMapEngine.panToVehicle()" style="background:#F1F5F9; border:none; color:#475569; font-weight:700; font-size:11px; padding:4px 8px; border-radius:8px; cursor:pointer;">
              🎯 Focus
            </button>
          </div>
        </div>
      `);

    // 3. Live Breadcrumbs Trail Layer
    if (this.citizenBreadcrumbLayer) {
      try { this.citizenMap.removeLayer(this.citizenBreadcrumbLayer); } catch (e) {}
    }
    this.citizenBreadcrumbLayer = L.layerGroup().addTo(this.citizenMap);
    this.breadcrumbCoords = [[telemetry.lat, telemetry.lng]];

    // 4. Municipal Route 4B Polyline (Green Glowing Line)
    if (typeof GPSTrackerEngine !== 'undefined' && GPSTrackerEngine.municipalRouteWaypoints) {
      const latlngs = GPSTrackerEngine.municipalRouteWaypoints.map(w => [w.lat, w.lng]);
      L.polyline(latlngs, {
        color: '#22C55E',
        weight: 8,
        opacity: 0.35,
        lineCap: 'round'
      }).addTo(this.citizenMap);

      L.polyline(latlngs, {
        color: '#15803D',
        weight: 4,
        opacity: 0.95,
        dashArray: '8, 6',
        lineCap: 'round'
      }).addTo(this.citizenMap);
    }

    // 5. Render Landmarks Layer on Citizen Map
    this.citizenLandmarkLayer = this.renderLandmarksLayer(this.citizenMap, false);

    // Auto-fit bounds between vehicle and citizen
    this.fitCitizenView();

    // Invalidate size to guarantee perfect rendering in mobile container
    setTimeout(() => {
      if (this.citizenMap) this.citizenMap.invalidateSize();
    }, 150);
    setTimeout(() => {
      if (this.citizenMap) this.citizenMap.invalidateSize();
    }, 400);
  },

  /**
   * Initialize Driver Mode Map
   */
  initDriverMap() {
    const container = document.getElementById('driver-leaflet-map-container');
    if (!container || typeof L === 'undefined') return;

    if (this.driverMap) {
      this.driverMap.remove();
      this.driverMap = null;
    }

    const telemetry = (typeof GPSTrackerEngine !== 'undefined') 
      ? GPSTrackerEngine.driverTelemetry 
      : { lat: 18.7340, lng: 73.6700, speed: 0, heading: 0 };

    this.driverMap = L.map(container, {
      center: [telemetry.lat, telemetry.lng],
      zoom: 16,
      zoomControl: false,
      attributionControl: false
    });

    const provider = this.tileProviders[this.currentTileType];
    this.driverTileLayer = L.tileLayer(provider.url, provider.options).addTo(this.driverMap);

    // Ultra-Interactive Driver Live Truck Marker
    const truckIcon = L.divIcon({
      className: 'leaflet-truck-interactive-wrap',
      html: `
        <div class="leaflet-truck-interactive">
          <span class="leaflet-radar-ring green wave-1"></span>
          <span class="leaflet-radar-ring green wave-2"></span>
          <div class="leaflet-heading-beam" id="driver-heading-beam" style="transform: translate(-50%, -50%) rotate(${telemetry.heading || 0}deg) translateY(-22px);"></div>
          <div class="leaflet-pin-core interactive-truck">🚚</div>
          <div class="leaflet-live-speed-tag" id="driver-truck-speed">
            <span class="live-dot"></span>
            <span id="driver-truck-speed-text">${telemetry.speed ? `${Math.round(telemetry.speed)} km/h` : '0 km/h'}</span>
          </div>
        </div>
      `,
      iconSize: [54, 54],
      iconAnchor: [27, 27]
    });
    this.truckMarkerDriver = L.marker([telemetry.lat, telemetry.lng], { icon: truckIcon })
      .addTo(this.driverMap)
      .bindPopup("<strong>Driver Position</strong><br>Hardware GPS Transmitting Live");

    // Driver Breadcrumbs Trail
    if (this.driverBreadcrumbLayer) {
      try { this.driverMap.removeLayer(this.driverBreadcrumbLayer); } catch (e) {}
    }
    this.driverBreadcrumbLayer = L.layerGroup().addTo(this.driverMap);
    this.driverBreadcrumbCoords = [[telemetry.lat, telemetry.lng]];

    // Render driver custom stops on map
    if (typeof GPSTrackerEngine !== 'undefined') {
      const stops = GPSTrackerEngine.getRouteStops();
      stops.forEach((s, idx) => {
        const isDone = s.status === 'completed';
        const color = isDone ? '#16A34A' : '#0F7943';
        const cpIcon = L.divIcon({
          className: 'leaflet-cp-node',
          html: `<div style="background:${color}; color:#FFF; font-weight:900; font-size:11px; width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid #FFF; box-shadow:0 3px 6px rgba(0,0,0,0.3);">${idx + 1}</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });
        L.marker([s.lat, s.lng], { icon: cpIcon }).addTo(this.driverMap).bindPopup(`<strong>Stop ${idx + 1}: ${s.name}</strong><br>${s.area} • ${s.bins} Bins`);
      });
    }

    setTimeout(() => {
      if (this.driverMap) this.driverMap.invalidateSize();
    }, 200);
  },

  /**
   * Initialize Report Incident Pin Map
   */
  initReportMap() {
    const container = document.getElementById('report-leaflet-map-container');
    if (!container || typeof L === 'undefined') return;

    if (this.reportMap) {
      this.reportMap.remove();
      this.reportMap = null;
    }

    const citizen = (typeof GPSTrackerEngine !== 'undefined') 
      ? GPSTrackerEngine.citizenLocation 
      : { lat: 18.7285, lng: 73.6765 };

    this.reportMap = L.map(container, {
      center: [citizen.lat, citizen.lng],
      zoom: 16,
      zoomControl: false,
      attributionControl: false
    });

    const provider = this.tileProviders[this.currentTileType];
    this.reportTileLayer = L.tileLayer(provider.url, provider.options).addTo(this.reportMap);

    // Draggable Report Pin
    const pinIcon = L.divIcon({
      className: 'leaflet-citizen-pin',
      html: `
        <div class="leaflet-pin-wrap">
          <span class="leaflet-radar-ring red"></span>
          <div class="leaflet-pin-core red" style="background:#EF4444; color:#FFF; box-shadow:0 4px 12px rgba(239,68,68,0.5);">📍</div>
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 19]
    });

    this.reportMarker = L.marker([citizen.lat, citizen.lng], { 
      icon: pinIcon, 
      draggable: true 
    }).addTo(this.reportMap);

    this.reportMarker.bindPopup(`
      <div style="font-family:'Plus Jakarta Sans',sans-serif; padding:4px 2px;">
        <div style="font-weight:800; color:#DC2626; font-size:13px;">📍 Incident Location</div>
        <div style="font-size:11px; color:#475569;">Drag pin or tap map to set exact spot</div>
      </div>
    `);

    // On Drag End
    this.reportMarker.on('dragend', (e) => {
      const pos = e.target.getLatLng();
      this.updateReportAddress(pos.lat, pos.lng);
    });

    // On Map Click
    this.reportMap.on('click', (e) => {
      this.reportMarker.setLatLng(e.latlng);
      this.updateReportAddress(e.latlng.lat, e.latlng.lng);
    });

    setTimeout(() => {
      if (this.reportMap) this.reportMap.invalidateSize();
    }, 200);
  },

  updateReportAddress(lat, lng) {
    const locText = document.getElementById('report-location-text');
    if (locText) {
      locText.textContent = `Talegaon Dabhade (${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E)`;
    }
    if (typeof CityAssist !== 'undefined') {
      CityAssist.showToast(`📍 Incident location pinned: ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`);
    }
  },

  recenterReportMap() {
    const citizen = (typeof GPSTrackerEngine !== 'undefined') 
      ? GPSTrackerEngine.citizenLocation 
      : { lat: 18.7285, lng: 73.6765 };
    if (this.reportMap && this.reportMarker) {
      this.reportMap.flyTo([citizen.lat, citizen.lng], 16, { animate: true, duration: 1 });
      this.reportMarker.setLatLng([citizen.lat, citizen.lng]);
      const locText = document.getElementById('report-location-text');
      if (locText) locText.textContent = "Samta Colony, Talegaon";
      if (typeof CityAssist !== 'undefined') {
        CityAssist.showToast("📍 Report pin centered on your location (Samta Colony, Talegaon)");
      }
    }
  },

  /**
   * Initialize Full-Screen Route Map Instance with all routes & theme toggles
   */
  initFullscreenMap() {
    const container = document.getElementById('fs-leaflet-map-view');
    if (!container || typeof L === 'undefined') return;

    if (this.fullscreenMap) {
      this.fullscreenMap.remove();
      this.fullscreenMap = null;
    }

    const citizen = (typeof GPSTrackerEngine !== 'undefined') 
      ? GPSTrackerEngine.citizenLocation 
      : { lat: 18.7285, lng: 73.6765 };

    const telemetry = (typeof GPSTrackerEngine !== 'undefined') 
      ? GPSTrackerEngine.driverTelemetry 
      : { lat: 18.7340, lng: 73.6700, speed: 22, heading: 135 };

    this.fullscreenMap = L.map(container, {
      center: [citizen.lat, citizen.lng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false
    });

    const provider = this.tileProviders[this.currentTileType];
    this.fullscreenTileLayer = L.tileLayer(provider.url, provider.options).addTo(this.fullscreenMap);
    L.control.zoom({ position: 'bottomright' }).addTo(this.fullscreenMap);

    // 1. Citizen Doorstep Pin
    const citizenIcon = L.divIcon({
      className: 'leaflet-citizen-pin',
      html: `
        <div class="leaflet-pin-wrap">
          <span class="leaflet-radar-ring"></span>
          <div class="leaflet-pin-core blue">📍</div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });
    this.citizenMarkerFullscreen = L.marker([citizen.lat, citizen.lng], { icon: citizenIcon })
      .addTo(this.fullscreenMap)
      .bindPopup(`
        <div style="font-family:'Plus Jakarta Sans',sans-serif; padding:4px 2px;">
          <div style="font-weight:900; color:#1D4ED8; font-size:13px;">📍 ${citizen.name || 'Your Doorstep'}</div>
          <div style="font-size:11px; color:#475569;">${citizen.address || 'Talegaon Dabhade'}</div>
          <div style="font-size:11px; color:#15803D; font-weight:800; margin-top:4px;">● Scheduled: 08:30 AM</div>
        </div>
      `);

    // 2. Ultra-Interactive Live Vehicle Pin
    const truckIcon = L.divIcon({
      className: 'leaflet-truck-interactive-wrap',
      html: `
        <div class="leaflet-truck-interactive">
          <span class="leaflet-radar-ring green wave-1"></span>
          <span class="leaflet-radar-ring green wave-2"></span>
          <span class="leaflet-radar-ring green wave-3"></span>
          <div class="leaflet-heading-beam" id="fs-heading-beam" style="transform: translate(-50%, -50%) rotate(${telemetry.heading || 0}deg) translateY(-22px);"></div>
          <div class="leaflet-pin-core interactive-truck">🚚</div>
          <div class="leaflet-live-speed-tag" id="fs-truck-speed">
            <span class="live-dot"></span>
            <span id="fs-truck-speed-text">${telemetry.speed ? `${Math.round(telemetry.speed)} km/h` : 'LIVE'}</span>
          </div>
        </div>
      `,
      iconSize: [54, 54],
      iconAnchor: [27, 27]
    });
    this.truckMarkerFullscreen = L.marker([telemetry.lat, telemetry.lng], { icon: truckIcon })
      .addTo(this.fullscreenMap)
      .bindPopup(`
        <div style="font-family:'Plus Jakarta Sans',sans-serif; padding:6px 2px;">
          <div style="font-weight:900; color:#15803D; font-size:14px; margin-bottom:3px; display:flex; align-items:center; gap:5px;">
            <span>🚚</span> Waste Truck #MH-12-EA-4920
          </div>
          <div style="font-size:12px; color:#475569;">Talegaon Municipal Route • Telemetry Connected</div>
        </div>
      `);

    // 3. Render Driver Custom Stops & Live Route Polyline
    this.renderDynamicRouteStopsOnMap();

    // 4. Render Landmarks on Fullscreen Map
    this.fsLandmarkLayer = this.renderLandmarksLayer(this.fullscreenMap, true);

    // Invalidate size on animation end
    setTimeout(() => {
      if (this.fullscreenMap) {
        this.fullscreenMap.invalidateSize();
        this.fitAllRoutes();
      }
    }, 250);
  },

  renderDynamicRouteStopsOnMap() {
    if (!this.fullscreenMap || typeof GPSTrackerEngine === 'undefined') return;

    if (this.checkpointMarkers) {
      this.checkpointMarkers.forEach(m => {
        try { this.fullscreenMap.removeLayer(m); } catch (e) {}
      });
    }
    this.checkpointMarkers = [];

    if (this.routePolylines['4b']) {
      try { this.fullscreenMap.removeLayer(this.routePolylines['4b']); } catch (e) {}
    }

    const stops = GPSTrackerEngine.getRouteStops();
    if (!stops || stops.length === 0) return;

    const latlngs = stops.map(w => [w.lat, w.lng]);
    
    // Draw primary route through driver's real stops
    this.routePolylines['4b'] = L.polyline(latlngs, {
      color: '#16A34A',
      weight: 6,
      opacity: 0.95
    }).addTo(this.fullscreenMap).bindPopup("<strong>Talegaon Dynamic Shift Route</strong><br>Live stops marked by driver");

    // Dynamic Checkpoint Pins with Status
    stops.forEach((w, idx) => {
      const isCompleted = w.status === 'completed';
      const isActive = w.status === 'active';
      const isEnd = idx === stops.length - 1 && stops.length > 1;
      const color = isCompleted ? '#16A34A' : (isActive ? '#0F7943' : (isEnd ? '#DC2626' : '#64748B'));
      const label = isCompleted ? '✓' : (isEnd ? '🏁' : `${idx + 1}`);

      const cpIcon = L.divIcon({
        className: 'leaflet-cp-node',
        html: `<div style="background:${color}; color:#FFF; font-weight:900; font-size:11px; width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid #FFF; box-shadow:0 3px 6px rgba(0,0,0,0.3);">${label}</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const m = L.marker([w.lat, w.lng], { icon: cpIcon })
        .addTo(this.fullscreenMap)
        .bindPopup(`
          <div style="font-family:'Plus Jakarta Sans',sans-serif; padding:4px 2px;">
            <div style="font-weight:800; color:${color}; font-size:13px;">Stop ${idx + 1}: ${w.name}</div>
            <div style="font-size:11px; color:#475569;">${w.area || 'Talegaon'} • ${w.bins || 30} Bins</div>
            <div style="font-size:11px; color:#1E293B; font-weight:700; margin-top:4px;">Status: ${isCompleted ? `✅ Completed at ${w.completedAt || ''}` : (isActive ? '🚚 Active Pickup Zone' : '⏳ Upcoming')}</div>
          </div>
        `);
      this.checkpointMarkers.push(m);
    });
  },

  refreshCheckpoints() {
    this.renderDynamicRouteStopsOnMap();
  },

  /**
   * Filter visible routes on the Fullscreen Leaflet Map
   */
  filterRoute(routeId) {
    if (!this.fullscreenMap) return;

    Object.keys(this.routePolylines).forEach(key => {
      const poly = this.routePolylines[key];
      if (!poly) return;

      if (routeId === 'all' || key === routeId) {
        if (!this.fullscreenMap.hasLayer(poly)) {
          this.fullscreenMap.addLayer(poly);
        }
      } else {
        if (this.fullscreenMap.hasLayer(poly)) {
          this.fullscreenMap.removeLayer(poly);
        }
      }
    });

    if (routeId === 'all') {
      this.fitAllRoutes();
    }
  },

  /**
   * Update live truck position across all active Leaflet maps
   */
  updateTruckLocation(lat, lng, speed = 18, heading = 0) {
    const spdText = speed > 0 ? `${Math.round(speed)} km/h` : 'At Rest';

    // 1. Citizen Tracking Screen Map
    if (this.truckMarkerCitizen) {
      this.truckMarkerCitizen.setLatLng([lat, lng]);

      const spdEl = document.getElementById('citizen-truck-speed-text');
      if (spdEl) spdEl.textContent = spdText;

      const beamEl = document.getElementById('citizen-heading-beam');
      if (beamEl) {
        beamEl.style.transform = `translate(-50%, -50%) rotate(${heading}deg) translateY(-22px)`;
      }

      // Add to live breadcrumb trail
      if (this.citizenBreadcrumbLayer) {
        if (!this.breadcrumbCoords) this.breadcrumbCoords = [];
        const last = this.breadcrumbCoords[this.breadcrumbCoords.length - 1];
        if (!last || (Math.abs(last[0] - lat) > 0.00005 || Math.abs(last[1] - lng) > 0.00005)) {
          this.breadcrumbCoords.push([lat, lng]);
          if (this.breadcrumbCoords.length > 25) this.breadcrumbCoords.shift();

          L.circleMarker([lat, lng], {
            radius: 4,
            fillColor: '#22C55E',
            color: '#FFFFFF',
            weight: 1.5,
            opacity: 0.8,
            fillOpacity: 0.7
          }).addTo(this.citizenBreadcrumbLayer);
        }
      }
    }

    // 2. Fullscreen Route Map
    if (this.truckMarkerFullscreen) {
      this.truckMarkerFullscreen.setLatLng([lat, lng]);

      const fsSpdEl = document.getElementById('fs-truck-speed-text');
      if (fsSpdEl) fsSpdEl.textContent = spdText;

      const fsBeamEl = document.getElementById('fs-heading-beam');
      if (fsBeamEl) {
        fsBeamEl.style.transform = `translate(-50%, -50%) rotate(${heading}deg) translateY(-22px)`;
      }
    }

    // 3. Driver HUD Map
    if (this.truckMarkerDriver) {
      this.truckMarkerDriver.setLatLng([lat, lng]);

      const drvSpdEl = document.getElementById('driver-truck-speed-text');
      if (drvSpdEl) drvSpdEl.textContent = spdText;

      const drvBeamEl = document.getElementById('driver-heading-beam');
      if (drvBeamEl) {
        drvBeamEl.style.transform = `translate(-50%, -50%) rotate(${heading}deg) translateY(-22px)`;
      }

      // Add to driver live breadcrumb trail
      if (this.driverBreadcrumbLayer) {
        if (!this.driverBreadcrumbCoords) this.driverBreadcrumbCoords = [];
        const last = this.driverBreadcrumbCoords[this.driverBreadcrumbCoords.length - 1];
        if (!last || (Math.abs(last[0] - lat) > 0.00005 || Math.abs(last[1] - lng) > 0.00005)) {
          this.driverBreadcrumbCoords.push([lat, lng]);
          if (this.driverBreadcrumbCoords.length > 30) this.driverBreadcrumbCoords.shift();

          L.circleMarker([lat, lng], {
            radius: 3.5,
            fillColor: '#16A34A',
            color: '#FFFFFF',
            weight: 1.2,
            opacity: 0.85,
            fillOpacity: 0.75
          }).addTo(this.driverBreadcrumbLayer);
        }
      }

      if (this.driverMap) {
        this.driverMap.panTo([lat, lng], { animate: true, duration: 0.5 });
      }
    }
  },

  panToDriverVehicle() {
    const tel = (typeof GPSTrackerEngine !== 'undefined') ? GPSTrackerEngine.driverTelemetry : { lat: 18.7340, lng: 73.6700 };
    if (this.driverMap) {
      this.driverMap.flyTo([tel.lat, tel.lng], 16, { animate: true, duration: 0.8 });
    }
    if (typeof CityAssist !== 'undefined') {
      CityAssist.showToast('🎯 Focused on Vehicle Position');
    }
  },

  fitCitizenView() {
    if (!this.citizenMap) return;
    const citizen = (typeof GPSTrackerEngine !== 'undefined') ? GPSTrackerEngine.citizenLocation : { lat: 18.7285, lng: 73.6765 };
    const tel = (typeof GPSTrackerEngine !== 'undefined') ? GPSTrackerEngine.driverTelemetry : { lat: 18.7340, lng: 73.6700 };

    const bounds = L.latLngBounds([
      [citizen.lat, citizen.lng],
      [tel.lat, tel.lng]
    ]);
    this.citizenMap.fitBounds(bounds, { padding: [35, 35] });
  },

  fitAllRoutes() {
    if (!this.fullscreenMap) return;
    const citizen = (typeof GPSTrackerEngine !== 'undefined') ? GPSTrackerEngine.citizenLocation : { lat: 18.7285, lng: 73.6765 };
    const tel = (typeof GPSTrackerEngine !== 'undefined') ? GPSTrackerEngine.driverTelemetry : { lat: 18.7340, lng: 73.6700 };

    const bounds = L.latLngBounds([
      [citizen.lat, citizen.lng],
      [tel.lat, tel.lng]
    ]);
    this.fullscreenMap.flyToBounds(bounds, { padding: [45, 45], maxZoom: 16 });
  },

  panToVehicle() {
    const tel = (typeof GPSTrackerEngine !== 'undefined') ? GPSTrackerEngine.driverTelemetry : { lat: 18.7340, lng: 73.6700 };
    if (this.citizenMap) {
      this.citizenMap.flyTo([tel.lat, tel.lng], 16, { animate: true, duration: 1.0 });
    }
    if (this.fullscreenMap) {
      this.fullscreenMap.flyTo([tel.lat, tel.lng], 16, { animate: true, duration: 1.0 });
    }
    if (typeof CityAssist !== 'undefined') {
      CityAssist.showToast('🎯 Focused on Waste Truck');
    }
  },

  panToDoorstep() {
    const citizen = (typeof GPSTrackerEngine !== 'undefined') ? GPSTrackerEngine.citizenLocation : { lat: 18.7285, lng: 73.6765 };
    if (this.citizenMap) {
      this.citizenMap.flyTo([citizen.lat, citizen.lng], 16, { animate: true, duration: 1.0 });
    }
    if (this.fullscreenMap) {
      this.fullscreenMap.flyTo([citizen.lat, citizen.lng], 16, { animate: true, duration: 1.0 });
    }
    if (typeof CityAssist !== 'undefined') {
      CityAssist.showToast('📍 Focused on Your Doorstep');
    }
  }
};

// Global Exposure
window.LeafletMapEngine = LeafletMapEngine;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => LeafletMapEngine.init());
} else {
  LeafletMapEngine.init();
}
