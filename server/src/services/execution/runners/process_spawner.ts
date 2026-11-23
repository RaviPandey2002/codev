import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { MAX_OUTPUT_BYTES, SpawnOutcome } from '../types.js';

let hasPrlimitChecked = false;
let hasPrlimit = false;

export function isPrlimitAvailable(): boolean {
  if (!hasPrlimitChecked) {
    hasPrlimitChecked = true;
    try {
      hasPrlimit = process.platform === 'linux' && existsSync('/usr/bin/prlimit');
    } catch {
      hasPrlimit = false;
    }
  }
  return hasPrlimit;
}

export function runProcess(
  command: string,
  args: string[],
  cwd: string,
  stdinInput: string,
  timeoutMs: number,
  options?: { sandboxed?: boolean; applyMemoryCap?: boolean }
): Promise<SpawnOutcome> {
  return new Promise((resolve) => {
    const startTime = performance.now();

    // Kernel sandboxing via prlimit on Linux:
    // Only wrap when explicitly requested (for running user code, never for g++ compiler tooling)
    let actualCommand = command;
    let actualArgs = args;

    if (options?.sandboxed && isPrlimitAvailable()) {
      const prlimitArgs: string[] = ['--fsize=5242880']; // 5MB max output file
      if (options.applyMemoryCap) {
        prlimitArgs.push('--as=268435456'); // 256MB virtual memory cap
      }
      // Only enforce nproc if running under a dedicated sandbox UID,
      // because Linux RLIMIT_NPROC is per-UID across the entire OS.
      if (process.env.SANDBOX_UID) {
        prlimitArgs.push('--nproc=30');
      }
      actualArgs = [...prlimitArgs, command, ...args];
      actualCommand = '/usr/bin/prlimit';
    }

    const spawnOptions: any = {
      cwd,
      env: {
        PATH: process.env.PATH,
        NODE_OPTIONS: '--max-old-space-size=128',
      },
      detached: process.platform !== 'win32',
    };

    if (process.env.SANDBOX_UID) {
      spawnOptions.uid = parseInt(process.env.SANDBOX_UID, 10);
    }
    if (process.env.SANDBOX_GID) {
      spawnOptions.gid = parseInt(process.env.SANDBOX_GID, 10);
    }

    const child = spawn(actualCommand, actualArgs, spawnOptions);

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const killChild = () => {
      try {
        if (child.pid && process.platform !== 'win32') {
          process.kill(-child.pid, 'SIGKILL');
        } else {
          child.kill('SIGKILL');
        }
      } catch {
        try {
          child.kill('SIGKILL');
        } catch {}
      }
    };

    const timer = setTimeout(() => {
      timedOut = true;
      killChild();
    }, timeoutMs);

    child.stdout.on('data', (chunk: Buffer) => {
      if (stdout.length < MAX_OUTPUT_BYTES) {
        stdout += chunk.toString('utf-8');
        if (stdout.length >= MAX_OUTPUT_BYTES) {
          stdout = stdout.slice(0, MAX_OUTPUT_BYTES) + '\n[Output truncated at 64KB]';
          killChild();
        }
      }
    });

    child.stderr.on('data', (chunk: Buffer) => {
      if (stderr.length < MAX_OUTPUT_BYTES) {
        stderr += chunk.toString('utf-8');
        if (stderr.length >= MAX_OUTPUT_BYTES) {
          stderr = stderr.slice(0, MAX_OUTPUT_BYTES) + '\n[Error output truncated at 64KB]';
          killChild();
        }
      }
    });

    child.stdin.on('error', () => {
      // Prevent uncaught EPIPE if child process terminates before reading all stdin
    });

    if (stdinInput) {
      // Normalize Windows CRLF to LF and ensure stdin ends with newline,
      // preventing EOF truncation and trailing \r issues in C++ getline / cin
      const normalizedStdin = stdinInput.replace(/\r\n/g, '\n');
      child.stdin.write(normalizedStdin.endsWith('\n') ? normalizedStdin : normalizedStdin + '\n');
    }
    child.stdin.end();

    child.on('error', (err: Error) => {
      clearTimeout(timer);
      resolve({
        stdout,
        stderr: stderr ? `${stderr}\n${err.message}` : err.message,
        exitCode: 1,
        timedOut: false,
        durationMs: Math.round(performance.now() - startTime),
      });
    });

    child.on('close', (code: number | null) => {
      clearTimeout(timer);
      resolve({
        stdout,
        stderr,
        exitCode: code,
        timedOut,
        durationMs: Math.round(performance.now() - startTime),
      });
    });
  });
}
