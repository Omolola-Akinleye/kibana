/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import { getSafeKspmClusterIdRuntimeMapping } from '../../../../common/runtime_mappings/get_safe_kspm_cluster_id_runtime_mapping';
import { calculatePostureScore } from '../../../../common/utils/helpers';

import {
  KSPM_POLICY_TEMPLATE,
  LATEST_FINDINGS_INDEX_DEFAULT_NS,
} from '../../../../common/constants';
import { cloudProviders, getAccountsStatsByIntegration } from './integration_account_stats.util';
import { KspmAccountsResponse, KspmAccountStats } from './types';

const getKspmAccountsStatsQuery = (): SearchRequest => ({
  index: LATEST_FINDINGS_INDEX_DEFAULT_NS,
  runtime_mappings: getSafeKspmClusterIdRuntimeMapping(),
  query: {
    match_all: {},
  },
  aggs: {
    accounts: {
      terms: {
        field: 'safe_kspm_cluster_id',
        order: {
          _count: 'desc',
        },
        size: 100,
      },
      aggs: {
        nodes_count: {
          cardinality: {
            field: 'host.name',
          },
        },
        agents_count: {
          cardinality: {
            field: 'agent.id',
          },
        },
        benchmark_id: {
          top_metrics: {
            metrics: {
              field: 'rule.benchmark.id',
            },
            size: 1,
            sort: {
              '@timestamp': 'desc',
            },
          },
        },
        benchmark_version: {
          top_metrics: {
            metrics: {
              field: 'rule.benchmark.version',
            },
            size: 1,
            sort: {
              '@timestamp': 'desc',
            },
          },
        },
        benchmark_name: {
          top_metrics: {
            metrics: {
              field: 'rule.benchmark.name',
            },
            size: 1,
            sort: {
              '@timestamp': 'desc',
            },
          },
        },
        kubernetes_version: {
          top_metrics: {
            metrics: {
              field: 'cloudbeat.kubernetes.version',
            },
            size: 1,
            sort: {
              '@timestamp': 'desc',
            },
          },
        },
        passed_findings_count: {
          filter: {
            bool: {
              filter: [
                {
                  bool: {
                    should: [
                      {
                        term: {
                          'result.evaluation': 'passed',
                        },
                      },
                    ],
                    minimum_should_match: 1,
                  },
                },
              ],
            },
          },
        },
        failed_findings_count: {
          filter: {
            bool: {
              filter: [
                {
                  bool: {
                    should: [
                      {
                        term: {
                          'result.evaluation': 'failed',
                        },
                      },
                    ],
                    minimum_should_match: 1,
                  },
                },
              ],
            },
          },
        },
        resources: {
          filter: {
            bool: {
              filter: [
                {
                  bool: {
                    should: [
                      {
                        term: {
                          'resource.sub_type': 'Pod',
                        },
                      },
                    ],
                    minimum_should_match: 1,
                  },
                },
              ],
            },
          },
          aggs: {
            pods_count: {
              cardinality: {
                field: 'resource.id',
              },
            },
          },
        },
      },
    },
  },

  size: 0,
  _source: false,
});

const getKspmAccounts = (
  aggregatedResourcesStats: KspmAccountsResponse,
  logger: Logger
): KspmAccountStats[] => {
  const accounts = aggregatedResourcesStats.accounts.buckets;

  const kspmAccountsStats = accounts.map((account) => ({
    account_id: account.key,
    doc_count: account.doc_count,
    posture_score: calculatePostureScore(
      account.passed_findings_count.doc_count,
      account.failed_findings_count.doc_count
    ),
    passed_findings_count: account.passed_findings_count.doc_count,
    failed_findings_count: account.failed_findings_count.doc_count,
    benchmark_name: account.benchmark_name.top[0].metrics['rule.benchmark.name'],
    benchmark_version: account.benchmark_version.top[0].metrics['rule.benchmark.version'],
    kubernetes_version: account.kubernetes_version.top[0].metrics['cloudbeat.kubernetes.version'],
    agents_count: account.agents_count.value,
    cloud_provider: cloudProviders[account.benchmark_id.top[0].metrics['rule.benchmark.id']],
    nodes_count: account.nodes_count.value,
    pods_count: account.resources.pods_count.value,
  }));

  logger.info('KSPM telemetry: accounts stats was sent');

  return kspmAccountsStats;
};

export const getKspmAccountsStats = async (
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<KspmAccountStats[]> => {
  return await getAccountsStatsByIntegration<KspmAccountStats, KspmAccountsResponse>(
    esClient,
    logger,
    getKspmAccountsStatsQuery,
    getKspmAccounts,
    LATEST_FINDINGS_INDEX_DEFAULT_NS,
    KSPM_POLICY_TEMPLATE
  );
};
