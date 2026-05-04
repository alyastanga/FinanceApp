const fs = require('fs');
const path = require('path');

const filesToProcess = [
  "components/GoalForm.tsx",
  "components/PortfolioForm.tsx",
  "components/ExpenseForm.tsx",
  "components/DateRangeModal.tsx",
  "components/TransactionList.tsx",
  "components/IncomeForm.tsx",
  "components/TransactionForm.tsx",
  "components/Auth.tsx",
  "components/GoalCard.tsx",
  "app/onboarding/e2ee-recovery.tsx",
  "app/onboarding/e2ee-setup.tsx",
  "app/(auth)/login.tsx",
  "app/model-settings.tsx",
  "app/(auth)/signup.tsx",
  "app/data-hub.tsx",
  "app/settings.tsx",
  "app/settings/profile.tsx",
  "app/settings/notifications.tsx",
  "app/(tabs)/budget.tsx",
  "app/settings/dek-rotation.tsx",
  "app/(tabs)/index.tsx",
  "app/(tabs)/settings.tsx"
];

for (const relPath of filesToProcess) {
  const fullPath = path.join(process.cwd(), relPath);
  if (!fs.existsSync(fullPath)) continue;

  let content = fs.readFileSync(fullPath, 'utf8');
  let changed = false;

  // 1. Replace Alert.alert
  if (content.includes('Alert.alert')) {
    content = content.replace(/Alert\.alert\(/g, 'CustomAlert.alert(');
    changed = true;
  }

  // 2. Some files destructure Alert from react-native (e.g. const { Alert } = require(...))
  if (content.includes('const { Alert } = require(')) {
    content = content.replace(/const \{ Alert \} = require\('react-native'\);/g, "import { CustomAlert } from '../components/ui/CustomAlert';");
    // handle nested imports in components
    content = content.replace(/const \{ Alert \} = require\('\.\.\/components\//g, "import { CustomAlert } from '../components/ui/CustomAlert';\nconst { Alert } = require('../components/");
    changed = true;
  }

  // 3. Add import if missing
  if (changed && !content.includes('import { CustomAlert }')) {
    // calculate relative path to components/ui/CustomAlert
    const depth = relPath.split('/').length - 1;
    let importPath = '';
    if (depth === 0) importPath = './components/ui/CustomAlert';
    else if (depth === 1) importPath = '../components/ui/CustomAlert';
    else if (depth === 2) importPath = '../../components/ui/CustomAlert';
    else if (depth === 3) importPath = '../../../components/ui/CustomAlert';

    const importStatement = `import { CustomAlert } from '${importPath}';\n`;
    
    // Find the last import
    const lastImportIndex = content.lastIndexOf('import ');
    if (lastImportIndex !== -1) {
      const endOfLastImport = content.indexOf('\n', lastImportIndex);
      content = content.slice(0, endOfLastImport + 1) + importStatement + content.slice(endOfLastImport + 1);
    } else {
      content = importStatement + content;
    }
  }

  if (changed) {
    fs.writeFileSync(fullPath, content);
    console.log(`Updated ${relPath}`);
  }
}
