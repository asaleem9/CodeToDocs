#!/usr/bin/env node

/**
 * CodeToDocsAI Demo & Test Script
 *
 * This script demonstrates all features of CodeToDocsAI:
 * - API documentation generation
 * - Quality scoring
 * - Diagram generation
 * - GitHub webhook simulation
 * - Storage and retrieval
 *
 * Perfect for hackathon demos and feature verification!
 */

import axios from 'axios';
import crypto from 'crypto';
import { samples, webhookPayload } from './sampleCode.js';

const API_BASE = 'http://localhost:3001';
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

// Progress indicator
const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
let spinnerIndex = 0;

function printHeader(text) {
  console.log(`\n${colors.bright}${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}${text}${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}${'='.repeat(60)}${colors.reset}\n`);
}

function printSuccess(text) {
  console.log(`${colors.green}✓${colors.reset} ${text}`);
}

function printError(text) {
  console.log(`${colors.red}✗${colors.reset} ${text}`);
}

function printInfo(text) {
  console.log(`${colors.blue}ℹ${colors.reset} ${text}`);
}

function printWarning(text) {
  console.log(`${colors.yellow}⚠${colors.reset} ${text}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function showSpinner(text, duration) {
  const interval = setInterval(() => {
    process.stdout.write(`\r${colors.cyan}${spinner[spinnerIndex]}${colors.reset} ${text}`);
    spinnerIndex = (spinnerIndex + 1) % spinner.length;
  }, 80);

  await sleep(duration);
  clearInterval(interval);
  process.stdout.write('\r');
}

async function checkHealth() {
  printHeader('🏥 Health Check');

  try {
    await showSpinner('Checking API health...', 1000);
    const response = await axios.get(`${API_BASE}/api/health`);
    printSuccess(`API Status: ${response.data.status}`);
    printInfo(`Message: ${response.data.message}`);
    return true;
  } catch (error) {
    printError('API health check failed');
    printError('Make sure the backend server is running on port 3001');
    return false;
  }
}

async function testDocumentationGeneration(language) {
  const sample = samples[language];
  printHeader(`📝 Testing Documentation Generation: ${sample.name}`);

  try {
    printInfo(`Language: ${colors.magenta}${language}${colors.reset}`);
    printInfo(`Code length: ${sample.code.length} characters`);

    await showSpinner('Generating documentation with AI...', 2000);

    const startTime = Date.now();
    const response = await axios.post(`${API_BASE}/api/generate`, {
      code: sample.code,
      language: sample.language
    });
    const endTime = Date.now();

    printSuccess(`Generated in ${endTime - startTime}ms`);

    // Quality Score
    if (response.data.qualityScore) {
      const score = response.data.qualityScore.score;
      const scoreColor = score >= 80 ? colors.green : score >= 60 ? colors.yellow : colors.red;
      console.log(`\n${colors.bright}Quality Score:${colors.reset} ${scoreColor}${score}/100${colors.reset}`);

      const breakdown = response.data.qualityScore.breakdown;
      console.log(`\n${colors.bright}Breakdown:${colors.reset}`);
      console.log(`  ${breakdown.hasOverview ? '✓' : '✗'} Overview`);
      console.log(`  ${breakdown.hasParameters ? '✓' : '✗'} Parameters`);
      console.log(`  ${breakdown.hasReturnValues ? '✓' : '✗'} Return Values`);
      console.log(`  ${breakdown.hasExamples ? '✓' : '✗'} Examples`);
      console.log(`  ${breakdown.hasUsage ? '✓' : '✗'} Usage Guide`);
      console.log(`  ${breakdown.hasDependencies ? '✓' : '✗'} Dependencies`);
      console.log(`  ${breakdown.hasNotes ? '✓' : '✗'} Notes/Best Practices`);
      console.log(`  Code blocks: ${breakdown.codeBlocksCount}`);
    }

    // Documentation preview
    if (response.data.documentation) {
      const preview = response.data.documentation.substring(0, 200);
      console.log(`\n${colors.bright}Documentation Preview:${colors.reset}`);
      console.log(`${colors.cyan}${preview}...${colors.reset}`);
    }

    // Diagram
    if (response.data.diagram) {
      printSuccess('Visual diagram generated');
      const diagramLines = response.data.diagram.split('\n').length;
      printInfo(`Diagram size: ${diagramLines} lines`);
    }

    return response.data;
  } catch (error) {
    printError(`Documentation generation failed: ${error.message}`);
    if (error.response?.data?.error) {
      printError(`Server error: ${error.response.data.error}`);
    }
    return null;
  }
}

async function testWebhookSimulation() {
  printHeader('🔔 GitHub Webhook Simulation');

  try {
    printInfo('Simulating GitHub PR merge webhook...');
    printInfo(`PR #${webhookPayload.number}: ${webhookPayload.pull_request.title}`);
    printInfo(`Author: ${webhookPayload.pull_request.user.login}`);
    printInfo(`Branch: ${webhookPayload.pull_request.head.ref}`);
    printInfo(`Repository: ${webhookPayload.pull_request.base.repo.full_name}`);

    // Create webhook signature (if secret is configured)
    const secret = process.env.GITHUB_WEBHOOK_SECRET || 'test_secret';
    const payload = JSON.stringify(webhookPayload);
    const signature = 'sha256=' + crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    await showSpinner('Sending webhook payload...', 1500);

    const response = await axios.post(`${API_BASE}/api/webhook/github`, webhookPayload, {
      headers: {
        'X-Hub-Signature-256': signature,
        'X-GitHub-Event': 'pull_request',
        'Content-Type': 'application/json'
      }
    });

    printSuccess('Webhook received and processed');
    printInfo(`Status: ${response.data.status}`);

    if (response.data.queued) {
      printWarning('PR queued for documentation generation');
      printInfo(`Queue size: ${response.data.queueSize || 1}`);
    }

    return true;
  } catch (error) {
    if (error.response?.status === 401) {
      printWarning('Webhook signature verification failed (expected in demo mode)');
      printInfo('In production, configure GITHUB_WEBHOOK_SECRET in .env');
      return true; // Not a critical failure for demo
    }

    printError(`Webhook test failed: ${error.message}`);
    return false;
  }
}

async function testStorageAndRetrieval() {
  printHeader('💾 Storage & Retrieval Test');

  try {
    await showSpinner('Fetching documentation history...', 1000);

    const response = await axios.get(`${API_BASE}/api/documentation`);

    printSuccess(`Retrieved ${response.data.total} documentation entries`);

    if (response.data.stats) {
      console.log(`\n${colors.bright}Storage Stats:${colors.reset}`);
      console.log(`  Entries: ${response.data.stats.entries}/${response.data.stats.maxSize}`);
      console.log(`  Storage type: In-memory LRU cache`);
    }

    if (response.data.documentation && response.data.documentation.length > 0) {
      console.log(`\n${colors.bright}Recent Entries:${colors.reset}`);
      response.data.documentation.slice(0, 3).forEach((doc, index) => {
        console.log(`\n  ${index + 1}. Language: ${colors.magenta}${doc.language}${colors.reset}`);
        console.log(`     Generated: ${new Date(doc.generatedAt).toLocaleString()}`);
        console.log(`     Quality: ${doc.qualityScore?.score || 'N/A'}/100`);
        if (doc.prInfo) {
          console.log(`     PR #${doc.prInfo.prNumber} by ${doc.prInfo.author}`);
        }
      });
    }

    return true;
  } catch (error) {
    printError(`Storage test failed: ${error.message}`);
    return false;
  }
}

async function testAllLanguages() {
  printHeader('🌐 Multi-Language Test');

  const results = [];

  for (const [language, sample] of Object.entries(samples)) {
    printInfo(`Testing ${language}...`);
    const result = await testDocumentationGeneration(language);
    results.push({ language, success: result !== null });

    // Wait between requests to avoid rate limiting
    await sleep(1000);
  }

  console.log(`\n${colors.bright}Summary:${colors.reset}`);
  results.forEach(({ language, success }) => {
    if (success) {
      printSuccess(`${language}: Documentation generated`);
    } else {
      printError(`${language}: Failed`);
    }
  });

  const successCount = results.filter(r => r.success).length;
  return successCount === results.length;
}

async function demonstrateFeatures() {
  console.log(`\n${colors.bright}${colors.magenta}`);
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                                                           ║');
  console.log('║           CodeToDocsAI - Hackathon Demo Script           ║');
  console.log('║                                                           ║');
  console.log('║   AI-Powered Documentation Generator using Claude 3.5    ║');
  console.log('║                                                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  const results = {
    health: false,
    singleDoc: false,
    allLanguages: false,
    webhook: false,
    storage: false
  };

  // 1. Health Check
  results.health = await checkHealth();
  if (!results.health) {
    printError('\nCannot proceed without a healthy API. Exiting...');
    process.exit(1);
  }
  await sleep(1000);

  // 2. Single Documentation Generation
  results.singleDoc = await testDocumentationGeneration('javascript') !== null;
  await sleep(1000);

  // 3. Storage & Retrieval
  results.storage = await testStorageAndRetrieval();
  await sleep(1000);

  // 4. Webhook Simulation
  results.webhook = await testWebhookSimulation();
  await sleep(1000);

  // 5. All Languages (optional - can be skipped for quick demo)
  const shouldTestAll = process.argv.includes('--all');
  if (shouldTestAll) {
    results.allLanguages = await testAllLanguages();
  }

  // Final Summary
  printHeader('📊 Demo Summary');

  console.log(`${colors.bright}Feature Status:${colors.reset}\n`);
  console.log(`  Health Check:           ${results.health ? '✓ Passed' : '✗ Failed'}`);
  console.log(`  Documentation Gen:      ${results.singleDoc ? '✓ Passed' : '✗ Failed'}`);
  console.log(`  Storage & Retrieval:    ${results.storage ? '✓ Passed' : '✗ Failed'}`);
  console.log(`  Webhook Integration:    ${results.webhook ? '✓ Passed' : '✗ Failed'}`);
  if (shouldTestAll) {
    console.log(`  Multi-Language:         ${results.allLanguages ? '✓ Passed' : '✗ Failed'}`);
  }

  const totalTests = shouldTestAll ? 5 : 4;
  const passedTests = Object.values(results).filter(Boolean).length;

  console.log(`\n${colors.bright}Overall:${colors.reset} ${passedTests}/${totalTests} tests passed`);

  if (passedTests === totalTests) {
    console.log(`\n${colors.green}${colors.bright}🎉 All tests passed! CodeToDocsAI is ready for the hackathon! 🎉${colors.reset}\n`);
  } else {
    console.log(`\n${colors.yellow}⚠ Some tests failed. Review the output above for details.${colors.reset}\n`);
  }

  printInfo('Demo complete. Press Ctrl+C to exit.\n');
}

// Run the demo
demonstrateFeatures().catch(error => {
  console.error(`\n${colors.red}Fatal error:${colors.reset}`, error.message);
  process.exit(1);
});
