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
  const filePath = path.join("/Users/wuwoo/Desktop/work/_管家调配系统/butler-dispatch-system", file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // Revert import
  content = content.replace('import { withSorters } from "@/utils/table";\n', '');

  let startIndex = 0;
  while (true) {
    const idx = content.indexOf('columns={withSorters([', startIndex);
    if (idx === -1) break;

    content = content.slice(0, idx) + 'columns={[' + content.slice(idx + 22);
    
    let braceCount = 1;
    let bracketCount = 1;
    let i = idx + 11; // after 'columns={['
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
        if (content[i+1] === ')') {
          content = content.slice(0, i + 1) + content.slice(i + 2);
        }
        startIndex = i + 1;
        break;
      }
      i++;
    }
  }

  fs.writeFileSync(filePath, content);
  console.log(`Reverted ${file}`);
}
