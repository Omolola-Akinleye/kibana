/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { getBenchmarkIdQuery } from './benchmarks_section';
import { BenchmarkData } from '../../../../common/types';
import { useNavigateFindings } from '../../../common/hooks/use_navigate_findings';
import { CISBenchmarkIcon } from '../../../components/cis_benchmark_icon';

export const BenchmarkDetailsBox = ({ benchmark }: { benchmark: BenchmarkData }) => {
  const { euiTheme } = useEuiTheme();
  const navToFindings = useNavigateFindings();

  const handleBenchmarkTitleClick = () => {
    return navToFindings(getBenchmarkIdQuery(benchmark));
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="none" alignItems="flexStart">
      <EuiFlexItem grow={false}>
        <EuiToolTip
          position="top"
          content={
            <EuiText>
              <FormattedMessage
                id="xpack.csp.dashboard.benchmarkSection.benchmarkTitleTooltip.benchmarkPrefixTitle"
                defaultMessage="Show all findings for "
              />
              <strong>
                <FormattedMessage
                  id="xpack.csp.dashboard.benchmarkSection.benchmarkTitleTooltip.benchmarkTitle"
                  defaultMessage="{benchmark} {version}"
                  values={{
                    benchmark: benchmark.meta.benchmarkName,
                    version: benchmark.meta.benchmarkVersion,
                  }}
                />
              </strong>
            </EuiText>
          }
        >
          <EuiLink onClick={handleBenchmarkTitleClick} color="text">
            <EuiTitle css={{ fontSize: 20 }}>
              <h5>
                <FormattedMessage
                  id="xpack.csp.dashboard.benchmarkSection.benchmarkTitle"
                  defaultMessage="{benchmark}"
                  values={{
                    benchmark: benchmark.meta.benchmarkId,
                  }}
                />
              </h5>
            </EuiTitle>
          </EuiLink>
        </EuiToolTip>
        <EuiText size="xs" color="subdued">
          <FormattedMessage
            id="xpack.csp.dashboard.benchmarkSection.cloudAssetCount"
            defaultMessage="{cloudAssetCount}"
            values={{
              cloudAssetCount: benchmark.meta.assetCount,
            }}
          />
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem
        grow={true}
        style={{ justifyContent: 'flex-end', paddingBottom: euiTheme.size.m }}
      >
        <CISBenchmarkIcon type={benchmark.meta.benchmarkId} name={benchmark.meta.benchmarkName} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
