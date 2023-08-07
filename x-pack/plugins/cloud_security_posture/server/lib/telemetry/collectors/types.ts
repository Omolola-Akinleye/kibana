/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AggregationsMultiBucketBase } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { CspStatusCode } from '../../../../common/types';

export interface CspmUsage {
  indices: CspmIndicesStats;
  resources_stats: CspmResourcesStats[];
  accounts_stats: FindingsAccountsStats[];
  rules_stats: CspmRulesStats[];
  installation_stats: CloudSecurityInstallationStats[];
  kspm_accounts_stats: KspmAccountStats[];
  cspm_accounts_stats: CspmAccountsStats[];
  cnvm_accounts_stats: CnvmAccountStats[];
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

export interface BenchmarkId {
  metrics: { 'rule.benchmark.id': string };
}
export interface BenchmarkName {
  metrics: { 'rule.benchmark.name': string };
}

export interface BenchmarkVersion {
  metrics: { 'rule.benchmark.version': string };
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
export interface FindingsAccountsStats {
  account_id: string;
  posture_score: number;
  latest_findings_doc_count: number;
  benchmark_id: string;
  benchmark_name: string;
  benchmark_version: string;
  kubernetes_version: string | null;
  passed_findings_count: number;
  failed_findings_count: number;
  agents_count: number;
  nodes_count: number;
  pods_count: number;
}

export interface CspmAccountsStats {
  account_id: string;
  posture_score: number;
  doc_count: number;
  benchmark_name: string;
  benchmark_version: string;
  passed_findings_count: number;
  failed_findings_count: number;
  cloud_provider: string;
}

export interface CspmAccountsResponse {
  accounts: {
    buckets: CspmAccountsEntity[];
  };
}
interface CspmAccountsEntity {
  key: string; // cluster id
  doc_count: number; // latest kspm findings doc count
  passed_findings_count: AggregationsMultiBucketBase;
  failed_findings_count: AggregationsMultiBucketBase;
  benchmark_name: { top: BenchmarkName[] };
  benchmark_version: { top: BenchmarkVersion[] };
  cloud_provider: { top: CloudProvider[] };
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
}

export interface CloudProvider {
  metrics: { 'cloud.provider': string };
}
export interface Value {
  value: number;
}

export interface KubernetesVersion {
  metrics: { 'cloudbeat.kubernetes.version': string };
}

export interface KspmAccountsResponse {
  accounts: {
    buckets: KspmAccountsEntity[];
  };
}
export interface KspmAccountsEntity {
  key: string; // cluster id
  doc_count: number; // latest kspm findings doc count
  passed_findings_count: AggregationsMultiBucketBase;
  failed_findings_count: AggregationsMultiBucketBase;
  benchmark_id: { top: BenchmarkId[] };
  benchmark_name: { top: BenchmarkName[] };
  benchmark_version: { top: BenchmarkVersion[] };
  kubernetes_version: { top: KubernetesVersion[] };
  agents_count: Value;
  nodes_count: Value;
  pods_count: Value;
  resources: {
    pods_count: Value;
  };
}

export interface KspmAccountStats {
  account_id: string;
  posture_score: number;
  doc_count: number;
  benchmark_name: string;
  benchmark_version: string;
  kubernetes_version: string | null;
  passed_findings_count: number;
  failed_findings_count: number;
  agents_count: number;
  nodes_count: number;
  pods_count: number;
  cloud_provider: string;
}

export interface CnvmAccountsResponse {
  accounts: {
    buckets: CnvmAccountsEntity[];
  };
}
export interface CnvmAccountsEntity {
  key: string; // cluster id
  doc_count: number; // latest cnvm vulnerabilities doc count,
  cloud_provider: { top: CloudProvider[] };
}

export interface CnvmAccountStats {
  account_id: string;
  doc_count: number;
  cloud_provider: string;
}
