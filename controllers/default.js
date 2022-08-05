exports.install = function() {
	ROUTE('/', view_index, ['post']);
	ROUTE('/login', auth, ['post']);
	ROUTE('/command', command, ['post']);
};

var sessionUID = "1234-5678-9ABC-DEF0";
var fcmTopic = "FOXTROT_UNIFORM_CHARLIE_KILO";
var apiKey = "YOUR_API_KEY";

var moment = require('moment');
moment.locale('ru');

var fs = require('fs');

var _scenarios = [];

function view_index() {
	var controller = this;
	console.log('-----',moment().format('DD.MM.YYYY, HH:mm:ss'), '-------------------------------');
	console.log('RX headers: ', JSON.stringify(controller.req.headers));
	console.log('RX body: ', JSON.stringify(controller.body));
	console.log("\n");

	controller.res.send(200, "hello");
}

function auth() {
	var controller = this;

	console.log('-----',moment().format('DD.MM.YYYY, HH:mm:ss'), '-------------------------------');
	console.log('RX headers: ', JSON.stringify(controller.req.headers));
	console.log('RX body: ', JSON.stringify(controller.body));
	console.log("\n");

	if (controller.body.login === 'Valeron' && controller.body.pass === '1234') {
		controller.res.send(200, [{"mes_type": "accept", "ses_uid": sessionUID, "topic": fcmTopic}], 'application/json');
	}
	else {
		controller.res.send(403, {"error": "Неверный логин/пароль"});
	}
}

function command() {
	var controller = this;

	console.log('-----',moment().format('DD.MM.YYYY, HH:mm:ss'), '-------------------------------');
	console.log('RX headers: ', JSON.stringify(controller.req.headers));
	console.log('RX body: ', JSON.stringify(controller.body));

	if (controller.body.ses_uid === sessionUID) {
		var zones = controller.body.zones;
		var records = controller.body.records;

		switch(controller.body.mes_type) {
			case 'get_user_devices':
				controller.res.send(200, [{'mes_type': 'user_devices', 'records': userDevices}], 'application/json');
				break;
			case 'cmd_arm':
				controller.res.send(200, [{"confirm": "true"}], 'application/json');
				changeStatus(1, zones);
				setTimeout(() => armFCM(zones), 1000);
				break;
			case 'cmd_disarm':
				controller.res.send(200, [{"confirm": "true"}], 'application/json');
				changeStatus(0, zones);
				setTimeout(() => disarmFCM(zones), 1000);
				break;
			case 'get_scenarios':
				controller.res.send(200, [{"mes_type": "scenarios", "records": _scenarios}], 'application/json');
				break;
			case 'save_scenarios':
				controller.res.send(200, [{"mes_type": "confirm", "for_request": "save_scenarios"}], 'application/json');
				_scenarios = records;
				break;
			case 'get_history':
				controller.res.send(200, [{"mes_type" : "get_history", "records": []}], 'application/json');
				break;
			case 'save_user_notice':
				controller.res.send(200, [ {"mes_type": "confirm", "for_request": "save_user_notice"} ], 'application/json');
				notificationList = zones;
				console.log("notificationList: ", JSON.stringify(zones));
				break;
			default:
				controller.res.send(400, 'Bad Request');
				break;
		}
	}
	else {
		controller.res.send(403, {"error": "Неверный UID"}, 'application/json');
	}
}

function changeStatus(flag, zones) {
	const ARMED = 2;
	const DISARMED = 3;
	const STATUS_ARMED = 'green';
	const STATUS_DISARMED = 'blue';

	userDevices.forEach(element => {
		for (var i = 0; i < zones.length; i++) {
			if (element.dev_id === zones[i]) {
				element.dev_state = flag? ARMED : DISARMED;
				element.style = flag? STATUS_ARMED : STATUS_DISARMED;
			}
		}
	});
}

function armFCM(zones) {
	U.request(
		// URL
		'https://fcm.googleapis.com/fcm/send',
		// FLAGS
		['post', 'json'],
		// DATA
		{
			"to": "/topics/" + fcmTopic,
			"android_channel_id": "statusChange",
			"notification": {
				"title": "Notification (arm)",
				"body": `Total.js test server ${zones}`,
				"click_action": "FLUTTER_NOTIFICATION_CLICK"
			},
		},
		// CALLBACK
		function callback(err,data,status,headers,host) {
			console.log(status + ": FCM server response: ", data);
		},
		// COOKIES
		{},
		// HEADERS
		{
			"Authorization": `key=${apiKey}`,
			"Content-Type" : "application/json"
		},
		// ENCODING
		'utf8'
	);
}

function disarmFCM(zones) {
	U.request(
		// URL
		'https://fcm.googleapis.com/fcm/send',
		// FLAGS
		['post', 'json'],
		// DATA
		{
			"to": "/topics/" + fcmTopic,
			"android_channel_id": "statusChange",
			"notification": {
				"title": "Notification (disarm)",
				"body": `Total.js test server ${zones}`,
				"click_action": "FLUTTER_NOTIFICATION_CLICK"
			},
		},
		// CALLBACK
		function callback(err, data, status, headers, host) {
			console.log(status + ": Disarm FCM result: ", data);
		},
		// COOKIES
		{},
		// HEADERS
		{
			"Authorization": `key=${apiKey}`,
			"Content-Type" : "application/json"
		},
		// ENCODING
		'utf8'
	);
}