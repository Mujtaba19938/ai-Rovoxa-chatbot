#!/usr/bin/env node

/**
 * Development Startup Script for AI Orb Chatbot
 * Starts both the backend server and frontend development server
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🚀 Starting AI Orb Chatbot Development Environment');
console.log('================================================\n');

// Start backend server
console.log('🔧 Starting backend server...');
const backend = spawn('node', ['server/index.js'], {
  cwd: projectRoot,
  stdio: 'pipe',
  shell: true
});

backend.stdout.on('data', (data) => {
  console.log(`[Backend] ${data.toString().trim()}`);
});

backend.stderr.on('data', (data) => {
  console.error(`[Backend Error] ${data.toString().trim()}`);
});

// Wait a moment for backend to start
setTimeout(() => {
  console.log('\n🌐 Starting frontend development server...');
  
  // Start frontend server
  const frontend = spawn('npm', ['run', 'dev'], {
    cwd: projectRoot,
    stdio: 'pipe',
    shell: true
  });

  frontend.stdout.on('data', (data) => {
    console.log(`[Frontend] ${data.toString().trim()}`);
  });

  frontend.stderr.on('data', (data) => {
    console.error(`[Frontend Error] ${data.toString().trim()}`);
  });

  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down servers...');
    backend.kill();
    frontend.kill();
    process.exit(0);
  });

}, 2000);

// Handle backend process termination
backend.on('close', (code) => {
  console.log(`\n❌ Backend server exited with code ${code}`);
  process.exit(1);
});

console.log('\n✅ Both servers are starting...');
console.log('📝 Backend: http://localhost:5000');
console.log('🌐 Frontend: http://localhost:3000');
console.log('\n💡 Press Ctrl+C to stop both servers');
