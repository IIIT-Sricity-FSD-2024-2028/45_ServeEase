import { constants } from 'node:fs';
import { access, copyFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const developmentDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = dirname(developmentDirectory);
const fixtures = [
  {
    source: join(developmentDirectory, 'upload-fixtures', 'verification', 'dev-verification.pdf'),
    destination: join(repositoryRoot, 'back-end', 'uploads', 'dev-fixtures', 'verification', 'dev-verification.pdf'),
  },
  {
    source: join(developmentDirectory, 'upload-fixtures', 'tickets', 'dev-ticket-evidence.jpg'),
    destination: join(repositoryRoot, 'back-end', 'uploads', 'dev-fixtures', 'tickets', 'dev-ticket-evidence.jpg'),
  },
  {
    source: join(developmentDirectory, 'upload-fixtures', 'profiles', 'dev-provider-photo.jpg'),
    destination: join(repositoryRoot, 'back-end', 'uploads', 'dev-fixtures', 'profiles', 'dev-provider-photo.jpg'),
  },
];

async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const missingSources = [];
  for (const fixture of fixtures) {
    if (!(await exists(fixture.source))) missingSources.push(fixture.source);
  }

  if (missingSources.length) {
    missingSources.forEach((source) => console.error(`[error] Missing required source fixture: ${source}`));
    process.exitCode = 1;
    return;
  }

  let failed = false;
  for (const fixture of fixtures) {
    try {
      await mkdir(dirname(fixture.destination), { recursive: true });
      if (await exists(fixture.destination)) {
        console.log(`[skipped] Already exists: ${fixture.destination}`);
        continue;
      }

      await copyFile(fixture.source, fixture.destination, constants.COPYFILE_EXCL);
      console.log(`[created] ${fixture.destination}`);
    } catch (error) {
      failed = true;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[error] ${fixture.destination}: ${message}`);
    }
  }

  if (failed) process.exitCode = 1;
}

await main();
