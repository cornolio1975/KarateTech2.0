const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'app', 'registration', '[tournament_id]', 'club');
const subdirs = ['.', 'officials', 'participants', 'teams'];

subdirs.forEach(sub => {
  const targetDir = path.join(dir, sub);
  const pagePath = path.join(targetDir, 'page.tsx');

  if (fs.existsSync(pagePath)) {
    let content = fs.readFileSync(pagePath, 'utf8');
    
    // Replace the empty array return with a dummy param
    content = content.replace(/return \[\];/g, "return [{ tournament_id: 'default' }];");
    
    fs.writeFileSync(pagePath, content, 'utf8');
    console.log('Fixed', pagePath);
  }
});
