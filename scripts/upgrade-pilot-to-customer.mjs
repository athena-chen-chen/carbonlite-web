#!/usr/bin/env node

import { pathToFileURL } from 'node:url';

const DEFAULT_ROLE = 'ADMIN';
const TARGET_ACCOUNT_TYPE = 'CUSTOMER';
const REQUIRED_CURRENT_ACCOUNT_TYPE = 'PILOT_REVIEWER';
const PRODUCTION_CONFIRMATION = 'UPGRADE_PILOT_TO_CUSTOMER_IN_PRODUCTION';
const EMAIL_VALIDATION_MESSAGE = 'Please enter a valid email address, for example customer@example.com.';

function parseArgs(argv) {
  const options = {
    email: '',
    workspace: '',
    role: DEFAULT_ROLE,
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--email') {
      options.email = next;
      index += 1;
    } else if (arg === '--workspace') {
      options.workspace = next;
      index += 1;
    } else if (arg === '--role') {
      options.role = next;
      index += 1;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

export function getUsage() {
  return `Upgrade a CarbonLite pilot reviewer into a paid pilot customer workspace.

Usage:
  pnpm upgrade:pilot-to-customer -- --email customer@example.com --workspace "Customer Pilot Workspace" --role ADMIN

Options:
  --email <email>       Required. Existing Pilot Reviewer email address.
  --workspace <name>    Required. New customer workspace name.
  --role <role>         Customer workspace role: ADMIN or OWNER. Defaults to ${DEFAULT_ROLE}.
  --dry-run             Print the safe request body without calling the API.

Environment:
  APP_ENV               local, pilot, staging, or production.
  API_BASE_URL          API base URL. Example: http://localhost:3333/api
  ADMIN_SCRIPT_TOKEN    Preferred admin script bearer token for this operation.
  ADMIN_API_TOKEN       Admin bearer token for the upgrade endpoint.
  CARBONLITE_ADMIN_TOKEN
                        Alternative admin bearer token env var.
  PILOT_TO_CUSTOMER_UPGRADE_ENDPOINT
                        Optional full endpoint URL.

Production guard:
  Production upgrade is blocked unless CONFIRM_PRODUCTION_PILOT_UPGRADE
  equals "${PRODUCTION_CONFIRMATION}".`;
}

function printHelp() {
  console.log(getUsage());
}

export function normalizeAppEnv(env = process.env) {
  return String(env.APP_ENV ?? env.VITE_APP_ENV ?? 'local')
    .trim()
    .toLowerCase();
}

export function assertSafeEnvironment(env = process.env) {
  const appEnv = normalizeAppEnv(env);
  if (appEnv === 'production' && env.CONFIRM_PRODUCTION_PILOT_UPGRADE !== PRODUCTION_CONFIRMATION) {
    throw new Error(
      `Refusing to upgrade pilot reviewer in production without CONFIRM_PRODUCTION_PILOT_UPGRADE=${PRODUCTION_CONFIRMATION}.`,
    );
  }

  if (!['local', 'development', 'pilot', 'staging', 'production'].includes(appEnv)) {
    throw new Error(`Unsupported APP_ENV "${appEnv}". Use local, pilot, staging, or production.`);
  }

  return appEnv;
}

export function requireEmail(email) {
  const normalized = String(email ?? '').trim().toLowerCase();
  if (
    /[\[\]()"']|mailto:/i.test(normalized) ||
    !/^[^\s@()[\]"']+@[^\s@()[\]"']+\.[^\s@()[\]"']+$/.test(normalized)
  ) {
    throw new Error(EMAIL_VALIDATION_MESSAGE);
  }
  return normalized;
}

function requireNonEmpty(value, label) {
  const normalized = String(value ?? '').trim();
  if (!normalized) {
    throw new Error(`${label} is required.\n\n${getUsage()}`);
  }
  return normalized;
}

export function normalizeCustomerRole(role) {
  const normalized = String(role ?? DEFAULT_ROLE).trim().toUpperCase();
  if (normalized !== 'ADMIN' && normalized !== 'OWNER') {
    throw new Error('--role must be ADMIN or OWNER.');
  }
  return normalized;
}

export function buildPayload(options) {
  const email = requireEmail(options.email);
  const workspaceName = requireNonEmpty(options.workspace, 'Workspace');
  const role = normalizeCustomerRole(options.role);

  return {
    email,
    currentAccountType: REQUIRED_CURRENT_ACCOUNT_TYPE,
    accountType: TARGET_ACCOUNT_TYPE,
    workspaceName,
    createWorkspace: true,
    preserveSampleWorkspace: true,
    role,
    accessScope: 'CUSTOMER_WORKSPACE_ONLY',
    permissions: {
      canUpload: true,
      canImport: true,
      canEditRecords: true,
      canDeleteRecords: true,
      canViewFactors: true,
      canGenerateReports: true,
      canEditOrganizationBoundary: true,
      canSubmitFeedback: true,
      canEditSystemFactors: false,
      canManagePlatformUsers: false,
      canAccessPlatformAdmin: false,
      canResetGlobalSampleData: false,
      canAccessOtherWorkspaces: false,
    },
    note:
      'Manual admin upgrade from read-only pilot reviewer to paid pilot customer workspace. Do not grant access to CarbonLite Sample Workspace as a customer workspace.',
  };
}

export function getEndpoint(env = process.env) {
  const explicit = String(env.PILOT_TO_CUSTOMER_UPGRADE_ENDPOINT ?? '').trim();
  if (explicit) return explicit;

  const apiBaseUrl = String(env.API_BASE_URL ?? env.VITE_API_BASE_URL ?? 'http://localhost:3333/api')
    .trim()
    .replace(/\/+$/, '');
  return `${apiBaseUrl}/admin/pilot-reviewers/upgrade-to-customer`;
}

function formatSuccessfulOutput({ payload, responseBody }) {
  const upgradedUser = responseBody?.user ?? responseBody?.customer ?? responseBody?.pilotReviewer ?? {};
  const workspace =
    responseBody?.workspace?.name ??
    responseBody?.workspaceName ??
    upgradedUser.workspaceName ??
    payload.workspaceName;

  return [
    'Pilot reviewer upgraded to customer workspace successfully.',
    '',
    `Email: ${upgradedUser.email ?? payload.email}`,
    `Account type: ${upgradedUser.accountType ?? payload.accountType}`,
    `Role: ${upgradedUser.role ?? payload.role}`,
    `Workspace: ${workspace}`,
    '',
    'Sample workspace remains unchanged. Confirm the user can only access the new customer workspace before sharing access.',
  ].join('\n');
}

function getAdminToken(env = process.env) {
  return String(
    env.ADMIN_SCRIPT_TOKEN ??
      env.ADMIN_API_TOKEN ??
      env.CARBONLITE_ADMIN_TOKEN ??
      '',
  ).trim();
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const appEnv = assertSafeEnvironment();
  const payload = buildPayload(options);

  if (options.dryRun) {
    console.log(JSON.stringify({
      appEnv,
      endpoint: getEndpoint(),
      payload,
    }, null, 2));
    return;
  }

  const token = getAdminToken();
  if (!token) {
    throw new Error('ADMIN_SCRIPT_TOKEN, ADMIN_API_TOKEN, or CARBONLITE_ADMIN_TOKEN is required unless --dry-run is used.');
  }

  const response = await fetch(getEndpoint(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(
        'Backend endpoint POST /api/admin/pilot-reviewers/upgrade-to-customer is not available.\nPlease implement the backend upgrade endpoint before running this script.',
      );
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        'Script is not authorized to upgrade pilot reviewers. Check ADMIN_SCRIPT_TOKEN or admin authentication.',
      );
    }
    if (response.status === 409) {
      throw new Error(
        `Pilot reviewer upgrade failed because the target workspace conflicts with existing data: ${responseText}`,
      );
    }
    if (response.status === 400) {
      throw new Error(`Pilot reviewer upgrade request was rejected: ${responseText}`);
    }
    throw new Error(`Pilot reviewer upgrade failed (${response.status}): ${responseText}`);
  }

  const responseBody = responseText ? JSON.parse(responseText) : {};
  console.log(formatSuccessfulOutput({ payload, responseBody }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
