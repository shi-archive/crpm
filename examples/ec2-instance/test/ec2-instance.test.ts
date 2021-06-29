import { expect as expectCDK, haveResource } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import { Ec2InstanceStack } from '../lib/ec2-instance-stack';

test('Stack', () => {
    const app = new cdk.App();
    const stack = new Ec2InstanceStack(app, 'Ec2InstanceStack');
    expectCDK(stack).to(haveResource('AWS::IAM::Role'));
});
