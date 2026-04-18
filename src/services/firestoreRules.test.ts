import { describe, expect, it } from 'vitest';
import rules from '../../firestore.rules?raw';

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
    expect(rules).toContain('request.resource.data.uid == uid');
    expect(rules).toContain('request.resource.data.id == entryId');
    expect(rules).toContain('request.resource.data.source.handLogId == entryId');
    expect(rules).toContain('request.auth.uid == uid');
  });
});
