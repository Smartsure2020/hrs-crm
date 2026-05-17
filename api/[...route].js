import './instrument.js';
import { requireAuth }   from './_auth.js';
import { isAdminRole }   from './_permissions.js';
import { getRateLimiter } from './_ratelimit.js';
import { createActions }  from './_base.js';
import { Sentry } from './_sentry.js';

import { config as clientsConfig }      from './repositories/clients.js';
import { config as policiesConfig }     from './repositories/policies.js';
import { config as claimsConfig }       from './repositories/claims.js';
import { config as dealsConfig }        from './repositories/deals.js';
import { config as documentsConfig }    from './repositories/documents.js';
import { config as tasksConfig }        from './repositories/tasks.js';
import { config as usersConfig }        from './repositories/users.js';
import { config as activityLogsConfig } from './repositories/activity-logs.js';
import { config as auditLogsConfig }    from './repositories/audit-logs.js';
import { config as commSplitsConfig }   from './repositories/commission-splits.js';

const MAX_LIMIT = 500;

const REPOS = {
  clients:              clientsConfig,
  policies:             policiesConfig,
  claims:               claimsConfig,
  deals:                dealsConfig,
  documents:            documentsConfig,
  tasks:                tasksConfig,
  users:                usersConfig,
  'activity-logs':      activityLogsConfig,
  'audit-logs':         auditLogsConfig,
  'commission-splits':  commSplitsConfig,
};

// Pre-build action maps once at startup instead of per-request.
const ACTIONS = Object.fromEntries(
  Object.entries(REPOS).map(([entity, config]) => [entity, createActions(config, entity)])
);

export default async function handler(req, res) {
  const start = Date.now();

  const user = await requireAuth(req, res);
  if (!user) return;

  const rl = await getRateLimiter();
  if (rl) {
    const { success } = await rl.limit(user.id);
    if (!success) return res.status(429).json({ error: 'Too many requests' });
  }

  const url      = new URL(req.url, `http://${req.headers.host}`);
  const entity   = url.pathname.replace(/^\/api\//, '').split('/')[0];
  const action   = url.searchParams.get('action') || 'list';
  const rawLimit = parseInt(url.searchParams.get('limit') || '50', 10);

  const actions = ACTIONS[entity];
  if (!actions) return res.status(404).json({ error: `Unknown entity: ${entity}` });

  const act = actions[action];
  if (!act) return res.status(400).json({ error: `Unknown action: ${action}` });

  const ctx = {
    isAdmin:     isAdminRole(user._profile?.role),
    callerEmail: user.email,
  };

  const params = {
    id:     url.searchParams.get('id'),
    sort:   url.searchParams.get('sort'),
    search: url.searchParams.get('search') || null,
    limit:  Math.min(isNaN(rawLimit) ? 50 : rawLimit, MAX_LIMIT),
    offset: parseInt(url.searchParams.get('offset') || '0', 10),
  };

  try {
    const result = await act(req, res, ctx, params);
    const ms = Date.now() - start;
    console.log(`API [${entity}/${action}] ${ms}ms`);
    if (ms > 3000) console.warn(`Slow API [${entity}/${action}]: ${ms}ms`);
    return result;
  } catch (err) {
    const ms = Date.now() - start;
    console.error(`API error [${entity}/${action}] ${ms}ms:`, err);
    Sentry.withScope((scope) => {
      scope.setUser({ id: user.id, email: user.email });
      scope.setTag('entity', entity);
      scope.setTag('action', action);
      scope.setExtra('duration_ms', ms);
      scope.setExtra('method', req.method);
      Sentry.captureException(err);
    });
    return res.status(500).json({ error: 'Something went wrong. Please try again or contact support.' });
  }
}
