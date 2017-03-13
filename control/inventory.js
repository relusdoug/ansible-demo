/*
 * Function to process SQS messages from Auto Scaling Events
 *
 *  General Call flow:
 *  receiveMessage() -> processMessage() -> complete Lifecycle hook -> deleteMessage() REPEAT
 *
 * Style Notes:
 *   - error process usually first
 *   - program flow embedded in cbCallFlow
 */

/* 
 * other modules
 */
var AWS = require("aws-sdk"); 
var exec = require("child_process").exec;

/*
 * Global Variables
 */
var sqs = new AWS.SQS({region:"us-east-2"});
var ec2 = new AWS.EC2({region:"us-east-2"});
var autoscaling = new AWS.AutoScaling({region:"us-east-2"});

var adQueueURL = '';
var adMsgReceiptHandle = '';
var adASGName = '';
var adLCHookName = '';
var adLCToken = '';
var adLCTransition = '';
var adLCMetaData = '';
var adEC2Info = {};

var adCBID = [];
adCBID[receiveMessage]=1;
adCBID[deleteMessage]=2;
adCBID[runPlayBook]=3;
adCBID[getEC2IPAddress]=4;
adCBID[inventoryAddInstance]=5;
adCBID[inventoryDeleteInstance]=6;
adCBID[completeLifecycle]=7;

/* ******************************
 * callback call flow
 * ******************************/
function cbCallFlow(err, data, from) {

  // OK - print error 
  if (err) { console.log("Error in CB from:", from, err, err.stack); } 
  console.log("### CB from:", from);

  switch (adCBID[from]) {
    case adCBID[receiveMessage]:
      if (err) { 
        receiveMessage(); 
      } else {
        if (typeof data.Messages === "undefined") { 
          console.log("CB from receive:", "no data");
          receiveMessage(); 
        } else { 
          console.log("CB from receive:", "good news, got data");
          let adMsgBody = JSON.parse(data.Messages[0].Body);
          adMsgReceiptHandle = data.Messages[0].ReceiptHandle;
          adASGName = adMsgBody.AutoScalingGroupName;
          adLCHookName = adMsgBody.LifecycleHookName;
          adLCToken = adMsgBody.LifecycleActionToken;
          adLCTransition = adMsgBody.LifecycleTransition;
          adLCMetaData = adMsgBody.NotificationMetadata;

console.log(adMsgBody);

// "LifecycleTransition":"autoscaling:EC2_INSTANCE_LAUNCHING" 
// "LifecycleTransition":"autoscaling:EC2_INSTANCE_TERMINATING" 
          if (adLCTransition  == "autoscaling:EC2_INSTANCE_TERMINATING") {
            inventoryDeleteInstance()
          } else {
            if ((adLCMetaData === undefined) || (adLCHookName === undefined)) { 
              deleteMessage();
            } else {
              getEC2IPAddress(adMsgBody.EC2InstanceId);
            }
          }
        }
      }
      break;

    case adCBID[getEC2IPAddress]:
      if (data == null) { 
        adEC2Info = null;
        completeLifecycle("ABANDON");
        deleteMessage();
      } else { 
        adEC2Info = data.Reservations[0].Instances[0]; 

// data.Reservations[0].Instances[0].PrivateIpAddress 
// data.Reservations[0].Instances[0].KeyName 
        inventoryAddInstance();
      }
      break;

    case adCBID[inventoryDeleteInstance]:
        completeLifecycle("CONTINUE");
        deleteMessage();
      break;

    case adCBID[inventoryAddInstance]:
        if (err) {
          completeLifecycle("ABANDON");
          deleteMessage();
        } else {
          runPlayBook();
        }
      break;

    case adCBID[runPlayBook]:
      if (err) {
        completeLifecycle("ABANDON");
      } else {
        completeLifecycle("CONTINUE");
      }
      deleteMessage();
      break;

    case adCBID[completeLifecycle]:
      // do nothing
      break;

    case adCBID[deleteMessage]:
      /* does not matter if deleting SQS message worked, just listen for more msgs */
      receiveMessage(); 
      break;

    default: 
      receiveMessage(); 
      break;
  }
}

/* ******************************
 * grab a message off sqs queue
 * ******************************/
function receiveMessage() { 
  var params = { 
    QueueUrl: adQueueURL, 
    MaxNumberOfMessages: 1,
    WaitTimeSeconds: 20 
  }; 
  sqs.receiveMessage(params, function(err, data) { cbCallFlow(err, data, receiveMessage); }); 
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
  sqs.deleteMessage(params, function(err, data) { cbCallFlow(err, data, deleteMessage); }); 
} 

/* ******************************
 * run the right playbook
 * for the instance that scaled
 * ******************************/
function runPlayBook() {
// "NotificationMetadata":"AnsibleDemoWebUpASGEvent" 
// "NotificationMetadata":"AnsibleDemoAppUpASGEvent" 
  let cmdWeb = 'ansible-playbook ansibleFiles/playbooks/addWebServer.yml';
  let cmdApp = 'ansible-playbook ansibleFiles/playbooks/addAppServer.yml';
  if (adLCMetaData.search('AnsibleDemoWebUpASGEvent') != -1) {
    exec(cmdWeb, function(err, stdout, stderr) { cbCallFlow(err, stdout, runPlayBook); }); 
  } else {
    exec(cmdApp, function(err, stdout, stderr) { cbCallFlow(err, stdout, runPlayBook); }); 
  }
}

/* ******************************
 * ask AWS from more info on the
 * instance just spawned
 * ******************************/
function getEC2IPAddress(instanceID) {
  var params = {
    InstanceIds: [instanceID],
  };
  ec2.describeInstances(params, function(err, data) { cbCallFlow(err, data, getEC2IPAddress); }); 
}

/* ******************************
 * add an instance to the inventory
 * ******************************/
function inventoryAddInstance (instanceID) {
  let addLine='';
  let cmd='';

  if (adLCMetaData.search('AnsibleDemoWebUpASGEvent') != -1) {
    addLine= '\\[webservers\\]\\n'+instanceID+' ansible_host='+adEC2Info.PrivateIpAddress+' ansible_user=ec2-user ansible_ssh_private_key_file=\~\/.ssh\/'+adEC2Info.KeyName;
    cmd = 'sed -i -e "s/\\[webservers\\]/'+addLine+'/" ansibleFiles/hosts'
  } else {
    addLine = '\\[appservers\\]\\n'+instanceID+' ansible_host='+adEC2Info.PrivateIpAddress+' ansible_user=ec2-user ansible_ssh_private_key_file=\~\/.ssh\/'+adEC2Info.KeyName;
    cmd = 'sed -i -e "s/\\[appservers\\]/'+addLine+'/" ansibleFiles/hosts'
  }

  exec(cmd, function(err, stdout, stderr) { cbCallFlow(err, stdout, inventoryAddInstance ); }); 
}

/* ******************************
 * delete instance from the inventory
 * ******************************/
function inventoryDeleteInstance (instanceID) {
  let cmd = 'sed -i -e /'+instanceID+'/d ansibleFiles/hosts'
  exec(cmd, function(err, stdout, stderr) { cbCallFlow(err, stdout, inventoryDeleteInstance); }); 
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
  console.log("###", params);
  autoscaling.completeLifecycleAction(params, function(err, data) { cbCallFlow(err, data, completeLifecycle); }); 
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

