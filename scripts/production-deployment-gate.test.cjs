const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const workflow = readFileSync(join(__dirname, '../.github/workflows/deploy-production.yml'), 'utf8');
const trigger = workflow.split(/\r?\nconcurrency:/)[0];
test('push to main runs CI, while automatic CD is opt-in', () => {
  assert.match(trigger, /^  push:\r?\n    branches:\r?\n      - main/m);
  assert.match(trigger, /workflow_dispatch:/);
  assert.doesNotMatch(trigger, /^  (pull_request|workflow_run|schedule):/m);
  assert.match(trigger, /authorize_production:[\s\S]*?type: boolean[\s\S]*?default: false/);
});
test('production deployment requires main plus repo opt-in or explicit approval', () => {
  const deploy = workflow.split(/\r?\n  deploy:/)[1]?.split(/\r?\n  notify:/)[0];
  assert.ok(deploy);
  assert.match(deploy, /github.ref == 'refs\/heads\/main'/);
  assert.match(deploy, /github.event_name == 'push' && vars.EDUAI_AUTO_CD_ENABLED == 'true'/);
  assert.match(deploy, /github.event_name == 'workflow_dispatch' && inputs.authorize_production == true/);
  assert.match(deploy, /environment: production/);
});
test('skipped deployments do not send external notifications', () => {
  const notify = workflow.split(/\r?\n  notify:/)[1];
  assert.match(notify, /if: \$\{\{ always\(\) && needs.deploy.result != 'skipped' \}\}/);
});

test('Vercel cannot automatically deploy the main branch', () => {
  const config = JSON.parse(readFileSync(join(__dirname, '../vercel.json'), 'utf8'));
  assert.equal(config.git?.deploymentEnabled?.main, false);
});
