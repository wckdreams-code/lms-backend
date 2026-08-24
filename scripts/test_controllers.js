const offlineScheduleController = require('../controllers/offlineScheduleController');
const offlineScheduleModel = require('../models/offlineScheduleModel');
const supabase = require('../config/supabase');

// Mock helpers
function mockRes() {
  const res = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    }
  };
  return res;
}

async function testCreate() {
  console.log('--- Testing Create Controller Function ---');
  
  // Save original functions
  const originalMaybeSingle = supabase.from;
  const originalCreateSchedule = offlineScheduleModel.createSchedule;

  // Mock Supabase to simulate a registration
  supabase.from = (table) => {
    if (table === 'offline_registrations') {
      return {
        select() {
          return {
            eq() {
              return {
                async maybeSingle() {
                  return {
                    data: {
                      id: 'some-registration-id',
                      course: { delivery_type: 'Offline' }
                    },
                    error: null
                  };
                }
              };
            }
          };
        }
      };
    }
    return originalMaybeSingle.apply(supabase, [table]);
  };

  // Mock Model Create
  offlineScheduleModel.createSchedule = async (data) => {
    return {
      id: 'mocked-schedule-id',
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  };

  const req = {
    body: {
      offline_registration_id: 'some-registration-id',
      teacher_id: 'some-teacher-id',
      day: 'Senin',
      start_time: '10:00:00',
      end_time: '12:00:00',
      location: 'LPIA Wisma Asri',
      notes: 'Please bring a notebook.'
    }
  };

  const res = mockRes();

  try {
    await offlineScheduleController.create(req, res);
    console.log('Response status:', res.statusCode);
    console.log('Response body:', JSON.stringify(res.body, null, 2));
    if (res.statusCode === 201 && res.body.status === 'success') {
      console.log('Test Create: SUCCESS');
    } else {
      console.log('Test Create: FAILED');
    }
  } catch (error) {
    console.error('Test Create encountered error:', error);
  } finally {
    // Restore
    supabase.from = originalMaybeSingle;
    offlineScheduleModel.createSchedule = originalCreateSchedule;
  }
}

async function testGet() {
  console.log('\n--- Testing Get Controller Function ---');

  const originalGetScheduleByRegistrationId = offlineScheduleModel.getScheduleByRegistrationId;

  offlineScheduleModel.getScheduleByRegistrationId = async (id) => {
    return {
      id: 'mocked-schedule-id',
      offline_registration_id: id,
      teacher_id: 'some-teacher-id',
      day: 'Senin',
      start_time: '10:00:00',
      end_time: '12:00:00',
      location: 'LPIA Wisma Asri',
      notes: 'Please bring a notebook.',
      status: 'confirmed'
    };
  };

  const req = {
    params: {
      registrationId: 'some-registration-id'
    }
  };

  const res = mockRes();

  try {
    await offlineScheduleController.getByRegistrationId(req, res);
    console.log('Response status:', res.statusCode);
    console.log('Response body:', JSON.stringify(res.body, null, 2));
    if (res.statusCode === 200 && res.body.status === 'success') {
      console.log('Test Get: SUCCESS');
    } else {
      console.log('Test Get: FAILED');
    }
  } catch (error) {
    console.error('Test Get encountered error:', error);
  } finally {
    offlineScheduleModel.getScheduleByRegistrationId = originalGetScheduleByRegistrationId;
  }
}

async function runAll() {
  await testCreate();
  await testGet();
}

runAll();
