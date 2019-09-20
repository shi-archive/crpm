import cdk = require("@aws-cdk/core");
import iam = require("@aws-cdk/aws-iam");
import cb = require("crpm");

require("dotenv").config({ path: `${__dirname}/../../../../.env` });

export class InstanceProfile extends cdk.Stack {
  constructor(scope: cdk.App, id: string, stackProps?: cdk.StackProps) {
    super(scope, id, stackProps);
    
    let props: cb.Writeable<iam.CfnInstanceProfileProps> = cb.loadProps(`${__dirname}/props.yaml`);
    props.instanceProfileName = process.env.APP_NAME;
    props.roles = [String(props.instanceProfileName)];
    new iam.CfnInstanceProfile(this, "InstanceProfile", props);
  }
}