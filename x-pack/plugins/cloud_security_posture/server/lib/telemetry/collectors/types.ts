/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CspStatusCode } from '../../../../common/types';

export type CloudSecurityUsageCollectorType =
  | 'Indices'
  | 'Accounts'
  | 'Resources'
  | 'Rules'
  | 'Installation'
  | 'Alerts'
  | 'Cloud Accounts';

export type CloudProviderKey = 'cis/eks' | 'cis/gke' | 'cis/k8s' | 'cis/ake';

export interface CspmUsage {
  indices: CspmIndicesStats;
  resources_stats: CspmResourcesStats[];
  accounts_stats: CspmAccountsStats[];
  rules_stats: CspmRulesStats[];
  installation_stats: CloudSecurityInstallationStats[];
  alerts_stats: CloudSecurityAlertsStats[];
  cloud_account_stats: CloudSecurityAccountsStats[];
}

export interface PackageSetupStatus {
  status: CspStatusCode;
  installedPackagePolicies: number;
  healthyAgents: number;
}

export interface CspmIndicesStats {
  findings: IndexStats | {};
  latest_findings: IndexStats | {};
  vulnerabilities: IndexStats | {};
  latest_vulnerabilities: IndexStats | {};
  score: IndexStats | {};
  latestPackageVersion: string;
  cspm: PackageSetupStatus;
  kspm: PackageSetupStatus;
  vuln_mgmt: PackageSetupStatus;
}

export interface IndexStats {
  doc_count: number;
  deleted: number;
  size_in_bytes: number;
  last_doc_timestamp: string | null;
}

export interface CspmResourcesStats {
  account_id: string;
  resource_type: string;
  resource_type_doc_count: number;
  resource_sub_type: string;
  resource_sub_type_doc_count: number;
  passed_findings_count: number;
  failed_findings_count: number;
}

export interface CloudSecurityAccountsStats {
  account_id: string;
  product: string;
  cloud_provider: string;
  package_policy_id: string;
  cloud_posture_stats?: CloudPostureAccountsStats;
  kspm_stats?: KSPMAccountsStats;
  latest_doc_count: number;
  latest_doc_updated_timestamp: string;
}
export interface CloudPostureAccountsStats {
  posture_score: number;
  benchmark_name: string;
  benchmark_version: string;
  passed_findings_count: number;
  failed_findings_count: number;
}

export interface KSPMAccountsStats {
  kubernetes_version: string | null;
  agents_count: number;
  nodes_count: number;
  pods_count: number;
}

interface VulnMgmtAccountsStats {
  vulnerability_id: string;
  vulnerability_score: number;
  cloud_service_name: string;
  cloud_machine_type: string;
  cloud_machine_image: string;
  cloud_region: string;
  critical_severity_count: number;
  high_severity_count: number;
  medium_severity_count: number;
  low_severity_count: number;
}

export interface CspmAccountsStats {
  account_id: string;
  posture_score: number;
  latest_findings_doc_count: number;
  benchmark_id: string;
  benchmark_name: string;
  benchmark_version: string;
  passed_findings_count: number;
  failed_findings_count: number;
  kubernetes_version: string | null;
  agents_count: number;
  nodes_count: number;
  pods_count: number;
}
export interface CspmRulesStats {
  account_id: string;
  rule_id: string;
  rule_name: string;
  rule_section: string;
  rule_version: string;
  rule_number: string;
  posture_type: string;
  benchmark_id: string;
  benchmark_name: string;
  benchmark_version: string;
  passed_findings_count: number;
  failed_findings_count: number;
}

export interface CloudSecurityInstallationStats {
  package_policy_id: string;
  feature: string;
  package_version: string;
  agent_policy_id: string;
  deployment_mode: string;
  created_at: string;
  agent_count: number;
  account_type?: 'single-account' | 'organization-account';
}

export interface CloudSecurityAlertsStats {
  posture_type: string;
  rules_count: number;
  alerts_count: number;
  alerts_open_count: number;
  alerts_closed_count: number;
  alerts_acknowledged_count: number;
}
