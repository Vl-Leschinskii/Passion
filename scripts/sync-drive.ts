import { syncDriveBooks } from "../src/lib/sync-drive";

syncDriveBooks()
  .then((r) => {
    console.log(JSON.stringify(r, null, 2));
    process.exit(r.errors.length ? 1 : 0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
