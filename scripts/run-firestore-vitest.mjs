import net from 'node:net';
import { once } from 'node:events';
import { spawn } from 'node:child_process';

const emulatorHost = '127.0.0.1';
const emulatorPort = 8780;
const projectId = 'demo-mahjong-point-manager';

const waitForPort = (host, port, timeoutMs) => {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      const socket = net.createConnection({ host, port });

      socket.once('connect', () => {
        socket.end();
        resolve();
      });

      socket.once('error', () => {
        socket.destroy();

        if (Date.now() - startedAt >= timeoutMs) {
          reject(new Error(`Timed out waiting for Firestore emulator on ${host}:${port}`));
          return;
        }

        setTimeout(tryConnect, 250);
      });
    };

    tryConnect();
  });
};

const killPortListeners = async (port) => {
  const lsof = spawn('lsof', ['-ti', `tcp:${port}`], {
    stdio: ['ignore', 'pipe', 'ignore'],
  });

  let stdout = '';
  lsof.stdout.on('data', (chunk) => {
    stdout += chunk.toString();
  });

  await once(lsof, 'exit');

  const pids = stdout
    .split(/\s+/)
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isInteger(value) && value !== process.pid);

  for (const pid of pids) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      // Ignore processes that already exited.
    }
  }
};

const stopChild = async (child) => {
  if (!child || child.exitCode !== null) {
    await killPortListeners(emulatorPort);
    return;
  }

  child.kill('SIGINT');
  await once(child, 'exit');
  await killPortListeners(emulatorPort);
};

const emulator = spawn(
  'firebase',
  ['emulators:start', '--config', 'firebase.test.json', '--only', 'firestore'],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      GCLOUD_PROJECT: projectId,
    },
  },
);

let shuttingDown = false;

const shutdown = async (exitCode = 0) => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  await stopChild(emulator);
  process.exit(exitCode);
};

process.on('SIGINT', () => {
  void shutdown(130);
});

process.on('SIGTERM', () => {
  void shutdown(143);
});

try {
  await waitForPort(emulatorHost, emulatorPort, 30000);

  const vitestArgs = process.argv.slice(2);
  const vitest = spawn(process.execPath, ['./node_modules/vitest/vitest.mjs', ...vitestArgs], {
    stdio: 'inherit',
    env: {
      ...process.env,
      GCLOUD_PROJECT: projectId,
      FIRESTORE_EMULATOR_HOST: `${emulatorHost}:${emulatorPort}`,
    },
  });

  const [vitestExitCode] = await once(vitest, 'exit');
  await stopChild(emulator);
  process.exit(vitestExitCode ?? 1);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  await stopChild(emulator);
  process.exit(1);
}
