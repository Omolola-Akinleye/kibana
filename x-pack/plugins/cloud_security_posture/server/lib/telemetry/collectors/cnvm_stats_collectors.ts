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
import type { CnvmAccountsResponse, CnvmAccountStats } from './types';
import {
  CNVM_POLICY_TEMPLATE,
  LATEST_VULNERABILITIES_INDEX_DEFAULT_NS,
} from '../../../../common/constants';
import { getAccountsStatsByIntegration } from './integration_account_stats.util';

const getCnvmAccountsStatsQuery = (): SearchRequest => ({
  index: LATEST_VULNERABILITIES_INDEX_DEFAULT_NS,
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

const getCnvmAccounts = (
  cnvmAccountsResponse: CnvmAccountsResponse,
  logger: Logger
): CnvmAccountStats[] => {
  const cnvmAccounts = cnvmAccountsResponse.accounts.buckets;

  const cnvmAccountsStats = cnvmAccounts.map((account) => ({
    account_id: account.key,
    doc_count: account.doc_count,
    cloud_provider: account.cloud_provider.top[0].metrics['cloud.provider'],
  }));
  logger.info('CNVM telemetry: accounts stats was sent');

  return cnvmAccountsStats;
};

export const getCnvmAccountsStats = async (
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<CnvmAccountStats[]> => {
  return await getAccountsStatsByIntegration<CnvmAccountStats, CnvmAccountsResponse>(
    esClient,
    logger,
    getCnvmAccountsStatsQuery,
    getCnvmAccounts,
    LATEST_VULNERABILITIES_INDEX_DEFAULT_NS,
    CNVM_POLICY_TEMPLATE
  );
};
