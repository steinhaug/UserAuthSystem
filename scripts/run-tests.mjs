#!/usr/bin/env node

import { spawn } from 'child_process';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Define tests with their display name and command
const tests = [
  { name: 'Database Connection', command: ['npx', 'tsx', 'scripts/tests/database-test.ts'] },
  { name: 'Firebase Configuration', command: ['npx', 'tsx', 'scripts/tests/firebase-test.ts'] },
  { name: 'Mapbox API', command: ['npx', 'tsx', 'scripts/tests/mapbox-test.ts'] },
  { name: 'OpenAI API', command: ['npx', 'tsx', 'scripts/tests/openai-test.ts'] }
];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m'
};

// Display menu
function showMenu() {
  console.log(`${colors.bright}${colors.cyan}=== External Services Test Menu ===\n${colors.reset}`);
  console.log(`${colors.dim}Select a test to run:${colors.reset}\n`);
  
  tests.forEach((test, index) => {
    console.log(`${colors.green}${index + 1}${colors.reset}. Test ${test.name}`);
  });
  
  console.log(`${colors.yellow}a${colors.reset}. Run all tests`);
  console.log(`${colors.red}q${colors.reset}. Quit\n`);
  
  rl.question(`${colors.bright}Enter your choice: ${colors.reset}`, (answer) => {
    handleChoice(answer);
  });
}

// Run a single test
function runTest(test) {
  return new Promise((resolve) => {
    console.log(`\n${colors.bright}${colors.cyan}Running ${test.name} test...${colors.reset}\n`);
    
    const process = spawn(test.command[0], test.command.slice(1), { stdio: 'inherit' });
    
    process.on('exit', (code) => {
      if (code === 0) {
        console.log(`\n${colors.green}${test.name} test completed successfully.${colors.reset}\n`);
      } else {
        console.log(`\n${colors.red}${test.name} test failed with code ${code}.${colors.reset}\n`);
      }
      resolve();
    });
  });
}

// Run all tests sequentially
async function runAllTests() {
  console.log(`\n${colors.bright}${colors.cyan}Running all tests sequentially...${colors.reset}\n`);
  
  for (const test of tests) {
    await runTest(test);
  }
  
  showMenu();
}

// Handle user's menu choice
function handleChoice(choice) {
  if (choice.toLowerCase() === 'q') {
    console.log(`\n${colors.bright}${colors.yellow}Exiting test runner. Goodbye!${colors.reset}\n`);
    rl.close();
    return;
  }
  
  if (choice.toLowerCase() === 'a') {
    runAllTests();
    return;
  }
  
  const index = parseInt(choice) - 1;
  if (isNaN(index) || index < 0 || index >= tests.length) {
    console.log(`\n${colors.red}Invalid choice. Please try again.${colors.reset}\n`);
    showMenu();
    return;
  }
  
  runTest(tests[index]).then(() => {
    // Ask if the user wants to return to the menu
    rl.question(`${colors.yellow}Return to menu? (Y/n): ${colors.reset}`, (answer) => {
      if (answer.toLowerCase() !== 'n') {
        showMenu();
      } else {
        rl.close();
      }
    });
  });
}

// Start the menu
showMenu();

// Handle CTRL+C
rl.on('SIGINT', () => {
  console.log(`\n${colors.bright}${colors.yellow}Test runner interrupted. Goodbye!${colors.reset}\n`);
  rl.close();
  process.exit(0);
});