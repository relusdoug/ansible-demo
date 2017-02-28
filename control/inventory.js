/* 
 * Node worker to poll SQS and add new instances to the Ansible inventory
 *   Worker assumes SQS URL will be passed in
 *   Worker will kickoff ansible playbook to setup app component (Web tier or App tier)
 */



/* This example gets the URL of the specified queue. */

var params = {
  QueueName: "MyQueue", 
  QueueOwnerAWSAccountId: "123456789101"
};

sqs.getQueueUrl(params, function(err, data) {
  if (err) console.log(err, err.stack); // an error occurred
  else     console.log(data);           // successful response
/*
data = {
  QueueUrl: "https://queue.amazonaws.com/123456789101/MyQueue"
  }
*/
});

var params = {
  AttributeNames: [ "All" ], 
  MaxNumberOfMessages: 10, 
  MessageAttributeNames: [ "All" ], 
  QueueUrl: "https://sqs.us-east-1.amazonaws.com/80398EXAMPLE/MyQueue", 
  VisibilityTimeout: 123, 
  WaitTimeSeconds: 123
};
sqs.receiveMessage(params, function(err, data) {
  if (err) console.log(err, err.stack); // an error occurred
  else     console.log(data);           // successful response
    /*
    data = {
      Messages: [ {
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
      } ]
    }
    */
});


/* This example deletes the specified message. */

var params = {
  QueueUrl: "https://sqs.us-east-1.amazonaws.com/80398EXAMPLE/MyQueue", 
  ReceiptHandle: "AQEBRXTo...q2doVA=="
};
sqs.deleteMessage(params, function(err, data) {
  if (err) console.log(err, err.stack); // an error occurred
  else     console.log(data);           // successful response
});

