#!/usr/bin/env bash
set -v

# Change directory
cd $(dirname "${BASH_SOURCE[0]}")/..

# Load environment variables
source .env

# Delete stacks
aws cloudformation delete-stack \
    --stack-name ec2-instance-${APP_NAME}
aws cloudformation wait stack-delete-complete \
    --stack-name ec2-instance-${APP_NAME}
aws cloudformation delete-stack \
    --stack-name iam-instance-profile-${APP_NAME}
aws cloudformation delete-stack \
    --stack-name ec2-security-group-${APP_NAME}
aws cloudformation wait stack-delete-complete \
    --stack-name iam-instance-profile-${APP_NAME}
aws cloudformation delete-stack \
    --stack-name iam-role-${APP_NAME}
