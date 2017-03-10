#!/bin/bash
x=`grep QueueName createApplicationEnvironment.json | sed s/\"QueueName\":// | sed s/\"//g | sed s/\,// | sed s/\ //g`
y=`aws sqs list-queues | grep $x`

echo $x
echo $y
eval node inventory.js $y 

