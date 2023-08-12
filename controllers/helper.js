const bcrypt = require('bcrypt');
const jose = require('jose');
require('dotenv').config();

async function hashFunction(password){
	return new Promise((resolve) => {
		bcrypt.hash(password, 10, (err, hash) => {
			if(err){
				throw err;
			}
			resolve(hash);
		});
	});
}

async function verifyHash(password, hash){
	return new Promise((resolve) => {
		bcrypt.compare(password, hash, (err, result) => {
			if(err)
				throw err;
				resolve(result);
			});
		});
}
	
async function createJWT(username){
	const secret = new TextEncoder().encode(process.env.secret);
	const alg = 'HS256';
	
	const jwt = await new jose.SignJWT({ username: username })
	.setProtectedHeader({ alg })
	.sign(secret);
	
	return jwt;
}

async function verifyJWT(token){
	const secret = new TextEncoder().encode(process.env.secret);
	try{
		const decoded = await jose.jwtVerify(token, secret);
		return decoded;
	}
	catch{
		return {error: "Token verification failed"};
	}
}

async function getUsernameInternal(req){
	try{
		let token = /token=(.+)/.exec(req.headers.cookie)[1];
		let decoded = await verifyJWT(token);
		if(decoded.payload){
			return {username: decoded.payload.username};
		}
		else{
			throw true;
		}
	}
	catch(err){
		return {error: "token verification failed"};
	}
}

function setHeaders(res){
	try{
		res.set('Access-Control-Allow-Origin', process.env.ORIGIN);
		res.set('Access-Control-Allow-Credentials', 'true');
		return res;
	}
	catch(err){
		throw {error: "Couldn't set access control headers"};
	}
}

module.exports = {
	hashFunction,
	verifyHash,
	createJWT,
	verifyJWT,
	getUsernameInternal,
	setHeaders
};
