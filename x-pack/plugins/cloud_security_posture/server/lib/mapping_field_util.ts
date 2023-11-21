/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DELIMITER = ';';
export const MAPPING_VERSION_DELIMITER = '_';
export const DOC_FIELD_VERSION_DELIMITER = '.';

export const toBenchmarkDocFieldKey = (benchmarkId: string, benchmarkVersion: string) => {
  if (benchmarkVersion.includes(MAPPING_VERSION_DELIMITER))
    return `${benchmarkId}${DELIMITER}${benchmarkVersion.replaceAll(
      `${MAPPING_VERSION_DELIMITER}`,
      DOC_FIELD_VERSION_DELIMITER
    )}`;
  return `${benchmarkId}${DELIMITER}${benchmarkVersion}`;
};

export const toBenchmarkMappingFieldKey = (benchmarkId: string, benchmarkVersion: string) => {
  if (benchmarkVersion.includes(DOC_FIELD_VERSION_DELIMITER))
    return `${benchmarkId}${DELIMITER}${benchmarkVersion.replaceAll(
      `${DOC_FIELD_VERSION_DELIMITER}`,
      MAPPING_VERSION_DELIMITER
    )}`;
  return `${benchmarkId}${DELIMITER}${benchmarkVersion}`;
};
