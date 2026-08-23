const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Building project for Hostinger deployment (no basePath)...');

const apiDir = path.join(__dirname, 'src', 'app', 'api');
const tempApiDir = path.join(__dirname, 'src', '_api_temp');
let movedApi = false;

function cleanNextCache() {
  const nextDir = path.join(__dirname, '.next');
  if (fs.existsSync(nextDir)) {
    try {
      fs.rmSync(nextDir, { recursive: true, force: true });
      console.log('  ✓ Cleared .next build cache');
    } catch (e) {
      console.warn('  ⚠ Could not fully clear .next cache:', e.message);
    }
  }
}

cleanNextCache();

let buildError = null;

try {
  // If a previous run left _api_temp, restore it first
  if (fs.existsSync(tempApiDir) && !fs.existsSync(apiDir)) {
    fs.renameSync(tempApiDir, apiDir);
  }

  if (fs.existsSync(apiDir)) {
    fs.renameSync(apiDir, tempApiDir);
  }

  execSync('npx next build', {
    stdio: 'inherit',
    env: {
      ...process.env,
      NEXT_PUBLIC_BASE_PATH: ''
    }
  });

  // Create a zip of the 'out' folder for easy upload to Hostinger
  console.log('Build completed. Packaging /out into dist.zip...');
  if (fs.existsSync('dist.zip')) {
    try {
      fs.unlinkSync('dist.zip');
    } catch (e) {
      console.warn('Warning: Could not delete old dist.zip, proceeding with -Force overwrite.');
    }
  }
  if (process.platform === 'win32') {
    execSync('powershell "Compress-Archive -Path out\\* -DestinationPath dist.zip -Force"', { stdio: 'inherit' });
  } else {
    execSync('zip -r dist.zip out/*', { stdio: 'inherit' });
  }
  console.log('✅ dist.zip updated successfully for Hostinger deployment!');
} catch (error) {
  buildError = error;
  console.error('Build failed:', error);
} finally {
  if (fs.existsSync(tempApiDir)) {
    try {
      if (fs.existsSync(apiDir)) {
        fs.rmSync(apiDir, { recursive: true, force: true });
      }
      fs.renameSync(tempApiDir, apiDir);
    } catch (e) {
      console.warn('Warning restoring API directory:', e.message);
    }
  }
  if (buildError) {
    process.exit(1);
  }
}

