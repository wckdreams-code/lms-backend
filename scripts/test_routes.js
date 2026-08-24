const app = require('../app');
const request = require('supertest');

async function runTests() {
  // We can't really do an end-to-end without a valid token and database state.
  // But we can check if the routes are registered and return 401 when unauthenticated.
  console.log('Testing GET /api/v1/offline-schedules/:id');
  const resGet = await request(app).get('/api/v1/offline-schedules/123');
  console.log(`Status: ${resGet.status}`);
  if (resGet.status !== 401) {
      console.log('Test Failed: Expected 401 for unauthenticated request');
  } else {
      console.log('GET route protected and active (401).');
  }

  console.log('Testing POST /api/v1/offline-schedules');
  const resPost = await request(app).post('/api/v1/offline-schedules').send({});
  console.log(`Status: ${resPost.status}`);
  if (resPost.status !== 401) {
      console.log('Test Failed: Expected 401 for unauthenticated request');
  } else {
      console.log('POST route protected and active (401).');
  }
}

// Ensure supertest is available, if not we skip
try {
  require.resolve('supertest');
  runTests();
} catch (e) {
  console.log('Supertest not available. Skipping route tests.');
}
