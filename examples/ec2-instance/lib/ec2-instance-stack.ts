import * as cdk from '@aws-cdk/core';
import * as crpm from 'crpm';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as iam from '@aws-cdk/aws-iam';

export class Ec2InstanceStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    const roleProps = crpm.load<iam.CfnRoleProps>(`${__dirname}/../res/security-identity-compliance/iam/role/props.yaml`);
    roleProps.roleName = cdk.Aws.STACK_NAME;
    const role = new iam.CfnRole(this, 'Role', roleProps);
    
    const instanceProfileProps = crpm.load<iam.CfnInstanceProfileProps>(`${__dirname}/../res/security-identity-compliance/iam/instance-profile/props.yaml`);
    instanceProfileProps.instanceProfileName = cdk.Aws.STACK_NAME;
    instanceProfileProps.roles = [role.ref];
    const instanceProfile = new iam.CfnInstanceProfile(this, 'InstanceProfile', instanceProfileProps);
    
    const securityGroupProps = crpm.load<ec2.CfnSecurityGroupProps>(`${__dirname}/../res/compute/ec2/security-group/props.yaml`);
    securityGroupProps.groupName = cdk.Aws.STACK_NAME;
    securityGroupProps.groupDescription = `Used by ${cdk.Aws.STACK_NAME} EC2 instance`;
    securityGroupProps.vpcId = this.node.tryGetContext('VPC_ID');
    const securityGroup = new ec2.CfnSecurityGroup(this, 'SecurityGroup', securityGroupProps);

    const instanceProps = crpm.load<ec2.CfnInstanceProps>(`${__dirname}/../res/compute/ec2/instance/props.yaml`);
    instanceProps.iamInstanceProfile = instanceProfile.ref;
    instanceProps.imageId = this.node.tryGetContext('IMAGE_ID');
    instanceProps.keyName = this.node.tryGetContext('KEY_NAME');
    instanceProps.securityGroupIds = [securityGroup.ref];
    instanceProps.subnetId = this.node.tryGetContext('SUBNET_ID');
    instanceProps.tags = [
      {
        "key": "Name",
        "value": cdk.Aws.STACK_NAME
      },
      {
        "key": "Application",
        "value": `${this.node.tryGetContext('APP_NAME')}`
      }
    ];
    instanceProps.userData = cdk.Fn.base64(
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
    const instance = new ec2.CfnInstance(this, 'Instance', instanceProps);
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
