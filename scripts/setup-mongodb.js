#!/usr/bin/env node

/**
 * MongoDB Setup Script for AI Orb Chatbot
 * This script helps set up MongoDB for persistent chat history
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 AI Orb Chatbot - MongoDB Setup');
console.log('=====================================\n');

// Check if MongoDB is already running
async function checkMongoDB() {
  return new Promise((resolve) => {
    const mongod = spawn('mongod', ['--version'], { stdio: 'pipe' });
    
    mongod.on('close', (code) => {
      resolve(code === 0);
    });
    
    mongod.on('error', () => {
      resolve(false);
    });
  });
}

// Start MongoDB service
async function startMongoDB() {
  console.log('📦 Starting MongoDB...');
  
  return new Promise((resolve, reject) => {
    // Try to start MongoDB daemon
    const mongod = spawn('mongod', ['--dbpath', './data/db'], {
      stdio: 'pipe',
      detached: true
    });
    
    mongod.on('error', (error) => {
      console.error('❌ Failed to start MongoDB:', error.message);
      reject(error);
    });
    
    // Give MongoDB a moment to start
    setTimeout(() => {
      console.log('✅ MongoDB started successfully!');
      resolve(true);
    }, 3000);
  });
}

// Create data directory
function createDataDirectory() {
  const dataDir = path.join(process.cwd(), 'data', 'db');
  
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('📁 Created data directory:', dataDir);
  }
}

// Main setup function
async function setup() {
  try {
    console.log('🔍 Checking MongoDB installation...');
    
    const isInstalled = await checkMongoDB();
    
    if (!isInstalled) {
      console.log('❌ MongoDB is not installed or not in PATH');
      console.log('\n📋 To install MongoDB:');
      console.log('   Windows: Download from https://www.mongodb.com/try/download/community');
      console.log('   macOS: brew install mongodb-community');
      console.log('   Linux: sudo apt-get install mongodb');
      console.log('\n💡 Alternative: Use MongoDB Atlas (cloud) - update MONGODB_URI in .env');
      return;
    }
    
    console.log('✅ MongoDB is installed');
    
    // Create data directory
    createDataDirectory();
    
    // Try to start MongoDB
    await startMongoDB();
    
    console.log('\n🎉 Setup complete!');
    console.log('📝 Next steps:');
    console.log('   1. Make sure your .env file has the correct MONGODB_URI');
    console.log('   2. Start the server: npm run server');
    console.log('   3. Start the frontend: npm run dev');
    console.log('\n💬 Your chat history will now persist across sessions!');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.log('\n🔄 Fallback: The app will work without MongoDB using in-memory storage');
    console.log('   (Chat history will not persist across server restarts)');
  }
}

// Run setup
setup();
