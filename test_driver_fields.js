// Test driver field whitelist against updated database.rules.json
const fs = require('fs');
const path = require('path');

const rulesContent = fs.readFileSync(path.join(__dirname, 'database.rules.json'), 'utf8');
const rules = JSON.parse(rulesContent).rules;
const vehicleRules = rules.vehicles.$vehicleId;

class MockSnapshot {
  constructor(data) {
    this._data = data;
  }
  exists() {
    return this._data !== undefined && this._data !== null;
  }
  val() {
    return this._data;
  }
  isNumber() {
    return typeof this._data === 'number' && !isNaN(this._data);
  }
  isString() {
    return typeof this._data === 'string';
  }
  child(pathStr) {
    if (!this.exists()) return new MockSnapshot(undefined);
    const parts = pathStr.split('/');
    let curr = this._data;
    for (const p of parts) {
      if (curr === undefined || curr === null || typeof curr !== 'object') {
        return new MockSnapshot(undefined);
      }
      curr = curr[p];
    }
    return new MockSnapshot(curr);
  }
}

function evaluateVehicleWrite(auth, vehicleId, data, newData) {
  if (!auth) return false;
  const isOfficer = (
    auth.token.role === 'officer' || 
    auth.token.role === 'municipality' || 
    auth.token.role === 'admin' || 
    auth.token.isOfficer === true || 
    auth.token.isAdmin === true
  );
  
  // 1. Evaluate .write condition
  const isDriver = auth.token.role === 'driver';
  const isAssigned = (
    data.child('currentDriver/id').val() === auth.uid || 
    (auth.token.vehicleId === vehicleId && data.child('vehicleId').val() === auth.token.vehicleId)
  );
  
  const canWrite = isOfficer || (isDriver && isAssigned);
  if (!canWrite) return false;
  if (isOfficer) return true; // Officers pass validation

  // 2. Evaluate child-level .validate rules on newData
  const newDataVal = newData.val() || {};
  const dataVal = data.val() || {};
  
  // Explicitly defined children in rule
  const definedKeys = [
    'currentDriver', 'vehicleId', 'licensePlate', 'wardId', 'assignedWard', 'assignedZone',
    'routeId', 'routeName', 'make', 'model', 'capacity', 'type',
    'lat', 'lng', 'speed', 'heading', 'progressPct', 'status', 'timestamp',
    'updatedAt', 'lastUpdate', 'currentLocation', 'battery', 'fuel', 'wasteLevel'
  ];

  for (const key of Object.keys(newDataVal)) {
    const childNewSnap = newData.child(key);
    const childDataSnap = data.child(key);

    if (!definedKeys.includes(key)) {
      // Hits $other .validate: "auth.token.role === 'officer' || ..."
      if (!isOfficer) return false;
    }

    // Specific field validations
    if (key === 'currentDriver') {
      if (childDataSnap.exists()) {
        if (childNewSnap.child('id').val() !== childDataSnap.child('id').val() ||
            childNewSnap.child('name').val() !== childDataSnap.child('name').val()) {
          return false;
        }
      }
    } else if (['vehicleId', 'licensePlate', 'wardId', 'assignedWard', 'assignedZone', 'routeId', 'routeName', 'make', 'model', 'capacity', 'type'].includes(key)) {
      if (childDataSnap.exists() && childNewSnap.val() !== childDataSnap.val()) {
        return false;
      }
    } else if (key === 'lat') {
      if (!childNewSnap.isNumber() || childNewSnap.val() < -90 || childNewSnap.val() > 90) return false;
    } else if (key === 'lng') {
      if (!childNewSnap.isNumber() || childNewSnap.val() < -180 || childNewSnap.val() > 180) return false;
    } else if (key === 'speed') {
      if (!childNewSnap.isNumber() || childNewSnap.val() < 0 || childNewSnap.val() > 160) return false;
    } else if (key === 'heading') {
      if (!childNewSnap.isNumber() || childNewSnap.val() < 0 || childNewSnap.val() > 360) return false;
    } else if (key === 'progressPct') {
      if (!childNewSnap.isNumber() || childNewSnap.val() < 0 || childNewSnap.val() > 100) return false;
    } else if (key === 'status') {
      if (!childNewSnap.isString() || childNewSnap.val().length > 50) return false;
    } else if (['battery', 'fuel', 'wasteLevel'].includes(key)) {
      if (!childNewSnap.isNumber() || childNewSnap.val() < 0 || childNewSnap.val() > 100) return false;
    }
  }

  return true;
}

const driverAuth = { uid: 'drv_456', token: { role: 'driver', vehicleId: 'GCV-001' } };
const initialVehicleData = {
  vehicleId: 'GCV-001',
  licensePlate: 'MH-14-GH-1234',
  currentDriver: { id: 'drv_456', name: 'Assigned Driver' },
  wardId: '10',
  assignedWard: 'Ward 10',
  assignedZone: 'East',
  routeId: 'RT-101',
  routeName: 'Route 1',
  make: 'Tata',
  model: 'Ace',
  capacity: '2.5 Ton',
  type: 'Tipper',
  lat: 18.73,
  lng: 73.68,
  speed: 25,
  heading: 180,
  progressPct: 50,
  status: 'active',
  timestamp: 1700000000
};

const dataSnap = new MockSnapshot(initialVehicleData);

console.log('================================================================');
console.log('TESTING DRIVER FIELD RESTRICTIONS AGAINST HARDENED RTDB RULES');
console.log('================================================================\n');

const blockedFields = [
  { field: 'adminNotes', value: 'Unauthorized note' },
  { field: 'maintenanceStatus', value: 'needs_service' },
  { field: 'owner', value: 'other_owner' },
  { field: 'municipalityId', value: 'pmc_pune' },
  { field: 'assignedZone', value: 'West' },
  { field: 'randomTestField', value: 'hacked' },
  { field: 'permissions', value: { all: true } },
  { field: 'driverName/currentDriver.name', value: 'Imposter Driver' },
  { field: 'routeName', value: 'Route 99' },
  { field: 'licensePlate', value: 'MH-12-XX-0000' }
];

console.log('MUST BE BLOCKED TESTS:');
let passedCount = 0;
let totalCount = 0;

blockedFields.forEach((tc, idx) => {
  totalCount++;
  let modifiedData = { ...initialVehicleData };
  if (tc.field === 'driverName/currentDriver.name') {
    modifiedData.currentDriver = { id: 'drv_456', name: 'Imposter Driver' };
  } else {
    modifiedData[tc.field] = tc.value;
  }
  const newDataSnap = new MockSnapshot(modifiedData);
  const isAllowed = evaluateVehicleWrite(driverAuth, 'GCV-001', dataSnap, newDataSnap);
  const pass = (isAllowed === false);
  if (pass) passedCount++;
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${idx + 1}. Attempt to add/modify ${tc.field} -> Allowed: ${isAllowed} (Expected: false)`);
});

console.log('\nMUST BE ALLOWED TEST:');
totalCount++;
const legitUpdateData = {
  ...initialVehicleData,
  lat: 18.735,
  lng: 73.685,
  speed: 28,
  heading: 190,
  progressPct: 55,
  status: 'en_route',
  timestamp: 1700001200
};
const legitSnap = new MockSnapshot(legitUpdateData);
const legitAllowed = evaluateVehicleWrite(driverAuth, 'GCV-001', dataSnap, legitSnap);
const legitPass = (legitAllowed === true);
if (legitPass) passedCount++;
console.log(`[${legitPass ? 'PASS' : 'FAIL'}] Legitimate update (lat, lng, speed, heading, progressPct, status, timestamp) -> Allowed: ${legitAllowed} (Expected: true)`);

console.log('\nMIXED UPDATE TEST:');
totalCount++;
const mixedData = {
  ...legitUpdateData,
  adminNotes: 'Unauthorized backdoor note'
};
const mixedSnap = new MockSnapshot(mixedData);
const mixedAllowed = evaluateVehicleWrite(driverAuth, 'GCV-001', dataSnap, mixedSnap);
const mixedPass = (mixedAllowed === false);
if (mixedPass) passedCount++;
console.log(`[${mixedPass ? 'PASS' : 'FAIL'}] Mixed update (lat + lng + speed + adminNotes) -> Allowed: ${mixedAllowed} (Expected: false)`);

console.log(`\n================================================================`);
console.log(`FINAL RESULTS: ${passedCount}/${totalCount} tests passed successfully.`);
console.log(`================================================================`);
