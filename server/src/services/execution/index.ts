import type { ExecutionResult } from '@codev/shared';
import { ExecutionParams } from './types.js';
import { executeViaLocal } from './runners/local_runner.js';
import { executeViaPiston } from './runners/piston_runner.js';

export async function executeCode(params: ExecutionParams): Promise<ExecutionResult> {
  const driver = process.env.EXECUTION_DRIVER || 'local';

  if (driver === 'piston') {
    try {
      return await executeViaPiston(params);
    } catch (error: any) {
      console.warn('Self-hosted Piston sandbox unavailable, falling back to local runner:', error?.message);
      return await executeViaLocal(params);
    }
  }

  return await executeViaLocal(params);
}

export * from './types.js';
export { executeViaLocal } from './runners/local_runner.js';
export { executeViaPiston } from './runners/piston_runner.js';
export { runProcess, isPrlimitAvailable } from './runners/process_spawner.js';
export { getCompileArgs, getTsxBinary } from './runners/compiler_config.js';
export * from './drivers/index.js';
