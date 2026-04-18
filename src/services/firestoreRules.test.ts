import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc, setLogLevel, updateDoc } from 'firebase/firestore';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import rules from '../../firestore.rules?raw';

const EMULATOR_PROJECT_ID = 'demo-mahjong-point-manager';
const env = (
  globalThis as {
    process?: {
      env?: Record<string, string | undefined>;
    };
  }
).process?.env;

const createAnalysisEntryData = (overrides: Record<string, unknown> = {}) => ({
  id: 'hand-1',
  uid: 'user-1',
  source: {
    kind: 'room',
    roomId: 'room-1',
    handLogId: 'hand-1',
  },
  context: {
    round: { wind: 'East', number: 1, honba: 0 },
    seatWind: 'East',
    roundWind: 'East',
    eventType: 'win',
    isDealer: true,
  },
  hand: {
    concealed: ['1m', '2m', '3m'],
    melds: [],
    wait: ['ryanmen'],
  },
  dora: {
    doraIndicators: [],
    uraIndicators: [],
    kanDoraIndicators: [],
    kanUraIndicators: [],
    redFiveCount: 0,
  },
  yaku: {
    list: ['riichi'],
    yakuman: [],
    ippatsu: false,
    riichi: 'normal',
    special: null,
    han: 3,
    fu: 40,
  },
  notes: 'test',
  createdAt: 1710000000000,
  updatedAt: 1710000001000,
  ...overrides,
});

const getEntryPath = (uid = 'user-1', entryId = 'hand-1') => {
  return `userAnalyses/${uid}/entries/${entryId}`;
};

describe.runIf(Boolean(env?.FIRESTORE_EMULATOR_HOST || env?.FIREBASE_EMULATOR_HUB))(
  'firestore.rules userAnalyses emulator access control',
  () => {
    let testEnv: RulesTestEnvironment;

    beforeAll(async () => {
      setLogLevel('silent');

      testEnv = await initializeTestEnvironment({
        projectId: EMULATOR_PROJECT_ID,
        firestore: { rules },
      });
    });

    afterEach(async () => {
      await testEnv.clearFirestore();
    });

    afterAll(async () => {
      await testEnv.cleanup();
      setLogLevel('error');
    });

    it('allows the owner to create, read, update, and delete their own analysis entry', async () => {
      const ownerDb = testEnv.authenticatedContext('user-1').firestore();
      const entryRef = doc(ownerDb, getEntryPath());

      await assertSucceeds(setDoc(entryRef, createAnalysisEntryData()));
      await assertSucceeds(getDoc(entryRef));
      await assertSucceeds(updateDoc(entryRef, { notes: 'updated note' }));
      await assertSucceeds(deleteDoc(entryRef));
    });

    it('denies read and delete for other users and unauthenticated clients', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), getEntryPath()), createAnalysisEntryData());
      });

      const otherUserRef = doc(testEnv.authenticatedContext('user-2').firestore(), getEntryPath());
      const unauthRef = doc(testEnv.unauthenticatedContext().firestore(), getEntryPath());

      await assertFails(getDoc(otherUserRef));
      await assertFails(deleteDoc(otherUserRef));
      await assertFails(getDoc(unauthRef));
      await assertFails(deleteDoc(unauthRef));
    });

    it('denies create when uid, id, or source.handLogId do not match the path', async () => {
      const ownerDb = testEnv.authenticatedContext('user-1').firestore();
      const entryRef = doc(ownerDb, getEntryPath());

      await assertFails(setDoc(entryRef, createAnalysisEntryData({ uid: 'user-2' })));
      await assertFails(setDoc(entryRef, createAnalysisEntryData({ id: 'other-entry' })));
      await assertFails(
        setDoc(
          entryRef,
          createAnalysisEntryData({
            source: {
              kind: 'room',
              roomId: 'room-1',
              handLogId: 'other-entry',
            },
          }),
        ),
      );
    });

    it('denies update when the owner tries to change uid, id, or source.handLogId', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), getEntryPath()), createAnalysisEntryData());
      });

      const ownerRef = doc(testEnv.authenticatedContext('user-1').firestore(), getEntryPath());

      await assertFails(updateDoc(ownerRef, { uid: 'user-2' }));
      await assertFails(updateDoc(ownerRef, { id: 'other-entry' }));
      await assertFails(updateDoc(ownerRef, { 'source.handLogId': 'other-entry' }));
    });

    it('denies create and update for authenticated non-owners', async () => {
      const otherUserDb = testEnv.authenticatedContext('user-2').firestore();
      const otherUserRef = doc(otherUserDb, getEntryPath());

      await assertFails(setDoc(otherUserRef, createAnalysisEntryData()));

      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), getEntryPath()), createAnalysisEntryData());
      });

      await assertFails(updateDoc(otherUserRef, { notes: 'tampered' }));
    });
  },
);

describe('firestore.rules participants name validation', () => {
  it('requires non-whitespace participant names', () => {
    expect(rules).toContain('function hasValidParticipantName()');
    expect(rules).toContain("request.resource.data.name.matches('.*\\\\S.*')");
  });
});

describe('firestore.rules userSettings access control', () => {
  it('defines a dedicated userSettings document match', () => {
    expect(rules).toContain('match /userSettings/{userId}');
  });

  it('restricts userSettings access to the authenticated owner', () => {
    expect(rules).toContain(
      'allow read, create, update, delete: if request.auth != null && request.auth.uid == userId;',
    );
    expect(rules).toContain('request.auth.uid == userId');
  });
});

describe('firestore.rules userAnalyses access control', () => {
  it('defines a userAnalyses entry subcollection match', () => {
    expect(rules).toContain('match /userAnalyses/{uid}');
    expect(rules).toContain('match /entries/{entryId}');
  });

  it('restricts userAnalyses reads and writes to the authenticated owner', () => {
    expect(rules).toContain(
      'allow read, delete: if request.auth != null && request.auth.uid == uid;',
    );
    expect(rules).toContain('allow create: if request.auth != null');
    expect(rules).toContain('request.auth.uid == uid');
    expect(rules).toContain('allow update: if request.auth != null');
    expect(rules).toContain('request.auth.uid == uid');
    expect(rules).toContain('resource.data.uid == uid');
    expect(rules).toContain('request.resource.data.uid == uid');
    expect(rules).toContain('request.resource.data.id == entryId');
    expect(rules).toContain('request.resource.data.source.handLogId == entryId');
  });
});
