const jwt = require('jsonwebtoken');

// Change these to match your actual dev environment if needed
const API_URL = 'http://localhost:4000';
const JWT_SECRET = process.env.JWT_SECRET || 'secret-key-for-local-dev';

async function runLoadTest() {
  console.log('--- Starting Concurrency Load Test ---');
  
  try {
    // 1. Get a test schedule & seat from the database via API
    console.log('Fetching schedules...');
    const schedulesRes = await fetch(`${API_URL}/schedules`);
    const schedules = await schedulesRes.json();
    
    if (schedules.length === 0) throw new Error('No schedules found');
    const scheduleId = schedules[0].id;
    
    console.log(`Fetching seats for schedule ${scheduleId}...`);
    const seatsRes = await fetch(`${API_URL}/schedules/${scheduleId}/seats`);
    const seats = await seatsRes.json();
    
    const availableSeat = seats.find(s => s.status === 'AVAILABLE');
    
    if (!availableSeat) {
      throw new Error('No available seats found to test. Please reset database or wait 5 mins.');
    }
    const seatId = availableSeat.id;
    console.log(`Target Seat for concurrency test: ${availableSeat.seatNumber} (${seatId})`);

    // 2. Generate 50 dummy JWT tokens representing 50 different concurrent users
    console.log('Generating 50 concurrent requests...');
    const requests = [];
    
    for (let i = 1; i <= 50; i++) {
      const dummyToken = jwt.sign(
        { id: `user-id-${i}`, email: `user${i}@test.com` }, 
        JWT_SECRET
      );

      // Prepare the fetch request promise but don't await it yet
      const reqPromise = fetch(`${API_URL}/schedules/${scheduleId}/seats/${seatId}/lock`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${dummyToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      requests.push(reqPromise);
    }

    // 3. Fire all 50 requests at the exact same time
    const startTime = Date.now();
    const responses = await Promise.all(requests);
    const duration = Date.now() - startTime;
    
    // 4. Analyze results
    let successCount = 0;
    let conflictCount = 0;
    let otherErrors = 0;
    
    for (let i = 0; i < responses.length; i++) {
      const res = responses[i];
      if (res.status === 200) {
        successCount++;
        console.log(`[Request ${i + 1}] WON THE RACE! Seat locked successfully.`);
      } else if (res.status === 409) {
        conflictCount++;
      } else {
        otherErrors++;
        const data = await res.json();
        console.log(`[Request ${i + 1}] Other Error: ${res.status} - ${JSON.stringify(data)}`);
      }
    }

    console.log('\n--- Load Test Results ---');
    console.log(`Total Requests Sent : 50`);
    console.log(`Time Taken          : ${duration}ms`);
    console.log(`Successful Locks    : ${successCount}`);
    console.log(`Concurrency Blocked : ${conflictCount} (HTTP 409 Conflict)`);
    console.log(`Other Errors        : ${otherErrors}`);
    
    if (successCount === 1 && conflictCount === 49) {
      console.log('\n✅ TEST PASSED: Concurrency handled perfectly. Only exactly 1 user got the seat.');
    } else {
      console.log('\n❌ TEST FAILED: Race condition detected or something else went wrong.');
    }
    
  } catch (error) {
    console.error('Test script crashed:', error.message);
  }
}

runLoadTest();
