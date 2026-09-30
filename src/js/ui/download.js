/**
 * download.js — save the backup as a file (pass 17, shared from pass 67 so
 * the storage-full banner can offer it as well as Settings).
 *
 * A file download, not a clipboard copy: navigator.clipboard is undefined
 * outside a secure context (any origin that isn't https or localhost, which
 * includes a plain LAN IP), so a clipboard write used to throw and the button
 * did visibly nothing. A Blob download needs no permission and no secure
 * context, so it works everywhere the app does.
 */

import { exportAll, noteExport } from "../core/backup.js";
import { todayISO } from "../core/dates.js";

export function downloadBackup() {
  const json = JSON.stringify(exportAll(), null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `rise-backup-${todayISO()}.json`;
  // Safari needs the anchor actually in the DOM for .click() to trigger a
  // real download rather than silently no-op.
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  noteExport();
}
