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
      id: "TECH-101",
      name: "Rahul Electrical Services",
      category: "electrician",
      categoryLabel: "Electrician",
      rating: 4.8,
      reviews: 126,
      distance: "1.1 km away",
      status: "Available Now",
      phone: "+91 98220 44102",
      experience: "8+ years",
      rate: "₹249 visit fee",
      avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=RahulTech&backgroundColor=b6e3f4",
      verified: true
    },
    {
      id: "TECH-102",
      name: "Sunil Plumbing Solutions",
      category: "plumber",
      categoryLabel: "Plumber",
      rating: 4.9,
      reviews: 98,
      distance: "1.4 km away",
      status: "Available Now",
      phone: "+91 98230 77819",
      experience: "6+ years",
      rate: "₹199 visit fee",
      avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=SunilPlumb&backgroundColor=c0aede",
      verified: true
    },
    {
      id: "TECH-103",
      name: "Amit Home Painting & Decor",
      category: "painter",
      categoryLabel: "Painter",
      rating: 4.7,
      reviews: 84,
      distance: "2.0 km away",
      status: "Available Now",
      phone: "+91 97640 12845",
      experience: "10+ years",
      rate: "₹349 visit fee",
      avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=AmitPaint&backgroundColor=d1d4f9",
      verified: true
    },
    {
      id: "TECH-104",
      name: "CoolCare AC Repair & Service",
      category: "ac_repair",
      categoryLabel: "AC Repair",
      rating: 4.8,
      reviews: 110,
      distance: "2.3 km away",
      status: "Available Now",
      phone: "+91 99210 56782",
      experience: "7+ years",
      rate: "₹299 visit fee",
      avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=CoolCare&backgroundColor=ffd5dc",
      verified: true
    },
    {
      id: "TECH-105",
      name: "Kailash Woodcraft Carpentry",
      category: "carpenter",
      categoryLabel: "Carpenter",
      rating: 4.9,
      reviews: 67,
      distance: "2.8 km away",
      status: "Available Now",
      phone: "+91 98810 93421",
      experience: "12+ years",
      rate: "₹249 visit fee",
      avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=KailashWood&backgroundColor=ffdfba",
      verified: true
    }
  ],

  addresses: [
    { id: "addr-1", label: "Home (Primary)", address: "Flat 402, Samta Colony, Talegaon Dabhade, Pune - 410507", lat: 18.7285, lng: 73.6765, isDefault: true },
    { id: "addr-2", label: "Office (MIDC)", address: "Tech Park 4, Talegaon MIDC, Pune - 410507", lat: 18.7450, lng: 73.6820, isDefault: false },
    { id: "addr-3", label: "Parents' House", address: "Plot 18, Somatane Phata, Talegaon, Pune - 410506", lat: 18.7180, lng: 73.6920, isDefault: false },
    { id: "addr-4", label: "Station Bazaar", address: "Shop 12, Station Road Bazaar, Talegaon - 410506", lat: 18.7340, lng: 73.6700, isDefault: false }
  ],

  notifications: [
    { id: 1, title: "Garbage Truck En Route", time: "5 mins ago", desc: "Vehicle MH-12-EA-4920 is entering your street." },
    { id: 2, title: "Plumber Assigned", time: "25 mins ago", desc: "Patil Plumbing Services accepted REQ-10842." }
  ],

  driver: {
    name: "Ramesh Shinde",
    id: "PMC-DRV-884",
    vehicleNumber: "MH-12-EA-4920",
    vehicleType: "Compactor 6-Ton",
    routeId: "Route 4B",
    routeName: "Shivaji Nagar ➔ Sector 4 Depot",
    status: "not_started", // 'not_started' | 'in_progress' | 'paused' | 'completed'
    statusLabel: "Not Started",
    speed: 0,
    progressPct: 0,
    etaMinutes: 14,
    currentStopIndex: 0,
    currentCoords: { lat: 18.5314, lng: 73.8446 },
    stops: [
      { id: 0, name: "Shivaji Nagar Sector 2 (Start)", note: "45 Residential Bins", status: "current" },
      { id: 1, name: "Model Colony Junction", note: "60 Community Bins", status: "pending" },
      { id: 2, name: "Fergusson College Road Bins", note: "30 Commercial Bins", status: "pending" },
      { id: 3, name: "Sector 4 Central Processing Depot (End)", note: "Final Waste Unloading", status: "depot" }
    ],
    // Coordinates along the SVG route curve
    routePoints: [
      { pct: 0, x: 24, y: 72, lat: 18.5314, lng: 73.8446, speed: 0, eta: 14, stopIdx: 0 },
      { pct: 15, x: 50, y: 55, lat: 18.5328, lng: 73.8458, speed: 24, eta: 12, stopIdx: 0 },
      { pct: 33, x: 105, y: 40, lat: 18.5345, lng: 73.8482, speed: 20, eta: 10, stopIdx: 1 },
      { pct: 50, x: 150, y: 65, lat: 18.5360, lng: 73.8510, speed: 28, eta: 7, stopIdx: 1 },
      { pct: 66, x: 195, y: 92, lat: 18.5375, lng: 73.8535, speed: 18, eta: 4, stopIdx: 2 },
      { pct: 85, x: 260, y: 80, lat: 18.5390, lng: 73.8560, speed: 22, eta: 2, stopIdx: 2 },
      { pct: 100, x: 310, y: 68, lat: 18.5410, lng: 73.8590, speed: 0, eta: 0, stopIdx: 3 }
    ]
  },

  municipality: {
    activeFleetCount: 14,
    totalFleetCount: 16,
    dailyTonsCollected: 48.2,
    openReportsCount: 6,
    activeSosCount: 1,
    triageQueue: [
      {
        id: "REQ-10848",
        title: "Illegal Dumping on Main Corner",
        category: "Illegal Dumping",
        location: "Shivaji Nagar, Lane 4",
        time: "10 mins ago",
        status: "pending",
        assignedSquad: null
      },
      {
        id: "REQ-10847",
        title: "Overflowing Wet Waste Bin",
        category: "Overflowing Bin",
        location: "Fergusson College Road, Bus Stop #3",
        time: "22 mins ago",
        status: "assigned",
        assignedSquad: "Rapid Squad #2"
      },
      {
        id: "REQ-10842",
        title: "Plumbing - Water Leakage Pipe",
        category: "Emergency Repair",
        location: "Samta Colony, Talegaon",
        time: "45 mins ago",
        status: "assigned",
        assignedSquad: "Patil Plumbing Services"
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
  ]
};
