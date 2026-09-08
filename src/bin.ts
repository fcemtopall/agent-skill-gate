#!/usr/bin/env node
import { runCli } from './cli/run.js';

runCli(process.argv.slice(2)).catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});