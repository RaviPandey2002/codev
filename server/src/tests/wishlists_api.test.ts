import assert from 'node:assert/strict';
import { eq, inArray } from 'drizzle-orm';
import app from '../app';
import { db } from '../db';
import { rooms, savedProblems, users, wishlists } from '../db/schema';

function extractCookieHeader(cookies: Array<{ name: string; value: string }>): string {
  return cookies.map((c) => `${c.name}=${c.value}`).join('; ');
}

async function registerTestUser(suffix: string) {
  const email = `wishlist_test_${suffix}_${Date.now()}@codev.dev`;
  const username = `wl_${suffix}_${Date.now().toString().slice(-5)}`;
  const res = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { username, email, password: 'Password123!' },
  });
  assert.equal(res.statusCode, 201, `Register failed: ${res.body}`);
  const parsed = JSON.parse(res.body);
  return {
    id: parsed.user.id as string,
    username,
    email,
    cookie: extractCookieHeader(res.cookies),
  };
}

async function run() {
  console.log('--- Starting Wishlists API Integration Tests ---');
  await app.ready();

  const createdUserIds: string[] = [];
  const createdRoomIds: string[] = [];
  const canonicalKeysToCleanup = ['leetcode:wishlist-test-two-sum', 'codeforces:999999/H'];

  try {
    // 1. Register two users (Owner A and Collaborator B)
    const userA = await registerTestUser('a');
    const userB = await registerTestUser('b');
    createdUserIds.push(userA.id, userB.id);

    // 2. User A creates a CP Arena room and invites/adds User B
    const createRoomRes = await app.inject({
      method: 'POST',
      url: '/rooms',
      headers: { cookie: userA.cookie },
      payload: {
        name: 'Wishlist Test Room',
        sourceType: 'COMPILER',
        arenaPlatform: 'LEETCODE',
        isPrivate: true,
      },
    });
    assert.equal(createRoomRes.statusCode, 201, createRoomRes.body);
    const roomId = JSON.parse(createRoomRes.body).room.id as string;
    createdRoomIds.push(roomId);

    const inviteRes = await app.inject({
      method: 'POST',
      url: `/rooms/${roomId}/members`,
      headers: { cookie: userA.cookie },
      payload: { identifier: userB.username, role: 'EDITOR' },
    });
    assert.equal(inviteRes.statusCode, 201, inviteRes.body);

    // 3. User A creates a PRIVATE folder and a ROOM-shared folder
    const privRes = await app.inject({
      method: 'POST',
      url: '/wishlists',
      headers: { cookie: userA.cookie },
      payload: {
        name: 'My Private DP',
        description: 'Hidden personal prep',
        visibility: 'PRIVATE',
      },
    });
    assert.equal(privRes.statusCode, 201, privRes.body);
    const privWishlistId = JSON.parse(privRes.body).wishlist.id as string;

    const sharedRes = await app.inject({
      method: 'POST',
      url: '/wishlists',
      headers: { cookie: userA.cookie },
      payload: {
        name: 'Team Practice Pack',
        description: 'Shared with room peers',
        visibility: 'ROOM',
        roomId,
      },
    });
    assert.equal(sharedRes.statusCode, 201, sharedRes.body);
    const sharedWishlistId = JSON.parse(sharedRes.body).wishlist.id as string;

    // 4. Add a problem payload (stub first, then richer statement) to verify deduplication & upgrade
    const twoSumStub = {
      title: '1. Test Two Sum',
      platform: 'LEETCODE',
      url: 'https://leetcode.com/problems/wishlist-test-two-sum/',
      difficulty: 'Easy',
      sampleCases: [{ input: '[2,7,11,15]\n9', output: '[0,1]' }],
      description: 'Imported from curated wishlist: Top Interview Classics',
    };

    const addPrivRes = await app.inject({
      method: 'POST',
      url: `/wishlists/${privWishlistId}/items`,
      headers: { cookie: userA.cookie },
      payload: { problem: twoSumStub },
    });
    assert.equal(addPrivRes.statusCode, 201, addPrivRes.body);
    const addPrivData = JSON.parse(addPrivRes.body);
    assert.equal(addPrivData.alreadyExists, false);
    assert.equal(addPrivData.item.canonicalKey, 'leetcode:wishlist-test-two-sum');

    // Duplicate add inside same folder returns alreadyExists: true
    const dupRes = await app.inject({
      method: 'POST',
      url: `/wishlists/${privWishlistId}/items`,
      headers: { cookie: userA.cookie },
      payload: { problem: twoSumStub },
    });
    assert.equal(dupRes.statusCode, 200, dupRes.body);
    assert.equal(JSON.parse(dupRes.body).alreadyExists, true);

    // Richer Two Sum payload added to shared folder should upgrade cached description without creating duplicate saved_problems row
    const twoSumRich = {
      ...twoSumStub,
      description: '<p>Given an array of integers nums and an integer target, return indices...</p>',
      codeSnippets: [
        { lang: 'C++', langSlug: 'cpp', code: 'class Solution {};' },
      ],
    };
    const addSharedRes = await app.inject({
      method: 'POST',
      url: `/wishlists/${sharedWishlistId}/items`,
      headers: { cookie: userA.cookie },
      payload: { problem: twoSumRich },
    });
    assert.equal(addSharedRes.statusCode, 201, addSharedRes.body);

    // Verify canonical deduplication in saved_problems
    const cachedTwoSums = await db
      .select()
      .from(savedProblems)
      .where(eq(savedProblems.canonicalKey, 'leetcode:wishlist-test-two-sum'));
    assert.equal(cachedTwoSums.length, 1, 'saved_problems must deduplicate by canonicalKey');
    assert.ok(
      cachedTwoSums[0].description?.includes('Given an array of integers'),
      'saved_problems should retain richer description'
    );

    // 5. Verify access control for Collaborator User B
    const listBRes = await app.inject({
      method: 'GET',
      url: `/wishlists?roomId=${roomId}`,
      headers: { cookie: userB.cookie },
    });
    assert.equal(listBRes.statusCode, 200, listBRes.body);
    const listB = JSON.parse(listBRes.body).wishlists as Array<any>;
    assert.equal(listB.some((w) => w.id === privWishlistId), false, 'User B must not see User A private wishlist');
    assert.equal(listB.some((w) => w.id === sharedWishlistId), true, 'User B must see room-shared wishlist');

    const getPrivBRes = await app.inject({
      method: 'GET',
      url: `/wishlists/${privWishlistId}`,
      headers: { cookie: userB.cookie },
    });
    assert.equal(getPrivBRes.statusCode, 403, 'User B must get 403 on User A private folder');

    // User B (EDITOR in room) can add a Codeforces problem payload to the room-shared folder
    const cfAddBRes = await app.inject({
      method: 'POST',
      url: `/wishlists/${sharedWishlistId}/items`,
      headers: { cookie: userB.cookie },
      payload: {
        problem: {
          title: 'H. Test Problem',
          platform: 'CODEFORCES',
          contestId: 999999,
          index: 'H',
          url: 'https://codeforces.com/contest/999999/problem/H',
          sampleCases: [{ input: '3\n1 2 3', output: '6' }],
        },
      },
    });
    assert.equal(cfAddBRes.statusCode, 201, cfAddBRes.body);
    const cfItemId = JSON.parse(cfAddBRes.body).item.id as string;

    // User B cannot delete User A's folder even when shared
    const delByBRes = await app.inject({
      method: 'DELETE',
      url: `/wishlists/${sharedWishlistId}`,
      headers: { cookie: userB.cookie },
    });
    assert.equal(delByBRes.statusCode, 403, 'Only owner can delete folder');

    // 6. Test detail endpoint & item removal (both by itemId and by canonicalKey)
    const detailRes = await app.inject({
      method: 'GET',
      url: `/wishlists/${sharedWishlistId}`,
      headers: { cookie: userA.cookie },
    });
    assert.equal(detailRes.statusCode, 200, detailRes.body);
    const detail = JSON.parse(detailRes.body).wishlist;
    assert.equal(detail.items.length, 2);

    const removeByIdRes = await app.inject({
      method: 'DELETE',
      url: `/wishlists/${sharedWishlistId}/items/${cfItemId}`,
      headers: { cookie: userA.cookie },
    });
    assert.equal(removeByIdRes.statusCode, 200, removeByIdRes.body);

    const removeByKeyRes = await app.inject({
      method: 'DELETE',
      url: `/wishlists/${privWishlistId}/items?canonicalKey=${encodeURIComponent('leetcode:wishlist-test-two-sum')}`,
      headers: { cookie: userA.cookie },
    });
    assert.equal(removeByKeyRes.statusCode, 200, removeByKeyRes.body);

    const detailPrivAfter = await app.inject({
      method: 'GET',
      url: `/wishlists/${privWishlistId}`,
      headers: { cookie: userA.cookie },
    });
    assert.equal(JSON.parse(detailPrivAfter.body).wishlist.items.length, 0);

    // 7. Test bulk add (including duplicate entry inside same batch & nullable fields)
    const bulkRes = await app.inject({
      method: 'POST',
      url: `/wishlists/${privWishlistId}/items/bulk`,
      headers: { cookie: userA.cookie },
      payload: {
        items: [
          {
            problem: {
              ...twoSumStub,
              description: null,
              difficulty: null,
              sampleCases: [{ input: '1', output: null }],
            },
          },
          {
            problem: {
              ...twoSumStub,
            },
          },
          {
            problem: {
              title: 'H. Test Problem',
              platform: 'CODEFORCES',
              contestId: 999999,
              index: 'H',
              url: 'https://codeforces.com/contest/999999/problem/H',
              sampleCases: [{ input: '3\n1 2 3', output: '6' }],
            },
          },
        ],
      },
    });
    assert.equal(bulkRes.statusCode, 201, bulkRes.body);
    assert.equal(JSON.parse(bulkRes.body).addedCount, 2, 'Bulk add should deduplicate within batch');

    console.log('✅ All Wishlists API tests passed!');
  } finally {
    // Cleanup test fixtures cleanly
    if (createdUserIds.length > 0) {
      await db.delete(wishlists).where(inArray(wishlists.ownerId, createdUserIds));
    }
    if (createdRoomIds.length > 0) {
      await db.delete(rooms).where(inArray(rooms.id, createdRoomIds));
    }
    await db
      .delete(savedProblems)
      .where(inArray(savedProblems.canonicalKey, canonicalKeysToCleanup));
    if (createdUserIds.length > 0) {
      await db.delete(users).where(inArray(users.id, createdUserIds));
    }
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Wishlists API test failed:', err);
    process.exit(1);
  });
