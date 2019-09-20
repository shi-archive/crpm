import cdk = require("@aws-cdk/core");
import ec2 = require("@aws-cdk/aws-ec2");
import cb = require("crpm");

require("dotenv").config({ path: `${__dirname}/../../../../.env` });

export class Instance extends cdk.Stack {
  constructor(scope: cdk.App, id: string, stackProps?: cdk.StackProps) {
    super(scope, id, stackProps);
    
    const name = process.env.APP_NAME;
    
    let props: cb.Writeable<ec2.CfnInstanceProps> = cb.loadProps(`${__dirname}/props.yaml`);
    props.iamInstanceProfile = name;
    props.imageId = process.env.IMAGE_ID;
    props.keyName = process.env.KEY_NAME;
    props.securityGroupIds = [String(process.env.SECURITY_GROUP_ID)];
    props.subnetId = process.env.SUBNET_ID;
    props.tags = [
      {
        "key": "Name",
        "value": String(name)
      },
      {
        "key": "Application",
        "value": String(process.env.APP_NAME)
      }
    ];
    props.userData = cdk.Fn.base64(
      cdk.Fn.join("", [
        "#!/bin/bash -xe\n",
        "yum update -y\n",
        "yum install -y aws-cfn-bootstrap\n",
            
        "# Install the files and packages from the metadata\n",
        "/opt/aws/bin/cfn-init --verbose",
        " --stack ", this.stackId,
        " --resource Instance",
        " --configsets init",
        " --region ", this.region, "\n",
            
        "# Signal the status from cfn-init\n",
        "/opt/aws/bin/cfn-signal -e $?",
        " --stack ", this.stackId,
        " --resource Instance",
        " --region ", this.region, "\n"
      ])
    );
    const instance = new ec2.CfnInstance(this, "Instance", props);
    instance.cfnOptions.creationPolicy = {
      "resourceSignal": {
        "timeout": "PT5M"
      }
    }
    instance.cfnOptions.metadata = {
      "AWS::CloudFormation::Init": {
        "configSets": {
          "init": [
            "installCfnHup",
            "installDependencies"
          ]
        },
        "installCfnHup": {
          "files": {
            "/etc/cfn/cfn-hup.conf" : {
              "content": cdk.Fn.join("\n", [
                "[main]",
                "stack=" + this.stackId,
                "region=" + this.region
              ]),
              "group": "root",
              "owner": "root",
              "mode": "000400"
            },
            "/etc/cfn/hooks.d/cfn-auto-reloader.conf" : {
              "content": cdk.Fn.join("\n", [
                "[cfn-auto-reloader-hook]",
                "triggers=post.update",
                "path=Resources.Instance.Metadata.AWS::CloudFormation::Init",
                "action=/opt/aws/bin/cfn-init --resource Instance --configsets init --verbose --stack " + this.stackId + " --region " + this.region,
                "runas=root"
              ]),
              "group": "root",
              "owner": "root",
              "mode": "000400"
            }
          },
          "services": {
            "sysvint": {
              "cfn-hup": {
                "enabled": true,
                "ensureRunning": true,
                "files": [
                  "/etc/cfn/cfn-hup.conf",
                  "/etc/cfn/hooks.d/cfn-auto-reloader.conf"
                ]
              }
            }
          }
        },
        "installDependencies": {
          "packages": {
            "yum": {
              "python3": []
            }
          },
          "commands": {
            "01_install_awscli": {
              "command": "pip3 install awscli --upgrade"
            },
            "02_install_docker": {
              "command": "amazon-linux-extras install docker -y"
            },
            "03_start_docker": {
              "command": "service docker start"
            },
            "04_give_docker_priv": {
              "command": "usermod -a -G docker ec2-user"
            }
          }
        }
      }
    };
  }
}