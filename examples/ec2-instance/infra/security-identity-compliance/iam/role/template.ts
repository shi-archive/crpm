import cdk = require("@aws-cdk/core");
import iam = require("@aws-cdk/aws-iam");
import cb = require("crpm");

require("dotenv").config({ path: `${__dirname}/../../../../.env` });

export class Role extends cdk.Stack {
  constructor(scope: cdk.App, id: string, stackProps?: cdk.StackProps) {
    super(scope, id, stackProps);
    
    let props: cb.Writeable<iam.CfnRoleProps> = cb.loadProps(`${__dirname}/props.yaml`);
    props.roleName = process.env.APP_NAME;
    new iam.CfnRole(this, "Role", props);
  }
}