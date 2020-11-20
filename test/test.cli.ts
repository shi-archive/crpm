import { expect } from 'chai';
import { spawnSync } from 'child_process';
import fs = require('fs-extra');
import 'mocha';
import rimraf = require('rimraf');

describe('crpm CLI', () => {
  before(() => {
    rimraf.sync('.test');
  });

  it('crpm', () => {
    const result = spawnSync('node', [__dirname + '/../bin/cli.js']);
    const stderr = result.output[2].toString();
    expect(stderr).to.contain('Usage: crpm COMMAND');
  });

  it('crpm ls', () => {
    const result = spawnSync('node', [__dirname + '/../bin/cli.js', 'ls']);
    const stdout = result.output[1].toString();
    const stderr = result.output[2].toString();
    const numMatches = (stdout.match(/[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9-]+/g) || []).length;
    expect(numMatches).to.be.at.least(572);
    expect(stdout).to.contain('compute/ec2/instance');
    expect(stderr).to.equal('');
  });

  it('cdk init app --language=typescript', () => {
    fs.mkdirSync('.test/app', { recursive: true });
    const result = spawnSync('cdk', ['init', 'app', '--language', 'typescript'], { cwd: '.test/app' });
    const stderr = result.output[2].toString();
    expect(stderr).to.contain('All done!');
  });

  it('npm run test', () => {
    const result = spawnSync('npm', ['run', 'test'], { cwd: '.test/app' });
    const stderr = result.output[2].toString();
    expect(stderr).to.contain('1 passed, 1 total');
  });

  it('crpm i compute/ec2/instance', () => {
    const result = spawnSync('node', [__dirname + '/../bin/cli.js', 'i', 'compute/ec2/instance'], { cwd: '.test/app' });
    const stdout = result.output[1].toString();
    const stderr = result.output[2].toString();
    expect(stdout).to.contain('Adding crpm to package.json and installing...');
    expect(stdout).to.contain('+ crpm@');
    expect(stdout).to.contain('.test/app/res/compute/ec2/instance/props.yaml');
    expect(stdout).to.contain('lib/app-stack.ts: Insert Instance at line');
    expect(stdout).not.to.contain('(0 bytes)');
    expect(stderr).to.equal('');
  });

  it('npm uninstall crpm', () => {
    let result = spawnSync('npm', ['uninstall', 'crpm', '-s'], { cwd: '.test/app' });
    let stderr = result.output[2].toString();
    expect(stderr).to.equal('');
  });

  it('npm pack', () => {
    const result = spawnSync('npm', ['pack', '-s']);
    const stderr = result.output[2].toString();
    expect(stderr).to.equal('');
  });

  it('mv crpm*.tgz .test/crpm.tgz', () => {
    const result = spawnSync('mv', ['crpm*.tgz', '.test/crpm.tgz'], { shell: true });
    const stderr = result.output[2].toString();
    expect(stderr).to.equal('');
  });

  it('npm i ../crpm.tgz', () => {
    const result = spawnSync('npm', ['i', '../crpm.tgz', '-s'], { cwd: '.test/app' });
    const stderr = result.output[2].toString();
    expect(stderr).to.equal('');
  });

  it('npm run build', () => {
    const result = spawnSync('npm', ['run', 'build'], { cwd: '.test/app' });
    const stderr = result.output[2].toString();
    expect(stderr).to.equal('');
  });

  it('cdk synth', () => {
    const result = spawnSync('cdk', ['synth'], { cwd: '.test/app' });
    const stdout = result.output[1].toString();
    const stderr = result.output[2].toString();
    expect(stdout).to.contain('Type: AWS::EC2::Instance');
    expect(stderr).to.equal('');
  });
});
