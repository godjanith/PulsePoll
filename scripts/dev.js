import { spawn } from 'node:child_process';
import process from 'node:process';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = [
  { name: 'API', args: ['--prefix', 'server', 'run', 'dev'] },
  { name: 'WEB', args: ['--prefix', 'client', 'run', 'dev'] },
].map(({ name, args }) => {
  const child = spawn(npmCommand, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  child.on('exit', (code) => {
    if (code && code !== 0) {
      console.error(`[${name}] exited with code ${code}`);
      if (!shuttingDown) shutdown();
    }
  });
  return child;
});

let shuttingDown = false;
function shutdown(signal = 'SIGTERM') {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill(signal);
  }
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
