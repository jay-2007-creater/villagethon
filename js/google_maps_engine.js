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
  },

  /**
   * Reverse geocodes coordinates (lat, lng) using Google Maps Geocoder API
   * Extracts exact building names, premises, streets, wards, city, and pincode.
   */
  async reverseGeocode(lat, lng) {
    if (!window.google || !google.maps || !google.maps.Geocoder) {
      return null;
    }

    return new Promise((resolve) => {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: { lat: Number(lat), lng: Number(lng) } }, (results, status) => {
        if (status !== "OK" || !results || results.length === 0) {
          resolve(null);
          return;
        }

        const best = results[0];
        let building = "";
        let streetNumber = "";
        let route = "";
        let sublocality = "";
        let locality = "";
        let pin = "";

        // Parse address components
        best.address_components.forEach((comp) => {
          const types = comp.types || [];
          if (types.includes("premise") || types.includes("subpremise") || types.includes("point_of_interest") || types.includes("establishment")) {
            if (!building) building = comp.long_name;
          }
          if (types.includes("street_number")) {
            streetNumber = comp.long_name;
          }
          if (types.includes("route")) {
            route = comp.long_name;
          }
          if (types.includes("sublocality_level_1") || types.includes("sublocality_level_2") || types.includes("neighborhood")) {
            if (!sublocality) sublocality = comp.long_name;
          }
          if (types.includes("locality") || types.includes("administrative_area_level_2")) {
            if (!locality) locality = comp.long_name;
          }
          if (types.includes("postal_code")) {
            pin = comp.long_name;
          }
        });

        // Format building / flat
        let flatVal = "";
        if (building) {
          flatVal = streetNumber ? `${building}, #${streetNumber}` : building;
        } else if (streetNumber) {
          flatVal = `House #${streetNumber}`;
        }

        // Format street & locality
        let streetVal = [route, sublocality].filter(Boolean).join(", ");
        if (!streetVal && best.formatted_address) {
          const parts = best.formatted_address.split(",");
          streetVal = parts.slice(0, 2).join(",").trim();
        }

        let cityVal = locality ? `${locality}, Pune` : "Talegaon Dabhade, Pune";
        let pinVal = pin || "410507";

        resolve({
          source: "google_maps",
          formattedAddress: best.formatted_address,
          flat: flatVal,
          street: streetVal,
          city: cityVal,
          pin: pinVal,
          lat: best.geometry ? best.geometry.location.lat() : lat,
          lng: best.geometry ? best.geometry.location.lng() : lng
        });
      });
    });
  },

  /**
   * Attaches Google Places Autocomplete to an HTML input element
   */
  attachPlacesAutocomplete(inputEl, callback) {
    if (!inputEl || !window.google || !google.maps || !google.maps.places) return null;

    try {
      const autocomplete = new google.maps.places.Autocomplete(inputEl, {
        componentRestrictions: { country: "in" },
        fields: ["address_components", "geometry", "formatted_address", "name"]
      });

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (!place || !place.geometry) return;

        let building = place.name || "";
        let streetNumber = "";
        let route = "";
        let sublocality = "";
        let locality = "";
        let pin = "";

        if (place.address_components) {
          place.address_components.forEach((comp) => {
            const types = comp.types || [];
            if (types.includes("premise") || types.includes("subpremise") || types.includes("point_of_interest") || types.includes("establishment")) {
              if (!building) building = comp.long_name;
            }
            if (types.includes("street_number")) {
              streetNumber = comp.long_name;
            }
            if (types.includes("route")) {
              route = comp.long_name;
            }
            if (types.includes("sublocality_level_1") || types.includes("sublocality_level_2") || types.includes("neighborhood")) {
              if (!sublocality) sublocality = comp.long_name;
            }
            if (types.includes("locality") || types.includes("administrative_area_level_2")) {
              if (!locality) locality = comp.long_name;
            }
            if (types.includes("postal_code")) {
              pin = comp.long_name;
            }
          });
        }

        const flatVal = building ? (streetNumber ? `${building}, #${streetNumber}` : building) : (streetNumber ? `House #${streetNumber}` : "");
        const streetVal = [route, sublocality].filter(Boolean).join(", ") || place.name || "";
        const cityVal = locality ? `${locality}, Pune` : "Talegaon Dabhade, Pune";
        const pinVal = pin || "410507";
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();

        if (typeof callback === "function") {
          callback({
            building: flatVal,
            street: streetVal,
            city: cityVal,
            pin: pinVal,
            lat,
            lng,
            formatted: place.formatted_address
          });
        }
      });

      return autocomplete;
    } catch (e) {
      console.warn("Could not attach Google Places Autocomplete:", e);
      return null;
    }
  }
};

// Expose globally
window.GoogleMapsEngine = GoogleMapsEngine;
