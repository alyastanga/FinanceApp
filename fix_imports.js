const fs = require('fs');
const path = require('path');

const componentsDir = path.join(process.cwd(), 'components');
const files = fs.readdirSync(componentsDir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const fullPath = path.join(componentsDir, file);
  let content = fs.readFileSync(fullPath, 'utf8');
  if (content.includes("import { CustomAlert } from '../components/ui/CustomAlert';")) {
    content = content.replace("import { CustomAlert } from '../components/ui/CustomAlert';", "import { CustomAlert } from './ui/CustomAlert';");
    fs.writeFileSync(fullPath, content);
    console.log('Fixed', file);
  }
}
