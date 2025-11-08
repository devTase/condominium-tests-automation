/**
 * Starts the Angular UI (`ng serve`) and the Quarkus backend (`mvnw quarkus:dev`)
 * in parallel. Designed to be used by Playwright's `webServer` hook so the
 * integration tests run against the real stack instead of falling back to mocks.
 */
const { spawn } = require('child_process');
const path = require('path');

const processes = [];
let shuttingDown = false;

const uiCwd = path.resolve(__dirname, '..', '..', 'condominium-hsh-ui');
const backendCwd = path.resolve(__dirname, '..', '..', 'condominium-hsh-be');

function spawnProcess(command, args, options) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: false,
    ...options,
  });

  processes.push(child);

  child.on('exit', (code, signal) => {
    if (shuttingDown) {
      return;
    }

    const name = options?.name ?? command;
    console.error(`[services] ${name} exited with code ${code ?? 'null'} signal ${signal ?? 'null'}`);
    shutdown(code ?? (signal ? 1 : 0));
  });

  child.on('error', (error) => {
    console.error(`[services] Failed to start ${options?.name ?? command}:`, error);
    shutdown(1);
  });

  return child;
}

function shutdown(code = 0) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  for (const child of processes) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }

  setTimeout(() => {
    for (const child of processes) {
      if (!child.killed) {
        child.kill('SIGKILL');
      }
    }
    process.exit(code);
  }, 5_000);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
process.on('uncaughtException', (error) => {
  console.error('[services] Uncaught exception', error);
  shutdown(1);
});

const isWindows = process.platform === 'win32';

const mvnCommand = isWindows ? 'cmd.exe' : path.join(backendCwd, 'mvnw');
const mvnArgs = isWindows
  ? ['/c', 'mvnw.cmd', 'quarkus:dev', '-Dquarkus.http.port=8080']
  : ['quarkus:dev', '-Dquarkus.http.port=8080'];
spawnProcess(mvnCommand, mvnArgs, {
  cwd: backendCwd,
  env: {
    ...process.env,
    QUARKUS_PROFILE: process.env.QUARKUS_PROFILE ?? 'dev',
  },
  name: 'backend',
});

const npmCommand = isWindows ? 'cmd.exe' : 'npm';
const npmArgs = isWindows
  ? ['/c', 'npm.cmd', 'run', 'start', '--', '--host', 'localhost', '--port', '4200']
  : ['run', 'start', '--', '--host', 'localhost', '--port', '4200'];
spawnProcess(npmCommand, npmArgs, {
  cwd: uiCwd,
  env: {
    ...process.env,
    NG_CLI_ANALYTICS: 'false',
  },
  name: 'ui',
});


