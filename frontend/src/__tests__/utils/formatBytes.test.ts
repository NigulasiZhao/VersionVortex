// Re-implement formatBytes for testing (same logic as in ReleaseDetail.tsx)
function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

describe('formatBytes', () => {
  it('should return "0 B" for 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('should format bytes correctly', () => {
    expect(formatBytes(500)).toBe('500 B');
    expect(formatBytes(1023)).toBe('1023 B');
  });

  it('should format kilobytes correctly', () => {
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(10240)).toBe('10 KB');
  });

  it('should format megabytes correctly', () => {
    expect(formatBytes(1048576)).toBe('1 MB');
    expect(formatBytes(1572864)).toBe('1.5 MB');
    expect(formatBytes(5242880)).toBe('5 MB');
  });

  it('should format gigabytes correctly', () => {
    expect(formatBytes(1073741824)).toBe('1 GB');
    expect(formatBytes(1610612736)).toBe('1.5 GB');
  });

  it('should handle decimal values correctly', () => {
    expect(formatBytes(500000)).toBe('488.3 KB');
    expect(formatBytes(5000000)).toBe('4.8 MB');
  });
});
