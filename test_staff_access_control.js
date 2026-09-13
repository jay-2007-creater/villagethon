/**
 * CITYASSIST — STAFF ACCESS CONTROL & ROLE-BASED LOGIN SECURITY TEST SUITE
 * 
 * Verifies:
 *  A. Citizen:
 *     - access /driver -> DENIED (redirects to home)
 *     - access /municipality -> DENIED (redirects to home)
 *     - read driver-only data -> DENIED
 *     - read municipality-only data -> DENIED
 *  B. Unapproved user:
 *     - access /driver -> DENIED
 *     - access /municipality -> DENIED
 *  C. Approved driver:
 *     - access /driver -> ALLOWED
 *     - access /municipality -> DENIED
 *     - modify assigned vehicle telemetry -> ALLOWED
 *     - modify another vehicle -> DENIED
 *     - change vehicleId -> DENIED
 *     - change wardId -> DENIED
 *     - change role -> DENIED
 *  D. Approved officer:
 *     - access Municipality Dashboard -> ALLOWED
 *     - access administrative data according to permissions -> ALLOWED
 *     - change own role to admin -> DENIED
 *  E. Privilege escalation:
 *     - Attempt to modify role, approved status, permissions, vehicleId, wardId, municipalityId from client -> DENIED
 */

const fs = require('fs');
const path = require('path');

// 1. Mock Browser Environment for AuthEngine & App Guards
const localStorageStore = {};
global.localStorage = {
  getItem: (k) => localStorageStore[k] || null,
  setItem: (k, v) => { localStorageStore[k] = String(v); },
  removeItem: (k) => { delete localStorageStore[k]; },
  clear: () => { for (const k in localStorageStore) delete localStorageStore[k]; }
};

const domElements = {};
global.document = {
  getElementById: (id) => {
    if (!domElements[id]) {
      domElements[id] = { id, style: {}, classList: { add: () => {}, remove: () => {}, toggle: () => {} }, textContent: '', value: '' };
    }
    return domElements[id];
  },
  querySelectorAll: (selector) => {
    return [];
  },
  querySelector: (selector) => {
    return { textContent: '', innerHTML: '' };
  }
};

global.window = { crypto: { getRandomValues: (arr) => arr } };

// Mock CityData and CityAssist
global.CityData = {
  user: {},
  municipality: {
    fleetVehicles: [
      { vehicleId: 'GCV-001', licensePlate: 'MH-12-EA-4919', wardId: 1, wardName: 'Ward 1' },
      { vehicleId: 'GCV-002', licensePlate: 'MH-12-EA-4920', wardId: 2, wardName: 'Ward 2', driver: 'Ramesh Shinde' }
    ]
  },
  driver: {}
};

let lastToast = null;
global.CityAssist = {
  currentScreen: 'home',
  showToast: (msg) => { lastToast = msg; },
  closeDrawer: () => {},
  closeModal: () => {},
  navigateTo: function(screen) {
    // Production Security Role Guard matching app.js
    if (screen === 'municipality') {
      if (!AuthEngine.isAuthorizedForRole('officer') && !AuthEngine.isAuthorizedForRole('admin')) {
        this.showToast("⛔ Access Denied: Municipal Officer access only.");
        const fallback = AuthEngine.isAuthorizedForRole('driver') ? 'driver' : 'home';
        this.currentScreen = fallback;
        return;
      }
    }
    if (screen === 'driver') {
      if (!AuthEngine.isAuthorizedForRole('driver')) {
        this.showToast("⛔ Access Denied: Approved Municipal Driver session required.");
        this.currentScreen = 'home';
        return;
      }
    }
    this.currentScreen = screen;
  }
};

// Load AuthEngine
const authEngineCode = fs.readFileSync(path.join(__dirname, 'js/auth_engine.js'), 'utf8');
const vm = require('vm');
vm.runInThisContext(authEngineCode.replace('const AuthEngine =', 'global.AuthEngine ='));

// Load Rules
const rtdbRules = JSON.parse(fs.readFileSync(path.join(__dirname, 'database.rules.json'), 'utf8')).rules;

// Helper MockSnapshot for RTDB evaluation
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

// RTDB Rules Evaluators
function evalRtdbUserWrite(auth, userId, dataObj, newDataObj) {
  const data = new MockSnapshot(dataObj);
  const newData = new MockSnapshot(newDataObj);
  if (!auth) return false;
  const isOfficer = auth.token.role === 'officer' || auth.token.role === 'municipality' || auth.token.isOfficer === true;
  const isAdmin = auth.token.role === 'admin' || auth.token.isAdmin === true;
  
  if (isAdmin) return true;
  if (isOfficer && userId !== auth.uid && newData.child('role').val() !== 'admin' && newData.child('isAdmin').val() !== true) {
    return true;
  }
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
}

function evalRtdbVehicleRead(auth, vehicleId, dataObj) {
  const data = new MockSnapshot(dataObj);
  if (!auth) return false;
  const isOfficer = auth.token.role === 'officer' || auth.token.role === 'municipality' || auth.token.role === 'admin' || auth.token.isOfficer === true || auth.token.isAdmin === true;
  if (isOfficer) return true;
  const isDriver = auth.token.role === 'driver' && (data.child('currentDriver/id').val() === auth.uid || data.child('vehicleId').val() === auth.token.vehicleId);
  if (isDriver) return true;
  const isCitizenWard = data.child('wardId').val() === auth.token.wardId;
  return isCitizenWard;
}

function evalRtdbVehicleWrite(auth, vehicleId, dataObj, newDataObj) {
  const data = new MockSnapshot(dataObj);
  const newData = new MockSnapshot(newDataObj);
  if (!auth) return false;
  const isOfficer = auth.token.role === 'officer' || auth.token.role === 'municipality' || auth.token.role === 'admin' || auth.token.isOfficer === true || auth.token.isAdmin === true;
  const isDriver = auth.token.role === 'driver' && (data.child('currentDriver/id').val() === auth.uid || (auth.token.vehicleId === vehicleId && data.child('vehicleId').val() === auth.token.vehicleId));
  
  if (!isOfficer && !isDriver) return false;
  if (isOfficer) return true;

  // Driver child validation
  const whitelist = ['lat', 'lng', 'speed', 'heading', 'progressPct', 'status', 'timestamp', 'updatedAt', 'lastUpdate', 'currentLocation', 'battery', 'fuel', 'wasteLevel', 'vehicleId', 'licensePlate', 'wardId', 'assignedWard', 'assignedZone', 'routeId', 'routeName', 'make', 'model', 'capacity', 'type', 'currentDriver'];
  
  for (const k in newDataObj) {
    if (!whitelist.includes(k)) return false; // $other rejected
  }

  // Immutable structural fields for driver
  if (newData.child('vehicleId').val() !== data.child('vehicleId').val()) return false;
  if (newData.child('wardId').val() !== data.child('wardId').val()) return false;
  if (newData.child('routeId').val() !== data.child('routeId').val()) return false;
  if (data.child('currentDriver/id').val() !== newData.child('currentDriver/id').val()) return false;

  return true;
}

function evalRtdbAuditLogsRead(auth) {
  if (!auth) return false;
  return auth.token.role === 'admin' || auth.token.role === 'officer' || auth.token.role === 'municipality' || auth.token.isOfficer === true || auth.token.isAdmin === true;
}

// -------------------------------------------------------------
// TEST RUNNER
// -------------------------------------------------------------
const results = [];
function test(name, fn) {
  try {
    fn();
    results.push({ name, status: 'PASS' });
    console.log(`✓ PASS: ${name}`);
  } catch (err) {
    results.push({ name, status: 'FAIL', error: err.message });
    console.error(`✗ FAIL: ${name} -> ${err.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || "Assertion failed");
}

console.log("\n======================================================================");
console.log("CITYASSIST RBAC & STAFF ACCESS CONTROL SECURITY VERIFICATION SUITE");
console.log("======================================================================\n");

// -------------------------------------------------------------
// SUITE A: CITIZEN ACCESS & DATA ISOLATION
// -------------------------------------------------------------
console.log("--- TEST GROUP A: Citizen Access ---");

test("A.1 Citizen: access /driver -> DENIED (redirects to home)", () => {
  AuthEngine.currentUser = {
    id: "cit_1",
    role: "citizen",
    staffStatus: "none",
    wardId: 2
  };
  CityAssist.navigateTo('driver');
  assert(CityAssist.currentScreen === 'home', `Expected home but got ${CityAssist.currentScreen}`);
});

test("A.2 Citizen: access /municipality -> DENIED (redirects to home)", () => {
  AuthEngine.currentUser = {
    id: "cit_1",
    role: "citizen",
    staffStatus: "none",
    wardId: 2
  };
  CityAssist.navigateTo('municipality');
  assert(CityAssist.currentScreen === 'home', `Expected home but got ${CityAssist.currentScreen}`);
});

test("A.3 Citizen: read driver-only telemetry on other ward -> DENIED", () => {
  const citizenAuth = { uid: "cit_1", token: { role: "citizen", wardId: 2 } };
  const vehicleWard1 = { vehicleId: "GCV-001", wardId: 1, currentDriver: { id: "drv_1" } };
  const canRead = evalRtdbVehicleRead(citizenAuth, "GCV-001", vehicleWard1);
  assert(canRead === false, "Citizen should not read vehicles outside their assigned ward");
});

test("A.4 Citizen: read municipality audit logs -> DENIED", () => {
  const citizenAuth = { uid: "cit_1", token: { role: "citizen", wardId: 2 } };
  const canRead = evalRtdbAuditLogsRead(citizenAuth);
  assert(canRead === false, "Citizen must receive permission denied on municipality audit logs");
});

// -------------------------------------------------------------
// SUITE B: UNAPPROVED USER
// -------------------------------------------------------------
console.log("\n--- TEST GROUP B: Unapproved User ---");

test("B.1 Unapproved user with pending status: access /driver -> DENIED", () => {
  AuthEngine.currentUser = {
    id: "unapp_1",
    role: "citizen",
    staffStatus: "pending",
    requestedRole: "driver"
  };
  CityAssist.navigateTo('driver');
  assert(CityAssist.currentScreen === 'home', `Unapproved user should be redirected to home, was ${CityAssist.currentScreen}`);
});

test("B.2 Unapproved user attempting self-assigned officer role: access /municipality -> DENIED", () => {
  // If user maliciously claims role: 'officer' in client state without approved staffStatus
  AuthEngine.currentUser = {
    id: "unapp_2",
    role: "officer",
    staffStatus: "pending" // Not approved!
  };
  CityAssist.navigateTo('municipality');
  assert(CityAssist.currentScreen === 'home', `Unapproved officer must be denied access to municipality dashboard`);
});

// -------------------------------------------------------------
// SUITE C: APPROVED DRIVER
// -------------------------------------------------------------
console.log("\n--- TEST GROUP C: Approved Driver ---");

test("C.1 Approved driver: access /driver -> ALLOWED", () => {
  AuthEngine.currentUser = {
    id: "driver_uid_102",
    role: "driver",
    staffStatus: "approved",
    vehicleId: "GCV-002",
    wardId: 2
  };
  CityAssist.navigateTo('driver');
  assert(CityAssist.currentScreen === 'driver', `Approved driver should access driver HUD, was ${CityAssist.currentScreen}`);
});

test("C.2 Approved driver: access /municipality -> DENIED", () => {
  AuthEngine.currentUser = {
    id: "driver_uid_102",
    role: "driver",
    staffStatus: "approved",
    vehicleId: "GCV-002",
    wardId: 2
  };
  CityAssist.navigateTo('municipality');
  assert(CityAssist.currentScreen === 'driver', `Driver attempting /municipality should be redirected back to driver HUD, was ${CityAssist.currentScreen}`);
});

test("C.3 Approved driver: modify assigned vehicle telemetry -> ALLOWED", () => {
  const driverAuth = { uid: "driver_uid_102", token: { role: "driver", vehicleId: "GCV-002" } };
  const existingVehicle = {
    vehicleId: "GCV-002",
    wardId: 2,
    routeId: "Route 4B",
    currentDriver: { id: "driver_uid_102", name: "Ramesh Shinde" },
    lat: 18.73,
    lng: 73.67,
    speed: 0
  };
  const updatedTelemetry = {
    ...existingVehicle,
    lat: 18.734,
    lng: 73.676,
    speed: 25,
    heading: 180,
    timestamp: Date.now()
  };
  const isAllowed = evalRtdbVehicleWrite(driverAuth, "GCV-002", existingVehicle, updatedTelemetry);
  assert(isAllowed === true, "Driver must be permitted to write legitimate telemetry for assigned vehicle");
});

test("C.4 Approved driver: modify another vehicle -> DENIED", () => {
  const driverAuth = { uid: "driver_uid_102", token: { role: "driver", vehicleId: "GCV-002" } };
  const otherVehicle = {
    vehicleId: "GCV-001",
    wardId: 1,
    routeId: "Route 1",
    currentDriver: { id: "other_driver", name: "Other Driver" },
    lat: 18.73,
    lng: 73.67
  };
  const updated = { ...otherVehicle, lat: 18.75 };
  const isAllowed = evalRtdbVehicleWrite(driverAuth, "GCV-001", otherVehicle, updated);
  assert(isAllowed === false, "Driver must NOT be able to modify another vehicle");
});

test("C.5 Approved driver: change vehicleId -> DENIED", () => {
  const driverAuth = { uid: "driver_uid_102", token: { role: "driver", vehicleId: "GCV-002" } };
  const existingVehicle = {
    vehicleId: "GCV-002",
    wardId: 2,
    routeId: "Route 4B",
    currentDriver: { id: "driver_uid_102" }
  };
  const tampered = { ...existingVehicle, vehicleId: "GCV-999" };
  const isAllowed = evalRtdbVehicleWrite(driverAuth, "GCV-002", existingVehicle, tampered);
  assert(isAllowed === false, "Driver modifying vehicleId must be denied");
});

test("C.6 Approved driver: change wardId -> DENIED", () => {
  const driverAuth = { uid: "driver_uid_102", token: { role: "driver", vehicleId: "GCV-002" } };
  const existingVehicle = {
    vehicleId: "GCV-002",
    wardId: 2,
    routeId: "Route 4B",
    currentDriver: { id: "driver_uid_102" }
  };
  const tampered = { ...existingVehicle, wardId: 5 };
  const isAllowed = evalRtdbVehicleWrite(driverAuth, "GCV-002", existingVehicle, tampered);
  assert(isAllowed === false, "Driver modifying wardId must be denied");
});

test("C.7 Approved driver: change role in profile -> DENIED", () => {
  const driverAuth = { uid: "driver_uid_102", token: { role: "driver" } };
  const existingUser = {
    name: "Ramesh Shinde",
    role: "driver",
    staffStatus: "approved",
    wardId: 2
  };
  const tampered = { ...existingUser, role: "admin" };
  const isAllowed = evalRtdbUserWrite(driverAuth, "driver_uid_102", existingUser, tampered);
  assert(isAllowed === false, "Driver modifying role in user profile must be denied");
});

// -------------------------------------------------------------
// SUITE D: APPROVED OFFICER
// -------------------------------------------------------------
console.log("\n--- TEST GROUP D: Approved Officer ---");

test("D.1 Approved officer: access Municipality Dashboard -> ALLOWED", () => {
  AuthEngine.currentUser = {
    id: "officer_uid_201",
    role: "officer",
    staffStatus: "approved",
    municipalityId: "TAL-PMC-01",
    wardId: 2
  };
  CityAssist.navigateTo('municipality');
  assert(CityAssist.currentScreen === 'municipality', `Approved officer should access municipality dashboard, was ${CityAssist.currentScreen}`);
});

test("D.2 Approved officer: access administrative audit data -> ALLOWED", () => {
  const officerAuth = { uid: "officer_uid_201", token: { role: "officer" } };
  const canRead = evalRtdbAuditLogsRead(officerAuth);
  assert(canRead === true, "Officer with proper claims should have access to audit logs");
});

test("D.3 Approved officer: change own role to admin -> DENIED", () => {
  const officerAuth = { uid: "officer_uid_201", token: { role: "officer" } };
  const existingOfficer = {
    name: "Prakash Deshmukh",
    role: "officer",
    staffStatus: "approved",
    wardId: 2,
    isAdmin: false
  };
  const tampered = {
    ...existingOfficer,
    role: "admin",
    isAdmin: true
  };
  const isAllowed = evalRtdbUserWrite(officerAuth, "officer_uid_201", existingOfficer, tampered);
  assert(isAllowed === false, "Officer cannot elevate themselves to admin");
});

// -------------------------------------------------------------
// SUITE E: PRIVILEGE ESCALATION ATTEMPTS
// -------------------------------------------------------------
console.log("\n--- TEST GROUP E: Privilege Escalation Attempts ---");

test("E.1 Citizen: attempt to modify role from client -> DENIED", () => {
  const citizenAuth = { uid: "citizen_1", token: { role: "citizen" } };
  const existingUser = { name: "Citizen A", role: "citizen", wardId: 2 };
  const tampered = { ...existingUser, role: "officer" };
  const allowed = evalRtdbUserWrite(citizenAuth, "citizen_1", existingUser, tampered);
  assert(allowed === false, "Citizen modifying role must be denied");
});

test("E.2 Citizen: attempt to set approved status from client -> DENIED", () => {
  const citizenAuth = { uid: "citizen_1", token: { role: "citizen" } };
  const existingUser = { name: "Citizen A", role: "citizen", staffStatus: "none" };
  const tampered = { ...existingUser, staffStatus: "approved" };
  const allowed = evalRtdbUserWrite(citizenAuth, "citizen_1", existingUser, tampered);
  assert(allowed === false, "Citizen modifying staffStatus must be denied");
});

test("E.3 Citizen: attempt to grant permissions from client -> DENIED", () => {
  const citizenAuth = { uid: "citizen_1", token: { role: "citizen" } };
  const existingUser = { name: "Citizen A", role: "citizen" };
  const tampered = { ...existingUser, permissions: ["staff_admin", "fleet_manage"] };
  const allowed = evalRtdbUserWrite(citizenAuth, "citizen_1", existingUser, tampered);
  assert(allowed === false, "Citizen adding permissions must be denied");
});

test("E.4 Citizen: attempt to modify wardId to hijack vehicle access -> DENIED", () => {
  const citizenAuth = { uid: "citizen_1", token: { role: "citizen" } };
  const existingUser = { name: "Citizen A", role: "citizen", wardId: 2 };
  const tampered = { ...existingUser, wardId: 1 };
  const allowed = evalRtdbUserWrite(citizenAuth, "citizen_1", existingUser, tampered);
  assert(allowed === false, "Citizen modifying wardId must be denied");
});

test("E.5 Citizen: attempt to assign municipalityId from client -> DENIED", () => {
  const citizenAuth = { uid: "citizen_1", token: { role: "citizen" } };
  const existingUser = { name: "Citizen A", role: "citizen" };
  const tampered = { ...existingUser, municipalityId: "TAL-PMC-01" };
  const allowed = evalRtdbUserWrite(citizenAuth, "citizen_1", existingUser, tampered);
  assert(allowed === false, "Citizen assigning municipalityId must be denied");
});

test("E.6 Driver: attempt to assign arbitrary fields on vehicle -> DENIED", () => {
  const driverAuth = { uid: "driver_uid_102", token: { role: "driver", vehicleId: "GCV-002" } };
  const existingVehicle = {
    vehicleId: "GCV-002",
    wardId: 2,
    routeId: "Route 4B",
    currentDriver: { id: "driver_uid_102" },
    lat: 18.73,
    lng: 73.67
  };
  const tampered = { ...existingVehicle, permissions: ["admin_override"], owner: "driver_uid_102" };
  const allowed = evalRtdbVehicleWrite(driverAuth, "GCV-002", existingVehicle, tampered);
  assert(allowed === false, "Driver injecting arbitrary vehicle fields must be denied");
});

console.log("\n======================================================================");
const passedCount = results.filter(r => r.status === 'PASS').length;
const totalCount = results.length;
console.log(`SUMMARY: ${passedCount} / ${totalCount} TESTS PASSED`);
console.log("======================================================================\n");

if (passedCount !== totalCount) {
  process.exit(1);
} else {
  process.exit(0);
}
