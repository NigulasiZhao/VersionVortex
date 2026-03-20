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

export interface User {
  id: number;
  username: string;
  role: string;
  created_at: string;
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

export interface JenkinsConfig {
  id?: number;
  package_id: number;
  package_name?: string;
  jenkins_url: string;
  job_name: string;
  username: string;
  api_token?: string;
  artifact_pattern: string;
  created_at?: string;
}

export interface JenkinsBuildResult {
  triggered: boolean;
  buildNumber: number | null;
  status: 'queued' | 'building' | 'completed' | 'failed' | 'partial';
  result?: string | null;
  releaseId?: number;
  tagName?: string;
  artifactName?: string;
  artifactSize?: number;
  message?: string;
}

export interface PackageBuildStatus {
  package_id: number;
  package_name: string;
  job_name: string;
  build_number: number | null;
  status: 'pending' | 'triggering' | 'building' | 'downloading' | 'completed' | 'failed';
  result: string | null;
  artifact_name: string | null;
  artifact_size: number | null;
  error: string | null;
  progress: number;
}

export interface BuildSession {
  id: string;
  tag_name: string;
  created_at: string;
  packages: PackageBuildStatus[];
  overall_status: 'running' | 'completed' | 'failed';
  release_id: number | null;
}
