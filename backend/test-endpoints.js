import axios from 'axios';

// Base config
axios.defaults.baseURL = 'http://localhost:5000/api';
axios.defaults.withCredentials = true;

// Helper to simulate request tracking
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTests() {
  console.log('=== WORKER DISPATCH SYSTEM API INTEGRATION TEST ===\n');

  try {
    // 1. Check API health
    console.log('1. Checking server health...');
    const health = await axios.get('/health');
    console.log('Result:', health.data.message, '\n');

    // 2. Login as Client
    console.log('2. Logging in as Client (client1@client.com)...');
    const loginRes = await axios.post('/auth/login', {
      email: 'client1@client.com',
      password: 'client123',
    });

    const token = loginRes.data.token;
    console.log('Login successful! Client Name:', loginRes.data.user.name);

    // Save cookie for subsequent requests
    const clientAuthHeaders = {
      headers: {
        Authorization: `Bearer ${token}`
      }
    };

    // 3. Create Ticket (should trigger auto-dispatch to Ramesh Kumar (worker1) since category matches Electrical and pincode is 400001)
    console.log('\n3. Client creating a new "Electrical" ticket...');
    const ticketRes = await axios.post('/tickets/create', {
      title: 'Living room fan spark',
      category: 'Electrical',
      description: 'The fan in the living room sparks when switched to speed 3.',
      severity: 'High',
      address: '102, Shanti Niwas, MG Road',
      pincode: '400001'
    }, clientAuthHeaders);

    console.log('Ticket created successfully!');
    console.log('Ticket ID:', ticketRes.data.ticket._id);
    console.log('Auto-matched status:', ticketRes.data.matched ? 'Dispatched' : 'Pending');
    if (ticketRes.data.matched) {
      console.log('Assigned Worker:', ticketRes.data.worker.name, `(${ticketRes.data.worker.rating} ★)`);
    }

    // 4. Log in as Worker Ramesh Kumar to check assigned job feed
    console.log('\n4. Logging in as Assigned Technician (worker1@worker.com)...');
    const workerLoginRes = await axios.post('/auth/login', {
      email: 'worker1@worker.com',
      password: 'worker123'
    });

    const workerToken = workerLoginRes.data.token;
    const workerAuthHeaders = {
      headers: {
        Authorization: `Bearer ${workerToken}`
      }
    };
    console.log('Worker login successful!');

    console.log('Fetching worker jobs feed...');
    const jobsRes = await axios.get('/worker/jobs', workerAuthHeaders);
    console.log(`Active dispatches found: ${jobsRes.data.jobs.length}`);
    const myNewJob = jobsRes.data.jobs.find(j => j._id === ticketRes.data.ticket._id);
    if (myNewJob) {
      console.log(`Found my assigned job! Status: ${myNewJob.status}`);

      // 5. Worker Accepts Job
      console.log('\n5. Worker accepting the assignment...');
      const acceptRes = await axios.post(`/worker/jobs/${myNewJob._id}/accept`, {}, workerAuthHeaders);
      console.log('Job accepted! New status:', acceptRes.data.ticket.status);

      // 6. Worker Resolves Job
      console.log('\n6. Worker marking the job as Completed...');
      const resolveRes = await axios.post(`/worker/jobs/${myNewJob._id}/resolve`, {
        notes: 'Tightened the speed regulator contacts and replaced loose wires inside canopy.'
      }, workerAuthHeaders);
      console.log('Job resolved! Status is now:', resolveRes.data.ticket.status);
    } else {
      console.error('Test error: Created ticket was not found in worker feed');
    }

    console.log('\n=== INTEGRATION TESTS COMPLETED SUCCESSFULLY ===');
  } catch (error) {
    console.error('\n*** INTEGRATION TEST FAILED ***');
    console.error(error.response?.data || error.message);
  }
}

runTests();
