/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { CSSObject } from '@emotion/react';

export const useStyles = () => {
  const cached = useMemo(() => {
    const iconTooltipButton: CSSObject = {
      color: '#fff',
    };

    const button: CSSObject = {
      width: '32px',
      height: '24px',
      borderRadius: '16px',
      backgroundColor: '#F1F4FA',
    };

    const tooltip: CSSObject = {
      width: '256px',
    };

    const tooltipContent: CSSObject = {
      display: 'flex',
      justifyContent: 'space-between',
    };

    return {
      iconTooltipButton,
      button,
      tooltip,
      tooltipContent,
    };
  }, []);

  return cached;
};
