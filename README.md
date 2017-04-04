# ansible-demo
A demo to show how CloudFormation and Ansible can work together

## To start:
1. create and log in to an instance in the default VPC (this can be deleted once the Ansible Controller is created)
2. Download git
3. get the code  (git clone https://github.com/relusdoug/ansible-demo.git)
4. upload aws keys that has permissions to create VPC's and EC2, etc
5. configure ssh to not ask to store host fingerprint (*)
6. upload KeyPair to be used for ansible controller instance
7. cd to ansible-demo/init
8. make

## Now you can log into the Ansible Controller, and create your app:
- cd to ansible-demo/control
- make


at ths point, you should see instances created by the autoscaling group being configured by ansible

##

 (*) create file ~/.ssh/config and copy the following 2 lines:
`Host *
  StrictHostKeyChecking no`
