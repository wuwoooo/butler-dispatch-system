import { resolveOverdueAssignments } from "@/lib/overdue-assignments";
import { prisma } from "@/lib/prisma";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const result = await resolveOverdueAssignments({ dryRun });
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
