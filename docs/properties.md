---
title: AWS Resource Properties
heading: AWS Resource Properties Template
---
A resource properties template is a YAML file that contains all possible properties,
with optional properties commented out.  You simply assign values to required properties, and uncomment
and assign values to any other properties that you care about.  Property types and documentation links
are included to make your life easier.  No more cutting and pasting from various pages of documentation
to piece together a CloudFormation template!  You can synthesize a CloudFormation template from a
properties file with no coding necessary.  You can also override properties in code, in an
associated **template.ts** CDK stack file.  Create tags with a for loop in [TypeScript](https://www.typescriptlang.org)?  Yes please!

### Example: compute/ec2/security-group/props.yaml

```yaml
# Documentation: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ec2-security-group.html#cfn-ec2-securitygroup-groupdescription
# Type: string
# Required
groupDescription: ''

# Documentation: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ec2-security-group.html#cfn-ec2-securitygroup-groupname
# Type: string
# Optional
#groupName: ''

# Documentation: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ec2-security-group.html#cfn-ec2-securitygroup-securitygroupegress
# Type: list
# Optional
#securityGroupEgress:
#  -
    # Documentation: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ec2-security-group-rule.html#cfn-ec2-security-group-rule-cidrip
    # Type: string
    # Optional
#    cidrIp: ''

    # Documentation: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ec2-security-group-rule.html#cfn-ec2-security-group-rule-cidripv6
    # Type: string
    # Optional
#    cidrIpv6: ''

    # Documentation: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ec2-security-group-rule.html#cfn-ec2-security-group-rule-description
    # Type: string
    # Optional
#    description: ''

    # Documentation: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ec2-security-group-rule.html#cfn-ec2-security-group-rule-destinationprefixlistid
    # Type: string
    # Optional
#    destinationPrefixListId: ''

    # Documentation: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ec2-security-group-rule.html#cfn-ec2-security-group-rule-destsecgroupid
    # Type: string
    # Optional
#    destinationSecurityGroupId: ''

    # Documentation: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ec2-security-group-rule.html#cfn-ec2-security-group-rule-fromport
    # Type: number
    # Optional
#    fromPort: 0

    # Documentation: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ec2-security-group-rule.html#cfn-ec2-security-group-rule-ipprotocol
    # Type: string
    # Required
#    ipProtocol: ''

    # Documentation: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ec2-security-group-rule.html#cfn-ec2-security-group-rule-toport
    # Type: number
    # Optional
#    toPort: 0

# Documentation: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ec2-security-group.html#cfn-ec2-securitygroup-securitygroupingress
# Type: list
# Optional
#securityGroupIngress:
#  -
    # Documentation: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ec2-security-group-rule.html#cfn-ec2-security-group-rule-cidrip
    # Type: string
    # Optional
#    cidrIp: ''

    # Documentation: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ec2-security-group-rule.html#cfn-ec2-security-group-rule-cidripv6
    # Type: string
    # Optional
#    cidrIpv6: ''

    # Documentation: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ec2-security-group-rule.html#cfn-ec2-security-group-rule-description
    # Type: string
    # Optional
#    description: ''

    # Documentation: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ec2-security-group-rule.html#cfn-ec2-security-group-rule-fromport
    # Type: number
    # Optional
#    fromPort: 0

    # Documentation: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ec2-security-group-rule.html#cfn-ec2-security-group-rule-ipprotocol
    # Type: string
    # Required
#    ipProtocol: ''

    # Documentation: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ec2-security-group-rule.html#cfn-ec2-securitygroup-ingress-sourceprefixlistid
    # Type: string
    # Optional
#    sourcePrefixListId: ''

    # Documentation: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ec2-security-group-rule.html#cfn-ec2-security-group-rule-sourcesecuritygroupid
    # Type: string
    # Optional
#    sourceSecurityGroupId: ''

    # Documentation: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ec2-security-group-rule.html#cfn-ec2-security-group-rule-sourcesecuritygroupname
    # Type: string
    # Optional
#    sourceSecurityGroupName: ''

    # Documentation: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ec2-security-group-rule.html#cfn-ec2-security-group-rule-sourcesecuritygroupownerid
    # Type: string
    # Optional
#    sourceSecurityGroupOwnerId: ''

    # Documentation: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ec2-security-group-rule.html#cfn-ec2-security-group-rule-toport
    # Type: number
    # Optional
#    toPort: 0

# Documentation: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ec2-security-group.html#cfn-ec2-securitygroup-tags
# Type: list
# Optional
#tags:
#  -

# Documentation: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ec2-security-group.html#cfn-ec2-securitygroup-vpcid
# Type: string
# Optional
#vpcId: ''
```
