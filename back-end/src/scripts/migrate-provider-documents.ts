/* eslint-disable no-console */
// Provider document migration (canonical registry). Run from back-end/ after `npm run build`:
//
//   npm run documents:migrate                       # dry-run report (default, writes nothing)
//   npm run documents:migrate -- --apply            # consolidate recoverable files into canonical storage
//   npm run documents:migrate -- --rollback <runId> # restore the registry from before that run
//   ... --report <file.json>                        # also write the full per-record report
//
// The running API server keeps the state file in memory and rewrites it, so --apply and --rollback refuse to
// run while it is up; use POST /api/admin/provider-documents/migrations (superuser) on the running server
// instead, or stop the server first.
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ProviderDocumentsService, documentDirectory, uploadsDirectory } from '../modules/provider-documents/provider-documents.service';
import { StateRepository } from '../modules/state/state.repository';

async function serverIsRunning() {
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    await fetch(`http://localhost:${port}/api/catalog`, { signal: controller.signal });
    clearTimeout(timer);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const rollbackIndex = args.indexOf('--rollback');
  const reportIndex = args.indexOf('--report');
  const reportFile = reportIndex >= 0 ? args[reportIndex + 1] : undefined;
  const writes = apply || rollbackIndex >= 0;

  if (writes && !args.includes('--allow-running') && await serverIsRunning()) {
    console.error('The ServeEase API server is running and owns the state file. Stop it first, or run the migration through the running server:\n  POST /api/admin/provider-documents/migrations  {"apply": true}   (superuser session)');
    process.exitCode = 2;
    return;
  }

  const service = new ProviderDocumentsService(new StateRepository());
  console.log(`Uploads folder:   ${uploadsDirectory()}`);
  console.log(`Private storage:  ${documentDirectory()}`);

  if (rollbackIndex >= 0) {
    console.log(JSON.stringify(service.rollback(String(args[rollbackIndex + 1] || '')), null, 2));
    return;
  }

  const report = service.migrate({ apply, actor: 'migration-cli' });
  console.log(`\nRun ${report.runId} (${report.mode})`);
  console.log('Counts:', JSON.stringify(report.counts));
  for (const result of report.results) {
    console.log(`  ${result.outcome.padEnd(24)} ${result.providerAccountId}/${result.documentId}  ${result.documentName || ''}  [${result.origin}]`);
  }
  if (report.conflicts.length) console.log('\nConflicts:\n  ' + report.conflicts.join('\n  '));
  if (report.orphanRequests.length) console.log('\nApproval requests with no owning account:\n  ' + report.orphanRequests.map((item) => `${item.providerId} <${item.email}> (${item.documents} documents)`).join('\n  '));
  console.log('\nConsistency:', JSON.stringify(report.consistency));
  if (report.backup) console.log(`State backup: ${report.backup.stateBackup}\nJournal:      ${report.backup.journal}\nRollback:     ${report.rollback}`);
  if (!apply) console.log('\nDry run only. Re-run with --apply to copy the recoverable files.');
  if (reportFile) {
    writeFileSync(resolve(reportFile), JSON.stringify(report, null, 2), 'utf8');
    console.log(`Full report written to ${resolve(reportFile)}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
