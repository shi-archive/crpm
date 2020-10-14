import { expect as expectCDK, haveResource } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as Ec2Instance from '../lib/ec2-instance-stack';

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new Ec2Instance.Ec2InstanceStack(app, 'MyTestStack');
    // THEN
    expectCDK(stack).to(haveResource('AWS::EC2::Instance'));
});
