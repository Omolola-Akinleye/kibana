/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CollectorFetchContext, UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { CoreStart, Logger } from '@kbn/core/server';
import { CspServerPluginStart, CspServerPluginStartDeps } from '../../../types';
import { getIndicesStats } from './indices_stats_collector';
import { getResourcesStats } from './resources_stats_collector';
import { cspmUsageSchema } from './schema';
import { CspmUsage } from './types';
import { getAccountsStats } from './accounts_stats_collector';
import { getRulesStats } from './rules_stats_collector';
import { getInstallationStats } from './installation_stats_collector';
import { getKspmAccountsStats } from './kspm_stats_collectors';
import { getCspmAccountsStats } from './cspm_stats_collectors';
import { getCnvmAccountsStats } from './cnvm_stats_collectors';

export function registerCspmUsageCollector(
  logger: Logger,
  coreServices: Promise<[CoreStart, CspServerPluginStartDeps, CspServerPluginStart]>,
  usageCollection?: UsageCollectionSetup
): void {
  // usageCollection is an optional dependency, so make sure to return if it is not registered
  if (!usageCollection) {
    return;
  }

  // Create usage collector
  const cspmUsageCollector = usageCollection.makeUsageCollector<CspmUsage>({
    type: 'cloud_security_posture',
    isReady: async () => {
      await coreServices;
      return true;
    },
    fetch: async (collectorFetchContext: CollectorFetchContext) => {
      const [
        indicesStats,
        accountsStats,
        resourcesStats,
        rulesStats,
        installationStats,
        kspmAccountStats,
        cspmAccountsStats,
        cnvmAccountsStats,
      ] = await Promise.all([
        getIndicesStats(
          collectorFetchContext.esClient,
          collectorFetchContext.soClient,
          coreServices,
          logger
        ),
        getAccountsStats(collectorFetchContext.esClient, logger),
        getResourcesStats(collectorFetchContext.esClient, logger),
        getRulesStats(collectorFetchContext.esClient, logger),
        getInstallationStats(
          collectorFetchContext.esClient,
          collectorFetchContext.soClient,
          coreServices,
          logger
        ),
        getKspmAccountsStats(collectorFetchContext.esClient, logger),
        getCspmAccountsStats(collectorFetchContext.esClient, logger),
        getCnvmAccountsStats(collectorFetchContext.esClient, logger),
      ]);

      return {
        indices: indicesStats,
        accounts_stats: accountsStats,
        resources_stats: resourcesStats,
        rules_stats: rulesStats,
        installation_stats: installationStats,
        kspm_accounts_stats: kspmAccountStats,
        cspm_accounts_stats: cspmAccountsStats,
        cnvm_accounts_stats: cnvmAccountsStats,
      };
    },
    schema: cspmUsageSchema,
  });

  // Register usage collector
  usageCollection.registerCollector(cspmUsageCollector);
}
