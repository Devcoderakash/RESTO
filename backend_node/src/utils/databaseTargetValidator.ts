import { URL } from 'url';

export const KNOWN_PRODUCTION_REFS = ['zmpthsiiouukjjyrbpnz', 'krsdjcxgfnlsstjwuqlj'] as const;

export interface ExtractedTargetInfo {
  ref: string | null;
  isLocal: boolean;
  host: string;
}

export interface ValidateTargetOptions {
  connectionString: string;
  expectedProjectRef?: string;
  allowLocal?: boolean;
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
 * Validates the database target against a fail-closed allowlist.
 */
export function validateDatabaseTarget(options: ValidateTargetOptions): {
  verified: boolean;
  projectRef: string;
  isLocal: boolean;
} {
  const { connectionString, operationName = 'Database operation' } = options;
  const expectedRef = options.expectedProjectRef || process.env.EXPECTED_STAGING_PROJECT_REF;

  if (!connectionString) {
    throw new Error(`${operationName} failed: No connection string provided.`);
  }

  // 1. Blacklist Check (Defense in Depth)
  for (const prodRef of KNOWN_PRODUCTION_REFS) {
    if (connectionString.includes(prodRef)) {
      throw new Error(
        `CRITICAL SAFETY VIOLATION: Target connection references known production project '${prodRef}'. Operations against production are strictly blocked.`
      );
    }
  }

  // 2. Strict Allowlist Expectation Check
  if (!expectedRef) {
    throw new Error(
      `${operationName} failed: Missing required EXPECTED_STAGING_PROJECT_REF. Staging project identity cannot be verified without an explicit allowlist expectation.`
    );
  }

  const { ref, isLocal, host } = extractProjectRef(connectionString);

  // 3. Reject Local Target when Remote Staging is Expected
  if (isLocal) {
    const isExplicitLocalExpected =
      expectedRef === 'local-rehearsal' ||
      expectedRef === 'local' ||
      Boolean(options.allowLocal) ||
      process.env.ALLOW_LOCAL_TARGET === 'true';

    if (!isExplicitLocalExpected) {
      throw new Error(
        `${operationName} failed: Refuse execution because target is local (${host || 'localhost'}) when a remote staging operation is expected (expected staging project: '${expectedRef}').`
      );
    }

    return { verified: true, projectRef: 'local-rehearsal', isLocal: true };
  }

  // 4. Reject Remote Target when Local was Explicitly Expected
  if (expectedRef === 'local-rehearsal' || expectedRef === 'local') {
    throw new Error(
      `${operationName} failed: Target is a remote host ('${host}') when local execution was explicitly expected.`
    );
  }

  // 5. Fail if Identity Cannot Be Verified
  if (!ref) {
    throw new Error(
      `${operationName} failed: Cannot verify project identity from connection string ('${host}'). Fail-closed: refusing execution against unverified database.`
    );
  }

  // 6. Strict Allowlist Match Check
  if (ref !== expectedRef) {
    throw new Error(
      `${operationName} failed: Mismatched project reference. Target database identifies as '${ref}', but expected staging project is '${expectedRef}'.`
    );
  }

  return { verified: true, projectRef: ref, isLocal: false };
}

/**
 * Enforces dual-confirmation rollback authorization.
 */
export function validateRollbackAuthorization(options: RollbackAuthOptions): void {
  const target = validateDatabaseTarget({
    connectionString: options.connectionString,
    expectedProjectRef: options.expectedProjectRef,
    allowLocal: options.allowLocal,
    operationName: 'Rollback authorization',
  });

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

  // 3. Validate against production contamination in staging mode
  if (isStaging) {
    for (const prodRef of KNOWN_PRODUCTION_REFS) {
      if (databaseUrl.includes(prodRef) || directDatabaseUrl.includes(prodRef)) {
        throw new Error(
          `CRITICAL SAFETY VIOLATION: Staging environment configured with production database reference '${prodRef}'! Refusing startup.`
        );
      }
    }
  }

  return { databaseUrl, directDatabaseUrl };
}
