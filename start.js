#!/usr/bin/env node
// Start script for VersionManage
const { spawn } = require('child_process');
const path = require('path');

const rootDir = path.dirname(__filename);

console.log('Starting VersionManage...');
console.log('');

// Start backend
const backend = spawn('npx', ['tsx', 'src/app.ts'], {
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

console.log('Backend: http://localhost:8080');
console.log('Frontend: http://localhost:5173');
console.log('Admin credentials: admin / admin123');
console.log('');

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  backend.kill();
  frontend.kill();
  process.exit(0);
});
