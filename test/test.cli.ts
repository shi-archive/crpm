import { expect } from 'chai';
import { spawnSync } from 'child_process';
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
    expect(numMatches).to.be.at.least(546);
    expect(stdout).to.contain('compute/ec2/instance');
    expect(stderr).to.equal('');
  });

  it('crpm i compute/ec2/instance', () => {
    // TODO: Create .test and init CDK app inside it, then continue
    const result = spawnSync('node', [__dirname + '/../bin/cli.js', 'i', '-o', '.test', 'compute/ec2/instance']);
    const stdout = result.output[1].toString();
    const stderr = result.output[2].toString();
    expect(stdout).to.contain('.test/.gitignore');
    expect(stdout).to.contain('.test/tsconfig.json');
    expect(stdout).to.contain('.test/package.json');
    expect(stdout).to.contain('+ aws-cdk@');
    expect(stdout).to.contain('+ crpm@');
    expect(stdout).to.contain('.test/compute/ec2/instance/template.ts');
    expect(stdout).to.contain('.test/compute/ec2/instance/props.yaml');
    expect(stdout).not.to.contain('(0 bytes)');
    expect(stderr).to.equal('');
  });

  it('cd .test; npm i', () => {
    // Swap out crpm from npmjs.com with the local version when running install
    const result = spawnSync('npm', ['i', '..', '-s'], { cwd: '.test' });
    const stderr = result.output[2].toString();
    expect(stderr).to.equal('');
  });

  it('cd .test; npm i ..', () => {
    const result = spawnSync('npm', ['i', '-s', '..'], { cwd: '.test' });
    const stderr = result.output[2].toString();
    expect(stderr).to.equal('');
  });

  it('cd .test; npm run build', () => {
    const result = spawnSync('npm', ['run', 'build'], { cwd: '.test' });
    const stderr = result.output[2].toString();
    expect(stderr).to.equal('');
  });
});
