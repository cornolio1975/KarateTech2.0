const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Building project for GitHub Pages deployment (basePath: /KarateTech2.0)...');

try {
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
  console.error('Build failed:', error);
  process.exit(1);
}

