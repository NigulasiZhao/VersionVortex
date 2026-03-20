export interface Package {
  id: number;
  name: string;
  description: string;
  homepage: string;
  created_at: string;
  release_count?: number;
  latest_tag?: string;
  latest_release_date?: string;
}

export interface Release {
  id: number;
  package_id: number;
  package_name: string;
  package_description?: string;
  homepage?: string;
  tag_name: string;
  title: string;
  body: string;
  is_draft: number;
  is_prerelease: number;
  created_at: string;
  updated_at: string;
  asset_count?: number;
  total_downloads?: number;
  assets?: Asset[];
}

export interface Asset {
  id: number;
  release_id: number;
  name: string;
  size: number;
  download_count: number;
  file_path: string;
  created_at: string;
}

export interface AdminStats {
  totalReleases: number;
  draftReleases: number;
  totalPackages: number;
  totalDownloads: number;
  totalAssets: number;
  recentReleases: Release[];
}
