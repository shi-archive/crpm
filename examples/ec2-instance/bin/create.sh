#!/usr/bin/env bash
set -v

# Change directory
cd $(dirname "${BASH_SOURCE[0]}")/..

# Load environment variables
source .env

# Get VPC ID from Subnet ID
export VPC_ID=$(aws ec2 describe-subnets --subnet-ids $SUBNET_ID --query Subnets[0].VpcId --output text)

# Install dependencies (just in case it hasn't been done yet)
npm install

# Build TypeScript (just in case it hasn't been done yet)
npm run build

# Synthesize templates
crpm synth infra/security-identity-compliance/iam/role
crpm synth infra/security-identity-compliance/iam/instance-profile
crpm synth infra/compute/ec2/security-group

# Create stacks
aws cloudformation create-stack \
    --stack-name iam-role-${APP_NAME} \
    --template-body file://infra/security-identity-compliance/iam/role/stack.template.json \
    --capabilities CAPABILITY_NAMED_IAM
aws cloudformation create-stack \
    --stack-name ec2-security-group-${APP_NAME} \
    --template-body file://infra/compute/ec2/security-group/stack.template.json
aws cloudformation wait stack-create-complete \
    --stack-name iam-role-${APP_NAME}
aws cloudformation create-stack \
    --stack-name iam-instance-profile-${APP_NAME} \
    --template-body file://infra/security-identity-compliance/iam/instance-profile/stack.template.json \
    --capabilities CAPABILITY_NAMED_IAM

# Get security group ID that was created above
export SECURITY_GROUP_ID=$(aws ec2 describe-security-groups --group-names ${APP_NAME} --query SecurityGroups[0].GroupId --output text)

# Synthesize template
crpm synth infra/compute/ec2/instance

# Create instance stack
aws cloudformation wait stack-create-complete \
    --stack-name iam-instance-profile-${APP_NAME}
aws cloudformation create-stack \
    --stack-name ec2-instance-${APP_NAME} \
    --template-body file://infra/compute/ec2/instance/stack.template.json
