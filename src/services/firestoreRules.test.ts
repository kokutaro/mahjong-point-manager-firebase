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
