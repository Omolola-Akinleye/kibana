/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import {
  BENCHMARK_SCORE_INDEX_DEFAULT_NS,
  LATEST_FINDINGS_INDEX_DEFAULT_NS,
} from '@kbn/cloud-security-posture-plugin/common/constants';
import {
  ComplianceDashboardData,
  PostureTrend,
} from '@kbn/cloud-security-posture-plugin/common/types';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';
import { benchmarkScoreMockData, complianceDashboardDataMock } from './mocks/benchmark_score_mock';
import { findingsMockData } from './mocks/findings_mock';

// eslint-disable-next-line import/no-default-export
export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;

  const kibanaHttpClient = getService('supertest');

  const retry = getService('retry');
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');

  /**
   * required before indexing findings
   */
  const waitForPluginInitialized = (): Promise<void> =>
    retry.try(async () => {
      log.debug('Check CSP plugin is initialized');
      const response = await supertest
        .get('/internal/cloud_security_posture/status?check=init')
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .expect(200);
      expect(response.body).to.eql({ isPluginInitialized: true });
      log.debug('CSP plugin is initialized');
    });

  const index = {
    addFindings: async <T>(findingsMock: T[]) => {
      await Promise.all(
        findingsMock.map((findingsDoc) =>
          es.index({
            index: LATEST_FINDINGS_INDEX_DEFAULT_NS,
            body: { ...findingsDoc, '@timestamp': new Date().toISOString() },
            refresh: true,
          })
        )
      );
    },

    addScores: async <T>(scoresMock: T[]) => {
      await Promise.all(
        scoresMock.map((scoreDoc) =>
          es.index({
            index: BENCHMARK_SCORE_INDEX_DEFAULT_NS,
            body: { ...scoreDoc, '@timestamp': new Date().toISOString() },
            refresh: true,
          })
        )
      );
    },

    removeFindings: async () => {
      const indexExists = await es.indices.exists({ index: LATEST_FINDINGS_INDEX_DEFAULT_NS });

      if (indexExists) {
        es.deleteByQuery({
          index: LATEST_FINDINGS_INDEX_DEFAULT_NS,
          query: { match_all: {} },
          refresh: true,
        });
      }
    },

    removeScores: async () => {
      const indexExists = await es.indices.exists({ index: BENCHMARK_SCORE_INDEX_DEFAULT_NS });

      if (indexExists) {
        es.deleteByQuery({
          index: BENCHMARK_SCORE_INDEX_DEFAULT_NS,
          query: { match_all: {} },
          refresh: true,
        });
      }
    },

    deleteFindingsIndex: async () => {
      const indexExists = await es.indices.exists({ index: LATEST_FINDINGS_INDEX_DEFAULT_NS });

      if (indexExists) {
        await es.indices.delete({ index: LATEST_FINDINGS_INDEX_DEFAULT_NS });
      }
    },
  };

  describe('GET /internal/cloud_security_posture/stats', () => {
    describe('benchmarks', async () => {
      beforeEach(async () => {
        await index.removeFindings();
        await index.removeScores();

        await waitForPluginInitialized();
        await index.addScores(benchmarkScoreMockData);
        await index.addFindings([findingsMockData[1]]);
      });

      it('should return CSPM benchmarks ', async () => {
        const { body: res }: { body: ComplianceDashboardData } = await kibanaHttpClient
          .get(`/internal/cloud_security_posture/stats/cspm`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        const removeRealtimeCalculatedFields = (trends: PostureTrend[]) => {
          return trends.map((trend: PostureTrend) => {
            const { timestamp, ...rest } = trend;
            return rest;
          });
        };

        const resBenchmarks = res.benchmarks.flatMap((benchmark) => ({
          ...benchmark,
          trend: removeRealtimeCalculatedFields(benchmark.trend),
        }));

        const resClusters = res.clusters.flatMap((cluster) => {
          const clusterWithoutTrend = {
            ...cluster,
            trend: removeRealtimeCalculatedFields(cluster.trend),
          };
          const { lastUpdate, ...clusterWithoutTime } = clusterWithoutTrend.meta;

          return { ...clusterWithoutTrend, meta: clusterWithoutTime };
        });

        const trends = removeRealtimeCalculatedFields(res.trend);

        expect({
          ...res,
          clusters: resClusters,
          benchmarks: resBenchmarks,
          trend: trends,
        }).to.eql(complianceDashboardDataMock);
      });
    });
  });
}
