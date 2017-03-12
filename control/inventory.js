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
adCBID[inventoryAddInstance ]=5;
adCBID[inventoryDeleteInstance ]=6;
adCBID[completeLifecycle]=7;

/* ******************************
 * callback call flow
 * ******************************/
function cbCallFlow(err, data, from) {

  // OK - print error 
  if (err) { console.log(from, err, err.stack); } 

  switch (adCBID[from]) {
    case adCBID[receiveMessage]:
      if (err) { 
        receiveMessage(); 
      } else {
        if (typeof data.Messages === "undefined") { 
          receiveMessage(); 
        } else { 
          let adMsgBody = JSON.parse(data.Messages[0].Body);
          adMsgReceiptHandle = data.Messages[0].ReceiptHandle;
          adASGName = adMsgBody.AutoScalingGroupName;
          adLCHookName = adMsgBody.LifecycleHookName;
          adLCToken = adMsgBody.LifecycleActionToken;
          adLCTransition = adMsgBody.LifecycleTransition;
          adLCMetaData = adMsgBody.NotificationMetadata;

          getEC2IPAddress(adMsgBody.EC2InstanceId);
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

/* "LifecycleTransition":"autoscaling:EC2_INSTANCE_LAUNCHING" */
/* "LifecycleTransition":"autoscaling:EC2_INSTANCE_TERMINATING" */
/* "NotificationMetadata":"AnsibleDemoWebDownASGEvent" */

        if (adLCTransition  == "autoscaling:EC2_INSTANCE_TERMINATING") {
          inventoryDeleteInstance()
        } else {
          inventoryAddInstance();
        }
      }
      break;

    case adCBID[inventoryDeleteInstance ]:
        completeLifecycle("CONTINUE");
        deleteMessage();
      break;

    case adCBID[inventoryAddInstance ]:
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

function runPlayBook() {
}

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

