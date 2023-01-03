/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { useStyles } from './styles';

export const ObservabilityIconButton = () => {
  const styles = useStyles();

  return (
    <EuiToolTip
      css={styles.tooltip}
      className=""
      position="top"
      title="Observability stats"
      content={
        <span css={styles.tooltipContent}>
          View observability stats m
          <EuiButtonIcon iconType="sortRight" css={styles.iconTooltipButton} />
        </span>
      }
    >
      <EuiButtonIcon iconType="logoObservability" css={styles.button} />
    </EuiToolTip>
  );
};
