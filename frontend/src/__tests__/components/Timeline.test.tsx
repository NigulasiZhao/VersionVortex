import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Timeline } from '../../components/ui/Timeline';

describe('Timeline', () => {
  const mockPackages = [
    { id: 1, name: 'app-a', description: 'Application A' },
    { id: 2, name: 'app-b', description: 'Application B' },
  ];

  const mockReleases = [
    {
      id: 1,
      tag_name: 'v1.0.0',
      title: 'First Release',
      body: 'Initial release',
      package_name: 'app-a',
      all_package_names: 'app-a',
      created_at: '2024-01-15T10:00:00Z',
      is_prerelease: 0,
      is_draft: 0,
      total_downloads: 100,
    },
    {
      id: 2,
      tag_name: 'v1.1.0',
      title: 'Second Release',
      body: 'Bug fixes',
      package_name: 'app-a',
      all_package_names: 'app-a',
      created_at: '2024-02-20T10:00:00Z',
      is_prerelease: 0,
      is_draft: 0,
      total_downloads: 50,
    },
  ];

  const renderWithRouter = (ui: React.ReactElement) => {
    return render(<MemoryRouter>{ui}</MemoryRouter>);
  };

  it('should render release list', () => {
    renderWithRouter(
      <Timeline
        releases={mockReleases}
        packages={mockPackages}
        selectedPackage="all"
        setSelectedPackage={() => {}}
      />
    );

    expect(screen.getByText('v1.0.0')).toBeInTheDocument();
    expect(screen.getByText('v1.1.0')).toBeInTheDocument();
  });

  it('should show empty state when no releases', () => {
    renderWithRouter(
      <Timeline
        releases={[]}
        packages={mockPackages}
        selectedPackage="all"
        setSelectedPackage={() => {}}
      />
    );

    expect(screen.getByText('暂无版本')).toBeInTheDocument();
  });

  it('should display release titles', () => {
    renderWithRouter(
      <Timeline
        releases={mockReleases}
        packages={mockPackages}
        selectedPackage="all"
        setSelectedPackage={() => {}}
      />
    );

    expect(screen.getByText('First Release')).toBeInTheDocument();
    expect(screen.getByText('Second Release')).toBeInTheDocument();
  });

  it('should display package names', () => {
    renderWithRouter(
      <Timeline
        releases={mockReleases}
        packages={mockPackages}
        selectedPackage="all"
        setSelectedPackage={() => {}}
      />
    );

    // Use getAllByText to find any element containing the package name
    expect(screen.getAllByText(/app-a/).length).toBeGreaterThan(0);
  });

  it('should show prerelease badge for prerelease versions', () => {
    const prereleaseReleases = [
      {
        ...mockReleases[0],
        id: 3,
        tag_name: 'v2.0.0-beta',
        is_prerelease: 1,
      },
    ];

    renderWithRouter(
      <Timeline
        releases={prereleaseReleases}
        packages={mockPackages}
        selectedPackage="all"
        setSelectedPackage={() => {}}
      />
    );

    expect(screen.getByText('Pre-release')).toBeInTheDocument();
  });

  it('should show draft badge for draft versions', () => {
    const draftReleases = [
      {
        ...mockReleases[0],
        id: 3,
        tag_name: 'v2.0.0-draft',
        is_draft: 1,
      },
    ];

    renderWithRouter(
      <Timeline
        releases={draftReleases}
        packages={mockPackages}
        selectedPackage="all"
        setSelectedPackage={() => {}}
      />
    );

    expect(screen.getByText('Draft')).toBeInTheDocument();
  });
});
