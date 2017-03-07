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

var AWS = require("aws-sdk"); 
var sqs = new AWS.SQS();

var adQueueURL = '';
var adState = 0; /* polling state */
var adMsgReceiptHandle = '';

function processingStateMachine() {
  switch (adState) {
    case 0: /* polling */
      receiveMessage();
      adState = 1;
      break;
    case 1: /* received, processing */
      if (adMsgReceiptHandle.length) {
        adState = 2;
      } else {
        adState = 0;
      }
      break;
    case 2: /* processing done, deleting */
      adState = 0;
      break;
  }
}

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
      if (data != null) {
        adMsgReceiptHandle = data.Messages[0].ReceiptHandle;
        console.log(data);
      } else {
        console.log("data points to null);
      }
    } 
  }); 
} 

function deleteMessage(task, callback) {
  var params = { 
    QueueUrl: adQueueURL, 
    ReceiptHandle: "AQEBRXTo...q2doVA==" 
  }; 
  sqs.deleteMessage(params, function(err, data) { 
    if (err) console.log(err, err.stack); // an error occurred 
    else     console.log(data);           // successful response 
  }); 
} 

/* ******************************
 * main entry point 
 * ******************************/
if (process.argv.length < 3) {
  console.log("Must pass in the SQS Queue URL");
  console.log("  for example:", argv[0], argv[1], "https://queue.amazonaws.com/80398EXAMPLE/MyQueue");
} else {
  adQueueURL = process.argv[2];
  if (adQueueURL.startsWith("https")) {
    /* start processing messages */
    processingStateMachine();
  } else {
    console.log("Must pass in the SQS Queue URL");
    console.log("  for example:", argv[0], argv[1], "https://queue.amazonaws.com/80398EXAMPLE/MyQueue");
  }
}

