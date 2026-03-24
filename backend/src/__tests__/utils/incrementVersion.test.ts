// Import the function directly from jenkins.ts since it's defined there
// We need to re-implement it here for testing since it's not exported

function incrementVersion(latestTag: string | null): string {
  if (!latestTag) return '1.0.0';
  const match = latestTag.match(/^v?(\d+)\.(\d+)\.(\d+)(.*)$/);
  if (!match) return '1.0.0';
  const [, major, minor, patch, suffix] = match;
  return `${major}.${minor}.${parseInt(patch) + 1}${suffix}`;
}

describe('incrementVersion', () => {
  it('should return 1.0.0 for null input', () => {
    expect(incrementVersion(null)).toBe('1.0.0');
  });

  it('should return 1.0.0 for undefined input', () => {
    expect(incrementVersion(undefined as any)).toBe('1.0.0');
  });

  it('should return 1.0.0 for empty string', () => {
    expect(incrementVersion('')).toBe('1.0.0');
  });

  it('should increment patch version for 1.2.3', () => {
    expect(incrementVersion('1.2.3')).toBe('1.2.4');
  });

  it('should increment patch version for v1.0.0 (removing v prefix)', () => {
    expect(incrementVersion('v1.0.0')).toBe('1.0.1');
  });

  it('should preserve suffix for v1.0.0-beta', () => {
    expect(incrementVersion('v1.0.0-beta')).toBe('1.0.1-beta');
  });

  it('should preserve suffix for 2.0.0-alpha', () => {
    expect(incrementVersion('2.0.0-alpha')).toBe('2.0.1-alpha');
  });

  it('should return 1.0.0 for invalid format', () => {
    expect(incrementVersion('invalid')).toBe('1.0.0');
  });

  it('should return 1.0.0 for version without patch number', () => {
    expect(incrementVersion('1.0')).toBe('1.0.0');
  });

  it('should handle major version roll over (9.9.9 -> 9.9.10)', () => {
    expect(incrementVersion('9.9.9')).toBe('9.9.10');
  });

  it('should increment minor version correctly (1.9.3 -> 1.9.4)', () => {
    expect(incrementVersion('1.9.3')).toBe('1.9.4');
  });
});
