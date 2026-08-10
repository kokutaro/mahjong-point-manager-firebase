import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  deleteField,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  setLogLevel,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
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

describe('firestore.rules competitionSeries access control', () => {
  it('defines series, members, and rounds matches', () => {
    expect(rules).toContain('match /competitionSeries/{seriesId}');
    expect(rules).toContain('match /members/{memberId}');
    expect(rules).toContain('match /rounds/{roundId}');
  });

  it('requires the authenticated organizer on create and preserves ownership on update', () => {
    expect(rules).toContain('request.resource.data.organizerId == request.auth.uid');
    expect(rules).toContain('request.resource.data.organizerId == resource.data.organizerId');
  });

  it('restricts series member and round writes to organizers or co-organizers', () => {
    expect(rules).toContain('function isSeriesOrganizerOrCoOrganizer()');
    expect(rules).toContain('allow create: if isSeriesOrganizerOrCoOrganizer()');
    expect(rules).toContain('allow update: if false;');
    expect(rules).toContain('allow delete: if isSeriesOrganizerOrCoOrganizer();');
  });
});

describe.runIf(Boolean(env?.FIRESTORE_EMULATOR_HOST || env?.FIREBASE_EMULATOR_HUB))(
  'firestore.rules competitionSeries emulator access control',
  () => {
    let testEnv: RulesTestEnvironment;

    const seriesData = {
      id: 'series-1',
      name: '年間リーグ',
      organizerId: 'organizer',
      coOrganizerIds: ['co-organizer'],
      createdAt: 1,
      updatedAt: 1,
    };

    const competitionData = (id: string) => ({
      id,
      name: id,
      organizerId: 'organizer',
      coOrganizerIds: [],
      status: 'recruiting',
      hasPasscode: false,
      settings: {},
      createdAt: 1,
    });

    beforeAll(async () => {
      setLogLevel('silent');
      testEnv = await initializeTestEnvironment({
        projectId: `${EMULATOR_PROJECT_ID}-series`,
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

    it('allows users to create only series they own', async () => {
      const organizerDb = testEnv.authenticatedContext('organizer').firestore();
      const attackerDb = testEnv.authenticatedContext('attacker').firestore();

      await assertSucceeds(setDoc(doc(organizerDb, 'competitionSeries/series-1'), seriesData));
      await assertFails(
        setDoc(doc(attackerDb, 'competitionSeries/series-2'), {
          ...seriesData,
          id: 'series-2',
        }),
      );
    });

    it('allows organizers and co-organizers to manage members but denies other users', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'competitionSeries/series-1'), seriesData);
      });
      const memberData = {
        id: 'member-1',
        name: '雀太郎',
        active: true,
        joinedAt: 1,
      };

      await assertSucceeds(
        setDoc(
          doc(
            testEnv.authenticatedContext('co-organizer').firestore(),
            'competitionSeries/series-1/members/member-1',
          ),
          memberData,
        ),
      );
      await assertFails(
        setDoc(
          doc(
            testEnv.authenticatedContext('attacker').firestore(),
            'competitionSeries/series-1/members/member-2',
          ),
          { ...memberData, id: 'member-2' },
        ),
      );
    });

    it('requires an atomic owned-competition update when creating a series round', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'competitionSeries/series-1'), seriesData);
        await setDoc(
          doc(context.firestore(), 'competitions/competition-1'),
          competitionData('competition-1'),
        );
      });
      const organizerDb = testEnv.authenticatedContext('organizer').firestore();
      const batch = writeBatch(organizerDb);
      batch.update(doc(organizerDb, 'competitions/competition-1'), {
        seriesId: 'series-1',
        seriesRoundNumber: 1,
      });
      batch.set(doc(organizerDb, 'competitionSeries/series-1/rounds/1'), {
        id: '1',
        competitionId: 'competition-1',
        roundNumber: 1,
        linkedAt: 1,
      });

      await assertSucceeds(batch.commit());
    });

    it('denies overwriting a round number after it has been assigned', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'competitionSeries/series-1'), seriesData);
        await setDoc(doc(context.firestore(), 'competitionSeries/series-1/rounds/1'), {
          id: '1',
          competitionId: 'competition-1',
          roundNumber: 1,
          linkedAt: 1,
        });
      });
      const roundRef = doc(
        testEnv.authenticatedContext('organizer').firestore(),
        'competitionSeries/series-1/rounds/1',
      );

      await assertFails(updateDoc(roundRef, { competitionId: 'competition-2' }));
    });

    it('denies linking an already linked competition to another round', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'competitionSeries/series-1'), seriesData);
        await setDoc(doc(context.firestore(), 'competitionSeries/series-1/rounds/1'), {
          id: '1',
          competitionId: 'competition-1',
          roundNumber: 1,
          linkedAt: 1,
        });
        await setDoc(doc(context.firestore(), 'competitions/competition-1'), {
          ...competitionData('competition-1'),
          seriesId: 'series-1',
          seriesRoundNumber: 1,
        });
      });
      const organizerDb = testEnv.authenticatedContext('organizer').firestore();
      const batch = writeBatch(organizerDb);
      batch.update(doc(organizerDb, 'competitions/competition-1'), {
        seriesRoundNumber: 2,
      });
      batch.set(doc(organizerDb, 'competitionSeries/series-1/rounds/2'), {
        id: '2',
        competitionId: 'competition-1',
        roundNumber: 2,
        linkedAt: 2,
      });

      await assertFails(batch.commit());
    });

    it('requires the competition back-reference to be cleared when unlinking a round', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'competitionSeries/series-1'), seriesData);
        await setDoc(doc(context.firestore(), 'competitionSeries/series-1/rounds/1'), {
          id: '1',
          competitionId: 'competition-1',
          roundNumber: 1,
          linkedAt: 1,
        });
        await setDoc(doc(context.firestore(), 'competitions/competition-1'), {
          ...competitionData('competition-1'),
          seriesId: 'series-1',
          seriesRoundNumber: 1,
        });
      });
      const organizerDb = testEnv.authenticatedContext('organizer').firestore();
      const roundRef = doc(organizerDb, 'competitionSeries/series-1/rounds/1');

      await assertFails(deleteDoc(roundRef));

      const batch = writeBatch(organizerDb);
      batch.update(doc(organizerDb, 'competitions/competition-1'), {
        seriesId: deleteField(),
        seriesRoundNumber: deleteField(),
      });
      batch.delete(roundRef);
      await assertSucceeds(batch.commit());
    });

    it('allows self registration and managers to add guests but denies guest spoofing', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(
          doc(context.firestore(), 'competitions/competition-1'),
          competitionData('competition-1'),
        );
      });
      const playerDb = testEnv.authenticatedContext('player-1').firestore();
      const organizerDb = testEnv.authenticatedContext('organizer').firestore();
      const baseParticipant = {
        name: '雀太郎',
        isGuest: false,
        status: 'idle',
        role: 'player',
        joinedAt: 1,
      };

      await assertSucceeds(
        setDoc(doc(playerDb, 'competitions/competition-1/participants/player-1'), {
          ...baseParticipant,
          id: 'player-1',
          userId: 'player-1',
        }),
      );
      await assertFails(
        setDoc(doc(playerDb, 'competitions/competition-1/participants/spoofed-guest'), {
          ...baseParticipant,
          id: 'spoofed-guest',
          isGuest: true,
        }),
      );
      await assertSucceeds(
        setDoc(doc(organizerDb, 'competitions/competition-1/participants/managed-guest'), {
          ...baseParticipant,
          id: 'managed-guest',
          isGuest: true,
        }),
      );
    });

    it('accepts only series member references from the competition series', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'competitionSeries/series-1'), seriesData);
        await setDoc(doc(context.firestore(), 'competitionSeries/series-1/members/member-1'), {
          id: 'member-1',
          name: '雀太郎',
          active: true,
          joinedAt: 1,
        });
        await setDoc(doc(context.firestore(), 'competitionSeries/other-series/members/member-2'), {
          id: 'member-2',
          name: '雀次郎',
          active: true,
          joinedAt: 1,
        });
        await setDoc(doc(context.firestore(), 'competitions/competition-1'), {
          ...competitionData('competition-1'),
          seriesId: 'series-1',
          seriesRoundNumber: 1,
        });
      });
      const organizerDb = testEnv.authenticatedContext('organizer').firestore();
      const baseParticipant = {
        name: '雀太郎',
        isGuest: true,
        status: 'idle',
        role: 'player',
        joinedAt: 1,
      };

      await assertSucceeds(
        setDoc(doc(organizerDb, 'competitions/competition-1/participants/participant-1'), {
          ...baseParticipant,
          id: 'participant-1',
          seriesMemberId: 'member-1',
        }),
      );
      await assertFails(
        setDoc(doc(organizerDb, 'competitions/competition-1/participants/participant-2'), {
          ...baseParticipant,
          id: 'participant-2',
          seriesMemberId: 'member-2',
        }),
      );
    });

    it('requires both competition and series management permission to change identity mapping', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'competitionSeries/series-1'), seriesData);
        await setDoc(doc(context.firestore(), 'competitionSeries/series-1/members/member-1'), {
          id: 'member-1',
          name: '雀太郎',
          active: true,
          joinedAt: 1,
        });
        await setDoc(doc(context.firestore(), 'competitions/competition-1'), {
          ...competitionData('competition-1'),
          coOrganizerIds: ['competition-co'],
          seriesId: 'series-1',
          seriesRoundNumber: 1,
        });
        await setDoc(doc(context.firestore(), 'competitions/competition-1/participants/player-1'), {
          id: 'player-1',
          userId: 'player-1',
          name: '雀太郎',
          isGuest: false,
          status: 'idle',
          role: 'player',
          joinedAt: 1,
        });
      });
      const participantRef = doc(
        testEnv.authenticatedContext('competition-co').firestore(),
        'competitions/competition-1/participants/player-1',
      );

      await assertFails(updateDoc(participantRef, { seriesMemberId: 'member-1' }));
    });
  },
);

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
