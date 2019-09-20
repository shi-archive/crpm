import ec2 = require('@aws-cdk/aws-ec2');
import { expect } from 'chai';
import 'mocha';

import props = require('../lib/props');

describe('loadProps function', () => {
  it('should return empty object for fixtures/empty.props.yaml', () => {
    const result = props.loadProps(`${__dirname}/fixtures/empty.props.yaml`);
    expect(result).to.be.an('object');
    expect(result).to.eql({});
  });

  it('should return expected object for fixtures/example.props.yaml', () => {
    const result = props.loadProps(`${__dirname}/fixtures/example.props.yaml`);
    expect(result).to.be.an('object');
    expect(result).to.eql({
      property: null
    });
  });

  it('should be allowed to assign prop for fixtures/.props.yaml', () => {
    const props: props.Writeable<ec2.CfnInstanceProps> = {};
    props.availabilityZone = 'us-east-1a';
    expect(props).to.eql({
      availabilityZone: 'us-east-1a'
    });
  });
});
