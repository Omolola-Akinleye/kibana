/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/core/server';
import type { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import { getCloudAccountIdRuntimeMapping } from '../../../../common/runtime_mappings/get_safe_cloud_account_id_runtime_mapping';
import { calculatePostureScore } from '../../../../common/utils/helpers';
import type { CspmAccountsResponse, CspmAccountsStats } from './types';
import {
  CSPM_POLICY_TEMPLATE,
  LATEST_FINDINGS_INDEX_DEFAULT_NS,
} from '../../../../common/constants';
import { getAccountsStatsByIntegration } from './integration_account_stats.util';

const getCspmAccountsStatsQuery = (): SearchRequest => ({
  index: LATEST_FINDINGS_INDEX_DEFAULT_NS,
  runtime_mappings: getCloudAccountIdRuntimeMapping(),
  query: {
    match_all: {},
  },
  aggs: {
    accounts: {
      terms: {
        field: 'safe_cloud_account_id',
        order: {
          _count: 'desc',
        },
        size: 100,
      },
      aggs: {
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
        cloud_provider: {
          top_metrics: {
            metrics: {
              field: 'cloud.provider',
            },
            size: 1,
            sort: {
              '@timestamp': 'desc',
            },
          },
        },
      },
    },
  },

  size: 0,
  _source: false,
});

const getCspmAccounts = (
  cspmAccountsResponse: CspmAccountsResponse,
  logger: Logger
): CspmAccountsStats[] => {
  const cspmAccounts = cspmAccountsResponse.accounts.buckets;

  const cspmAccountsStats = cspmAccounts.map((account) => ({
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
    cloud_provider: account.cloud_provider.top[0].metrics['cloud.provider'],
  }));
  logger.info('CSPM telemetry: accounts stats was sent');

  return cspmAccountsStats;
};

export const getCspmAccountsStats = async (
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<CspmAccountsStats[]> => {
  return await getAccountsStatsByIntegration<CspmAccountsStats, CspmAccountsResponse>(
    esClient,
    logger,
    getCspmAccountsStatsQuery,
    getCspmAccounts,
    LATEST_FINDINGS_INDEX_DEFAULT_NS,
    CSPM_POLICY_TEMPLATE
  );
};
