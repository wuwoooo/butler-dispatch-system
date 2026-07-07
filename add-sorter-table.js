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

  // Replace <Table with <SortableTable
  content = content.replace(/<Table</g, '<SortableTable<');
  content = content.replace(/<Table\s/g, '<SortableTable ');

  // Add import for SortableTable if needed
  if (!content.includes('import { SortableTable }')) {
    const importStatement = `import { SortableTable } from "@/components/tables/SortableTable";\n`;
    const lastImportIndex = content.lastIndexOf('import ');
    const nextNewline = content.indexOf('\n', lastImportIndex);
    content = content.slice(0, nextNewline + 1) + importStatement + content.slice(nextNewline + 1);
  }

  fs.writeFileSync(filePath, content);
  console.log(`Processed ${file}`);
}
