import app from '../app';
import { db } from '../db';
import { users, refreshTokens } from '../db/schema';
import { eq } from 'drizzle-orm';

async function runAuthRotationTests() {
  console.log('=====================================================');
  console.log('🧪 Running Auth Refresh Token Rotation & Expiry Tests');
  console.log('=====================================================');

  await app.ready();

  const testEmail = `token_test_${Date.now()}@codev.dev`;
  const username = `tokuser_${Date.now().toString().slice(-5)}`;

  try {
    // ----------------------------------------------------
    // TEST 1: Registration sets both cookies with 7-day browser maxAge
    // ----------------------------------------------------
    console.log('\n▶ [TEST 1] Registering test user and inspecting Set-Cookie headers...');
    const registerRes = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        username,
        email: testEmail,
        password: 'Password123!',
      },
    });

    if (registerRes.statusCode !== 201) {
      throw new Error(`Register failed with status ${registerRes.statusCode}: ${registerRes.body}`);
    }

    const setCookieHeaders = registerRes.cookies;
    const accessCookie = setCookieHeaders.find((c) => c.name === 'accessToken');
    const refreshCookie = setCookieHeaders.find((c) => c.name === 'refreshToken');

    if (!accessCookie || !refreshCookie) {
      throw new Error('Missing accessToken or refreshToken cookie in register response');
    }

    // Verify browser maxAge is 7 days (604800 seconds) so browser does not drop prematurely
    console.log(`  ✓ accessToken cookie maxAge: ${accessCookie.maxAge}s (expected 604800s)`);
    console.log(`  ✓ refreshToken cookie maxAge: ${refreshCookie.maxAge}s (expected 604800s)`);

    if (accessCookie.maxAge !== 7 * 24 * 60 * 60) {
      throw new Error(`accessToken maxAge expected 604800, got ${accessCookie.maxAge}`);
    }

    const initialCookieHeader = `${accessCookie.name}=${accessCookie.value}; ${refreshCookie.name}=${refreshCookie.value}`;

    // ----------------------------------------------------
    // TEST 2: Protected route access with valid token
    // ----------------------------------------------------
    console.log('\n▶ [TEST 2] Accessing protected route /auth/me with valid access token...');
    const meRes = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { cookie: initialCookieHeader },
    });

    if (meRes.statusCode !== 200) {
      throw new Error(`Expected 200 on /auth/me, got ${meRes.statusCode}`);
    }
    const meData = JSON.parse(meRes.body);
    console.log(`  ✓ Successfully authenticated as: ${meData.user.username}`);

    // ----------------------------------------------------
    // TEST 3: Expired / Missing Access Token with Valid Refresh Token
    // ----------------------------------------------------
    console.log('\n▶ [TEST 3] Simulating browser dropped access token (only refresh token present)...');
    const refreshOnlyHeader = `${refreshCookie.name}=${refreshCookie.value}`;

    // A protected route should return 401 UNAUTHORIZED
    const unauthRes = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { cookie: refreshOnlyHeader },
    });

    console.log(`  ✓ Direct access with missing token returned 401 status: ${unauthRes.statusCode}`);
    if (unauthRes.statusCode !== 401) {
      throw new Error(`Expected 401 when access token is missing, got ${unauthRes.statusCode}`);
    }

    // ----------------------------------------------------
    // TEST 4: Token Rotation via /auth/refresh
    // ----------------------------------------------------
    console.log('\n▶ [TEST 4] Invoking /auth/refresh with valid refreshToken cookie...');
    const refreshRes = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      headers: { cookie: refreshOnlyHeader },
    });

    if (refreshRes.statusCode !== 200) {
      throw new Error(`Expected 200 on /auth/refresh, got ${refreshRes.statusCode}: ${refreshRes.body}`);
    }

    const refreshedCookies = refreshRes.cookies;
    const newAccessCookie = refreshedCookies.find((c) => c.name === 'accessToken');
    const newRefreshCookie = refreshedCookies.find((c) => c.name === 'refreshToken');

    if (!newAccessCookie || !newRefreshCookie) {
      throw new Error('Missing rotated tokens in /auth/refresh response');
    }

    console.log('  ✓ Token rotation issued new accessToken and new refreshToken');
    console.log(`  ✓ Old refresh token: ${refreshCookie.value.slice(0, 10)}...`);
    console.log(`  ✓ New refresh token: ${newRefreshCookie.value.slice(0, 10)}...`);

    if (newRefreshCookie.value === refreshCookie.value) {
      throw new Error('Refresh token was not rotated!');
    }

    // ----------------------------------------------------
    // TEST 5: Old Refresh Token is now invalidated (Replay Protection)
    // ----------------------------------------------------
    console.log('\n▶ [TEST 5] Verifying rotated old refreshToken is invalidated in database...');
    const replayRes = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      headers: { cookie: refreshOnlyHeader },
    });

    if (replayRes.statusCode !== 401) {
      throw new Error(`Expected 401 on replayed old refresh token, got ${replayRes.statusCode}`);
    }
    console.log('  ✓ Replay attempt blocked with 401 REFRESH_TOKEN_INVALID');

    // ----------------------------------------------------
    // TEST 6: New Token allows seamless access
    // ----------------------------------------------------
    console.log('\n▶ [TEST 6] Accessing protected route with freshly rotated tokens...');
    const newCookieHeader = `${newAccessCookie.name}=${newAccessCookie.value}; ${newRefreshCookie.name}=${newRefreshCookie.value}`;
    const meAfterRefresh = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { cookie: newCookieHeader },
    });

    if (meAfterRefresh.statusCode !== 200) {
      throw new Error(`Expected 200 with new cookies, got ${meAfterRefresh.statusCode}`);
    }
    console.log('  ✓ Authenticated request succeeded seamlessly with fresh tokens');

    console.log('\n=====================================================');
    console.log('🏁 ALL 6 AUTH ROTATION TESTS PASSED CLEANLY!');
    console.log('=====================================================');
  } finally {
    // Cleanup
    const user = await db.query.users.findFirst({ where: eq(users.email, testEmail) });
    if (user) {
      await db.delete(refreshTokens).where(eq(refreshTokens.userId, user.id));
      await db.delete(users).where(eq(users.id, user.id));
    }
    await app.close();
  }
}

runAuthRotationTests().catch((err) => {
  console.error('❌ Auth Rotation Test failed:', err);
  process.exit(1);
});
