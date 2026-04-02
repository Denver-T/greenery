// Test data factories.
// Each factory returns a valid default that can be selectively overridden.

function employee(overrides = {}) {
  return {
    id: 1,
    name: "Test Tech",
    role: "Technician",
    email: "tech@greenery.test",
    phone: "555-123-4567",
    status: "Active",
    permissionLevel: "Technician",
    created_at: new Date("2025-01-01"),
    updated_at: new Date("2025-01-01"),
    ...overrides,
  };
}

function workReqRow(overrides = {}) {
  return {
    id: 1,
    actionRequired: "Replace fern in lobby",
    status: "assigned",
    assignedTo: 1,
    dueDate: "2025-06-01",
    notes: null,
    account: "Acme Corp",
    location: "Building A",
    referenceNumber: "REQ-001",
    requestDate: "2025-01-15",
    created_at: new Date("2025-01-15"),
    updated_at: new Date("2025-01-15"),
    ...overrides,
  };
}

function plantGroupRow(overrides = {}) {
  return {
    id: 1,
    name: "Fern",
    location: "Lobby",
    image_url: null,
    cost_per_unit: "12.50",
    quantity: 3,
    created_at: new Date("2025-01-01"),
    updated_at: new Date("2025-01-01"),
    ...overrides,
  };
}

function authenticatedUser(overrides = {}) {
  return {
    uid: "firebase-uid-1",
    email: "tech@greenery.test",
    employeeId: 1,
    role: "Technician",
    permissionLevel: "Technician",
    employee: employee(),
    claims: { uid: "firebase-uid-1", email: "tech@greenery.test" },
    ...overrides,
  };
}

function firebaseDecodedToken(overrides = {}) {
  return {
    uid: "firebase-uid-1",
    email: "tech@greenery.test",
    aud: "test-project",
    iss: "https://securetoken.google.com/test-project",
    ...overrides,
  };
}

module.exports = {
  employee,
  workReqRow,
  plantGroupRow,
  authenticatedUser,
  firebaseDecodedToken,
};
