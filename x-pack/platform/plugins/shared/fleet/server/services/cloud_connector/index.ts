/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CloudConnectorVarsRecord } from '../../../common/types/models/cloud_connector';
import { NewPackagePolicy } from '../../types';
import { SUPPORTED_CLOUD_CONNECTOR_VARS } from '../../../common/constants/cloud_connector';

export const extractCloudVarsFromPackagePolicy = (
  packagePolicy: NewPackagePolicy
): CloudConnectorVarsRecord | null => {
  for (const input of packagePolicy.inputs) {
    if (input.enabled && input.streams.length > 0) {
      const vars = input.streams.find((stream) => stream.enabled)?.vars;
      if (vars) {
        return Object.entries(vars)
          .filter(([key, _value]) => SUPPORTED_CLOUD_CONNECTOR_VARS.includes(key))
          .reduce((acc, [key, value]) => {
            acc[key] = value;
            return acc;
          }, {} as CloudConnectorVarsRecord);
      }
    }
  }
  return null;
};
