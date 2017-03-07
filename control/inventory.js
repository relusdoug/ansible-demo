/*
 * Function to process SQS messages from Auto Scaling Events
 */

/*
  data = {
    Messages: [
    {
      Attributes: {
       "ApproximateFirstReceiveTimestamp": "1442428276921", 
       "ApproximateReceiveCount": "5", 
       "SenderId": "AIDAIAZKMSNQ7TEXAMPLE", 
       "SentTimestamp": "1442428276921"
      }, 
      Body: "My first message.", 
      MD5OfBody: "1000f835...a35411fa", 
      MD5OfMessageAttributes: "9424c491...26bc3ae7", 
      MessageAttributes: {
       "City": {
         DataType: "String", 
         StringValue: "Any City"
        }, 
       "PostalCode": {
         DataType: "String", 
         StringValue: "ABC123"
        }
      }, 
      MessageId: "d6790f8d-d575-4f01-bc51-40122EXAMPLE", 
      ReceiptHandle: "AQEBzbVv...fqNzFw=="
    }]
  }
*/

// https://github.com/cmawhorter/sqs-lambda-queue-processor/tree/master/scripts 
// http://ashiina.github.io/2015/01/lambda-data-fetching/ 

/* 
 *  Call flow:
 *  receiveMessage() -> processMessage() -> deleteMessage() REPEAT
 */
var AWS = require("aws-sdk"); 
var sqs = new AWS.SQS({region:"us-east-2"});
var exec = require("child_process").exec;

var adQueueURL = '';
var adMsgReceiptHandle = '';

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
        adMsgReceiptHandle = data.Messages[0].ReceiptHandle;
        processMessage()
      } else {
        console.log (new Date());
        receiveMessage();
      }
    } 
  }); 
} 

/* get instance ip */
/* put/delete instance ip in ansible inventory */
/* if new instance, run playbook */
function processMessage() {
  cmd1 = "ls";
  cmd2 = "ls";
  cmd3 = "ls";
  exec(cmd1, function(error, stdout, stderr) {
    exec(cmd2, function(error, stdout, stderr) {
      exec(cmd3, function(error, stdout, stderr) {
        deleteMessage();
      });
    });
  });
}

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
 * main entry point 
 * ******************************/
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
    console.log("  for example:", argv[0], argv[1], "https://queue.amazonaws.com/80398EXAMPLE/MyQueue");
  }
}

