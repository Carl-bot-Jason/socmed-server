const express = require('express');
const router = require('./router');
const cors = require('cors');
const connect_db  = require('./db/connect');
const errorMiddleware = require('./errors/errorMiddleware');
const socketServer = require('./socket');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use('/api', router);
app.use(errorMiddleware);

const port = process.env.PORT || 3005;

async function start(){
	let con = await connect_db();
	app.listen(port, () => {
		console.log(`Server is listening on port ${port}...`);
	});
	
	socketServer.listen(4000);
}

start();