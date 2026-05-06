import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('config template exposes Supabase placeholder tokens for build-time injection', () => {
  const template = readFileSync(new URL('../config.template.js', import.meta.url), 'utf8');

  assert.match(template, /__SUPABASE_URL__/, 'template should include Supabase URL placeholder');
  assert.match(template, /__SUPABASE_ANON_KEY__/, 'template should include Supabase anon key placeholder');
});

test('pages workflow generates config.js from template and deploys via GitHub Actions', () => {
  const workflow = readFileSync(new URL('../.github/workflows/deploy-pages.yml', import.meta.url), 'utf8');

  assert.match(workflow, /python3 .*config\.template\.js.*config\.js/, 'workflow should generate config.js from the template');
  assert.match(workflow, /actions\/configure-pages@/, 'workflow should configure GitHub Pages');
  assert.match(workflow, /actions\/deploy-pages@/, 'workflow should deploy via the Pages action');
  assert.match(workflow, /SUPABASE_URL/, 'workflow should read the Supabase URL secret or variable');
  assert.match(workflow, /SUPABASE_ANON_KEY/, 'workflow should read the Supabase anon key secret or variable');
});
