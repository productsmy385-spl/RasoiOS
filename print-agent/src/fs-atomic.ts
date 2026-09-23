import { randomBytes } from "node:crypto";
import { mkdir, open, rename, rm } from "node:fs/promises";
import path from "node:path";

/**
 * Write-then-rename with fsync, so a power cut leaves either the old file or the new one — never half of either. The
 * journal depends on this: a torn journal would forget which jobs were already printed (ADR-007 §5).
 */
export async function writeFileAtomic(file: string, contents: string, mode: number): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const temp = `${file}.${randomBytes(6).toString("hex")}.tmp`;
  const handle = await open(temp, "wx", mode);
  try {
    await handle.writeFile(contents, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await rename(temp, file);
  } catch (error) {
    await rm(temp, { force: true });
    throw error;
  }
  if (process.platform !== "win32") {
    // Persist the rename itself (directory entry). Windows has no directory fsync; NTFS journals the rename.
    const dir = await open(path.dirname(file), "r");
    try {
      await dir.sync();
    } finally {
      await dir.close();
    }
  }
}
