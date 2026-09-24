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
export type AgentEnv = Readonly<Record<string, string | undefined>>;

export function agentPaths(env: AgentEnv = process.env, platform: NodeJS.Platform = process.platform): AgentPaths {
  const p = env.RASOIOS_AGENT_HOME ? path : platform === "win32" ? path.win32 : path.posix;
  const home = env.RASOIOS_AGENT_HOME
    ? path.resolve(env.RASOIOS_AGENT_HOME)
    : platform === "win32"
      ? p.join(env.ProgramData ?? "C:\\ProgramData", "RasoiOS", "PrintAgent")
      : "/var/lib/rasoios-print-agent";
  return {
    home,
    config: p.join(home, "config.json"),
    credentials: p.join(home, "credentials.json"),
    journal: p.join(home, "journal.json"),
  };
}
