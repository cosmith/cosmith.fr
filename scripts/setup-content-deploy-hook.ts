import { init } from '@instantdb/admin';
import { config } from 'dotenv';
import schema from '../src/schema.js';

config();

const APP_ID =
  process.env.INSTANT_APP_ID || 'de6141d2-6507-48c1-981e-9ba2c71ccc6d';
const CLOUDFLARE_PROJECT_NAME =
  process.env.CLOUDFLARE_PAGES_PROJECT_NAME || 'cosmith-fr';
const CLOUDFLARE_BRANCH =
  process.env.CLOUDFLARE_PAGES_DEPLOY_BRANCH || 'main';
const CLOUDFLARE_HOOK_NAME =
  process.env.CLOUDFLARE_PAGES_DEPLOY_HOOK_NAME || 'instantdb-content';

const CONTENT_NAMESPACES = [
  'pages',
  'projects',
  'updates',
  'attachments',
] as const;
const CONTENT_ACTIONS = ['create', 'update', 'delete'] as const;

type CloudflareDeployHook = {
  hook_id: string;
  name: string;
  branch: string;
  created_on: string;
};

type CloudflareResponse<T> = {
  result: T;
  success: boolean;
  errors: { code: number; message: string }[];
  messages: unknown[];
};

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function sameSet(actual: readonly string[], expected: readonly string[]): boolean {
  return (
    actual.length === expected.length &&
    expected.every((item) => actual.includes(item))
  );
}

async function cloudflareRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const accountId = requiredEnv('CLOUDFLARE_ACCOUNT_ID');
  const apiToken = requiredEnv('CLOUDFLARE_API_TOKEN');
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}${path}`,
    {
      ...options,
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    },
  );
  const body = (await response.json()) as CloudflareResponse<T>;

  if (!response.ok || !body.success) {
    const message =
      body.errors?.map((error) => error.message).join('; ') ||
      `${response.status} ${response.statusText}`;
    throw new Error(`Cloudflare request failed: ${message}`);
  }

  return body.result;
}

async function ensureCloudflareDeployHook(): Promise<CloudflareDeployHook> {
  const path = `/pages/projects/${CLOUDFLARE_PROJECT_NAME}/deploy_hooks`;
  const hooks = await cloudflareRequest<CloudflareDeployHook[]>(path);
  const existing = hooks.find(
    (hook) =>
      hook.name === CLOUDFLARE_HOOK_NAME && hook.branch === CLOUDFLARE_BRANCH,
  );

  if (existing) {
    return existing;
  }

  return await cloudflareRequest<CloudflareDeployHook>(path, {
    method: 'POST',
    body: JSON.stringify({
      name: CLOUDFLARE_HOOK_NAME,
      branch: CLOUDFLARE_BRANCH,
    }),
  });
}

async function ensureInstantWebhook(deployHook: CloudflareDeployHook) {
  const triggerUrl = `https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/${deployHook.hook_id}`;
  const db = init({
    appId: APP_ID,
    adminToken: requiredEnv('INSTANT_APP_ADMIN_TOKEN'),
    schema,
  });
  const webhooks = await db.webhooks.manager.list();
  const existing =
    webhooks.find((webhook) => webhook.sink.url === triggerUrl) ||
    webhooks.find(
      (webhook) =>
        sameSet(webhook.namespaces, CONTENT_NAMESPACES) &&
        sameSet(webhook.actions, CONTENT_ACTIONS),
    );

  if (existing) {
    const updated = await db.webhooks.manager.update(existing.id, {
      url: triggerUrl,
      namespaces: [...CONTENT_NAMESPACES],
      actions: [...CONTENT_ACTIONS],
    });

    if (updated.status === 'disabled') {
      return await db.webhooks.manager.enable(updated.id);
    }

    return updated;
  }

  return await db.webhooks.manager.create({
    url: triggerUrl,
    namespaces: [...CONTENT_NAMESPACES],
    actions: [...CONTENT_ACTIONS],
  });
}

async function main(): Promise<void> {
  const deployHook = await ensureCloudflareDeployHook();
  const instantWebhook = await ensureInstantWebhook(deployHook);

  console.log(
    JSON.stringify(
      {
        cloudflareDeployHook: {
          id: deployHook.hook_id,
          name: deployHook.name,
          branch: deployHook.branch,
        },
        instantWebhook: {
          id: instantWebhook.id,
          status: instantWebhook.status,
          namespaces: instantWebhook.namespaces,
          actions: instantWebhook.actions,
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
