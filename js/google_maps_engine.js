/**
 * Google Maps Integration Engine for CityAssist
 * Handles interactive Google Maps instances for Citizen Garbage Tracking,
 * Driver Navigation HUD, live route polylines, smooth marker animation,
 * and doorstep pinpointing.
 */

const GoogleMapsEngine = {
  isLoaded: false,
  apiKey: "",
  citizenMap: null,
  driverMap: null,
  truckMarkerCitizen: null,
  truckMarkerDriver: null,
  citizenHomeMarker: null,
  routePolylineCitizen: null,
  routePolylineDriver: null,
  currentTruckCoords: { lat: 18.5440, lng: 73.8300 },
  targetTruckCoords: { lat: 18.5440, lng: 73.8300 },
  animFrameId: null,

  // Custom Map Styling (Modern Clean Civic Theme)
  mapStyles: [
    { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
    { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
    { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#e5f8ed" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
    { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#dadada" }] },
    { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9e6f2" }] }
  ],

  init() {
    const savedKey = localStorage.getItem('cityassist_google_maps_key');
    if (savedKey) {
      this.apiKey = savedKey;
      this.loadGoogleMapsSdk(savedKey);
    }
  },

  setApiKey(key) {
    if (!key) return;
    this.apiKey = key;
    localStorage.setItem('cityassist_google_maps_key', key);
    this.loadGoogleMapsSdk(key);
  },

  loadGoogleMapsSdk(key) {
    if (window.google && window.google.maps) {
      this.isLoaded = true;
      this.initCitizenMap();
      this.initDriverMap();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=geometry,places&callback=GoogleMapsEngine.onSdkLoaded`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      console.warn("Google Maps SDK failed to load, maintaining high-precision vector maps.");
    };
    document.head.appendChild(script);
  },

  onSdkLoaded() {
    this.isLoaded = true;
    console.log("Google Maps JavaScript API Loaded Successfully");
    this.initCitizenMap();
    this.initDriverMap();
  },

  /**
   * Initialize Citizen Garbage Tracking Google Map
   */
  initCitizenMap() {
    const container = document.getElementById('gt-google-map-container');
    if (!container || !window.google || !window.google.maps) return;

    container.style.display = 'block';
    const svgMap = document.getElementById('gt-svg-map-container');
    if (svgMap) svgMap.style.display = 'none';

    const center = { lat: 18.5340, lng: 73.8420 };
    this.citizenMap = new google.maps.Map(container, {
      center: center,
      zoom: 15,
      styles: this.mapStyles,
      disableDefaultUI: true,
      zoomControl: true
    });

    // 1. Citizen Home Location Pin (Blue Target Marker)
    const citizenLoc = (typeof GPSTrackerEngine !== 'undefined') 
      ? GPSTrackerEngine.citizenLocation 
      : { lat: 18.5308, lng: 73.8474 };

    this.citizenHomeMarker = new google.maps.Marker({
      position: { lat: citizenLoc.lat, lng: citizenLoc.lng },
      map: this.citizenMap,
      title: "Your Doorstep (Collection Point)",
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 9,
        fillColor: "#2563EB",
        fillOpacity: 1,
        strokeColor: "#FFFFFF",
        strokeWeight: 3
      }
    });

    // 2. Green Garbage Vehicle Marker
    this.truckMarkerCitizen = new google.maps.Marker({
      position: this.currentTruckCoords,
      map: this.citizenMap,
      title: "Garbage Collection Vehicle #MH-12-EA-4920",
      icon: {
        url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 38 38">
            <circle cx="19" cy="19" r="17" fill="#16A34A" stroke="#FFFFFF" stroke-width="2.5" shadow="0 2px 6px rgba(0,0,0,0.3)"/>
            <text x="19" y="24" font-size="16" text-anchor="middle" fill="#FFFFFF">🚚</text>
          </svg>
        `),
        scaledSize: new google.maps.Size(38, 38),
        anchor: new google.maps.Point(19, 19)
      }
    });

    // 3. Route Polyline
    if (typeof GPSTrackerEngine !== 'undefined' && GPSTrackerEngine.municipalRouteWaypoints) {
      const pathCoords = GPSTrackerEngine.municipalRouteWaypoints.map(w => ({ lat: w.lat, lng: w.lng }));
      this.routePolylineCitizen = new google.maps.Polyline({
        path: pathCoords,
        geodesic: true,
        strokeColor: "#16A34A",
        strokeOpacity: 0.85,
        strokeWeight: 4,
        map: this.citizenMap
      });
    }
  },

  /**
   * Initialize Driver Google Map
   */
  initDriverMap() {
    const container = document.getElementById('driver-google-map-container');
    if (!container || !window.google || !window.google.maps) return;

    container.style.display = 'block';
    const svgMap = document.getElementById('driver-svg-map-container');
    if (svgMap) svgMap.style.display = 'none';

    this.driverMap = new google.maps.Map(container, {
      center: { lat: 18.5350, lng: 73.8400 },
      zoom: 15,
      styles: this.mapStyles,
      disableDefaultUI: true,
      zoomControl: true
    });

    this.truckMarkerDriver = new google.maps.Marker({
      position: this.currentTruckCoords,
      map: this.driverMap,
      title: "Driver Current Location",
      icon: {
        path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        scale: 6,
        fillColor: "#16A34A",
        fillOpacity: 1,
        strokeColor: "#FFFFFF",
        strokeWeight: 2,
        rotation: 135
      }
    });
  },

  /**
   * Smoothly animate truck marker on Google Maps when live telemetry arrives
   */
  updateTruckPosition(lat, lng, heading) {
    this.targetTruckCoords = { lat, lng };

    if (!this.isLoaded) return;

    // Direct update or smooth interpolation
    if (this.truckMarkerCitizen && this.citizenMap) {
      this.truckMarkerCitizen.setPosition(new google.maps.LatLng(lat, lng));
    }
    if (this.truckMarkerDriver && this.driverMap) {
      this.truckMarkerDriver.setPosition(new google.maps.LatLng(lat, lng));
      if (heading !== undefined) {
        const icon = this.truckMarkerDriver.getIcon();
        if (icon) {
          icon.rotation = heading;
          this.truckMarkerDriver.setIcon(icon);
        }
      }
    }
  },

  recenterCitizenMap() {
    if (this.citizenMap && this.citizenHomeMarker) {
      this.citizenMap.panTo(this.citizenHomeMarker.getPosition());
      this.citizenMap.setZoom(16);
    }
  }
};

// Expose globally
window.GoogleMapsEngine = GoogleMapsEngine;
