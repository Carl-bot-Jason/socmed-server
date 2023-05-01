const express = require('express');
const cors = require('cors');
const connect_db  = require('./db/connect');
const errorMiddleware = require('./errors/errorMiddleware');
require('dotenv').config();

connect_db()
.then(con => {
	const router = require('./router');
	const socketServer = require('./socket');

	const app = express();
	
	app.use(cors());
	app.use(express.json());
	app.use(express.urlencoded({extended: true}));
	app.use('/api', router);
	app.use(errorMiddleware);
	
	const port = process.env.PORT || 3005;
	
	app.listen(port, () => {
		console.log(`Server is listening on port ${port}...`);
	});
	
	socketServer.listen(4000);
})
.catch(err => {
	console.log('Database connection failed');
});