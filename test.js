const connect = require('./db/connect');

async function fun(){
	let con = await connect;
	console.log(con);
}

fun();

