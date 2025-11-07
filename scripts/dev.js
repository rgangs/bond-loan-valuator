#!/usr/bin/env node
// ============================================================================
// Unified Development Runner
// ============================================================================
// Installs dependencies (if missing), prepares the database, and starts the
// API server, optional FRED feed, and desktop client in one shot.
// ============================================================================

const path = require('path');
const fs = require('fs');
const { spawn, spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const apiDir = path.join(rootDir, 'api-server');
const desktopDir = path.join(rootDir, 'desktop-client');

const isWindows = process.platform === 'win32';
const npmCommand = 'npm';
const nodeCommand = 'node';
const pythonCommand = process.env.PYTHON_COMMAND || (isWindows ? 'python' : 'python3');

const defaultFredPath = isWindows
  ? path.win32.join('D:', 'FREDAPI')
  : '/mnt/d/FREDAPI';

const fredDir = path.resolve(process.env.FRED_API_PATH || defaultFredPath);
const shouldStartFred = (process.env.START_FRED || process.env.FRED_API_DEV_RUNNER || 'true').toLowerCase() !== 'false';
const localFredBaseUrl = process.env.FRED_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';
const fredCurveMapFile = path.join(apiDir, 'config', 'fred.curve-map.json');

const buildDisplayCommand = (command, args = []) => [command, ...(args || [])].join(' ');

const runSyncCommand = (command, args, cwd) => {
  const display = buildDisplayCommand(command, args);
  let result;

  if (isWindows) {
    result = spawnSync(display, {
      cwd,
      stdio: 'inherit',
      shell: true
    });
  } else {
    result = spawnSync(command, args, {
      cwd,
      stdio: 'inherit'
    });
  }

  if (result.error) {
    throw new Error(`Failed to run "${display}": ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(`Command "${display}" exited with code ${result.status}`);
  }
};

function ensureDependencies(cwd) {
  if (fs.existsSync(path.join(cwd, 'node_modules'))) {
    return;
  }

  console.log(`⧗ Installing dependencies in ${path.relative(rootDir, cwd)}...`);
  runSyncCommand(npmCommand, ['install'], cwd);
}

function ensureDatabase() {
  runSyncCommand(nodeCommand, ['scripts/ensure-db.js'], apiDir);
}

function ensurePythonDependencies(cwd) {
  console.log(`⧗ Installing Python dependencies in ${path.relative(rootDir, cwd)}...`);
  runSyncCommand(pythonCommand, ['-m', 'pip', 'install', '-r', 'requirements.txt'], cwd);
}

function buildServices() {
  const services = [];

  const fredApiEnv = {};

  if (shouldStartFred) {
    if (!process.env.FRED_API_ENABLED) {
      fredApiEnv.FRED_API_ENABLED = 'true';
    }
    if (!process.env.FRED_API_BASE_URL) {
      fredApiEnv.FRED_API_BASE_URL = localFredBaseUrl;
    }
    if (!process.env.FRED_API_CURVE_MAP_FILE && fs.existsSync(fredCurveMapFile)) {
      fredApiEnv.FRED_API_CURVE_MAP_FILE = fredCurveMapFile;
    }
  }

  if (shouldStartFred) {
    if (fs.existsSync(fredDir) && fs.existsSync(path.join(fredDir, 'main.py'))) {
      const fredServiceEnv = {
        PYTHONUNBUFFERED: '1'
      };

      services.push({
        name: 'FRED API',
        cwd: fredDir,
        command: pythonCommand,
        args: ['main.py', '--skip-initial-load'],
        env: fredServiceEnv
      });
    } else {
      console.warn(`⚠️  FRED API directory not found at ${fredDir}. Set START_FRED=false to hide this warning.`);
    }
  }

  services.push({
    name: 'API Server',
    cwd: apiDir,
    command: npmCommand,
    args: ['run', 'dev'],
    env: fredApiEnv
  });

  services.push({
    name: 'Desktop Client',
    cwd: desktopDir,
    command: npmCommand,
    args: ['run', 'dev']
  });

  return services;
}

function startServices(services) {
  const children = [];
  let shuttingDown = false;

  function shutdown(code = 0) {
    if (shuttingDown) return;
    shuttingDown = true;
    children.forEach(({ child }) => {
      if (!child.killed) {
        child.kill('SIGINT');
      }
    });
    setTimeout(() => process.exit(code), 100);
  }

  services.forEach(({ name, cwd, command, args, env }) => {
    const display = buildDisplayCommand(command, args);
    console.log(`⧗ Starting ${name} (${display})...`);

    const spawnEnv = { ...process.env, ...(env || {}) };

    let child;
    try {
      if (isWindows) {
        child = spawn(display, {
          cwd,
          stdio: 'inherit',
          shell: true,
          env: spawnEnv
        });
      } else {
        child = spawn(command, args, {
          cwd,
          stdio: 'inherit',
          env: spawnEnv
        });
      }
    } catch (error) {
      console.error(`✗ Failed to start ${name}: ${error.message}`);
      console.error(`  Command: ${display}`);
      console.error(`  Working directory: ${cwd}`);
      console.error('  Set START_FRED=false to skip the FRED feed if it is not available.');
      throw error;
    }

    child.on('exit', (code, signal) => {
      if (shuttingDown) return;
      const reason = signal ? `signal ${signal}` : `code ${code}`;
      console.log(`\n${name} exited with ${reason}. Shutting down remaining services...`);
      shutdown(code || 0);
    });

    children.push({ name, child, display });
  });

  ['SIGINT', 'SIGTERM'].forEach((event) => {
    process.on(event, () => shutdown(0));
  });
}

async function run() {
  try {
    ensureDependencies(apiDir);
    ensureDependencies(desktopDir);

    if (shouldStartFred && fs.existsSync(fredDir) && fs.existsSync(path.join(fredDir, 'requirements.txt'))) {
      ensurePythonDependencies(fredDir);
    }

    ensureDatabase();

    const services = buildServices();
    startServices(services);
  } catch (error) {
    console.error(`✗ ${error.message}`);
    process.exit(1);
  }
}

run();
