const connection = require('../db/connect')();
const {getUsernameInternal} = require('./helper');
const {nanoid} = require('nanoid');


async function getPrivateMessages(req, res, next){
	try {
		let con = await connection;
		if(!req.query.roomid){
			res.status(400).send({error: "Bad Request"});
			return;
		}
		let [rows, columns] = await con.execute(
			'SELECT * FROM chat_message_private WHERE chat_room=?',
			[req.query.roomid]
		);
		res.status(200).send(rows);
	}
	catch (err){
		next(err);
	}
}

// NOT USED
async function postPrivateMessage(req, res, next){
	try {
		let con = await connection;
		let getUser = await getUsernameInternal(req);
		if(!req.query.roomid){
			res.status(400).send({error: "Bad Request"});
			return;
		}
		if(getUser.error){
			res.status(400).send(getUser.error);
			return;
		}
		await con.execute(
			'INSERT INTO chat_message_private VALUES (DEFAULT, ?, ?, ?, ?)',
			[req.query.roomid, getUser.username, req.body.message, req.body.time]
		);
		res.status(200).send({response: "successful"});
	}
	catch (err){
		next(err);
	}
}

async function getCommunityMessages(req, res, next){
	try {
		let con = await connection;
		if(!req.query.roomid){
			res.status(400).send({error: "Bad Request"});
			return;
		}
		let [rows, columns] = await con.execute(
			'SELECT * FROM chat_message_community WHERE community_id=?',
			[req.query.roomid]
		);
		res.status(200).send(rows);
	}
	catch (err){
		next(err);	
	}
}

// NOT USED
async function postCommunityMessage(req, res, next){
	try {
		let con = await connection;
		let getUser = await getUsernameInternal(req);
		if(!req.query.roomid){
			res.status(400).send({error: "Bad Request"});
			return;
		}
		if(getUser.error){
			res.status(400).send(getUser.error);
			return;
		}
		await con.execute(
			'INSERT INTO chat_message_community VALUES (DEFAULT, ?, ?, ?, ?)',
			[req.query.roomid, getUser.username, req.body.message, req.body.time]
		);
		res.status(200).send({response: "successful"});
	}
	catch (err){
		next(err);
	}
}

async function getContacts(req, res, next){
	try {
		let con = await connection;
		let getUser = await getUsernameInternal(req);
		if(getUser.error){
			res.status(400).send(getUser.error);
			return;
		}
		let [rows, columns] = await con.execute(
			`SELECT contact.chat_room, chat_room_private.user1, chat_room_private.user2 FROM contact INNER JOIN chat_room_private
			ON contact.chat_room=chat_room_private.id
			WHERE contact.username=?`,
			[getUser.username]
		);
		let final = rows.map(obj => {
			let username = getUser.username != obj.user1 ? obj.user1 : obj.user2;
			return {username, roomId: obj.chat_room}
		});
		res.status(200).send(final);
	}
	catch (err) {
		next(err);	
	}
}

async function postContact(req, res, next){
	try {
		let con = await connection;
		let getUser = await getUsernameInternal(req);
		if(getUser.error){
			res.status(400).send(getUser.error);
			return;
		}
		if(!req.body.roomId){
			res.status(400).send({error: "Bad Request"});
			return;
		}
		await con.execute(
			'REPLACE INTO contact VALUES (?, ?, NOW())',
			[getUser.username, req.body.roomId]
		);
		res.status(200).send({response: "successful"});
	}
	catch (err){
		next(err);
	}
}

async function getChatRoomPrivate(req, res, next){
	try {
		let con = await connection;
		let getUser = await getUsernameInternal(req);
		if(getUser.error){
			res.status(400).send(getUser.error);
			return;
		}
		if(!req.query.username){
			res.status(400).send({error: "Bad Request"});
			return;
		}
		let user1 = getUser.username.localeCompare(req.query.username) == -1 ? getUser.username : req.query.username;
		let user2 = getUser.username.localeCompare(req.query.username) == 1 ? getUser.username : req.query.username;
		let [rows, columns] = await con.execute(
			'SELECT id FROM chat_room_private WHERE user1=? AND user2=?',
			[user1, user2]
		);
		if(!rows.length){
			let id = nanoid();
			[rows, columns] = await con.execute(
				'INSERT INTO chat_room_private VALUES (?, ?, ?)',
				[id, user1, user2]
			);
			res.status(200).send({roomId: id});
		}
		else{
			res.status(200).send({roomId: rows[0].id});
		}
	}
	catch (err) {
		next(err);
	}
}

module.exports = {
	getPrivateMessages,
	postPrivateMessage,
	getCommunityMessages,
	postCommunityMessage,
	getContacts,
	postContact,
	getChatRoomPrivate
}
