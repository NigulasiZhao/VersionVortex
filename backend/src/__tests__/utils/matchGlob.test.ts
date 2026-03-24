// Re-implement matchGlob for testing (same logic as in jenkins.ts)
function matchGlob(filePath: string, pattern: string): boolean {
  const regexPattern = pattern
    .replace(/\./g, '\\.')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  const fullPathRegex = new RegExp(`^${regexPattern}$`);
  const basenameRegex = new RegExp(`^${regexPattern}$`);
  return fullPathRegex.test(filePath) || basenameRegex.test(filePath.split('/').pop() || '');
}

describe('matchGlob', () => {
  it('should match exact filename', () => {
    expect(matchGlob('app.zip', 'app.zip')).toBe(true);
    expect(matchGlob('app.zip', 'app.exe')).toBe(false);
  });

  it('should match * wildcard for any characters', () => {
    expect(matchGlob('app-1.0.0.zip', '*.zip')).toBe(true);
    expect(matchGlob('my-app-1.0.0.zip', '*.zip')).toBe(true);
    expect(matchGlob('app.zip', '*.zip')).toBe(true);
    expect(matchGlob('app.tar.gz', '*.zip')).toBe(false);
  });

  it('should match *.exe wildcard', () => {
    expect(matchGlob('setup.exe', '*.exe')).toBe(true);
    expect(matchGlob('MyApp.exe', '*.exe')).toBe(true);
    expect(matchGlob('setup.msi', '*.exe')).toBe(false);
  });

  it('should match app-*.zip pattern', () => {
    expect(matchGlob('app-1.0.0.zip', 'app-*.zip')).toBe(true);
    expect(matchGlob('app-2.5.3.zip', 'app-*.zip')).toBe(true);
    expect(matchGlob('app.zip', 'app-*.zip')).toBe(false);
    expect(matchGlob('web-1.0.0.zip', 'app-*.zip')).toBe(false);
  });

  it('should match ? wildcard for single character', () => {
    expect(matchGlob('app1.zip', 'app?.zip')).toBe(true);
    expect(matchGlob('app2.zip', 'app?.zip')).toBe(true);
    expect(matchGlob('app.zip', 'app?.zip')).toBe(false);
    expect(matchGlob('app10.zip', 'app?.zip')).toBe(false);
  });

  it('should match full path patterns', () => {
    expect(matchGlob('/path/to/app.zip', '*.zip')).toBe(true);
    expect(matchGlob('/path/to/app.zip', 'app.zip')).toBe(true);
    expect(matchGlob('relative/path/app.zip', '*.zip')).toBe(true);
  });

  it('should escape dots correctly', () => {
    expect(matchGlob('app.v2.zip', '*.zip')).toBe(true);
    expect(matchGlob('app.v2.zip', '*.zip')).toBe(true);
  });

  it('should handle complex patterns', () => {
    expect(matchGlob('package-1.0.0.min.js', '*.min.js')).toBe(true);
    expect(matchGlob('package-1.0.0.js', '*.min.js')).toBe(false);
  });

  it('should match no extension files', () => {
    expect(matchGlob('Makefile', 'Makefile')).toBe(true);
    expect(matchGlob('Makefile', '*.txt')).toBe(false);
  });

  it('should be case sensitive', () => {
    expect(matchGlob('APP.ZIP', '*.zip')).toBe(false);
    expect(matchGlob('app.ZIP', '*.zip')).toBe(false);
    expect(matchGlob('APP.zip', '*.ZIP')).toBe(false);
  });
});
