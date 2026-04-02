// Global test setup — runs before each test file via setupFilesAfterEnv.
// Sets fake environment variables and configures mock cleanup.

process.env.DB_HOST = "localhost";
process.env.DB_PORT = "3306";
process.env.DB_USER = "test_user";
process.env.DB_PASSWORD = "test_pass";
process.env.DB_NAME = "greenery_test";
process.env.FIREBASE_PROJECT_ID = "test-project";
process.env.FIREBASE_CLIENT_EMAIL = "test@test.iam.gserviceaccount.com";
process.env.FIREBASE_PRIVATE_KEY =
  "-----BEGIN RSA PRIVATE KEY-----\nfake\n-----END RSA PRIVATE KEY-----\n";

// Disable rate limiting in tests
process.env.RATE_LIMIT_LOGIN_MAX = "99999";
process.env.RATE_LIMIT_WRITE_MAX = "99999";

afterEach(() => {
  jest.restoreAllMocks();
});
