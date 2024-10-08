/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  FC,
} from 'react';
import { useSelector } from 'react-redux';
import { useEvent } from 'react-use';
import moment from 'moment';
import { Subject } from 'rxjs';
import { selectRefreshInterval, selectRefreshPaused } from '../state';

interface SyntheticsRefreshContext {
  lastRefresh: number;
  refreshApp: () => void;
}

const defaultContext: SyntheticsRefreshContext = {
  lastRefresh: 0,
  refreshApp: () => {
    throw new Error('App refresh was not initialized, set it when you invoke the context');
  },
};

export const SyntheticsRefreshContext = createContext(defaultContext);

export const SyntheticsRefreshContextProvider: FC<{
  reload$?: Subject<boolean>;
}> = ({ children, reload$ }) => {
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());

  const refreshPaused = useSelector(selectRefreshPaused);
  const refreshInterval = useSelector(selectRefreshInterval);

  const refreshApp = useCallback(() => {
    const refreshTime = Date.now();
    setLastRefresh(refreshTime);
  }, [setLastRefresh]);

  useEffect(() => {
    if (!refreshPaused) {
      refreshApp();
    }
  }, [refreshApp, refreshPaused]);

  useEffect(() => {
    const subscription = reload$?.subscribe(() => {
      refreshApp();
    });
    return () => subscription?.unsubscribe();
  }, [reload$, refreshApp]);

  const value = useMemo(() => {
    return {
      lastRefresh,
      refreshApp,
    };
  }, [lastRefresh, refreshApp]);

  useEvent(
    'visibilitychange',
    () => {
      const isOutdated = moment().diff(new Date(lastRefresh), 'seconds') > refreshInterval;
      if (document.visibilityState !== 'hidden' && !refreshPaused && isOutdated) {
        refreshApp();
      }
    },
    document
  );

  useEffect(() => {
    if (refreshPaused) {
      return;
    }
    const interval = setInterval(() => {
      if (document.visibilityState !== 'hidden') {
        refreshApp();
      }
    }, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [refreshPaused, refreshApp, refreshInterval]);

  return <SyntheticsRefreshContext.Provider value={value} children={children} />;
};

export const useSyntheticsRefreshContext = () => useContext(SyntheticsRefreshContext);
