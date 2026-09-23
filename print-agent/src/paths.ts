import path from "node:path";

/**
 * Where the agent keeps its three files (Q-010, 2026-09-23: Windows and Linux).
 *
 * - Windows: `%ProgramData%\RasoiOS\PrintAgent` — the installer removes inherited permissions and grants only SYSTEM
 *   and Administrators (packaging/windows/install.ps1).
 * - Linux: `/var/lib/rasoios-print-agent` — created 0700 for the service user by systemd `StateDirectory=`.
 *
 * `RASOIOS_AGENT_HOME` overrides both (development and tests).
 */
export type AgentPaths = { home: string; config: string; credentials: string; journal: string };

export function agentPaths(env: NodeJS.ProcessEnv = process.env, platform: NodeJS.Platform = process.platform): AgentPaths {
  const home = env.RASOIOS_AGENT_HOME
    ? path.resolve(env.RASOIOS_AGENT_HOME)
    : platform === "win32"
      ? path.win32.join(env.ProgramData ?? "C:\\ProgramData", "RasoiOS", "PrintAgent")
      : "/var/lib/rasoios-print-agent";
  const join = platform === "win32" && !env.RASOIOS_AGENT_HOME ? path.win32.join : path.join;
  return {
    home,
    config: join(home, "config.json"),
    credentials: join(home, "credentials.json"),
    journal: join(home, "journal.json"),
  };
}
