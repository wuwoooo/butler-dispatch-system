/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const files = [
  "components/settings/SystemDictsClient.tsx",
  "components/dispatch/DispatchClient.tsx",
  "components/leaves/LeavesClient.tsx",
  "components/butlers/ButlerStatisticsClient.tsx",
  "components/abnormal/AbnormalRecordsClient.tsx",
  "components/logs/LogsClient.tsx",
  "components/finance/FinanceClient.tsx",
  "components/orders/OrdersClient.tsx",
  "components/orders/OrderDetailView.tsx",
  "components/notifications/NotificationsClient.tsx",
  "components/reviews/ReviewsClient.tsx"
];

for (const file of files) {
  const filePath = path.join(__dirname, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  if (!content.includes('withSorters')) {
    // Add import
    const importStatement = `import { withSorters } from "@/utils/table";\n`;
    const lastImportIndex = content.lastIndexOf('import ');
    const nextNewline = content.indexOf('\n', lastImportIndex);
    content = content.slice(0, nextNewline + 1) + importStatement + content.slice(nextNewline + 1);
  }

  let startIndex = 0;
  while (true) {
    const idx = content.indexOf('columns={[', startIndex);
    if (idx === -1) break;

    content = content.slice(0, idx) + 'columns={withSorters([' + content.slice(idx + 10);
    
    let braceCount = 1;
    let bracketCount = 1;
    let i = idx + 22; 
    let inString = false;
    let stringChar = '';

    while (i < content.length) {
      const char = content[i];
      if (!inString && (char === '"' || char === "'" || char === '`')) {
        inString = true;
        stringChar = char;
      } else if (inString && char === stringChar && content[i-1] !== '\\') {
        inString = false;
      } else if (!inString) {
        if (char === '[') bracketCount++;
        else if (char === ']') bracketCount--;
        else if (char === '{') braceCount++;
        else if (char === '}') braceCount--;
      }

      if (bracketCount === 0 && braceCount === 1 && content[i] === ']') {
        // found the end ! Check if next is }
        content = content.slice(0, i + 1) + ')' + content.slice(i + 1);
        startIndex = i + 2; 
        break;
      }
      i++;
    }
  }

  fs.writeFileSync(filePath, content);
  console.log(`Processed ${file}`);
}
