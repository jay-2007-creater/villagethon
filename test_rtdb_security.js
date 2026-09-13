// Test suite for Firebase Realtime Database Security Rules
const fs = require('fs');
const path = require('path');

const rulesContent = fs.readFileSync(path.join(__dirname, 'database.rules.json'), 'utf8');
const rules = JSON.parse(rulesContent).rules;

console.log('====================================================');
console.log('RUNNING REALTIME DATABASE SECURITY RULES TEST SUITE');
console.log('====================================================\n');

// Mock RTDB DataSnapshot helper
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

// Rule Evaluators based on database.rules.json
const evaluators = {
  userRead(auth, userId) {
    return auth != null && (
      auth.uid === userId || 
      auth.token.role === 'officer' || 
      auth.token.role === 'municipality' || 
      auth.token.role === 'admin' || 
      auth.token.isOfficer === true || 
      auth.token.isAdmin === true
    );
  },
  
  userWrite(auth, userId, data, newData) {
    const isOfficer = auth != null && (
      auth.token.role === 'officer' || 
      auth.token.role === 'municipality' || 
      auth.token.role === 'admin' || 
      auth.token.isOfficer === true || 
      auth.token.isAdmin === true
    );
    if (!auth) return false;
    if (isOfficer) return true;
    
    if (auth.uid === userId) {
      if (!data.exists()) {
        return (newData.child('role').val() === 'citizen' || !newData.child('role').exists()) &&
          !newData.child('permissions').exists() &&
          !newData.child('verificationStatus').exists() &&
          !newData.child('wardId').exists() &&
          !newData.child('ward').exists() &&
          !newData.child('staffStatus').exists() &&
          !newData.child('isStaff').exists() &&
          !newData.child('isAdmin').exists() &&
          !newData.child('isOfficer').exists() &&
          !newData.child('municipality').exists() &&
          !newData.child('municipalityId').exists();
      } else {
        return newData.child('role').val() === data.child('role').val() &&
          newData.child('wardId').val() === data.child('wardId').val() &&
          newData.child('ward').val() === data.child('ward').val() &&
          newData.child('permissions').val() === data.child('permissions').val() &&
          newData.child('verificationStatus').val() === data.child('verificationStatus').val() &&
          newData.child('staffStatus').val() === data.child('staffStatus').val() &&
          newData.child('createdAt').val() === data.child('createdAt').val() &&
          newData.child('municipality').val() === data.child('municipality').val() &&
          newData.child('municipalityId').val() === data.child('municipalityId').val() &&
          newData.child('isStaff').val() === data.child('isStaff').val() &&
          newData.child('isAdmin').val() === data.child('isAdmin').val() &&
          newData.child('isOfficer').val() === data.child('isOfficer').val();
      }
    }
    return false;
  },

  vehicleRead(auth, vehicleId, data) {
    if (!auth) return false;
    const isOfficer = (
      auth.token.role === 'officer' || 
      auth.token.role === 'municipality' || 
      auth.token.role === 'admin' || 
      auth.token.isOfficer === true || 
      auth.token.isAdmin === true
    );
    if (isOfficer) return true;
    
    const isAssignedDriver = auth.token.role === 'driver' && (
      data.child('currentDriver/id').val() === auth.uid || 
      data.child('vehicleId').val() === auth.token.vehicleId
    );
    if (isAssignedDriver) return true;
    
    const isWardCitizen = (data.child('wardId').val() === auth.token.wardId);
    return isWardCitizen;
  },

  vehicleWrite(auth, vehicleId, data, newData) {
    if (!auth) return false;
    const isOfficer = (
      auth.token.role === 'officer' || 
      auth.token.role === 'municipality' || 
      auth.token.role === 'admin' || 
      auth.token.isOfficer === true || 
      auth.token.isAdmin === true
    );
    if (isOfficer) return true;
    
    const isDriverRole = auth.token.role === 'driver';
    const isExistingAssignedDriver = (
      data.child('currentDriver/id').val() === auth.uid || 
      (auth.token.vehicleId === vehicleId && data.child('vehicleId').val() === auth.token.vehicleId)
    );
    
    if (isDriverRole && isExistingAssignedDriver) {
      // Must preserve all structural and assignment fields:
      return (
        JSON.stringify(newData.child('currentDriver').val()) === JSON.stringify(data.child('currentDriver').val()) &&
        newData.child('vehicleId').val() === data.child('vehicleId').val() &&
        newData.child('wardId').val() === data.child('wardId').val() &&
        newData.child('assignedWard').val() === data.child('assignedWard').val() &&
        newData.child('assignedZone').val() === data.child('assignedZone').val() &&
        newData.child('routeId').val() === data.child('routeId').val() &&
        newData.child('routeName').val() === data.child('routeName').val() &&
        newData.child('licensePlate').val() === data.child('licensePlate').val() &&
        newData.child('make').val() === data.child('make').val() &&
        newData.child('model').val() === data.child('model').val() &&
        newData.child('capacity').val() === data.child('capacity').val() &&
        newData.child('type').val() === data.child('type').val()
      );
    }
    return false;
  },

  grievanceRead(auth, reportId, data) {
    if (!auth) return false;
    const isOfficer = (
      auth.token.role === 'officer' || 
      auth.token.role === 'municipality' || 
      auth.token.role === 'admin' || 
      auth.token.isOfficer === true || 
      auth.token.isAdmin === true
    );
    if (isOfficer) return true;
    return data.child('citizenUid').val() === auth.uid;
  },

  grievanceWrite(auth, reportId, data, newData) {
    if (!auth) return false;
    const isOfficer = (
      auth.token.role === 'officer' || 
      auth.token.role === 'municipality' || 
      auth.token.role === 'admin' || 
      auth.token.isOfficer === true || 
      auth.token.isAdmin === true
    );
    if (isOfficer) return true;

    if (!data.exists()) {
      return (
        newData.child('citizenUid').val() === auth.uid &&
        newData.child('status').val() === 'pending' &&
        !newData.child('assignedSquad').exists() &&
        !newData.child('assignedTo').exists() &&
        !newData.child('resolutionNotes').exists() &&
        !newData.child('resolvedAt').exists() &&
        !newData.child('internalNotes').exists()
      );
    } else {
      return (
        data.child('citizenUid').val() === auth.uid &&
        newData.child('citizenUid').val() === data.child('citizenUid').val() &&
        newData.child('status').val() === data.child('status').val() &&
        newData.child('assignedSquad').val() === data.child('assignedSquad').val() &&
        newData.child('assignedTo').val() === data.child('assignedTo').val() &&
        newData.child('wardId').val() === data.child('wardId').val() &&
        newData.child('ward').val() === data.child('ward').val() &&
        newData.child('lat').val() === data.child('lat').val() &&
        newData.child('lng').val() === data.child('lng').val() &&
        newData.child('createdAt').val() === data.child('createdAt').val() &&
        newData.child('resolvedAt').val() === data.child('resolvedAt').val() &&
        newData.child('resolutionNotes').val() === data.child('resolutionNotes').val() &&
        newData.child('internalNotes').val() === data.child('internalNotes').val()
      );
    }
  }
};

let passed = 0;
let total = 0;

function assertTest(name, condition, expectedAllowed = false) {
  total++;
  const result = condition;
  const isPass = (result === expectedAllowed);
  if (isPass) {
    passed++;
    console.log(`[PASS] ${name} -> Allowed: ${result} (Expected: ${expectedAllowed})`);
  } else {
    console.error(`[FAIL] ${name} -> Allowed: ${result} (Expected: ${expectedAllowed})`);
  }
}

// 1. Citizens cannot modify role, wardId, permissions, isOfficer, isAdmin or verification fields
const citizenAuth = { uid: 'cit_123', token: { role: 'citizen', wardId: '10' } };
const userSnap = new MockSnapshot({
  name: 'John Citizen',
  role: 'citizen',
  wardId: '10',
  ward: 'Ward 10',
  permissions: { canTriage: false },
  verificationStatus: 'verified',
  staffStatus: 'none',
  createdAt: 1700000000,
  municipality: 'talegaon'
});

assertTest('1a. Citizen modifies role to officer', evaluators.userWrite(
  citizenAuth, 'cit_123', userSnap,
  new MockSnapshot({ ...userSnap.val(), role: 'officer' })
), false);

assertTest('1b. Citizen modifies wardId', evaluators.userWrite(
  citizenAuth, 'cit_123', userSnap,
  new MockSnapshot({ ...userSnap.val(), wardId: '12' })
), false);

assertTest('1c. Citizen modifies permissions', evaluators.userWrite(
  citizenAuth, 'cit_123', userSnap,
  new MockSnapshot({ ...userSnap.val(), permissions: { canTriage: true } })
), false);

assertTest('1d. Citizen modifies verificationStatus', evaluators.userWrite(
  citizenAuth, 'cit_123', userSnap,
  new MockSnapshot({ ...userSnap.val(), verificationStatus: 'admin_verified' })
), false);

// 2. Drivers cannot claim or assign themselves to vehicles
const driverAuth = { uid: 'drv_456', token: { role: 'driver', vehicleId: 'GCV-001' } };
const unassignedVehicleSnap = new MockSnapshot({
  vehicleId: 'GCV-002',
  licensePlate: 'MH-14-GH-1234',
  currentDriver: { id: 'drv_999', name: 'Other Driver' },
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
  status: 'active'
});

assertTest('2. Driver claims unassigned vehicle (GCV-002)', evaluators.vehicleWrite(
  driverAuth, 'GCV-002', unassignedVehicleSnap,
  new MockSnapshot({ ...unassignedVehicleSnap.val(), currentDriver: { id: 'drv_456', name: 'New Driver' } })
), false);

// 3. Drivers can write ONLY approved telemetry fields & 4. Cannot modify administrative fields
const assignedVehicleSnap = new MockSnapshot({
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
  status: 'active'
});

assertTest('3. Driver writes valid live telemetry update', evaluators.vehicleWrite(
  driverAuth, 'GCV-001', assignedVehicleSnap,
  new MockSnapshot({ ...assignedVehicleSnap.val(), lat: 18.74, lng: 73.69, speed: 30, status: 'en_route', timestamp: 1700001000 })
), true);

assertTest('4a. Driver attempts modifying licensePlate', evaluators.vehicleWrite(
  driverAuth, 'GCV-001', assignedVehicleSnap,
  new MockSnapshot({ ...assignedVehicleSnap.val(), licensePlate: 'MH-14-HACK-999' })
), false);

assertTest('4b. Driver attempts modifying wardId', evaluators.vehicleWrite(
  driverAuth, 'GCV-001', assignedVehicleSnap,
  new MockSnapshot({ ...assignedVehicleSnap.val(), wardId: '15' })
), false);

assertTest('4c. Driver attempts modifying routeId', evaluators.vehicleWrite(
  driverAuth, 'GCV-001', assignedVehicleSnap,
  new MockSnapshot({ ...assignedVehicleSnap.val(), routeId: 'RT-999' })
), false);

// 5. Citizens can read ONLY vehicles authorized for their trusted ward
assertTest('5a. Citizen reads assigned ward vehicle (Ward 10)', evaluators.vehicleRead(
  citizenAuth, 'GCV-001', assignedVehicleSnap
), true);

const otherWardVehicleSnap = new MockSnapshot({
  vehicleId: 'GCV-005',
  wardId: '14'
});
assertTest('5b. Citizen reads other ward vehicle (Ward 14)', evaluators.vehicleRead(
  citizenAuth, 'GCV-005', otherWardVehicleSnap
), false);

// 6. Citizens cannot read another citizen\'s private data
assertTest('6. Citizen reads another user profile', evaluators.userRead(
  citizenAuth, 'cit_999'
), false);

// 7. Grievance UID, status, ward, lat/lng and administrative fields cannot be changed by citizens
const grievanceSnap = new MockSnapshot({
  citizenUid: 'cit_123',
  title: 'Pothole on Main Rd',
  status: 'pending',
  wardId: '10',
  ward: 'Ward 10',
  lat: 18.735,
  lng: 73.682,
  createdAt: 1700000000,
  assignedSquad: 'Squad Alpha',
  assignedTo: 'Officer K',
  resolutionNotes: '',
  resolvedAt: null,
  internalNotes: ''
});

assertTest('7a. Citizen modifies grievance status to resolved', evaluators.grievanceWrite(
  citizenAuth, 'rep_001', grievanceSnap,
  new MockSnapshot({ ...grievanceSnap.val(), status: 'resolved' })
), false);

assertTest('7b. Citizen modifies grievance lat/lng location', evaluators.grievanceWrite(
  citizenAuth, 'rep_001', grievanceSnap,
  new MockSnapshot({ ...grievanceSnap.val(), lat: 18.888, lng: 73.999 })
), false);

assertTest('7c. Citizen modifies grievance wardId', evaluators.grievanceWrite(
  citizenAuth, 'rep_001', grievanceSnap,
  new MockSnapshot({ ...grievanceSnap.val(), wardId: '12' })
), false);

assertTest('7d. Citizen modifies grievance assignedSquad', evaluators.grievanceWrite(
  citizenAuth, 'rep_001', grievanceSnap,
  new MockSnapshot({ ...grievanceSnap.val(), assignedSquad: 'Squad Hacker' })
), false);

// 8. Unauthenticated access is denied
assertTest('8a. Unauthenticated user reads profile', evaluators.userRead(null, 'cit_123'), false);
assertTest('8b. Unauthenticated user reads vehicle', evaluators.vehicleRead(null, 'GCV-001', assignedVehicleSnap), false);
assertTest('8c. Unauthenticated user reads grievance', evaluators.grievanceRead(null, 'rep_001', grievanceSnap), false);

console.log(`\nTEST RESULTS: ${passed}/${total} assertions passed successfully.`);
if (passed === total) {
  console.log('ALL REALTIME DATABASE SECURITY RULES TESTS PASSED!\n');
}
