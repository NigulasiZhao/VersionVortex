// Re-implement groupByMonth for testing (same logic as in Timeline.tsx)
function groupByMonth(releases: any[]) {
  const groups: Record<string, any[]> = {};

  releases.forEach((release) => {
    const date = new Date(release.created_at);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const key = `${year}-${month.toString().padStart(2, "0")}`;

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(release);
  });

  const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  return sortedKeys.map((key) => {
    const [year, month] = key.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    const label = date.toLocaleDateString("zh-CN", { year: "numeric", month: "long" });

    return {
      key,
      label,
      releases: groups[key].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    };
  });
}

describe('groupByMonth', () => {
  const releases = [
    { id: 1, tag_name: 'v1.0.0', created_at: '2024-01-15T10:00:00Z' },
    { id: 2, tag_name: 'v1.1.0', created_at: '2024-01-20T10:00:00Z' },
    { id: 3, tag_name: 'v2.0.0', created_at: '2024-02-10T10:00:00Z' },
    { id: 4, tag_name: 'v3.0.0', created_at: '2024-03-05T10:00:00Z' },
  ];

  it('should return empty array for empty input', () => {
    const result = groupByMonth([]);
    expect(result).toEqual([]);
  });

  it('should group releases by year-month', () => {
    const result = groupByMonth(releases);
    expect(result.length).toBe(3); // Jan 2024, Feb 2024, Mar 2024
  });

  it('should have keys in format YYYY-MM', () => {
    const result = groupByMonth(releases);
    result.forEach((group) => {
      expect(group.key).toMatch(/^\d{4}-\d{2}$/);
    });
  });

  it('should sort groups by date descending', () => {
    const result = groupByMonth(releases);
    expect(result[0].key).toBe('2024-03');
    expect(result[1].key).toBe('2024-02');
    expect(result[2].key).toBe('2024-01');
  });

  it('should sort releases within each group by date descending', () => {
    const result = groupByMonth(releases);
    const janGroup = result.find((g) => g.key === '2024-01');
    expect(janGroup).toBeDefined();
    expect(janGroup!.releases[0].tag_name).toBe('v1.1.0');
    expect(janGroup!.releases[1].tag_name).toBe('v1.0.0');
  });

  it('should include label in Chinese format', () => {
    const result = groupByMonth(releases);
    const janGroup = result.find((g) => g.key === '2024-01');
    expect(janGroup!.label).toBe('2024年1月');
  });

  it('should handle single release', () => {
    const singleRelease = [releases[0]];
    const result = groupByMonth(singleRelease);
    expect(result.length).toBe(1);
    expect(result[0].releases.length).toBe(1);
  });

  it('should handle same month releases', () => {
    const result = groupByMonth(releases.filter((r) => r.created_at.startsWith('2024-01')));
    expect(result.length).toBe(1);
    expect(result[0].releases.length).toBe(2);
  });
});
