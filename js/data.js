/**
 * CityAssist - Mock Data Store
 */

const CityData = {
  user: {
    name: "Citizen",
    phone: "",
    email: "",
    avatar: "https://ui-avatars.com/api/?name=Citizen&background=0F7943&color=fff&size=200&bold=true",
    points: 0,
    badgesCount: 0,
    location: "Talegaon Dabhade"
  },

  requests: [
    {
      id: "REQ-10842",
      title: "Plumbing - Water Leakage",
      category: "plumbing",
      iconType: "water",
      status: "on_the_way",
      statusLabel: "On the Way",
      filterGroup: "in_progress",
      assignedTo: {
        name: "Patil Plumbing Services",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
        phone: "+91 98220 11223"
      },
      timeline: {
        step: "Technician is on the way",
        detail: "Expected arrival: <span class='highlight-green'>10 mins</span>",
        iconType: "gear"
      },
      date: "26 Aug 2026, 11:45 AM",
      address: "Flat 402, Samta Colony, Talegaon Dabhade, Pune"
    },
    {
      id: "REQ-10830",
      title: "Electrical - Repair",
      category: "electrical",
      iconType: "electric",
      status: "completed",
      statusLabel: "Completed",
      filterGroup: "completed",
      assignedTo: {
        name: "Quick Electricians Co.",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80",
        phone: "+91 98220 99887"
      },
      timeline: {
        step: "Completed on",
        detail: "12 May 2024, 11:30 AM",
        iconType: "check"
      },
      date: "12 May 2024, 11:30 AM",
      address: "Flat 402, Samta Colony, Talegaon Dabhade, Pune"
    },
    {
      id: "REQ-10821",
      title: "AC Repair",
      category: "ac",
      iconType: "ac",
      status: "in_progress",
      statusLabel: "In Progress",
      filterGroup: "in_progress",
      assignedTo: {
        name: "Cool Tech Services",
        avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120&auto=format&fit=crop&q=80",
        phone: "+91 98440 33445"
      },
      timeline: {
        step: "Expected arrival: <span class='highlight-green'>30 mins</span>",
        detail: "Technician preparing equipment",
        iconType: "check"
      },
      date: "26 Aug 2026, 10:15 AM",
      address: "Flat 402, Samta Colony, Talegaon Dabhade, Pune"
    }
  ],

  badges: [
    { title: "Gold Eco Champion", desc: "1,000+ Points Milestone: Certified Civic Leader", icon: "🏆", isMilestone1000: true, unlockedDate: "24 Aug 2026" },
    { title: "Eco Warrior", desc: "Reported 10+ public waste concerns", icon: "🌱" },
    { title: "Civic Champion", desc: "Helped resolve 5 community issues", icon: "⭐" },
    { title: "Speedy Reporter", desc: "First to report missed pickups in sector", icon: "⚡" },
    { title: "Green Citizen", desc: "100% segregated waste handover streak", icon: "♻️" }
  ],

  professionals: [
    {
      id: "GOV-WASTE",
      name: "PMC Solid Waste & Sanitation Division",
      category: "waste",
      categoryLabel: "Waste Management",
      icon: "🗑️",
      rating: 4.9,
      reviews: 1420,
      distance: "Ward 2 & Sector 4 Division",
      status: "🟢 4 Collection Trucks Active",
      phone: "1800-233-0404",
      experience: "Talegaon Municipal Corp",
      rate: "Free Citizen Service",
      avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=WasteGov&backgroundColor=bbf7d0",
      verified: true,
      officer: "Er. Ramesh Patil (Zonal Inspector)",
      description: "Doorstep waste pickup, missed trash collection dispatch, segregated waste processing, and bulk commercial garbage removal."
    },
    {
      id: "GOV-WATER",
      name: "Talegaon Water Works & Pipeline Division",
      category: "water",
      categoryLabel: "Water Supply",
      icon: "💧",
      rating: 4.8,
      reviews: 980,
      distance: "North Zone & Station Road",
      status: "🟢 2 Water Tankers On-Duty",
      phone: "02114-222123",
      experience: "PMC Water Works Dept",
      rate: "Official Municipal Wing",
      avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=WaterGov&backgroundColor=bae6fd",
      verified: true,
      officer: "Er. Suresh Deshmukh (Water Engineer)",
      description: "Drinking water pipeline leak repair, municipal water tanker supply, low pressure issues, and new tap connection verification."
    },
    {
      id: "GOV-ROADS",
      name: "PMC Rapid Road & Pothole Repair Unit",
      category: "roads",
      categoryLabel: "Roads & Pavements",
      icon: "🛣️",
      rating: 4.7,
      reviews: 750,
      distance: "Main Transit Lanes & Chowk",
      status: "🟢 Cold-Mix Asphalt Squad Ready",
      phone: "02114-222124",
      experience: "PMC Infrastructure Division",
      rate: "Priority Public Works",
      avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=RoadsGov&backgroundColor=fed7aa",
      verified: true,
      officer: "Er. Vinod Kadam (Road Executive)",
      description: "Asphalt pothole repair, broken pavement restoration, road cave-in safety barricading, and speed breaker repainting."
    },
    {
      id: "GOV-LIGHTS",
      name: "Municipal Electrical & Streetlight Wing",
      category: "streetlights",
      categoryLabel: "Streetlights",
      icon: "💡",
      rating: 4.8,
      reviews: 890,
      distance: "Central Grid Control Substation",
      status: "🟢 Sky-Lift Van Available",
      phone: "02114-222125",
      experience: "PMC Electrical Section",
      rate: "Free Civic Maintenance",
      avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=LightsGov&backgroundColor=fef08a",
      verified: true,
      officer: "Er. Deepak Shinde (Chief Electrician)",
      description: "Non-functional LED streetlamp replacement, dark spot illumination, hanging cable safety repair, and timer automation fixes."
    },
    {
      id: "GOV-DRAINAGE",
      name: "Drainage, Sewerage & Stormwater Squad",
      category: "drainage",
      categoryLabel: "Drainage & Sewage",
      icon: "🚰",
      rating: 4.9,
      reviews: 610,
      distance: "Talegaon Market & Low-Lying Sector",
      status: "🟢 Jetting & Suction Machine Ready",
      phone: "02114-222126",
      experience: "PMC Sanitation & Drainage",
      rate: "Immediate Response",
      avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=DrainGov&backgroundColor=c7d2fe",
      verified: true,
      officer: "Er. Mahendra Chavan (Drainage Head)",
      description: "Chamber desilting, overflowing manhole unclogging, monsoon stormwater drain clearing, and underground pipe line flushing."
    },
    {
      id: "GOV-CLEAN",
      name: "Swachh Talegaon Cleanliness & Hygiene Unit",
      category: "cleanliness",
      categoryLabel: "Cleanliness & Sanitation",
      icon: "🧹",
      rating: 4.9,
      reviews: 2150,
      distance: "Citywide Public Spaces & Parks",
      status: "🟢 Daily Rapid Sweeping Active",
      phone: "1800-233-0405",
      experience: "Swachh Bharat Mission PMC",
      rate: "Civic Public Hygiene",
      avatar: "assets/services/icon_public_cleanliness.png",
      verified: true,
      officer: "Er. Anjali Jadhav (Health Officer)",
      description: "Public street sweeping, open garbage dump clearance, community bin sanitization, and public toilet hygiene maintenance."
    },
    {
      id: "GOV-TREES",
      name: "Horticulture & Tree Management Squad",
      category: "trees",
      categoryLabel: "Trees & Green Spaces",
      icon: "🌳",
      rating: 4.8,
      reviews: 430,
      distance: "Municipal Gardens & Green Belt",
      status: "🟢 Tree Trimming Crane Unit On-Duty",
      phone: "02114-222127",
      experience: "PMC Garden & Tree Authority",
      rate: "Environmental Wing",
      avatar: "assets/services/icon_trees_greenery.png",
      verified: true,
      officer: "Er. Pramod Salve (Garden Superintendent)",
      description: "Hazardous tree pruning, storm-fallen tree emergency removal, public park upkeep, and municipal sapling plantation drives."
    },
    {
      id: "GOV-INFRA",
      name: "Public Infrastructure & Civil Assets Unit",
      category: "infra",
      categoryLabel: "Public Infrastructure",
      icon: "🚏",
      rating: 4.7,
      reviews: 580,
      distance: "Bus Shelters, Footpaths & Chowks",
      status: "🟢 Rapid Masonry & Civil Crew Active",
      phone: "02114-222128",
      experience: "PMC Civil Works Division",
      rate: "Civic Asset Maintenance",
      avatar: "assets/services/icon_public_infra.png",
      verified: true,
      officer: "Er. Sanjay Bhalerao (Civil Assets Engineer)",
      description: "Damaged bus stop repair, pedestrian railing fixes, broken bollards, footpath tiling restoration, and public sign board maintenance."
    },
    {
      id: "GOV-HEALTH",
      name: "Public Health, Vector & Dengue Control",
      category: "health",
      categoryLabel: "Public Health & Sanitation",
      icon: "🏥",
      rating: 4.9,
      reviews: 1120,
      distance: "Citywide Wards & Residential Zones",
      status: "🟢 Thermal Fogging & Abate Spray Active",
      phone: "1800-233-0406",
      experience: "PMC Vector Borne Disease Control",
      rate: "Public Health Safety",
      avatar: "assets/services/icon_public_health.png",
      verified: true,
      officer: "Dr. Sandeep More (Chief Health Officer)",
      description: "Mosquito thermal fogging, water stagnation larvae treatment, public sanitation drives, and anti-epidemic preventive spraying."
    },
    {
      id: "GOV-OTHER",
      name: "Municipal Central Grievance & Citizen Cell",
      category: "other",
      categoryLabel: "Other Civic Issues",
      icon: "📋",
      rating: 4.8,
      reviews: 1640,
      distance: "PMC Municipal Headquarters",
      status: "🟢 Multi-Utility Response Team Active",
      phone: "1800-233-0244",
      experience: "Talegaon Municipal Headquarters",
      rate: "Integrated Grievance Resolution",
      avatar: "assets/services/icon_other_civic.png",
      verified: true,
      officer: "Shri. M. K. Thorat (Chief Administrative Officer)",
      description: "Encroachment removal, noise complaints, stray animal control, illegal hoardings, and general municipal services."
    }
  ],

  addresses: [
    { id: "addr-1", label: "Home (Primary)", flat: "Flat 402, Wing B", street: "Green Avenue Society, Samta Colony", city: "Talegaon Dabhade, Pune", pin: "410507", address: "Flat 402, Wing B, Green Avenue Society, Samta Colony, Talegaon Dabhade, Pune - 410507", lat: 18.7288, lng: 73.6768, isDefault: true },
    { id: "addr-2", label: "Office (MIDC)", flat: "Unit 204, Tower A", street: "Talegaon MIDC Tech Park, Phase 2", city: "Talegaon Dabhade, Pune", pin: "410507", address: "Unit 204, Tower A, Talegaon MIDC Tech Park, Phase 2, Pune - 410507", lat: 18.7450, lng: 73.6820, isDefault: false },
    { id: "addr-3", label: "Parents' House", flat: "Row House #18", street: "Somatane Phata, Bhandara Road", city: "Talegaon Dabhade, Pune", pin: "410506", address: "Row House #18, Somatane Phata, Bhandara Road, Talegaon - 410506", lat: 18.7180, lng: 73.6920, isDefault: false },
    { id: "addr-4", label: "Station Bazaar", flat: "Shop #12, Ground Floor", street: "Station Road Bazaar, Near Talegaon Station", city: "Talegaon Dabhade, Pune", pin: "410506", address: "Shop #12, Station Road Bazaar, Near Talegaon Station - 410506", lat: 18.7340, lng: 73.6700, isDefault: false }
  ],

  notifications: [
    { id: 1, title: "Garbage Truck En Route", time: "5 mins ago", desc: "Vehicle MH-12-EA-4920 is entering your street." },
    { id: 2, title: "Plumber Assigned", time: "25 mins ago", desc: "Patil Plumbing Services accepted REQ-10842." }
  ],

  driver: {
    name: "Ramesh Shinde",
    id: "PMC-DRV-884",
    assignedVehicleId: "GCV-002",
    vehicleNumber: "MH-12-EA-4920",
    vehicleType: "Compactor 6-Ton",
    wardId: 2,
    wardName: "Ward 2 (Samta Colony & Shivaji Nagar)",
    routeId: "Route 4B",
    routeName: "Samta Colony ➔ Sector 4 Central Depot",
    status: "not_started", // 'not_started' | 'in_progress' | 'paused' | 'completed'
    statusLabel: "Not Started",
    speed: 0,
    progressPct: 0,
    etaMinutes: 14,
    currentStopIndex: 0,
    currentCoords: { lat: 18.7340, lng: 73.6700 },
    stops: [
      { id: 0, name: "Talegaon Station North (Start)", note: "45 Residential Bins", status: "current" },
      { id: 1, name: "Maratha Colony Residential Area", note: "38 Community Bins", status: "pending" },
      { id: 2, name: "Samta Colony Doorstep Zone", note: "50 Doorstep Bins", status: "pending" },
      { id: 3, name: "Talegaon Processing Depot (End)", note: "Final Waste Unloading", status: "depot" }
    ],
    // Coordinates along route
    routePoints: [
      { pct: 0, x: 24, y: 72, lat: 18.7340, lng: 73.6700, speed: 0, eta: 14, stopIdx: 0 },
      { pct: 25, x: 50, y: 55, lat: 18.7325, lng: 73.6720, speed: 20, eta: 10, stopIdx: 0 },
      { pct: 50, x: 105, y: 40, lat: 18.7310, lng: 73.6740, speed: 22, eta: 7, stopIdx: 1 },
      { pct: 75, x: 195, y: 92, lat: 18.7285, lng: 73.6765, speed: 18, eta: 4, stopIdx: 2 },
      { pct: 100, x: 310, y: 68, lat: 18.7210, lng: 73.6845, speed: 0, eta: 0, stopIdx: 3 }
    ]
  },

  municipality: {
    activeFleetCount: 14,
    totalFleetCount: 16,
    dailyTonsCollected: 48.2,
    openReportsCount: 6,
    activeSosCount: 1,
    slaCompliancePct: 96.4,
    wards: [
      { id: 1, name: "Ward 1 - Station Road & Market", marathi: "प्रभाग १ - स्टेशन रोड व बाजारपेठ", cleanliness: 94, avgSla: "22 mins", active: 1, resolved: 18, officer: "Mr. P. N. Kulkarni", phone: "9822012345", lat: 18.7260, lng: 73.6720, vehicleId: "GCV-001" },
      { id: 2, name: "Ward 2 - Samta Colony & Shivaji Nagar", marathi: "प्रभाग २ - समता कॉलनी व शिवाजी नगर", cleanliness: 88, avgSla: "28 mins", active: 2, resolved: 14, officer: "Mrs. S. B. Shinde", phone: "9822023456", lat: 18.7310, lng: 73.6795, vehicleId: "GCV-002" },
      { id: 3, name: "Ward 3 - Talegaon Gaothan & Indrayani", marathi: "प्रभाग ३ - तळेगाव गावठाण व इंद्रायणी", cleanliness: 91, avgSla: "25 mins", active: 1, resolved: 19, officer: "Mr. R. V. Gaikwad", phone: "9822034567", lat: 18.7350, lng: 73.6810, vehicleId: "GCV-003" },
      { id: 4, name: "Ward 4 - Model Colony & Lake Zone", marathi: "प्रभाग ४ - मॉडेल कॉलनी व तळे परिसर", cleanliness: 96, avgSla: "18 mins", active: 0, resolved: 22, officer: "Mr. A. K. Pawar", phone: "9822045678", lat: 18.7285, lng: 73.6850, isTopRank: true, vehicleId: "GCV-004" },
      { id: 5, name: "Ward 5 - MIDC Industrial & Suburbs", marathi: "प्रभाग ५ - एमआयडीसी व उपनगर", cleanliness: 85, avgSla: "35 mins", active: 2, resolved: 12, officer: "Mr. M. S. More", phone: "9822056789", lat: 18.7450, lng: 73.6820, vehicleId: "GCV-005" },
      { id: 6, name: "Ward 6 - Vadgaon Extension & Ring Road", marathi: "प्रभाग ६ - वडगाव विस्तार व रिंग रोड", cleanliness: 92, avgSla: "20 mins", active: 1, resolved: 16, officer: "Mr. V. B. Jadhav", phone: "9822067890", lat: 18.7400, lng: 73.6900, vehicleId: "GCV-006" }
    ],
    fleetVehicles: [
      {
        vehicleId: "GCV-001",
        licensePlate: "MH-14-GH-1120",
        type: "Tipper 4-Ton",
        wardId: 1,
        wardName: "Ward 1 (Station Road & Market)",
        routeId: "Route 1A",
        routeName: "Station Bazaar ➔ Shivaji Chowk",
        schedule: "06:30 AM – 11:30 AM",
        driver: "Sunil Patil",
        driverId: "PMC-DRV-101",
        phone: "9822088402",
        status: "Active • On Route",
        isActive: true,
        lat: 18.7260,
        lng: 73.6720,
        speed: "18 km/h",
        fuel: "76%"
      },
      {
        vehicleId: "GCV-002",
        licensePlate: "MH-12-EA-4920",
        type: "Compactor 6-Ton",
        wardId: 2,
        wardName: "Ward 2 (Samta Colony & Shivaji Nagar)",
        routeId: "Route 4B",
        routeName: "Samta Colony ➔ Sector 4 Depot",
        schedule: "07:00 AM – 12:00 PM",
        driver: "Ramesh Shinde",
        driverId: "PMC-DRV-884",
        phone: "9822088401",
        status: "Active • On Route",
        isActive: true,
        lat: 18.7325,
        lng: 73.6780,
        speed: "24 km/h",
        fuel: "84%"
      },
      {
        vehicleId: "GCV-003",
        licensePlate: "MH-12-TR-9901",
        type: "Super-Sucker Jetting Van",
        wardId: 3,
        wardName: "Ward 3 (Talegaon Gaothan & Indrayani)",
        routeId: "Route 3A",
        routeName: "Gaothan Central ➔ Indrayani Ghat",
        schedule: "07:30 AM – 12:30 PM",
        driver: "Anand More",
        driverId: "PMC-DRV-303",
        phone: "9822088403",
        status: "On Standby • Depot",
        isActive: false,
        lat: 18.7350,
        lng: 73.6810,
        speed: "0 km/h",
        fuel: "92%"
      },
      {
        vehicleId: "GCV-004",
        licensePlate: "MH-14-AZ-4500",
        type: "Mini Tipper 3-Ton",
        wardId: 4,
        wardName: "Ward 4 (Model Colony & Lake Zone)",
        routeId: "Route 2C",
        routeName: "Talegaon Lake Ring ➔ Model Colony",
        schedule: "06:45 AM – 11:45 AM",
        driver: "Dinesh Pawar",
        driverId: "PMC-DRV-404",
        phone: "9822088405",
        status: "Completed • Depot",
        isActive: false,
        lat: 18.7285,
        lng: 73.6850,
        speed: "0 km/h",
        fuel: "60%"
      },
      {
        vehicleId: "GCV-005",
        licensePlate: "MH-12-TR-8812",
        type: "Heavy Dumper 10-Ton",
        wardId: 5,
        wardName: "Ward 5 (MIDC Industrial & Suburbs)",
        routeId: "Route 5A",
        routeName: "MIDC Phase 2 ➔ Vadgaon Line",
        schedule: "08:00 AM – 01:30 PM",
        driver: "Vilas Jadhav",
        driverId: "PMC-DRV-505",
        phone: "9822088404",
        status: "Active • Transit",
        isActive: true,
        lat: 18.7450,
        lng: 73.6820,
        speed: "32 km/h",
        fuel: "68%"
      },
      {
        vehicleId: "GCV-006",
        licensePlate: "MH-14-EA-6620",
        type: "Compactor 8-Ton",
        wardId: 6,
        wardName: "Ward 6 (Vadgaon Extension & Ring Road)",
        routeId: "Route 6B",
        routeName: "Vadgaon Ring ➔ Somatane Depot",
        schedule: "07:00 AM – 12:00 PM",
        driver: "Ganesh Shinde",
        driverId: "PMC-DRV-606",
        phone: "9822088406",
        status: "On Standby • Depot",
        isActive: false,
        lat: 18.7400,
        lng: 73.6900,
        speed: "0 km/h",
        fuel: "95%"
      }
    ],
    triageQueue: [
      {
        id: "CR-8921",
        title: "Severe Illegal Waste Dumping near Society Gate",
        category: "Illegal Dumping",
        location: "Samta Colony, Lane 4, Ward 2",
        wardId: 2,
        time: "8 mins ago",
        status: "pending",
        priority: "🔴 Urgent / High Priority",
        aiConfidence: "98%",
        department: "TDMC Solid Waste Management",
        assignedSquad: null,
        citizenName: "Rahul Deshpande",
        citizenPhone: "98220 44921",
        lat: 18.7310,
        lng: 73.6795,
        remarks: ""
      },
      {
        id: "CR-8924",
        title: "Main 4-inch Water Pipe Leakage & Street Flooding",
        category: "Water Leakage",
        location: "Shivaji Chowk, Main Market, Ward 3",
        wardId: 3,
        time: "20 mins ago",
        status: "assigned",
        priority: "🚨 Critical Emergency",
        aiConfidence: "96%",
        department: "TDMC Water Works Dept",
        assignedSquad: "Indrayani Water Supply & Pipeline Repair Squad",
        citizenName: "Anjali Joshi",
        citizenPhone: "98220 77124",
        lat: 18.7280,
        lng: 73.6740,
        remarks: "Valve closed. Pressure repair squad on site."
      },
      {
        id: "CR-8927",
        title: "High-Mast Streetlight Feeder Cable Breakdown",
        category: "Streetlight Outage",
        location: "Station Road Bazaar Junction, Ward 1",
        wardId: 1,
        time: "35 mins ago",
        status: "pending",
        priority: "🟡 Important Notice",
        aiConfidence: "94%",
        department: "TDMC Electrical & Streetlights",
        assignedSquad: null,
        citizenName: "Sanjay Kulkarni",
        citizenPhone: "98220 33827",
        lat: 18.7245,
        lng: 73.6710,
        remarks: ""
      },
      {
        id: "CR-8919",
        title: "Deep Pothole on Lake Ring Road Repaired",
        category: "Potholes / Bad Road",
        location: "Talegaon Lake Ring Road, Ward 4",
        wardId: 4,
        time: "1 hour ago",
        status: "resolved",
        priority: "Normal",
        aiConfidence: "99%",
        department: "TDMC Public Works & Asphalt",
        assignedSquad: "Talegaon Pothole & Road Repair Flying Squad #1",
        citizenName: "Pooja Patil",
        citizenPhone: "98220 11919",
        lat: 18.7360,
        lng: 73.6870,
        remarks: "Cold-mix asphalt compaction complete. Cleaned site."
      }
    ]
  },

  communityPosts: [
    {
      id: "POST-100",
      author: {
        name: "PMC Sanitation Squad #4",
        role: "Official Municipal Squad",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&auto=format&fit=crop&q=80",
        isOfficial: true
      },
      time: "1h ago",
      category: "appreciate",
      badgeText: "Transformation",
      badgeType: "appreciation",
      text: "Transformation Complete! ✨ FC Road corner was cleared of 450kg debris & transformed into a flowerbed zone. Slide below to compare!",
      isBeforeAfter: true,
      beforeImage: "https://images.unsplash.com/photo-1605600659908-0ef719419d41?w=600&auto=format&fit=crop&q=80",
      afterImage: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600&auto=format&fit=crop&q=80",
      likes: 142,
      comments: 29,
      isLiked: false,
      isBookmarked: true
    },
    {
      id: "POST-101",
      author: {
        name: "Rohit Patil",
        role: "Active Citizen",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&auto=format&fit=crop&q=80",
        isOfficial: false
      },
      time: "2h ago",
      category: "appreciate",
      badgeText: "Appreciation",
      badgeType: "appreciation",
      text: "Big thanks to our garbage collection team for keeping our area every day. Great work! 👏",
      image: "https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?w=260&auto=format&fit=crop&q=80",
      likes: 24,
      comments: 8,
      isLiked: false,
      isBookmarked: false
    },
    {
      id: "POST-102",
      author: {
        name: "Meera Joshi",
        role: "Community Member",
        avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=160&auto=format&fit=crop&q=80",
        isOfficial: false
      },
      time: "5h ago",
      category: "report",
      badgeText: "Report",
      badgeType: "report",
      text: "Garbage is being dumped near the community park. Please take action.",
      image: "https://images.unsplash.com/photo-1605600659908-0ef719419d41?w=260&auto=format&fit=crop&q=80",
      likes: 16,
      comments: 3,
      isLiked: false,
      isBookmarked: false
    },
    {
      id: "POST-103",
      author: {
        name: "CityAssist Official",
        role: "Admin",
        avatar: null,
        isOfficial: true
      },
      time: "1d ago",
      category: "updates",
      badgeText: "Update",
      badgeType: "update",
      text: "Dry waste collection timing will be changed this Sunday from 10 AM to 9 AM.",
      image: null,
      likes: 42,
      comments: 5,
      isLiked: false,
      isBookmarked: false
    },
    {
      id: "POST-104",
      author: {
        name: "Sector 4 Green Club",
        role: "Community Organizer",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80",
        isOfficial: false
      },
      time: "2d ago",
      category: "events",
      badgeText: "Event",
      badgeType: "event",
      text: "Join us for the Sunday Tree Plantation & Cleanliness Walk! Meet at Central Garden gate at 7:30 AM. 🌳",
      image: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=260&auto=format&fit=crop&q=80",
      likes: 38,
      comments: 11,
      isLiked: false,
      isBookmarked: false
    }
  ],

  /* =========================================================================
     🛡️ ADMINISTRATIVE AUDIT LOGS (Accessible only to TDMC Administrators)
     ========================================================================= */
  auditLogs: [
    {
      id: "AUDIT-1787801-901",
      userId: "MUNI-ADM-001",
      userName: "Prakash Deshmukh (Admin)",
      userRole: "admin",
      action: "STAFF_ACCOUNT_APPROVED",
      recordId: "MUNI-OFF-201",
      targetType: "staff",
      details: {
        staffId: "MUNI-OFF-201",
        staffName: "Prakash Deshmukh",
        assignedRole: "officer",
        assignedWard: "Ward 2 Administrative Office",
        permissions: "fleet_manage, publish_advisories, triage_grievances"
      },
      timestamp: "2026-09-13T08:30:00.000Z",
      clientTime: Date.now() - 24000000
    },
    {
      id: "AUDIT-1787801-902",
      userId: "MUNI-ADM-001",
      userName: "Prakash Deshmukh (Admin)",
      userRole: "admin",
      action: "VEHICLE_ASSIGNMENT_CHANGED",
      recordId: "GCV-002",
      targetType: "vehicle",
      details: {
        vehicleId: "GCV-002",
        licensePlate: "MH-12-EA-4920",
        wardId: 2,
        routeId: "Route 4B",
        assignedDriverId: "PMC-DRV-884",
        assignedDriverName: "Ramesh Shinde"
      },
      timestamp: "2026-09-13T09:15:00.000Z",
      clientTime: Date.now() - 21000000
    },
    {
      id: "AUDIT-1787801-903",
      userId: "MUNI-OFF-201",
      userName: "Prakash Deshmukh",
      userRole: "officer",
      action: "COMPLAINT_SQUAD_ASSIGNED",
      recordId: "PMC-10842",
      targetType: "grievance",
      details: {
        grievanceId: "PMC-10842",
        assignedSquad: "Rapid Action Squad 2 (Samta)",
        priority: "High",
        newStatus: "assigned",
        remarks: "Dispatched squad for immediate clearing"
      },
      timestamp: "2026-09-13T10:00:00.000Z",
      clientTime: Date.now() - 18000000
    },
    {
      id: "AUDIT-1787801-904",
      userId: "MUNI-OFF-201",
      userName: "Prakash Deshmukh",
      userRole: "officer",
      action: "ADVISORY_BROADCASTED",
      recordId: "ADV-1787804",
      targetType: "advisory",
      details: {
        advisoryId: "ADV-1787804",
        title: "Scheduled Water Supply Maintenance",
        category: "💧 Water Supply Advisory",
        targetWard: "Ward 2 (Samta Colony & Shivaji Nagar)",
        priority: "High"
      },
      timestamp: "2026-09-13T11:20:00.000Z",
      clientTime: Date.now() - 12000000
    }
  ]
};
