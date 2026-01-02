#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const weatherApiKey = 'e585fbaf7e314f7b5c1a1ed2fd74d98d';

console.log('🌤️ Setting up Weather API...');

// Check if .env file exists
const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', 'env.example');

if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env file from env.example...');
  
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ .env file created');
  } else {
    console.log('❌ env.example file not found');
    process.exit(1);
  }
}

// Read current .env file
let envContent = fs.readFileSync(envPath, 'utf8');

// Check if WEATHER_API_KEY already exists
if (envContent.includes('WEATHER_API_KEY=')) {
  // Update existing key
  envContent = envContent.replace(
    /WEATHER_API_KEY=.*/,
    `WEATHER_API_KEY=${weatherApiKey}`
  );
  console.log('🔄 Updated existing WEATHER_API_KEY');
} else {
  // Add new key
  envContent += `\n# OpenWeatherMap API Configuration\nWEATHER_API_KEY=${weatherApiKey}\n`;
  console.log('➕ Added WEATHER_API_KEY');
}

// Write updated .env file
fs.writeFileSync(envPath, envContent);

console.log('✅ Weather API key configured successfully!');
console.log('🔑 API Key:', weatherApiKey);
console.log('');
console.log('📋 Next steps:');
console.log('1. Restart your server: npm run server');
console.log('2. Test weather functionality by asking: "What\'s the weather in London?"');
console.log('3. Run connectivity tests in Settings > System Diagnostics');
console.log('');
console.log('🌤️ Weather queries that will work:');
console.log('- "What\'s the weather in [city]?"');
console.log('- "How is the weather in [city]?"');
console.log('- "Temperature in [city]"');
console.log('- "Weather forecast for [city]"');
