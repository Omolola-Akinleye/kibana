/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSubscriptionStatus } from '../common/hooks/use_subscription_status';
import Chance from 'chance';
import {
  DEFAULT_NO_DATA_TEST_SUBJECT,
  ERROR_STATE_TEST_SUBJECT,
  isCommonError,
  LOADING_STATE_TEST_SUBJECT,
  PACKAGE_NOT_INSTALLED_TEST_SUBJECT,
  SUBSCRIPTION_NOT_ALLOWED_TEST_SUBJECT,
  VULN_MGMT_INTEGRATION_NOT_INSTALLED_TEST_SUBJECT,
} from './cloud_posture_page';
import { createReactQueryResponse } from '../test/fixtures/react_query';
import { TestProvider } from '../test/test_provider';
import { coreMock } from '@kbn/core/public/mocks';
import { render, screen } from '@testing-library/react';
import React, { ComponentProps } from 'react';
import { UseQueryResult } from '@tanstack/react-query';
import { CloudPosturePage } from './cloud_posture_page';
import { NoDataPage } from '@kbn/kibana-react-plugin/public';
import { useCspSetupStatusApi } from '../common/api/use_setup_status_api';
import { useCspIntegrationLink } from '../common/navigation/use_csp_integration_link';
import {
  LATEST_VULNERABILITIES_INDEX_DEFAULT_NS,
  VULN_MGMT_POLICY_TEMPLATE,
} from '../../common/constants';
import { useLocation } from 'react-router-dom';
import { findingsNavigation } from '../common/navigation/constants';

const chance = new Chance();

jest.mock('../common/api/use_setup_status_api');
jest.mock('../common/hooks/use_subscription_status');
jest.mock('../common/navigation/use_csp_integration_link');

const mockLocation = {
  pathname: findingsNavigation.vulnerabilities.path,
  search: '',
  hash: '',
  state: null,
};

describe('<CloudPosturePage />', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (useCspSetupStatusApi as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
        data: { status: 'indexed' },
      })
    );

    (useSubscriptionStatus as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
        data: true,
      })
    );
  });

  const renderCloudPosturePage = (
    props: ComponentProps<typeof CloudPosturePage> = { children: null }
  ) => {
    const mockCore = coreMock.createStart();

    render(
      <TestProvider
        core={{
          ...mockCore,
          application: {
            ...mockCore.application,
            capabilities: {
              ...mockCore.application.capabilities,
              // This is required so that the `noDataConfig` view will show the action button
              navLinks: { integrations: true },
            },
          },
        }}
      >
        <CloudPosturePage {...props} />
      </TestProvider>
    );
  };

  it('renders children if setup status is indexed', () => {
    const children = chance.sentence();
    renderCloudPosturePage({ children });

    expect(screen.getByText(children)).toBeInTheDocument();
    expect(screen.queryByTestId(LOADING_STATE_TEST_SUBJECT)).not.toBeInTheDocument();
    expect(screen.queryByTestId(SUBSCRIPTION_NOT_ALLOWED_TEST_SUBJECT)).not.toBeInTheDocument();
    expect(screen.queryByTestId(ERROR_STATE_TEST_SUBJECT)).not.toBeInTheDocument();
    expect(screen.queryByTestId(PACKAGE_NOT_INSTALLED_TEST_SUBJECT)).not.toBeInTheDocument();
  });

  it('renders default loading state when the subscription query is loading', () => {
    (useSubscriptionStatus as jest.Mock).mockImplementation(
      () =>
        createReactQueryResponse({
          status: 'loading',
        }) as unknown as UseQueryResult
    );

    const children = chance.sentence();
    renderCloudPosturePage({ children });

    expect(screen.getByTestId(LOADING_STATE_TEST_SUBJECT)).toBeInTheDocument();
    expect(screen.queryByText(children)).not.toBeInTheDocument();
    expect(screen.queryByTestId(ERROR_STATE_TEST_SUBJECT)).not.toBeInTheDocument();
    expect(screen.queryByTestId(SUBSCRIPTION_NOT_ALLOWED_TEST_SUBJECT)).not.toBeInTheDocument();
    expect(screen.queryByTestId(PACKAGE_NOT_INSTALLED_TEST_SUBJECT)).not.toBeInTheDocument();
  });

  it('renders default error state when the subscription query has an error', () => {
    (useSubscriptionStatus as jest.Mock).mockImplementation(
      () =>
        createReactQueryResponse({
          status: 'error',
          error: new Error('error'),
        }) as unknown as UseQueryResult
    );

    const children = chance.sentence();
    renderCloudPosturePage({ children });

    expect(screen.getByTestId(ERROR_STATE_TEST_SUBJECT)).toBeInTheDocument();
    expect(screen.queryByTestId(LOADING_STATE_TEST_SUBJECT)).not.toBeInTheDocument();
    expect(screen.queryByTestId(SUBSCRIPTION_NOT_ALLOWED_TEST_SUBJECT)).not.toBeInTheDocument();
    expect(screen.queryByText(children)).not.toBeInTheDocument();
    expect(screen.queryByTestId(PACKAGE_NOT_INSTALLED_TEST_SUBJECT)).not.toBeInTheDocument();
  });

  it('renders subscription not allowed prompt if subscription is not installed', () => {
    (useSubscriptionStatus as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
        data: false,
      })
    );

    const children = chance.sentence();
    renderCloudPosturePage({ children });

    expect(screen.queryByTestId(PACKAGE_NOT_INSTALLED_TEST_SUBJECT)).not.toBeInTheDocument();
    expect(screen.queryByText(children)).not.toBeInTheDocument();
    expect(screen.queryByTestId(LOADING_STATE_TEST_SUBJECT)).not.toBeInTheDocument();
    expect(screen.getByTestId(SUBSCRIPTION_NOT_ALLOWED_TEST_SUBJECT)).toBeInTheDocument();
    expect(screen.queryByTestId(ERROR_STATE_TEST_SUBJECT)).not.toBeInTheDocument();
  });

  it('renders integrations installation prompt if integration is not installed', () => {
    (useCspSetupStatusApi as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
        data: {
          kspm: { status: 'not-installed' },
          cspm: { status: 'not-installed' },
          indicesDetails: [
            { index: 'logs-cloud_security_posture.findings_latest-default', status: 'empty' },
            { index: 'logs-cloud_security_posture.findings-default*', status: 'empty' },
          ],
        },
      })
    );
    (useCspIntegrationLink as jest.Mock).mockImplementation(() => chance.url());

    const children = chance.sentence();
    renderCloudPosturePage({ children });

    expect(screen.getByTestId(PACKAGE_NOT_INSTALLED_TEST_SUBJECT)).toBeInTheDocument();
    expect(screen.queryByText(children)).not.toBeInTheDocument();
    expect(screen.queryByTestId(LOADING_STATE_TEST_SUBJECT)).not.toBeInTheDocument();
    expect(screen.queryByTestId(SUBSCRIPTION_NOT_ALLOWED_TEST_SUBJECT)).not.toBeInTheDocument();
    expect(screen.queryByTestId(ERROR_STATE_TEST_SUBJECT)).not.toBeInTheDocument();
  });

  // Todo: fix this test once we have a way to mock the useLocation hook
  xit('renders vuln_mgmt integrations installation prompt if vuln_mgmt integration is not installed', () => {
    (useCspSetupStatusApi as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
        data: {
          kspm: { status: 'not-deployed' },
          cspm: { status: 'not-deployed' },
          [VULN_MGMT_POLICY_TEMPLATE]: { status: 'not-installed' },
          indicesDetails: [
            { index: 'logs-cloud_security_posture.findings_latest-default', status: 'empty' },
            { index: 'logs-cloud_security_posture.findings-default*', status: 'empty' },
            { index: LATEST_VULNERABILITIES_INDEX_DEFAULT_NS, status: 'empty' },
          ],
        },
      })
    );
    (useLocation as jest.Mock).mockImplementation(() => mockLocation);
    (useCspIntegrationLink as jest.Mock).mockImplementation(() => chance.url());

    const children = chance.sentence();
    renderCloudPosturePage({ children });

    expect(
      screen.getByTestId(VULN_MGMT_INTEGRATION_NOT_INSTALLED_TEST_SUBJECT)
    ).toBeInTheDocument();
    expect(screen.queryByText(children)).not.toBeInTheDocument();
    expect(screen.queryByTestId(LOADING_STATE_TEST_SUBJECT)).not.toBeInTheDocument();
    expect(screen.queryByTestId(SUBSCRIPTION_NOT_ALLOWED_TEST_SUBJECT)).not.toBeInTheDocument();
    expect(screen.queryByTestId(ERROR_STATE_TEST_SUBJECT)).not.toBeInTheDocument();
  });

  it('renders default loading state when the integration query is loading', () => {
    (useCspSetupStatusApi as jest.Mock).mockImplementation(
      () =>
        createReactQueryResponse({
          status: 'loading',
        }) as unknown as UseQueryResult
    );

    const children = chance.sentence();
    renderCloudPosturePage({ children });

    expect(screen.getByTestId(LOADING_STATE_TEST_SUBJECT)).toBeInTheDocument();
    expect(screen.queryByText(children)).not.toBeInTheDocument();
    expect(screen.queryByTestId(ERROR_STATE_TEST_SUBJECT)).not.toBeInTheDocument();
    expect(screen.queryByTestId(SUBSCRIPTION_NOT_ALLOWED_TEST_SUBJECT)).not.toBeInTheDocument();
    expect(screen.queryByTestId(PACKAGE_NOT_INSTALLED_TEST_SUBJECT)).not.toBeInTheDocument();
  });

  it('renders default error state when the integration query has an error', () => {
    (useCspSetupStatusApi as jest.Mock).mockImplementation(
      () =>
        createReactQueryResponse({
          status: 'error',
          error: new Error('error'),
        }) as unknown as UseQueryResult
    );

    const children = chance.sentence();
    renderCloudPosturePage({ children });

    expect(screen.getByTestId(ERROR_STATE_TEST_SUBJECT)).toBeInTheDocument();
    expect(screen.queryByTestId(LOADING_STATE_TEST_SUBJECT)).not.toBeInTheDocument();
    expect(screen.queryByTestId(SUBSCRIPTION_NOT_ALLOWED_TEST_SUBJECT)).not.toBeInTheDocument();
    expect(screen.queryByText(children)).not.toBeInTheDocument();
    expect(screen.queryByTestId(PACKAGE_NOT_INSTALLED_TEST_SUBJECT)).not.toBeInTheDocument();
  });

  it('renders default loading text when query isLoading', () => {
    const query = createReactQueryResponse({
      status: 'loading',
    }) as unknown as UseQueryResult;

    const children = chance.sentence();
    renderCloudPosturePage({ children, query });

    expect(screen.getByTestId(LOADING_STATE_TEST_SUBJECT)).toBeInTheDocument();
    expect(screen.queryByTestId(SUBSCRIPTION_NOT_ALLOWED_TEST_SUBJECT)).not.toBeInTheDocument();
    expect(screen.queryByText(children)).not.toBeInTheDocument();
    expect(screen.queryByTestId(ERROR_STATE_TEST_SUBJECT)).not.toBeInTheDocument();
    expect(screen.queryByTestId(PACKAGE_NOT_INSTALLED_TEST_SUBJECT)).not.toBeInTheDocument();
  });

  it('renders default loading text when query is idle', () => {
    const query = createReactQueryResponse({
      status: 'idle',
    }) as unknown as UseQueryResult;

    const children = chance.sentence();
    renderCloudPosturePage({ children, query });

    expect(screen.getByTestId(LOADING_STATE_TEST_SUBJECT)).toBeInTheDocument();
    expect(screen.queryByTestId(SUBSCRIPTION_NOT_ALLOWED_TEST_SUBJECT)).not.toBeInTheDocument();
    expect(screen.queryByText(children)).not.toBeInTheDocument();
    expect(screen.queryByTestId(ERROR_STATE_TEST_SUBJECT)).not.toBeInTheDocument();
    expect(screen.queryByTestId(PACKAGE_NOT_INSTALLED_TEST_SUBJECT)).not.toBeInTheDocument();
  });

  it('renders default error texts when query isError', () => {
    const error = chance.sentence();
    const message = chance.sentence();
    const statusCode = chance.integer();

    const query = createReactQueryResponse({
      status: 'error',
      error: {
        body: {
          error,
          message,
          statusCode,
        },
      },
    }) as unknown as UseQueryResult;

    const children = chance.sentence();
    renderCloudPosturePage({ children, query });

    [error, message, statusCode].forEach((text) =>
      expect(screen.getByText(text, { exact: false })).toBeInTheDocument()
    );
    expect(screen.getByTestId(ERROR_STATE_TEST_SUBJECT)).toBeInTheDocument();
    expect(screen.queryByTestId(SUBSCRIPTION_NOT_ALLOWED_TEST_SUBJECT)).not.toBeInTheDocument();
    expect(screen.queryByTestId(LOADING_STATE_TEST_SUBJECT)).not.toBeInTheDocument();
    expect(screen.queryByText(children)).not.toBeInTheDocument();
    expect(screen.queryByTestId(PACKAGE_NOT_INSTALLED_TEST_SUBJECT)).not.toBeInTheDocument();
  });

  it('prefers custom error render', () => {
    const error = chance.sentence();
    const message = chance.sentence();
    const statusCode = chance.integer();

    const query = createReactQueryResponse({
      status: 'error',
      error: {
        body: {
          error,
          message,
          statusCode,
        },
      },
    }) as unknown as UseQueryResult;

    const children = chance.sentence();
    renderCloudPosturePage({
      children,
      query,
      errorRender: (err) => <div>{isCommonError(err) && err.body.message}</div>,
    });

    expect(screen.getByText(message)).toBeInTheDocument();
    [error, statusCode].forEach((text) => expect(screen.queryByText(text)).not.toBeInTheDocument());
    expect(screen.queryByTestId(ERROR_STATE_TEST_SUBJECT)).not.toBeInTheDocument();
    expect(screen.queryByTestId(LOADING_STATE_TEST_SUBJECT)).not.toBeInTheDocument();
    expect(screen.queryByTestId(SUBSCRIPTION_NOT_ALLOWED_TEST_SUBJECT)).not.toBeInTheDocument();
    expect(screen.queryByText(children)).not.toBeInTheDocument();
    expect(screen.queryByTestId(PACKAGE_NOT_INSTALLED_TEST_SUBJECT)).not.toBeInTheDocument();
  });

  it('prefers custom loading render', () => {
    const loading = chance.sentence();

    const query = createReactQueryResponse({
      status: 'loading',
    }) as unknown as UseQueryResult;

    const children = chance.sentence();
    renderCloudPosturePage({
      children,
      query,
      loadingRender: () => <div>{loading}</div>,
    });

    expect(screen.getByText(loading)).toBeInTheDocument();
    expect(screen.queryByTestId(ERROR_STATE_TEST_SUBJECT)).not.toBeInTheDocument();
    expect(screen.queryByTestId(LOADING_STATE_TEST_SUBJECT)).not.toBeInTheDocument();
    expect(screen.queryByTestId(SUBSCRIPTION_NOT_ALLOWED_TEST_SUBJECT)).not.toBeInTheDocument();
    expect(screen.queryByText(children)).not.toBeInTheDocument();
    expect(screen.queryByTestId(PACKAGE_NOT_INSTALLED_TEST_SUBJECT)).not.toBeInTheDocument();
  });

  it('renders no data prompt when query data is undefined', () => {
    const query = createReactQueryResponse({
      status: 'success',
      data: undefined,
    }) as unknown as UseQueryResult;

    const children = chance.sentence();
    renderCloudPosturePage({ children, query });

    expect(screen.getByTestId(DEFAULT_NO_DATA_TEST_SUBJECT)).toBeInTheDocument();
    expect(screen.queryByTestId(LOADING_STATE_TEST_SUBJECT)).not.toBeInTheDocument();
    expect(screen.queryByTestId(SUBSCRIPTION_NOT_ALLOWED_TEST_SUBJECT)).not.toBeInTheDocument();
    expect(screen.queryByText(children)).not.toBeInTheDocument();
    expect(screen.queryByTestId(ERROR_STATE_TEST_SUBJECT)).not.toBeInTheDocument();
    expect(screen.queryByTestId(PACKAGE_NOT_INSTALLED_TEST_SUBJECT)).not.toBeInTheDocument();
  });

  it('prefers custom no data prompt', () => {
    const pageTitle = chance.sentence();
    const solution = chance.sentence();
    const docsLink = chance.sentence();
    const noDataRenderer = () => (
      <NoDataPage pageTitle={pageTitle} solution={solution} docsLink={docsLink} actions={{}} />
    );

    const query = createReactQueryResponse({
      status: 'success',
      data: undefined,
    }) as unknown as UseQueryResult;

    const children = chance.sentence();
    renderCloudPosturePage({
      children,
      query,
      noDataRenderer,
    });

    expect(screen.getByText(pageTitle)).toBeInTheDocument();
    expect(screen.getAllByText(solution, { exact: false })[0]).toBeInTheDocument();
    expect(screen.queryByTestId(LOADING_STATE_TEST_SUBJECT)).not.toBeInTheDocument();
    expect(screen.queryByTestId(SUBSCRIPTION_NOT_ALLOWED_TEST_SUBJECT)).not.toBeInTheDocument();
    expect(screen.queryByText(children)).not.toBeInTheDocument();
    expect(screen.queryByTestId(ERROR_STATE_TEST_SUBJECT)).not.toBeInTheDocument();
    expect(screen.queryByTestId(PACKAGE_NOT_INSTALLED_TEST_SUBJECT)).not.toBeInTheDocument();
  });
});
