const http = require('http');

// Helper para hacer requests HTTP
function makeRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body.length > 0 ? JSON.parse(body) : null
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function test() {
  console.log('\n=== Testing Auth Flow ===\n');

  try {
    // Test 1: Login
    console.log('1️⃣ Testing POST /api/auth/login...');
    const loginRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      email: 'urriagac44@gmail.com',
      password: 'Cesar2206'
    });

    console.log(`Status: ${loginRes.status}`);
    console.log('Response:', JSON.stringify(loginRes.body, null, 2));

    if (loginRes.status !== 201 || !loginRes.body?.data?.access_token) {
      console.error('❌ Login failed! Status:', loginRes.status);
      console.error('Response:', loginRes.body);
      return;
    }

    const token = loginRes.body.data.access_token;
    console.log('✅ Login successful! Token:', token.substring(0, 20) + '...\n');

    // Test 2: Get /auth/me
    console.log('2️⃣ Testing GET /api/auth/me...');
    const meRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/me',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`Status: ${meRes.status}`);
    console.log('Response:', JSON.stringify(meRes.body, null, 2));

    if (meRes.status === 200) {
      console.log('✅ /auth/me endpoint works!\n');
    } else {
      console.error('❌ /auth/me failed with status:', meRes.status);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
