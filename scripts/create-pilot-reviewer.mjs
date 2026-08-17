#!/usr/bin/env node

import { pathToFileURL } from 'node:url';

const DEFAULT_WORKSPACE = 'CarbonLite Sample Workspace';
const DEFAULT_ROLE = 'REVIEWER';
const DEFAULT_ACCOUNT_TYPE = 'PILOT_REVIEWER';
const DEFAULT_EXPIRY_DAYS = 30;
const PRODUCTION_CONFIRMATION = 'CREATE_PILOT_REVIEWER_IN_PRODUCTION';
const EMAIL_VALIDATION_MESSAGE = 'Please enter a valid email address, for example alexander@example.com.';

function parseArgs(argv) {
  const options = {
    name: '',
    workspace: '',
    role: DEFAULT_ROLE,
    accountType: DEFAULT_ACCOUNT_TYPE,
    expiryDays: DEFAULT_EXPIRY_DAYS,
    dryRun: false,
    noExpiration: false,
    inviteExpiresHours: 48,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--email') {
      options.email = next;
      index += 1;
    } else if (arg === '--name') {
      options.name = next;
      index += 1;
    } else if (arg === '--workspace') {
      options.workspace = next;
      index += 1;
    } else if (arg === '--expires-days') {
      options.expiryDays = Number(next);
      index += 1;
    } else if (arg === '--expires') {
      options.expires = next;
      index += 1;
    } else if (arg === '--no-expiration') {
      options.noExpiration = true;
    } else if (arg === '--invite-expires-hours') {
      options.inviteExpiresHours = Number(next);
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
  return `Create a limited CarbonLite pilot reviewer account.

Usage:
  pnpm create:pilot-reviewer --name "Alexander" --email alexander@example.com --workspace "CarbonLite Sample Workspace"

Options:
  --name <name>            Required. Pilot reviewer display name.
  --email <email>          Required. Pilot reviewer email address.
  --workspace <name>       Required. Must be a safe sample/demo workspace.
  --expires <YYYY-MM-DD>   Optional exact access expiration date.
  --expires-days <days>    Access window. Defaults to ${DEFAULT_EXPIRY_DAYS} days.
  --no-expiration          Omit expiresAt from the request body.
  --invite-expires-hours <hours>
                           Password setup link expiry. Defaults to 48 hours.
  --dry-run                Print the safe request body without calling the API.

Environment:
  APP_ENV                  local, pilot, staging, or production.
  API_BASE_URL             API base URL. Example: http://localhost:3333/api
  ADMIN_SCRIPT_TOKEN       Preferred admin script bearer token for this operation.
  ADMIN_API_TOKEN          Admin bearer token for the creation endpoint.
  CARBONLITE_ADMIN_TOKEN   Alternative admin bearer token env var.
  APP_URL                  Frontend URL for invite links. Fallback: http://localhost:5173
  FRONTEND_URL             Alternative frontend URL env var.
  PILOT_REVIEWER_CREATE_ENDPOINT
                           Optional full endpoint URL.

Production guard:
  Production creation is blocked unless CONFIRM_PRODUCTION_PILOT_REVIEWER_CREATE
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
  if (appEnv === 'production' && env.CONFIRM_PRODUCTION_PILOT_REVIEWER_CREATE !== PRODUCTION_CONFIRMATION) {
    throw new Error(
      `Refusing to create pilot reviewer in production without CONFIRM_PRODUCTION_PILOT_REVIEWER_CREATE=${PRODUCTION_CONFIRMATION}.`,
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
    /[\[\]()]|mailto:/i.test(normalized) ||
    !/^[^\s@()[\]]+@[^\s@()[\]]+\.[^\s@()[\]]+$/.test(normalized)
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

function parseExactExpiry(value) {
  const normalized = String(value ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error('--expires must use YYYY-MM-DD format.');
  }

  const date = new Date(`${normalized}T23:59:59.999Z`);
  if (!Number.isFinite(date.getTime())) {
    throw new Error('--expires must be a valid date.');
  }
  return date.toISOString();
}

export function buildExpiresAt(options) {
  if (options.noExpiration) return null;
  if (options.expires) return parseExactExpiry(options.expires);
  if (!Number.isFinite(options.expiryDays) || options.expiryDays <= 0) {
    throw new Error('--expires-days must be a positive number.');
  }

  const expiresAt = new Date();
  expiresAt.setUTCDate(expiresAt.getUTCDate() + options.expiryDays);
  return expiresAt.toISOString();
}

export function buildPayload(options) {
  if (!Number.isFinite(options.inviteExpiresHours) || options.inviteExpiresHours <= 0) {
    throw new Error('--invite-expires-hours must be a positive number.');
  }
  const name = requireNonEmpty(options.name, 'Name');
  const email = requireEmail(options.email);
  const workspace = requireNonEmpty(options.workspace, 'Workspace');
  const expiresAt = buildExpiresAt(options);

  return {
    name,
    email,
    workspace,
    workspaceName: workspace,
    role: DEFAULT_ROLE,
    accountType: DEFAULT_ACCOUNT_TYPE,
    status: 'ACTIVE',
    expires: expiresAt,
    expiresAt,
    invite: {
      delivery: 'SETUP_LINK',
      sendEmail: true,
      tokenExpiresHours: options.inviteExpiresHours,
      passwordResetRequired: true,
    },
    accessScope: 'SAMPLE_WORKSPACE_ONLY',
    permissions: {
      canViewSampleData: true,
      canViewReports: true,
      canDownloadSampleExports: true,
      canSubmitFeedback: true,
      canUpload: false,
      canImport: false,
      canEditRecords: false,
      canDeleteRecords: false,
      canResetDemoData: false,
      canEditFactors: false,
      canManageUsers: false,
      canAccessAdminDashboard: false,
    },
    note: 'Pilot reviewer account for sample-data workflow feedback only. Not a customer, paid pilot, or production client account.',
  };
}

export function getEndpoint(env = process.env) {
  const explicit = String(env.PILOT_REVIEWER_CREATE_ENDPOINT ?? '').trim();
  if (explicit) return explicit;

  const apiBaseUrl = String(env.API_BASE_URL ?? env.VITE_API_BASE_URL ?? 'http://localhost:3333/api')
    .trim()
    .replace(/\/+$/, '');
  return `${apiBaseUrl}/admin/pilot-reviewers`;
}

export function getFrontendUrl(env = process.env) {
  return String(env.APP_URL ?? env.FRONTEND_URL ?? env.VITE_FRONTEND_URL ?? 'http://localhost:5173')
    .trim()
    .replace(/\/+$/, '');
}

export function buildInviteLinkFromResponse(responseBody, env = process.env) {
  const explicit = String(responseBody?.inviteLink ?? responseBody?.setupUrl ?? responseBody?.inviteUrl ?? '').trim();
  if (explicit) return explicit;

  const token = String(responseBody?.setupToken ?? responseBody?.inviteToken ?? responseBody?.token ?? '').trim();
  if (!token) return '';

  return `${getFrontendUrl(env)}/set-password?token=${encodeURIComponent(token)}`;
}

function formatSuccessfulOutput({ payload, responseBody, inviteLink }) {
  const lines = [
    'Pilot reviewer created successfully.',
    '',
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    `Account type: ${payload.accountType}`,
    `Role: ${payload.role}`,
    `Workspace: ${payload.workspaceName}`,
    `Expires: ${payload.expiresAt || 'Not set'}`,
    '',
  ];

  if (inviteLink) {
    lines.push('Invite link:', inviteLink);
  } else {
    lines.push(
      'Invite link: Not returned by backend.',
      'Confirm email delivery or backend invite token configuration before sharing access.',
    );
  }

  if (responseBody?.temporaryPassword) {
    lines.push('', 'Secure temporary password returned by backend. Show it only once:', responseBody.temporaryPassword);
  }

  return lines.join('\n');
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
      frontendUrl: getFrontendUrl(),
      payload,
    }, null, 2));
    return;
  }

  const token = String(
    process.env.ADMIN_SCRIPT_TOKEN ??
      process.env.ADMIN_API_TOKEN ??
      process.env.CARBONLITE_ADMIN_TOKEN ??
      '',
  ).trim();
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
        'Backend endpoint POST /api/admin/pilot-reviewers is not available.\nPlease implement the backend Pilot Reviewer creation endpoint.',
      );
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        'Script is not authorized to create pilot reviewers. Check ADMIN_SCRIPT_TOKEN or admin authentication.',
      );
    }
    throw new Error(`Pilot reviewer creation failed (${response.status}): ${responseText}`);
  }

  const responseBody = responseText ? JSON.parse(responseText) : {};
  const inviteLink = buildInviteLinkFromResponse(responseBody);
  if (!inviteLink) {
    throw new Error(
      'Pilot reviewer was created, but no invite link was returned. Please check invite token configuration.',
    );
  }
  console.log(formatSuccessfulOutput({ payload, responseBody, inviteLink }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
