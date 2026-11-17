import app from '../app';
import { db } from '../db';
import { users, rooms } from '../db/schema';
import { eq } from 'drizzle-orm';
import { roomHub } from '../websocket/room_hub';

async function runSecurityTests() {
  console.log('=== Starting Phase 1 Security Verification Tests ===');
  await app.ready();

  const cleanupEmails: string[] = [];
  const cleanupRoomIds: string[] = [];

  try {
    // ----------------------------------------------------
    // TEST 1: Private Workspace Access Control
    // ----------------------------------------------------
    console.log('\n[TEST 1] Testing Private Workspace Authorization...');

    // 1.1 Register Owner
    const ownerEmail = `sec_owner_${Date.now()}@codev.dev`;
    cleanupEmails.push(ownerEmail);
    const ownerRes = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        username: `owner_${Date.now().toString().slice(-5)}`,
        email: ownerEmail,
        password: 'password123',
      },
    });
    if (ownerRes.statusCode !== 201) throw new Error('Failed to register owner');
    const ownerCookie = ownerRes.cookies.map((c) => `${c.name}=${c.value}`).join('; ');

    // 1.2 Owner creates PRIVATE workspace
    const privateRoomRes = await app.inject({
      method: 'POST',
      url: '/rooms',
      headers: { cookie: ownerCookie },
      payload: {
        name: 'Secret Vault',
        description: 'Private algorithm research',
        template: 'cpp',
        sourceType: 'COMPILER',
        isPrivate: true,
      },
    });
    if (privateRoomRes.statusCode !== 201) throw new Error('Failed to create private room');
    const privateRoomId = JSON.parse(privateRoomRes.body).room.id;
    cleanupRoomIds.push(privateRoomId);
    console.log('✓ Created Private Workspace:', privateRoomId);

    // 1.3 Register Attacker / External User
    const attackerEmail = `sec_intruder_${Date.now()}@codev.dev`;
    cleanupEmails.push(attackerEmail);
    const attackerRes = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        username: `intruder_${Date.now().toString().slice(-5)}`,
        email: attackerEmail,
        password: 'password123',
      },
    });
    if (attackerRes.statusCode !== 201) throw new Error('Failed to register attacker');
    const attackerCookie = attackerRes.cookies.map((c) => `${c.name}=${c.value}`).join('; ');

    // 1.4 Attacker attempts to query private workspace details -> Expected: 403 Forbidden
    const unauthDetailsRes = await app.inject({
      method: 'GET',
      url: `/rooms/${privateRoomId}`,
      headers: { cookie: attackerCookie },
    });
    console.log('• Attacker GET Private Room Status:', unauthDetailsRes.statusCode);
    if (unauthDetailsRes.statusCode !== 403) {
      throw new Error(`Expected 403 on private room query, got ${unauthDetailsRes.statusCode}`);
    }
    console.log('✓ Private workspace details query properly blocked (403 Forbidden)');

    // 1.5 Attacker attempts to bypass and JOIN private workspace -> Expected: 403 Forbidden
    const unauthJoinRes = await app.inject({
      method: 'POST',
      url: `/rooms/${privateRoomId}/join`,
      headers: { cookie: attackerCookie },
    });
    console.log('• Attacker POST Join Private Room Status:', unauthJoinRes.statusCode);
    if (unauthJoinRes.statusCode !== 403) {
      throw new Error(`Expected 403 on private room join, got ${unauthJoinRes.statusCode}`);
    }
    console.log('✓ Private workspace direct join attempt properly blocked (403 Forbidden)');

    // 1.6 Owner explicitly invites user to the private room
    const attackerData = JSON.parse(attackerRes.body).user;
    const inviteRes = await app.inject({
      method: 'POST',
      url: `/rooms/${privateRoomId}/members`,
      headers: { cookie: ownerCookie },
      payload: {
        identifier: attackerData.username,
        role: 'EDITOR',
      },
    });
    if (inviteRes.statusCode !== 201) {
      throw new Error(`Expected 201 on member invite, got ${inviteRes.statusCode}`);
    }
    console.log('✓ Owner invited collaborator to private room successfully');

    // 1.7 Collaborator now queries private workspace details -> Expected: 200 OK
    const authDetailsRes = await app.inject({
      method: 'GET',
      url: `/rooms/${privateRoomId}`,
      headers: { cookie: attackerCookie },
    });
    if (authDetailsRes.statusCode !== 200) {
      throw new Error(`Expected 200 on authorized private room query, got ${authDetailsRes.statusCode}`);
    }
    console.log('✓ Invited collaborator now has access to private room (200 OK)');

    // 1.8 Collaborator lists members -> Expected: 200 OK with owner and member
    const membersListRes = await app.inject({
      method: 'GET',
      url: `/rooms/${privateRoomId}/members`,
      headers: { cookie: attackerCookie },
    });
    const membersList = JSON.parse(membersListRes.body);
    const nonOwnerMembers = membersList.members.filter(
      (m: any) => m.userId !== membersList.owner.userId
    );
    if (membersListRes.statusCode !== 200 || nonOwnerMembers.length !== 1) {
      throw new Error('Failed to list workspace members');
    }
    console.log('✓ Workspace members listed successfully');

    // 1.9 Owner removes collaborator -> Expected: 200 OK
    const removeMemberRes = await app.inject({
      method: 'DELETE',
      url: `/rooms/${privateRoomId}/members/${attackerData.id}`,
      headers: { cookie: ownerCookie },
    });
    if (removeMemberRes.statusCode !== 200) {
      throw new Error(`Expected 200 on remove member, got ${removeMemberRes.statusCode}`);
    }
    console.log('✓ Owner removed collaborator from workspace');

    // 1.10 Ex-collaborator queries private workspace -> Expected: 403 Forbidden again
    const postRemoveRes = await app.inject({
      method: 'GET',
      url: `/rooms/${privateRoomId}`,
      headers: { cookie: attackerCookie },
    });
    if (postRemoveRes.statusCode !== 403) {
      throw new Error(`Expected 403 after member removal, got ${postRemoveRes.statusCode}`);
    }
    console.log('✓ Ex-collaborator access severed and blocked (403 Forbidden)');

    // ----------------------------------------------------
    // TEST 2: C/C++ Preprocessor #include Directory Traversal Sanitization
    // ----------------------------------------------------
    console.log('\n[TEST 2] Testing C/C++ Preprocessor Include Sanitization...');

    // 2.1 Attack with absolute path include
    const absPathAttackCode = `#include "/etc/passwd"\nint main(){ return 0; }`;
    const absAttackRes = await app.inject({
      method: 'POST',
      url: '/execute',
      headers: { cookie: ownerCookie },
      payload: {
        language: 'cpp',
        code: absPathAttackCode,
        stdin: '',
      },
    });
    const absAttackBody = JSON.parse(absAttackRes.body).result;
    console.log('• Absolute include status:', absAttackBody.status);
    console.log('• Absolute include stderr:', absAttackBody.stderr);
    if (
      absAttackBody.status !== 'COMPILE_ERROR' ||
      !absAttackBody.stderr.includes('SecurityError: Absolute paths')
    ) {
      throw new Error('Failed to block absolute path include in C++ execution!');
    }
    console.log('✓ Blocked absolute path #include traversal');

    // 2.2 Attack with relative directory traversal include
    const relPathAttackCode = `#include "../../server/.env"\nint main(){ return 0; }`;
    const relAttackRes = await app.inject({
      method: 'POST',
      url: '/execute',
      headers: { cookie: ownerCookie },
      payload: {
        language: 'cpp',
        code: relPathAttackCode,
        stdin: '',
      },
    });
    const relAttackBody = JSON.parse(relAttackRes.body).result;
    console.log('• Relative include status:', relAttackBody.status);
    console.log('• Relative include stderr:', relAttackBody.stderr);
    if (
      relAttackBody.status !== 'COMPILE_ERROR' ||
      !relAttackBody.stderr.includes('SecurityError: Absolute paths')
    ) {
      throw new Error('Failed to block relative directory traversal include in C++ execution!');
    }
    console.log('✓ Blocked relative directory traversal #include');

    // 2.3 Legitimate safe C++ code execution
    const safeCppCode = `#include <iostream>\nusing namespace std;\nint main() { cout << "Codev Security Verified!" << endl; return 0; }`;
    const safeRes = await app.inject({
      method: 'POST',
      url: '/execute',
      headers: { cookie: ownerCookie },
      payload: {
        language: 'cpp',
        code: safeCppCode,
        stdin: '',
      },
    });
    const safeBody = JSON.parse(safeRes.body).result;
    console.log('• Safe C++ execution status:', safeBody.status);
    console.log('• Safe C++ output:', safeBody.stdout?.trim());
    if (safeBody.status !== 'SUCCESS' || !safeBody.stdout.includes('Codev Security Verified!')) {
      throw new Error(`Legitimate C++ execution failed: ${safeBody.stderr}`);
    }
    console.log('✓ Legitimate C++ code executed successfully');

    // ----------------------------------------------------
    // TEST 3: Workspace Leave & Disconnection
    // ----------------------------------------------------
    console.log('\n[TEST 3] Testing Public Room Join and Leave...');

    // 3.1 Owner creates a public room
    const publicRoomRes = await app.inject({
      method: 'POST',
      url: '/rooms',
      headers: { cookie: ownerCookie },
      payload: {
        name: 'Open Collaboration',
        template: 'python',
        sourceType: 'SCRATCHPAD',
        isPrivate: false,
      },
    });
    const publicRoomId = JSON.parse(publicRoomRes.body).room.id;
    cleanupRoomIds.push(publicRoomId);

    // 3.2 User joins public room
    const peerJoinRes = await app.inject({
      method: 'POST',
      url: `/rooms/${publicRoomId}/join`,
      headers: { cookie: attackerCookie },
    });
    if (peerJoinRes.statusCode !== 200) throw new Error('Peer failed to join public room');
    console.log('✓ Peer joined public workspace');

    // 3.3 User leaves public room
    const peerLeaveRes = await app.inject({
      method: 'DELETE',
      url: `/rooms/${publicRoomId}`,
      headers: { cookie: attackerCookie },
    });
    const peerLeaveBody = JSON.parse(peerLeaveRes.body);
    if (peerLeaveRes.statusCode !== 200 || !peerLeaveBody.left) {
      throw new Error('Peer failed to leave workspace');
    }
    console.log('✓ Peer left workspace and socket severing executed cleanly');

    // ----------------------------------------------------
    // TEST 4: Snapshot Flush on Shutdown
    // ----------------------------------------------------
    console.log('\n[TEST 4] Testing roomHub.flushAllRooms()...');
    await roomHub.flushAllRooms();
    console.log('✓ roomHub.flushAllRooms() executed cleanly without errors');

    // ----------------------------------------------------
    // TEST 5: Snapshot Sanitization (Prevent Stuck Running State)
    // ----------------------------------------------------
    console.log('\n[TEST 5] Testing Snapshot Sanitization of Ephemeral Execution Flags...');
    const testSession = await roomHub.getOrCreateRoomSession(publicRoomId);
    const meta = testSession.doc.getMap('workspaceMeta');
    meta.set('isRunning', true);
    meta.set('runningBy', 'TestRunner');
    meta.set('runStartedAt', Date.now());

    // Flush to DB
    await roomHub.flushAllRooms();

    // Destroy in-memory session to force cold rehydration from Postgres snapshot
    roomHub.destroyRoomSession(publicRoomId);

    // Rehydrate
    const rehydratedSession = await roomHub.getOrCreateRoomSession(publicRoomId);
    const rehydratedMeta = rehydratedSession.doc.getMap('workspaceMeta');
    const isRunningAfterRehydrate = rehydratedMeta.get('isRunning');
    const runningByAfterRehydrate = rehydratedMeta.get('runningBy');

    if (isRunningAfterRehydrate) {
      throw new Error(`Expected isRunning to be false after rehydration, got ${isRunningAfterRehydrate}`);
    }
    if (runningByAfterRehydrate) {
      throw new Error(`Expected runningBy to be null after rehydration, got ${runningByAfterRehydrate}`);
    }
    console.log('✓ Snapshot successfully sanitized: isRunning is false and runningBy is null after DB rehydration');

    console.log('\n=== ALL PHASE 1 SECURITY TESTS PASSED SUCCESSFULLY! ===');
  } finally {
    // Cleanup created test records
    for (const rId of cleanupRoomIds) {
      try {
        await db.delete(rooms).where(eq(rooms.id, rId));
      } catch {}
    }
    for (const email of cleanupEmails) {
      try {
        await db.delete(users).where(eq(users.email, email));
      } catch {}
    }
  }

  process.exit(0);
}

runSecurityTests().catch((err) => {
  console.error('\n❌ Security verification error:', err);
  process.exit(1);
});
