import {Controller, Get, Query} from "../../../src";
import admin from 'firebase-admin';

@Controller('/notification')
export class Notification {
	
	constructor() {
		admin.initializeApp({
			credential: admin.credential.cert(require('../../serviceAccountKey.json')),
		});
	}
	
	@Get('/test')
	async get(@Query('deviceToken') deviceToken: string) {
		const notificationTitle = 'New Message!';
		const notificationBody = 'You have a new message from User 123';
		const messageData = { customKey: 'customValue' }; // Optional data
		
		const message = {
			notification: {
				title: notificationTitle,
				body: notificationBody
			},
			data: messageData,
			token: deviceToken,
		};
		
		return await admin.messaging().send(message)
	}
}