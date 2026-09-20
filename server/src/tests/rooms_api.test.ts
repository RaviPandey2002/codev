import app from '../app';
import { db } from '../db';
import { users, rooms, roomMembers, roomFiles } from '../db/schema';
import { eq } from 'drizzle-orm';


async function run() {
  console.log('--- Starting Room APIs Verification ---');
  await app.ready();

  // 1. Register a test user
  const testEmail = `tester_${Date.now()}@codev.dev`;
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

  console.log('Register Status:', regRes.statusCode);
  if (regRes.statusCode !== 201) {
    console.error('Register failed:', regRes.body);
    process.exit(1);
  }

  const cookies = regRes.cookies;
  const cookieHeader = cookies
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  // 2. Create a room (TypeScript Scratchpad)
  const createRes = await app.inject({
    method: 'POST',
    url: '/rooms',
    headers: {
      cookie: cookieHeader,
    },
    payload: {
      name: 'Algorithm Challenges',
      description: 'Daily leetcode & codeforces prep',
      template: 'typescript',
      sourceType: 'SCRATCHPAD',
    },
  });

  console.log('Create Room Status:', createRes.statusCode);
  const createdBody = JSON.parse(createRes.body);
  console.log('Created Room:', createdBody);
  const roomId = createdBody.room.id;

  if (createRes.statusCode !== 201 || !roomId) {
    console.error('Failed to create room!');
    process.exit(1);
  }

  // 3. List rooms for user
  const listRes = await app.inject({
    method: 'GET',
    url: '/rooms',
    headers: {
      cookie: cookieHeader,
    },
  });

  console.log('List Rooms Status:', listRes.statusCode);
  const listBody = JSON.parse(listRes.body);
  console.log('User Rooms Count:', listBody.rooms.length);
  if (listBody.rooms.length === 0 || listBody.rooms[0].id !== roomId) {
    console.error('Room not found in user list!');
    process.exit(1);
  }

  // 4. Get room details & files
  const detailsRes = await app.inject({
    method: 'GET',
    url: `/rooms/${roomId}`,
    headers: {
      cookie: cookieHeader,
    },
  });

  console.log('Get Room Details Status:', detailsRes.statusCode);
  const detailsBody = JSON.parse(detailsRes.body);
  console.log('Room Details Role:', detailsBody.userRole);
  console.log('Room Files Count:', detailsBody.files.length);
  console.log('Seeded File Path:', detailsBody.files[0]?.path);

  // 5. Register a second user and join the room
  const secondUser = {
    username: `peer_${Date.now().toString().slice(-5)}`,
    email: `peer_${Date.now()}@codev.dev`,
    password: 'password123',
  };

  const regPeerRes = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: secondUser,
  });

  const peerCookies = regPeerRes.cookies
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  const joinRes = await app.inject({
    method: 'POST',
    url: `/rooms/${roomId}/join`,
    headers: {
      cookie: peerCookies,
    },
  });

  console.log('Peer Join Status:', joinRes.statusCode);
  const joinBody = JSON.parse(joinRes.body);
  console.log('Peer Role in Room:', joinBody.room.role);

  if (joinBody.room.role !== 'EDITOR') {
    console.error('Expected peer role to be EDITOR!');
    process.exit(1);
  }

  // 6. Test Compiler Room Creation (C++)
  const createCpRes = await app.inject({
    method: 'POST',
    url: '/rooms',
    headers: {
      cookie: cookieHeader,
    },
    payload: {
      name: 'Codeforces Round 999 Prep',
      template: 'cpp',
      sourceType: 'COMPILER',
    },
  });

  console.log('Create CP Room Status:', createCpRes.statusCode);
  const cpBody = JSON.parse(createCpRes.body);
  console.log('CP Room Code:', cpBody.room.id);
  console.log('CP Room SourceType:', cpBody.room.sourceType);

  const cpDetailsRes = await app.inject({
    method: 'GET',
    url: `/rooms/${cpBody.room.id}`,
    headers: {
      cookie: cookieHeader,
    },
  });
  const cpDetails = JSON.parse(cpDetailsRes.body);
  console.log('CP Seeded File:', cpDetails.files[0]?.path);

  console.log('--- ALL ROOM API TESTS PASSED SUCCESSFULLY! ---');

  // Clean up test data
  await db.delete(rooms).where(eq(rooms.id, roomId));
  await db.delete(rooms).where(eq(rooms.id, cpBody.room.id));
  await db.delete(users).where(eq(users.email, testEmail));
  await db.delete(users).where(eq(users.email, secondUser.email));

  process.exit(0);
}

run().catch((err) => {
  console.error('Verification error:', err);
  process.exit(1);
});
