import cdk = require("@aws-cdk/core");
import ec2 = require("@aws-cdk/aws-ec2");
import crpm = require("crpm");

require("dotenv").config({ path: `${__dirname}/../../../../.env` });

export class SecurityGroup extends cdk.Stack {
  constructor(scope: cdk.App, id: string, stackProps?: cdk.StackProps) {
    super(scope, id, stackProps);
    
    let props: crpm.Writeable<ec2.CfnSecurityGroupProps> = crpm.loadProps(`${__dirname}/props.yaml`);
    props.groupName = process.env.APP_NAME;
    props.groupDescription = `Used by ${props.groupName} EC2 instance`;
    props.vpcId = process.env.VPC_ID;
    new ec2.CfnSecurityGroup(this, "SecurityGroup", props);
  }
}