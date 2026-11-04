import { URL } from 'url';

export const APPROVED_PRIMARY_PROJECT_REF = 'zmpthsiiouukjjyrbpnz' as const;
export const UNAPPROVED_PRODUCTION_REFS = ['krsdjcxgfnlsstjwuqlj'] as const;
export const KNOWN_PRODUCTION_REFS = [
  APPROVED_PRIMARY_PROJECT_REF,
  ...UNAPPROVED_PRODUCTION_REFS,
] as const;

export interface ExtractedTargetInfo {
  ref: string | null;
  isLocal: boolean;
  host: string;
}

export interface ValidateTargetOptions {
  connectionString: string;
  expectedProjectRef?: string;
  allowLocal?: boolean;
  allowPrimaryTarget?: boolean | string;
  primaryProjectRef?: string;
  operationName?: string;
}

export interface RollbackAuthOptions {
  connectionString: string;
  expectedProjectRef?: string;
  confirmStagingRollback?: string | boolean;
  confirmProjectRef?: string;
  allowLocal?: boolean;
}

/**
 * Extracts Supabase project reference and locality from a PostgreSQL connection string.
 * Supports:
 * - Direct connection: db.<ref>.supabase.co / <ref>.supabase.co
 * - Supavisor/Pooler: postgres.<ref>@aws-0-*.pooler.supabase.com:6543
 * - Localhost / 127.0.0.1
 */
export function extractProjectRef(connectionString: string): ExtractedTargetInfo {
  if (!connectionString || typeof connectionString !== 'string') {
    return { ref: null, isLocal: false, host: '' };
  }

  // Check for local database targets
  const isLocal =
    connectionString.includes('localhost') ||
    connectionString.includes('127.0.0.1') ||
    connectionString.startsWith('postgres://localhost') ||
    connectionString.startsWith('postgresql://localhost');

  let host = '';
  let ref: string | null = null;

  try {
    // Attempt standard URL parse
    const parsed = new URL(connectionString);
    host = parsed.hostname;

    // 1. Check username for pooler format: postgres.<project-ref>
    if (parsed.username && parsed.username.includes('.')) {
      const parts = parsed.username.split('.');
      if (parts.length >= 2 && parts[0] === 'postgres' && parts[1]) {
        ref = parts[1];
      }
    }

    // 2. Check hostname for direct/pooler Supabase pattern
    if (!ref && parsed.hostname) {
      // Pattern: db.<project-ref>.supabase.co
      const dbMatch = parsed.hostname.match(/^db\.([a-z0-9_-]+)\.supabase\.co$/i);
      if (dbMatch) {
        ref = dbMatch[1];
      }

      // Pattern: <project-ref>.supabase.co
      const directMatch = parsed.hostname.match(/^([a-z0-9_-]+)\.supabase\.co$/i);
      if (directMatch && directMatch[1] !== 'db') {
        ref = directMatch[1];
      }

      // Pattern: <project-ref>.pooler.supabase.com
      const poolerMatch = parsed.hostname.match(/^([a-z0-9_-]+)\.pooler\.supabase\.com$/i);
      if (poolerMatch) {
        ref = poolerMatch[1];
      }
    }
  } catch {
    // Fallback regex extraction if URL parsing fails on complex connection strings
  }

  // Secondary regex fallback if URL parsing did not capture host/ref
  if (!ref) {
    const userMatch = connectionString.match(/[/:@]postgres\.([a-z0-9_-]+)[:@]/i);
    if (userMatch) {
      ref = userMatch[1];
    }
  }

  if (!ref) {
    const hostMatch = connectionString.match(/@(db\.)?([a-z0-9_-]+)\.supabase\.co/i);
    if (hostMatch) {
      ref = hostMatch[2];
    }
  }

  if (isLocal) {
    return { ref: 'local-rehearsal', isLocal: true, host: host || 'localhost' };
  }

  return { ref, isLocal: false, host };
}

/**
 * Checks whether the environment or caller has explicitly authorized the exact RESTO V2 primary project.
 */
export function checkPrimaryProjectAuthorization(options: {
  allowPrimaryTarget?: boolean | string;
  primaryProjectRef?: string;
  expectedRef?: string;
}): { authorized: boolean; reason?: string } {
  const allowOptIn =
    options.allowPrimaryTarget ?? process.env.ALLOW_RESTO_V2_PRIMARY_TARGET;
  const isOptIn = allowOptIn === true || allowOptIn === 'true';

  const primaryRef =
    options.primaryProjectRef ?? process.env.RESTO_V2_PRIMARY_PROJECT_REF;

  if (!isOptIn) {
    return {
      authorized: false,
      reason:
        `Primary target access requires explicit ALLOW_RESTO_V2_PRIMARY_TARGET=true.`,
    };
  }

  if (primaryRef !== APPROVED_PRIMARY_PROJECT_REF) {
    return {
      authorized: false,
      reason:
        `Primary target authorization requires exact RESTO_V2_PRIMARY_PROJECT_REF='${APPROVED_PRIMARY_PROJECT_REF}'. Received: '${primaryRef || 'none'}'.`,
    };
  }

  if (options.expectedRef && options.expectedRef !== APPROVED_PRIMARY_PROJECT_REF) {
    return {
      authorized: false,
      reason:
        `Target validation failed: Mismatched project reference. Expected '${options.expectedRef}', but primary database is '${APPROVED_PRIMARY_PROJECT_REF}'.`,
    };
  }

  return { authorized: true };
}

/**
 * Validates the database target against a fail-closed allowlist.
 */
export function validateDatabaseTarget(options: ValidateTargetOptions): {
  verified: boolean;
  projectRef: string;
  isLocal: boolean;
  isPrimary: boolean;
} {
  const { connectionString, operationName = 'Database operation' } = options;
  const expectedRef = options.expectedProjectRef || process.env.EXPECTED_STAGING_PROJECT_REF;

  if (!connectionString) {
    throw new Error(`${operationName} failed: No connection string provided.`);
  }

  // 1. Check for unapproved production references (NEVER allowed under any circumstances)
  for (const unapprovedRef of UNAPPROVED_PRODUCTION_REFS) {
    if (connectionString.includes(unapprovedRef)) {
      throw new Error(
        `CRITICAL SAFETY VIOLATION: Target connection references unapproved production project '${unapprovedRef}'. Operations against this project are strictly prohibited.`
      );
    }
  }

  // 2. Check for the user-approved primary production project
  const isTargetingApprovedPrimary = connectionString.includes(APPROVED_PRIMARY_PROJECT_REF);
  if (isTargetingApprovedPrimary) {
    const authCheck = checkPrimaryProjectAuthorization({
      allowPrimaryTarget: options.allowPrimaryTarget,
      primaryProjectRef: options.primaryProjectRef,
      expectedRef,
    });

    if (!authCheck.authorized) {
      throw new Error(
        `CRITICAL SAFETY VIOLATION: Target connection references primary production project '${APPROVED_PRIMARY_PROJECT_REF}'. ${authCheck.reason}`
      );
    }
  }

  // 3. Strict Allowlist Expectation Check
  if (!expectedRef) {
    throw new Error(
      `${operationName} failed: Missing required EXPECTED_STAGING_PROJECT_REF. Staging/primary project identity cannot be verified without an explicit allowlist expectation.`
    );
  }

  const { ref, isLocal, host } = extractProjectRef(connectionString);

  // 4. Reject Local Target when Remote Operation is Expected
  if (isLocal) {
    const isExplicitLocalExpected =
      expectedRef === 'local-rehearsal' ||
      expectedRef === 'local' ||
      Boolean(options.allowLocal) ||
      process.env.ALLOW_LOCAL_TARGET === 'true';

    if (!isExplicitLocalExpected) {
      throw new Error(
        `${operationName} failed: Refuse execution because target is local (${host || 'localhost'}) when a remote staging/primary operation is expected (expected project: '${expectedRef}').`
      );
    }

    return { verified: true, projectRef: 'local-rehearsal', isLocal: true, isPrimary: false };
  }

  // 5. Reject Remote Target when Local was Explicitly Expected
  if (expectedRef === 'local-rehearsal' || expectedRef === 'local') {
    throw new Error(
      `${operationName} failed: Target is a remote host ('${host}') when local execution was explicitly expected.`
    );
  }

  // 6. Fail if Identity Cannot Be Verified
  if (!ref) {
    throw new Error(
      `${operationName} failed: Cannot verify project identity from connection string ('${host}'). Fail-closed: refusing execution against unverified database.`
    );
  }

  // 7. Strict Allowlist Match Check
  if (ref !== expectedRef) {
    throw new Error(
      `${operationName} failed: Mismatched project reference. Target database identifies as '${ref}', but expected project is '${expectedRef}'.`
    );
  }

  const isPrimary = ref === APPROVED_PRIMARY_PROJECT_REF;
  return { verified: true, projectRef: ref, isLocal: false, isPrimary };
}

/**
 * Enforces dual-confirmation rollback authorization.
 * Destructive rollback against the primary production database is strictly blocked.
 */
export function validateRollbackAuthorization(options: RollbackAuthOptions): void {
  const target = validateDatabaseTarget({
    connectionString: options.connectionString,
    expectedProjectRef: options.expectedProjectRef,
    allowLocal: options.allowLocal,
    operationName: 'Rollback authorization',
  });

  // Rollback against the primary production project is strictly prohibited
  if (target.isPrimary || options.connectionString.includes(APPROVED_PRIMARY_PROJECT_REF)) {
    throw new Error(
      `ROLLBACK BLOCKED: Destructive rollback operations are strictly prohibited against RESTO V2 primary production project '${APPROVED_PRIMARY_PROJECT_REF}'.`
    );
  }

  const confirmStaging =
    options.confirmStagingRollback ?? process.env.CONFIRM_STAGING_ROLLBACK;
  const isConfirmed = confirmStaging === true || confirmStaging === 'true';

  if (!isConfirmed) {
    throw new Error(
      'ROLLBACK BLOCKED: Remote database rollback requires explicit confirmation via CONFIRM_STAGING_ROLLBACK=true environment variable.'
    );
  }

  // If remote target, require second project-specific confirmation
  if (!target.isLocal) {
    const confirmProjectRef =
      options.confirmProjectRef || process.env.CONFIRM_STAGING_ROLLBACK_PROJECT_REF;

    if (!confirmProjectRef) {
      throw new Error(
        `ROLLBACK BLOCKED: Remote database rollback requires secondary target-specific confirmation CONFIRM_STAGING_ROLLBACK_PROJECT_REF='${target.projectRef}'.`
      );
    }

    if (confirmProjectRef !== target.projectRef) {
      throw new Error(
        `ROLLBACK BLOCKED: Secondary confirmation mismatch. Target staging project is '${target.projectRef}', but received CONFIRM_STAGING_ROLLBACK_PROJECT_REF='${confirmProjectRef}'.`
      );
    }
  }
}

/**
 * Resolves database URLs with explicit staging precedence and zero silent fallback to production/default.
 */
export function resolveStagingDatabaseUrls(envVars: Record<string, string | undefined>): {
  databaseUrl: string;
  directDatabaseUrl: string;
} {
  const isStaging = envVars.NODE_ENV === 'staging';

  // 1. Resolve Primary Query Pooler URL (Port 6543)
  // Precedence: STAGING_DATABASE_URL -> DATABASE_URL
  const databaseUrl = envVars.STAGING_DATABASE_URL || envVars.DATABASE_URL;

  if (!databaseUrl) {
    if (isStaging || envVars.NODE_ENV === 'production') {
      throw new Error(
        'DATABASE_URL or STAGING_DATABASE_URL must be explicitly configured in staging/production mode. Silent fallback is prohibited.'
      );
    }
    return {
      databaseUrl: 'postgresql://postgres:postgres@localhost:5432/postgres',
      directDatabaseUrl: '',
    };
  }

  // 2. Resolve Persistent Direct / LISTEN URL (Port 5432)
  // Precedence: STAGING_DIRECT_DATABASE_URL -> DIRECT_DATABASE_URL -> databaseUrl
  const directDatabaseUrl =
    envVars.STAGING_DIRECT_DATABASE_URL ||
    envVars.DIRECT_DATABASE_URL ||
    databaseUrl;

  // 3. Validate against unapproved production contamination
  for (const unapprovedRef of UNAPPROVED_PRODUCTION_REFS) {
    if (databaseUrl.includes(unapprovedRef) || directDatabaseUrl.includes(unapprovedRef)) {
      throw new Error(
        `CRITICAL SAFETY VIOLATION: Database connection references unapproved production project '${unapprovedRef}'! Refusing startup.`
      );
    }
  }

  // 4. Validate approved primary target authorization
  const referencesPrimary =
    databaseUrl.includes(APPROVED_PRIMARY_PROJECT_REF) ||
    directDatabaseUrl.includes(APPROVED_PRIMARY_PROJECT_REF);

  if (referencesPrimary) {
    const authCheck = checkPrimaryProjectAuthorization({
      allowPrimaryTarget: envVars.ALLOW_RESTO_V2_PRIMARY_TARGET,
      primaryProjectRef: envVars.RESTO_V2_PRIMARY_PROJECT_REF,
    });

    if (!authCheck.authorized) {
      throw new Error(
        `CRITICAL SAFETY VIOLATION: Database connection references primary project '${APPROVED_PRIMARY_PROJECT_REF}'. ${authCheck.reason}`
      );
    }
  }

  return { databaseUrl, directDatabaseUrl };
}
