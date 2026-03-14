/**
 * Type definitions for the PackageDocsSidebar component.
 * Matches the JSON API at /apps/docs/api/packages/.
 */

export interface PackageInfo {
  pip_name: string;
  module: string;
  version: string;
  description: string;
  github_url: string;
  has_sphinx: boolean;
  sphinx_url: string;
  sphinx_content_url: string;
  pypi_url: string;
}

export interface PackageGroup {
  label: string;
  key: string;
  packages: PackageInfo[];
}

export interface ApiResponse {
  version: string;
  groups: PackageGroup[];
}

export interface PackageDocsSidebarConfig {
  /** Container element or CSS selector */
  container: string | HTMLElement;
  /** API endpoint URL (default: /apps/docs/api/packages/) */
  apiUrl?: string;
  /** Called when user clicks a package */
  onPackageSelect?: (pkg: PackageInfo) => void;
  /** Show version badges */
  showVersions?: boolean;
  /** Show group headers */
  showGroups?: boolean;
  /** CSS class prefix for scoping */
  classPrefix?: string;
}
