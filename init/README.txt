vpc - 10.14.0.0/16
subnets - 10.14.128.0/22 - public
subnets - 10.14.136.0/22 - public
subnets - 10.14.64.0/21 - private
subnets - 10.14.72.0/21 - private
subnets - 10.14.32.0/22 - custom private
subnets - 10.14.40.0/22 - custom private
subnets - 10.14.224.0/22 - management

/18 16384  (17-18: 2 bits)
/19  8192  (17-19: 3 bits)
/20  4096  (17-20: 4 bits)
/21  2048  (17-21: 5 bits) *
/22  1024  (17-22: 6 bits)
/23   512  (17-23: 7 bits)

!!! BUG: These commands do not work... 
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.32.0/install.sh | bash
export NVM_DIR="/home/ec2-user/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm install 6.9.5

!!! to do: create the role, we are going to use for the controller
        "ansibleControllerRole": {
            "Type": "AWS::IAM::Role",
            "Properties": {
                "AssumeRolePolicyDocument": {"Version": "2012-10-17","Statement":[{"Effect":"Allow","Action":"*","Principal":{"Service":["*"]}}]},
                "RoleName": "ansibleControllerRole"
            }
        },
                "IamInstanceProfile" : {"Type": "AWS::IAM::InstanceProfile","Properties":{"Roles":[ "ansibleControllerRole" ]}},
