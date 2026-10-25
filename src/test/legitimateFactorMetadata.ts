/** In-memory source models for tests unrelated to demo authorization.
 * These metadata do not approve the numerical values supplied by a test.
 * No workspace opt-in, seed records, or production factor data are changed.
 */
export const LEGITIMATE_OFFICIAL_FACTOR = {
  sourceAuthority: 'Example inventory agency',
  sourceDocument: 'Published inventory factors',
  sourceReference: 'Published inventory factors',
  confidenceLevel: 'OFFICIAL_GOVERNMENT',
  verificationStatus: 'VERIFIED',
  verified: true,
} as const;
