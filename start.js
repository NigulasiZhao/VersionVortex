#!/usr/bin/env node
// Start script for VersionManage
const { spawn, execSync } = require('child_process');
const path = require('path');

const rootDir = path.dirname(__filename);

console.log('Starting VersionManage...');
console.log('');

// Compile backend first
console.log('Compiling backend...');
try {
  execSync('npx tsc', { cwd: path.join(rootDir, 'backend'), stdio: 'inherit' });
} catch (e) {
  console.error('Backend compile failed');
  process.exit(1);
}

// Start backend
const backend = spawn('node', ['dist/app.js'], {
  cwd: path.join(rootDir, 'backend'),
  stdio: 'inherit',
  shell: true,
  env: { ...process.env },
});

// Start frontend dev server (use local vite in frontend/node_modules)
const frontend = spawn('node', ['./node_modules/vite/bin/vite.js'], {
  cwd: path.join(rootDir, 'frontend'),
  stdio: 'inherit',
  shell: true,
  env: { ...process.env },
});

console.log('Backend: http://localhost:12006');
console.log('Frontend: http://localhost:12005');
console.log('Admin credentials: admin / admin123');
console.log('');

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  backend.kill();
  frontend.kill();
  process.exit(0);
});
