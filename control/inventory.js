/*
 * Function to process SQS messages from Auto Scaling Events
 */

// [webservers]
// i-0ccebd6242c553d06 ansible_host=10.14.66.183 ansible_user=ec2-user ansible_ssh_private_key_file=~/.ssh/DY-Ohio.pem
//
// [appservers]
// i-0ccebd6242c553d06 ansible_host=10.14.66.183 ansible_user=ec2-user ansible_ssh_private_key_file=~/.ssh/DY-Ohio.pem
//
// {File:[{SectionName:"webservers", Items:[{instances}]}]}
// INI File is an array of Section Objects
//   Sections have a SectionName
//   Sections have an array of Items
//    Items have an InstanceID
//    Items have an IP
//    Items have a Key-Pair name
//
// File[];
// File[0].SectionName
// File[0].Items[]
// File[0].Items[0].InstanceID
// File[0].Items[0].IP
// File[0].Items[0].KeyPair
//
// name=value
// [section]
// a=a
// b=b

// https://github.com/cmawhorter/sqs-lambda-queue-processor/tree/master/scripts 
// http://ashiina.github.io/2015/01/lambda-data-fetching/ 

/* 
 *  Call flow:
 *  receiveMessage() -> processMessage() -> complete Lifecycle hook -> deleteMessage() REPEAT
 */
var AWS = require("aws-sdk"); 
var sqs = new AWS.SQS({region:"us-east-2"});
var ec2 = new AWS.EC2({region:"us-east-2"});
var autoscaling = new AWS.AutoScaling({region:"us-east-2"});
var exec = require("child_process").exec;

var adQueueURL = '';
var adMsgReceiptHandle = '';
var adASGName = '';
var adLCHookName = '';
var adLCToken = '';
var adLCTransition = '';
var adLCMetaData = '';
var adEC2Info = {};

/* ******************************
 * grab a message off sqs queue
 * ******************************/
function receiveMessage() { 
  var params = { 
    QueueUrl: adQueueURL, 
    MaxNumberOfMessages: 1,
    WaitTimeSeconds: 20 
  }; 
  sqs.receiveMessage(params, function(err, data) { 
    if (err) { 
      console.error(err, err.stack); 
    } else { 
      console.log(data);

      if (!(typeof data.Messages === "undefined")) {
        startProcessingMessage(data)
      } else {
        console.log (new Date());
        receiveMessage();
      }
    } 
  }); 
} 

/* ******************************
 * delete message received
 * from the sqs queue
 * ******************************/
function deleteMessage() {
  var params = { 
    QueueUrl: adQueueURL, 
    ReceiptHandle: adMsgReceiptHandle
  }; 
  sqs.deleteMessage(params, function(err, data) { 
    if (err) { console.log(err, err.stack); } 
    else { console.log("delete succeeded", data); }
    receiveMessage();
  }); 
} 

/* ******************************
 * get instance ip 
 * put/delete instance ip in ansible inventory
 * if new instance, run playbook
 * ******************************/
function startProcessingMessage(data) {
  let adMsgBody = JSON.parse(data.Messages[0].Body);
  adMsgReceiptHandle = data.Messages[0].ReceiptHandle;
  adASGName = adMsgBody.AutoScalingGroupName;
  adLCHookName = adMsgBody.LifecycleHookName;
  adLCToken = adMsgBody.LifecycleActionToken;
  adLCTransition = adMsgBody.LifecycleTransition;
  adLCMetaData = adMsgBody.NotificationMetadata;

/* ugh - gotta go back to AWS to get the IP address and keypair */
  getEC2IPAddress(adMsgBody.EC2InstanceId);
}

/* "LifecycleTransition":"autoscaling:EC2_INSTANCE_LAUNCHING" */
/* "LifecycleTransition":"autoscaling:EC2_INSTANCE_TERMINATING" */
/* "NotificationMetadata":"AnsibleDemoWebDownASGEvent" */
/* ******************************
 *
 * ******************************/
function continueProcessingMessage() {
  if (adEC2Info == null) {
    completeLifecycle("ABANDON");
    deleteMessage();
  } else {
    addInstanceToInventory();
/* run playbook */
    let cmd1 = "ls";
    exec(cmd1, function(error, stdout, stderr) {
      completeLifecycle("CONTINUE");
      deleteMessage();
    });
  }
}

/* ================================================= 
 * Utility functions
 * ================================================= */

/* ******************************
 * ask AWS from more info on the
 * instance just spawned
 * ******************************/
function getEC2IPAddress(instanceID) {
  var params = {
    InstanceIds: [instanceID],
    MaxResults: 1,
  };

  ec2.describeInstances(params, function(err, data) {
    if (err){
      console.log(err, err.stack); // an error occurred
      adEC2Info = null;
    } else {
      console.log(data);           // successful response
      adEC2Info = data.Reservations[0].Instances[0];
    }
    continueProcessingMessage();
  });

//data.Reservations[0].Instances[0].PrivateIpAddress 
//data.Reservations[0].Instances[0].KeyName 
}

/* ******************************
 * add an instance to the inventory
 * ******************************/
function inventoryAddInstance (instanceID) {

  let addline = '\\[webservers\\]\\n'+instanceID+' ansible_host='+adEC2Info.PrivateIpAddress+' ansible_user=ec2-user ansible_ssh_private_key_file=\~\/.ssh\/'+adEC2Info.KeyName;
  let cmd = 'sed -i -e s/\\[webservers\\]'+addLine+'/ ansibleFiles/hosts'
  exec(cmd, function(error, stdout, stderr) {
    if (err){
      console.log(err, err.stack); // an error occurred
    } else {
      console.log('instance add to inventory');
    }
  });
}

/* ******************************
 * delete instance from the inventory
 * ******************************/
function inventoryDeleteInstance (instanceID) {
  let cmd = 'sed -i -e /'+instanceID+'/d ansibleFiles/hosts'
  exec(cmd, function(error, stdout, stderr) {
    if (err){
      console.log(err, err.stack); // an error occurred
    } else {
      console.log('instance deleted from inventory');
    }
  });
}

/* ******************************
 * send message to ASG on LC event
 * ******************************/
function completeLifecycle(LCHaction) {
  var params = {
    AutoScalingGroupName: adASGName,
    LifecycleHookName:    adLCHookName,
    LifecycleActionToken: adLCToken,
    LifecycleActionResult: LCHaction
  };

  autoscaling.completeLifecycleAction(params, function(err, data) {
    if (err) console.log("lifecycle error:", err, err.stack);    // an error occurred
    else     console.log("lifecycle complete:", data);           // successful response
  });
}

/* ================================================= 
 * main entry point 
 * ================================================= */
if (process.argv.length < 3) {
  console.log("Must pass in the SQS Queue URL");
  console.log("  for example:", process.argv[0], process.argv[1], "https://queue.amazonaws.com/80398EXAMPLE/MyQueue");
} else {
  adQueueURL = process.argv[2];
  if (adQueueURL.startsWith("https")) {
    /* start processing messages */
    receiveMessage();
  } else {
    console.log("Must pass in the SQS Queue URL");
    console.log("  for example:", process.argv[0], process.argv[1], "https://queue.amazonaws.com/80398EXAMPLE/MyQueue");
  }
}

