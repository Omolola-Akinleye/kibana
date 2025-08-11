/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const fleetAndAgents = getService('fleetAndAgents');

  const testUsers = {
    fleetAll: {
      username: 'fleet_all',
      password: 'fleet_all-password',
      roles: ['fleet_all'],
    },
    fleetRead: {
      username: 'fleet_read',
      password: 'fleet_read-password',
      roles: ['fleet_read'],
    },
    fleetNone: {
      username: 'fleet_none',
      password: 'fleet_none-password',
      roles: ['fleet_none'],
    },
  };

  const READ_SCENARIOS = [
    {
      user: testUsers.fleetAll,
      statusCode: 200,
    },
    {
      user: testUsers.fleetRead,
      statusCode: 200,
    },
    {
      user: testUsers.fleetNone,
      statusCode: 403,
    },
  ];

  const ALL_SCENARIOS = [
    {
      user: testUsers.fleetAll,
      statusCode: 200,
    },
    {
      user: testUsers.fleetRead,
      statusCode: 403,
    },
    {
      user: testUsers.fleetNone,
      statusCode: 403,
    },
  ];

  const ROUTES = [
    {
      method: 'GET',
      path: '/api/fleet/cloud_connectors',
      scenarios: READ_SCENARIOS,
    },
    {
      method: 'POST',
      path: '/api/fleet/cloud_connectors',
      scenarios: ALL_SCENARIOS,
      send: {
        name: 'test-cloud-connector',
        cloudProvider: 'aws',
        vars: {
          role_arn: 'arn:aws:iam::123456789012:role/test-role',
          external_id: {
            type: 'password',
            value: {
              id: 'test-external-id-12345678901234567890',
              isSecretRef: true,
            },
          },
        },
      },
    },
    {
      method: 'POST',
      path: '/api/fleet/cloud_connectors',
      scenarios: ALL_SCENARIOS,
      send: {
        name: 'test-cloud-connector-alt-format',
        cloudProvider: 'aws',
        vars: {
          'aws.role_arn': 'arn:aws:iam::123456789012:role/test-role-alt',
          'aws.credentials.external_id': {
            type: 'password',
            value: {
              id: 'test-external-id-alt-12345678901234567890',
              isSecretRef: true,
            },
          },
        },
      },
    },
  ];

  describe('Cloud Connector Privileges', () => {
    before(async () => {
      await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
      await kibanaServer.savedObjects.cleanStandardList();
      await fleetAndAgents.setup();
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
    });

    ROUTES.forEach((route) => {
      route.scenarios.forEach((scenario) => {
        it(`${route.method} ${route.path} - ${scenario.user.username} should return ${scenario.statusCode}`, async () => {
          const { username, password } = scenario.user;
          const auth = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

          let request = route.method === 'GET' 
            ? supertest.get(route.path)
            : supertest.post(route.path);
          request = request
            .set('kbn-xsrf', 'xxxx')
            .set('Authorization', auth);

          if (route.send) {
            request = request.send(route.send);
          }

          const response = await request.expect(scenario.statusCode);

          if (scenario.statusCode === 200) {
            if (route.method === 'GET') {
              expect(response.body).to.be.an('array');
            } else if (route.method === 'POST' && route.send) {
              expect(response.body).to.have.property('id');
              expect(response.body.name).to.equal(route.send.name);
              expect(response.body.cloudProvider).to.equal(route.send.cloudProvider);
            }
          }
        });
      });
    });
  });
} 