export enum DeviceScope {
  SESSIONS_READ = 'sessions:read',
  SHELL_EXEC = 'shell:exec',
  SHELL_EXEC_IN_REPO = 'shell:exec-in-repo',
  FS_READ = 'fs:read',
  FS_WRITE = 'fs:write',
  SCRIPTS_EXECUTE = 'scripts:execute',
  SCHEDULE_WRITE = 'schedule:write',
  REPOS_WRITE = 'repos:write',
  CLIPBOARD_READ = 'clipboard:read',
  CLIPBOARD_WRITE = 'clipboard:write',
  BROWSER_CONTROL = 'browser:control',
}
