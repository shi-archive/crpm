import { expect } from 'chai';
import { spawnSync } from 'child_process';
import 'mocha';

describe('find-available-resources CLI', () => {
  it('node find-available-resources', () => {
    const result = spawnSync('node', [__dirname + '/../bin/find-available-resources.js']);
    const stderr = result.output[2].toString();
    expect(stderr).to.equal('');
  });

  it('node find-available-resources -v', () => {
    const result = spawnSync('node', [__dirname + '/../bin/find-available-resources.js', '-v']);
    const stderr = result.output[2].toString();
    const numMatches = (stderr.match(/[a-z0-9]+\/[A-Za-z0-9]+/g) || []).length;
    expect(numMatches).to.be.at.least(572);
    expect(stderr).to.contain('ec2/CfnInstanceProps');
  });
});
