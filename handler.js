// https://github.com/optimizely/aws-lambda-cloudwatch-slack

console.log('[Amazon CloudWatch Notification]');

/*
 configuration for each condition.
 add any conditions here
 */
var ALARM_CONFIG = [
  {
    condition: "OK",
// 		channel: "#test",
    mention: " ",
    color: "#093", // green
    severity: "OK"
  },
  {
    condition: "INFO",
// 		channel: "#test",
    mention: " ",
    color: "#FF9F21", // yellow
    severity: "INFO"
  },
  {
    condition: "CRITICAL",
// 		channel: "#general",
    mention: "<@channel> ",
    color: "#F35A00", // orange
    severity: "CRITICAL"
  },
  {
    condition: /./,
// 		channel: "#general",
    color: "#FF9F21", // yellow
    severity: "INFO"
  },
];

var SLACK_CONFIG = {
  // Create a new service from https://optimizely.slack.com/services/new/incoming-webhook
  // and add its URL hostname/path here
  hostname: 'hooks.slack.com',
  path: 'YOUR_SLACK_PATH_HERE'
};

var http = require('https');
var querystring = require('querystring');
exports.handler = function(event, context) {
  console.log(event.Records[0]);

  // parse information
  var message = event.Records[0].Sns.Message;
  var subject = event.Records[0].Sns.Subject;
  var timestamp = event.Records[0].Sns.Timestamp;

  // vars for final message
  var channel;
  var severity;
  var color;
  var matched;

  // create post message
  var alarmMessage = " *[Amazon CloudWatch Notification]* \n" +
    "Subject: " + subject + "\n" +
    "Message: " + message + "\n" +
    "Timestamp: " + timestamp;

  // check subject for condition
  for (var i = 0; i < ALARM_CONFIG.length; i++) {
    var row = ALARM_CONFIG[i];
    console.log(row);
    if (subject.match(row.condition)) {
      console.log("Matched condition: " + row.condition);

      matched = true;
      if (row.mention) {
        alarmMessage = row.mention + " " + alarmMessage + " ";
      }

      channel = row.channel;
      severity = row.severity;
      color = row.color;
      break;
    }
  }

  if (!matched) {
    console.log("Could not find condition.");
    context.done('error', "Invalid condition");
  }

  var payloadStr = JSON.stringify({
    "attachments": [
      {
        "fallback": alarmMessage,
        "text": alarmMessage,
        "mrkdwn_in": ["text"],
        "username": "AWS-CloudWatch-Lambda-bot",
        "fields": [
          {
            "title": "Severity",
            "value": severity,
            "short": true
          }
        ],
        "color": color
      }
    ],
    "channel": channel
  });
  console.log(payloadStr);
  var postData = querystring.stringify({
    "payload": payloadStr
  });

  var options = {
    hostname: SLACK_CONFIG.hostname,
    port: 443,
    path: SLACK_CONFIG.path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': postData.length
    }
  };

  var req = http.request(options, function(res) {
    console.log("Got response: " + res.statusCode);
    if (res.statusCode > 299) {
      context.fail(res.statusCode);
    }
    res.on("data", function(chunk) {
      console.log('BODY: ' + chunk);
      context.succeed(null, chunk);
    });
  }).on('error', function(e) {
    context.fail(e);
  });
  req.write(postData);
  req.end();
};
