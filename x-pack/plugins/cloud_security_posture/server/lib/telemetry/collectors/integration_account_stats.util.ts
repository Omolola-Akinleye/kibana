/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/core/server';
import {
  CnvmAccountsResponse,
  CnvmAccountStats,
  CspmAccountsResponse,
  CspmAccountsStats,
  KspmAccountsResponse,
  KspmAccountStats,
} from './types';
type IntegrationAccountResponseType =
  | CspmAccountsResponse
  | KspmAccountsResponse
  | CnvmAccountsResponse;
type IntegrationAccountStatsType = CspmAccountsStats | KspmAccountStats | CnvmAccountStats; // Adjust the response types accordingly

export const getAccountsStatsByIntegration = async <
  T extends IntegrationAccountStatsType,
  U extends IntegrationAccountResponseType
>(
  esClient: ElasticsearchClient,
  logger: Logger,
  getAccountsStatsQuery: () => SearchRequest,
  getIntegrationAccounts: (integrationAccountsStatsResponse: U, logger: Logger) => T[],
  index: string,
  policyTemplate: string
): Promise<T[]> => {
  try {
    const isIndexExists = await esClient.indices.exists({
      index,
    });

    if (isIndexExists) {
      const integrationAccountsStatsResponse = await esClient.search<unknown, U>(
        getAccountsStatsQuery()
      );

      const integrationAccountsStats = integrationAccountsStatsResponse.aggregations
        ? getIntegrationAccounts(integrationAccountsStatsResponse.aggregations, logger)
        : [];

      return integrationAccountsStats;
    }

    return [];
  } catch (e) {
    logger.error(`Failed to get ${policyTemplate} account stats ${e}`);
    return [];
  }
};

export const cloudProviders: { [key: string]: string } = {
  cis_eks: 'aws',
  cis_gke: 'gcp',
  cis_k8s: 'self_managed',
} as const;
