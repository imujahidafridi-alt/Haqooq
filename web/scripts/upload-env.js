const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const envPath = path.resolve(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('.env.local not found!');
  process.exit(1);
}

const fileContent = fs.readFileSync(envPath, 'utf8');
const lines = fileContent.split(/\r?\n/);

const envs = ['production', 'preview', 'development'];

for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const index = trimmed.indexOf('=');
  if (index === -1) continue;
  
  const key = trimmed.slice(0, index).trim();
  let value = trimmed.slice(index + 1).trim();
  
  // If the value is enclosed in quotes, strip them
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  
  console.log(`Uploading ${key}...`);
  
  for (const env of envs) {
    const result = spawnSync('npx', ['vercel', 'env', 'add', key, env, '--yes', '--force'], {
      input: value,
      encoding: 'utf8',
      shell: true
    });
    
    if (result.status !== 0) {
      console.error(`Failed to upload ${key} to ${env}:`, result.stderr || result.stdout);
    } else {
      console.log(`Uploaded ${key} to ${env} successfully.`);
    }
  }
}
console.log('All environment variables uploaded successfully!');
