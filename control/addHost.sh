#!/bin/bash

sed -i -e s/\\[$4\\]/\\[$4\\]\\n$1\ ansible_host\=$2\ ansible_user\=ec2-user\ ansible_ssh_private_key_file=\~\\/.ssh\\/$3/ ansibleFiles\/hosts 
echo "`date` launched $1 for $4" >> host.log

