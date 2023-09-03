const {createServer} = require("http");
const {Server} = require("socket.io");
const connection = require('./db/connect')();

const httpServer = createServer();
const io = new Server(httpServer, {
	cors: {
		'origin': '*'
	}
});

io.on("connection", (socket) => {
	const users = [];
	for(let [id, socket] of io.of("/").sockets) {
		users.push({
			userID: id,
			username: socket.username,
		});
	}
	socket.broadcast.emit("users", users);
	socket.broadcast.emit("user_connected", {
		userID: socket.id,
		username: socket.username
	});
	let currentRoom = socket.handshake.auth.room;
	socket.join(currentRoom);
	socket.on("private_message", (obj) => {
		socket.to(currentRoom).emit("private_message", {
			message: obj.message,
			time: new Date(),
			from: socket.username
		});
		(async() => {
			try{
				let con = await connection;
				let ins = await con.execute('INSERT INTO chat_message_private VALUES (DEFAULT, ?, ?, ?, NOW())',
					[currentRoom, socket.username, obj.message]
				);
			}
			catch(err){
				console.log(err);
			}
		})();
	});

	socket.on("community_message", (obj) => {
		socket.to(currentRoom).emit("community_message", {
			message: obj.message,
			time: new Date(),
			from: socket.username
		});
		(async() => {
			try{
				let con = await connection;
				await con.execute('INSERT INTO chat_message_community VALUES (DEFAULT, ?, ?, ?, NOW())',
					[currentRoom, socket.username, obj.message]
				);
			}
			catch(err){
				console.log(err);
			}
		})();
	});
});

io.use((socket, next) => {
	const username = socket.handshake.auth.username;
	socket.username = username;
	next();
});

module.exports = httpServer;
