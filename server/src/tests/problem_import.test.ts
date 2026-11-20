import app from '../app';

async function run() {
  console.log('--- Starting Problem Import Verification Tests ---');
  await app.ready();

  // 1. Register a test user
  const testEmail = `tester_prob_${Date.now()}@codev.dev`;
  const testUser = {
    username: `tester_${Date.now().toString().slice(-5)}`,
    email: testEmail,
    password: 'password123',
  };

  const regRes = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: testUser,
  });

  const cookies = regRes.cookies;
  const cookieHeader = cookies
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  // 2. Test LeetCode Import: two-sum
  console.log('\n[TEST 1] Testing LeetCode problem import (two-sum)...');
  const lcRes = await app.inject({
    method: 'POST',
    url: '/problems/import',
    headers: { cookie: cookieHeader },
    payload: {
      urlOrId: 'https://leetcode.com/problems/two-sum/',
      platform: 'LEETCODE',
    },
  });

  console.log('LeetCode Import Status:', lcRes.statusCode);
  const lcBody = JSON.parse(lcRes.body);
  if (lcRes.statusCode !== 200 || !lcBody.problem) {
    console.error('Failed to import LeetCode problem:', lcRes.body);
    process.exit(1);
  }
  console.log('✓ LeetCode Title:', lcBody.problem.title);
  console.log('✓ LeetCode Difficulty:', lcBody.problem.difficulty);
  console.log('✓ LeetCode Sample Input:', lcBody.problem.sampleInput);

  // 3. Test Codeforces Import: 2290/H (Extra Road from user reference)
  console.log('\n[TEST 2] Testing Codeforces problem import (2290/H)...');
  const cfRes = await app.inject({
    method: 'POST',
    url: '/problems/import',
    headers: { cookie: cookieHeader },
    payload: {
      urlOrId: '2290/H',
      platform: 'CODEFORCES',
    },
  });

  console.log('Codeforces Import Status:', cfRes.statusCode);
  const cfBody = JSON.parse(cfRes.body);
  if (cfRes.statusCode !== 200 || !cfBody.problem) {
    console.error('Failed to import Codeforces problem:', cfRes.body);
    process.exit(1);
  }
  console.log('✓ Codeforces Title:', cfBody.problem.title);
  console.log('✓ Codeforces Tags:', cfBody.problem.tags);
  console.log('✓ Codeforces Time Limit:', cfBody.problem.timeLimit);
  console.log('✓ Codeforces Memory Limit:', cfBody.problem.memoryLimit);

  console.log('\n--- ALL PROBLEM IMPORT TESTS PASSED SUCCESSFULLY! ---');
  process.exit(0);
}

run().catch((err) => {
  console.error('Unhandled test failure:', err);
  process.exit(1);
});
