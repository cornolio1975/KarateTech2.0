const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Building project for GitHub Pages deployment (basePath: /KarateTech2.0)...');

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

function moveApiDirForBuild() {
  if (fs.existsSync(tempApiDir) && !fs.existsSync(apiDir)) {
    fs.renameSync(tempApiDir, apiDir);
    return;
  }

  if (!fs.existsSync(apiDir)) {
    return;
  }

  try {
    fs.renameSync(apiDir, tempApiDir);
    return;
  } catch (error) {
    if (error && (error.code === 'EPERM' || error.code === 'EACCES')) {
      console.warn('  ⚠ Rename blocked by Windows file lock; using copy-and-remove fallback.');
      fs.cpSync(apiDir, tempApiDir, { recursive: true, force: true });
      fs.rmSync(apiDir, { recursive: true, force: true });
      return;
    }
    throw error;
  }
}

function restoreApiDir() {
  if (!fs.existsSync(tempApiDir)) {
    return;
  }

  try {
    if (fs.existsSync(apiDir)) {
      fs.rmSync(apiDir, { recursive: true, force: true });
    }
    fs.renameSync(tempApiDir, apiDir);
  } catch (error) {
    console.warn('  ⚠ Could not restore API directory with rename; copying back instead.', error.message);
    if (fs.existsSync(apiDir)) {
      fs.rmSync(apiDir, { recursive: true, force: true });
    }
    fs.cpSync(tempApiDir, apiDir, { recursive: true, force: true });
    fs.rmSync(tempApiDir, { recursive: true, force: true });
  }
}

try {
  moveApiDirForBuild();

  execSync('npx next build', {
    stdio: 'inherit',
    env: {
      ...process.env,
      NEXT_PUBLIC_BASE_PATH: '/KarateTech2.0'
    }
  });

  const outDir = path.join(__dirname, 'out');
  if (fs.existsSync(outDir)) {
    fs.writeFileSync(path.join(outDir, '.nojekyll'), '');
    console.log('  ✓ Created .nojekyll in /out directory');
  }

  console.log('GitHub Pages build completed successfully!');
} catch (error) {
  buildError = error;
  console.error('Build failed:', error);
} finally {
  restoreApiDir();
  if (buildError) {
    process.exit(1);
  }
}

