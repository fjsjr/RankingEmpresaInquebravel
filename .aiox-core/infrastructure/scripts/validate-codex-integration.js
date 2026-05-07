#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { parseAllAgents } = require('./ide-sync/agent-parser');
const claudeCodeTransformer = require('./ide-sync/transformers/claude-code');
const { DEFAULT_REDIRECTS, generateAllRedirects } = require('./ide-sync/redirect-generator');
const { validateIdeSync } = require('./ide-sync/validator');
const { getSkillId } = require('./codex-skills-sync');

function getDefaultOptions() {
  const projectRoot = process.cwd();
  return {
    projectRoot,
    instructionsFile: path.join(projectRoot, 'AGENTS.md'),
    agentsDir: path.join(projectRoot, '.codex', 'agents'),
    skillsDir: path.join(projectRoot, '.codex', 'skills'),
    sourceAgentsDir: path.join(projectRoot, '.aiox-core', 'development', 'agents'),
    quiet: false,
    json: false,
  };
}

function parseArgs(argv = process.argv.slice(2)) {
  const args = new Set(argv);
  return {
    quiet: args.has('--quiet') || args.has('-q'),
    json: args.has('--json'),
  };
}

function countMarkdownFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return 0;
  return fs.readdirSync(dirPath).filter((f) => f.endsWith('.md')).length;
}

function countSkillFiles(skillsDir, expectedSkillIds = []) {
  if (!fs.existsSync(skillsDir)) return 0;

  if (expectedSkillIds.length > 0) {
    return expectedSkillIds
      .filter((skillId) => fs.existsSync(path.join(skillsDir, skillId, 'SKILL.md')))
      .length;
  }

  const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('aiox-'))
    .filter((entry) => fs.existsSync(path.join(skillsDir, entry.name, 'SKILL.md')))
    .length;
}

function getExpectedCodexAgentFiles(sourceAgentsDir, agentsDir) {
  const agents = parseAllAgents(sourceAgentsDir).filter(
    (agent) => !agent.error || agent.error === 'YAML parse failed, using fallback extraction',
  );

  const files = agents.map((agent) => ({
    filename: claudeCodeTransformer.getFilename(agent),
    content: claudeCodeTransformer.transform(agent),
  }));

  const redirects = generateAllRedirects(DEFAULT_REDIRECTS, agentsDir, claudeCodeTransformer.format).map(
    (redirect) => ({
      filename: redirect.filename,
      content: redirect.content,
    }),
  );

  return [...files, ...redirects];
}

function getExpectedCodexSkillIds(sourceAgentsDir) {
  return parseAllAgents(sourceAgentsDir)
    .filter((agent) => !agent.error || agent.error === 'YAML parse failed, using fallback extraction')
    .map((agent) => getSkillId(agent.id));
}

function getCodexAgentValidation(sourceAgentsDir, agentsDir) {
  const expectedFiles = getExpectedCodexAgentFiles(sourceAgentsDir, agentsDir);
  return validateIdeSync(expectedFiles, agentsDir, DEFAULT_REDIRECTS);
}

function validateCodexIntegration(options = {}) {
  const projectRoot = options.projectRoot || process.cwd();
  const resolved = {
    ...getDefaultOptions(),
    ...options,
    projectRoot,
    instructionsFile: options.instructionsFile || path.join(projectRoot, 'AGENTS.md'),
    agentsDir: options.agentsDir || path.join(projectRoot, '.codex', 'agents'),
    skillsDir: options.skillsDir || path.join(projectRoot, '.codex', 'skills'),
    sourceAgentsDir: options.sourceAgentsDir || path.join(projectRoot, '.aiox-core', 'development', 'agents'),
  };
  const errors = [];
  const warnings = [];

  if (!fs.existsSync(resolved.instructionsFile)) {
    warnings.push(
      `Codex instructions file not found yet: ${path.relative(resolved.projectRoot, resolved.instructionsFile)}`,
    );
  }

  if (!fs.existsSync(resolved.agentsDir)) {
    errors.push(`Missing Codex agents dir: ${path.relative(resolved.projectRoot, resolved.agentsDir)}`);
  }

  if (!fs.existsSync(resolved.skillsDir)) {
    errors.push(`Missing Codex skills dir: ${path.relative(resolved.projectRoot, resolved.skillsDir)}`);
  }

  const sourceCount = countMarkdownFiles(resolved.sourceAgentsDir);
  const expectedSkills = getExpectedCodexSkillIds(resolved.sourceAgentsDir);
  const agentValidation = fs.existsSync(resolved.agentsDir)
    ? getCodexAgentValidation(resolved.sourceAgentsDir, resolved.agentsDir)
    : null;
  const codexAgentsCount = agentValidation ? agentValidation.total.synced : 0;
  const codexSkillsCount = countSkillFiles(resolved.skillsDir, expectedSkills);

  if (agentValidation && (agentValidation.total.missing > 0 || agentValidation.total.drift > 0)) {
    const changed = agentValidation.drift.map((item) => item.filename);
    const missing = agentValidation.missing.map((item) => item.filename);

    if (changed.length > 0) {
      warnings.push(`Codex fallback agents out of sync with generated target: ${changed.join(', ')}`);
    }
    if (missing.length > 0) {
      warnings.push(`Codex fallback agents missing from generated target: ${missing.join(', ')}`);
    }
  }

  if (expectedSkills.length > 0 && codexSkillsCount !== expectedSkills.length) {
    warnings.push(`Codex skill count differs from generated set (${codexSkillsCount}/${expectedSkills.length})`);
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    metrics: {
      sourceAgents: sourceCount,
      codexAgents: codexAgentsCount,
      codexSkills: codexSkillsCount,
      expectedCodexAgents: agentValidation ? agentValidation.total.expected : 0,
      agentDrift: agentValidation ? agentValidation.total.drift : 0,
      agentMissing: agentValidation ? agentValidation.total.missing : 0,
    },
  };
}

function formatHumanReport(result) {
  if (result.ok) {
    const lines = [
      `✅ Codex integration validation passed (agents: ${result.metrics.codexAgents}, skills: ${result.metrics.codexSkills})`,
    ];
    if (result.warnings.length > 0) {
      lines.push(...result.warnings.map((w) => `⚠️ ${w}`));
    }
    return lines.join('\n');
  }
  const lines = [
    `❌ Codex integration validation failed (${result.errors.length} issue(s))`,
    ...result.errors.map((e) => `- ${e}`),
  ];
  if (result.warnings.length > 0) {
    lines.push(...result.warnings.map((w) => `⚠️ ${w}`));
  }
  return lines.join('\n');
}

function main() {
  const args = parseArgs();
  const result = validateCodexIntegration(args);

  if (!args.quiet) {
    if (args.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(formatHumanReport(result));
    }
  }

  if (!result.ok) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  validateCodexIntegration,
  parseArgs,
  getDefaultOptions,
  countMarkdownFiles,
  countSkillFiles,
  getExpectedCodexAgentFiles,
  getExpectedCodexSkillIds,
  getCodexAgentValidation,
};
