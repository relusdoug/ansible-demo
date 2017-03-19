#!/bin/bash

# set the desired instance number > 0
#echo "App"
aws autoscaling set-desired-capacity --desired-capacity 2 --auto-scaling-group-name \
`aws autoscaling describe-auto-scaling-groups | \
grep -e AutoScalingGroupName | \
grep -e "DY-Ansible-Demo-AppStack-AppASG" | \
sed -e s/'"AutoScalingGroupName":'// | \
sed -e s/'[ \t\n\r,"]'//g `

#echo "web"
aws autoscaling set-desired-capacity --desired-capacity 2 --auto-scaling-group-name \
`aws autoscaling describe-auto-scaling-groups | \
grep -e AutoScalingGroupName | \
grep -e "DY-Ansible-Demo-AppStack-WebASG" | \
sed -e s/'"AutoScalingGroupName":'// | \
sed -e s/'[ \t\n\r,"]'//g `

# start monitoring the SQS queue for Lifecycle Hook events
x=`grep QueueName createApplicationEnvironment.json | sed s/\"QueueName\":// | sed s/\"//g | sed s/\,// | sed s/\ //g`
y=`aws sqs list-queues | grep $x`

#echo $x
#echo $y
eval node inventory.js $y 

