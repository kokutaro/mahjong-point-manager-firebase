import { describe, expect, it } from 'vitest';
import rules from '../../firestore.rules?raw';

describe('firestore.rules participants name validation', () => {
  it('requires non-whitespace participant names', () => {
    expect(rules).toContain('function hasValidParticipantName()');
    expect(rules).toContain("request.resource.data.name.matches('.*\\\\S.*')");
  });
});
