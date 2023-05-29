const connection = require('../db/connect')();
const {hashFunction, getUsernameInternal, createJWT, verifyHash, verifyJWT} = require('./helper');

async function getUsername(req, res, next){
	try{
		let token = /token=(.+)/.exec(req.headers.cookie)[1];
		let decoded = await verifyJWT(token);
		if(decoded.payload){
			res.status(200).json({username: decoded.payload.username});
		}
		else{
			res.status(409).send(decoded);
		}
	}
	catch(err){
		next(err);
	}
}

async function postLogin(req, res, next){
	try{
		let con = await connection;
		let flag = true;
		let [rows, columns] = await con.execute(
			'SELECT * FROM user WHERE username = ?',
			[req.body.username]
		);
		if(!rows.length){
			res.status(409).send({username: "Username is invalid"});
			flag = false;
		};

		if(!flag){
			return;
		}
		flag = true;
		[rows, columns] = await con.execute(
			'SELECT hash FROM user WHERE username = ?',
			[req.body.username]
		);
		let result = await verifyHash(req.body.password, rows[0].hash);
		if(!result){
			res.status(409).send({password: "Password is incorrect"});
			return;
		}
		let jwt = await createJWT(req.body.username);
		res.clearCookie('token')
		.cookie('token', jwt, {expires: new Date(Date.now() + 60 * 1000 * 86400), Secure: true, Path: "/", SameSite: 'None'})
		.status(200)
		.send({response: "Login successful"});
	}
	catch(error){
		next(error);
	}
}

async function postSignup(req, res, next){
	try{
		let con = await connection;
		let flag = true;
		let [rows, columns] = await con.execute(
			'SELECT * FROM user WHERE username = ?',
			[req.body.username]
		);
		if(rows.length){
			res.status(409).send({username: "Username already exists"});
			flag = false;
		};

		if(!flag){
			return;
		}
		flag = true;
		[rows, columns] = await con.execute(
			'SELECT * FROM user WHERE email = ?',
			[req.body.email]
		);
		if(rows.length){
			res.status(409).send({email: "Email is already in use"});
			flag = false;
		}
		
		if(!flag)
			return;

		let hash = await hashFunction(req.body.password);
		await con.query(
			'INSERT INTO user VALUES( ?, ?, ?, 0, NOW(), 929292, ?, 0, 0)',
			[req.body.username, req.body.full_name, hash, req.body.email]
		);
		res.status(200).send({response: "Signup successful"});
	}
	catch(error){
		next(error);
	}
}

async function getProfile(req, res, next){
	try{
		let con = await connection;
		if(!req.query.user){
			res.status(400).send({error: "Invalid request"});
			return;
		}
		let username = req.query.user;
		let [rows, columns] = await con.execute(
			'SELECT username, full_name, coins, create_date, profile_image_id, follower_count, following_count FROM user WHERE username=?',
			[username]
		);
		if(!rows.length){
			res.status(409).send({error: "User does not exist"});
			return;
		}
		rows = rows[0];
		let date = rows.create_date;
		let month = date.getMonth() < 9 ? "0" + eval(date.getMonth() + 1) : eval(date.getMonth() + 1);
		let day = date.getDate() < 10 ? "0" + date.getDate() : date.getDate();
		let full_date = day + "-" + month + "-" + date.getFullYear();

		res.status(200).send({
			username: rows.username,
			name: rows.full_name,
			coins: rows.coins,
			src: rows.profile_image_id,
			follower_count: rows.follower_count,
			following_count: rows.following_count,
			join_date: full_date
		});
	}
	catch(error){
		next(error);
	}
}

async function createCommunity(req, res, next){
	try{
		let con = await connection;
		let token = /token=(.+)/.exec(req.headers.cookie)[1];
		let decoded = await verifyJWT(token);
		let username;
		if(decoded.payload){
			username = decoded.payload.username;
		}
		else{
			res.status(400).send(decoded);
			return;
		}
		let [rows, columns] = await con.execute(
			'SELECT id from community where name=?',
			[req.body.name]
		);
		if(rows.length){
			res.status(409).send({response: "Community already exists",
			warnings: {
				name: "This name is already taken"
			}, valid: {
				name: false
			}});
			return;
		}

		[rows, columns] = await con.execute(
			'INSERT INTO community VALUES (DEFAULT, ?, CURDATE(), ?, 1, ?, ?)',
			[req.body.name, req.body.description, req.body.banner, username]
		);
		
		let community_id = rows.insertId;
		let arg_array = [community_id, username];
		let query = "INSERT INTO admin VALUES (?, ?)";
		if(req.body.admin.length)
			query += ','
		for(let i = 0; i < req.body.admin.length; i++){
			query += ' (?, ?)';
			arg_array.push(community_id, req.body.admin[i]);
			if(i != req.body.admin.length - 1){
				query += ',';
			}
		}
		await con.execute(
			query,
			arg_array
		);
		await con.execute(
			'INSERT INTO member VALUES (?, ?)',
			[rows.insertId, username]
		);
		res.status(200).send({response: "successful"});
	}
	catch(err){
		next(err);
	}
}

async function getCommunities(req, res, next){
	try {
		let con = await connection;
		let final = {}, username = null;
		let getUser = await getUsernameInternal(req);
		if(getUser.username){
			username = getUser.username;
		}
		if(req.query.view == 'home'){
			if(username == null){
				let recommended = await con.execute('SELECT * FROM community ORDER BY RAND() LIMIT 10');
				final.recommended = recommended[0];
				let discover = await con.execute('SELECT * FROM community ORDER BY create_date DESC LIMIT 10');
				final.discover = discover[0];
				let popular = await con.execute('SELECT * FROM community ORDER BY member_count DESC LIMIT 10');
				final.popular = popular[0];
			}
			else{
				// let recommended = await con.execute('CALL getRecommendedCommunities(?)', [username]);
				// final.recommended = recommended[0][0];
				let discover = await con.execute('SELECT * FROM community ORDER BY create_date DESC LIMIT 10');
				final.discover = discover[0];
				// let popular = await con.execute('CALL getPopularCommunities(?)', [username]);
				// final.popular = popular[0][0];
			}
			res.status(200).json(final);
		}
		else{
			res.status(400).send({error: "Bad Request"});
		}
	} catch (err) {
		next(err);
	}
}

async function getRecentCommunities(req, res, next){
	try{
		let con = await connection;
		let getUser = await getUsernameInternal(req);
		if(getUser.error){
			res.status(404).send(getUser.error);
			return;
		}
		let [rows, columns] = await con.execute(
			'SELECT recent_community.community_id, community.name FROM recent_community INNER JOIN community ON community.id=recent_community.community_id WHERE recent_community.username=? ORDER BY recent_community.time DESC LIMIT 5',
			[getUser.username]
		);
		res.status(200).send({recentCommunities: rows});
	}
	catch(err){
		next(err);
	}
}

async function getCommunity(req, res, next){
	try {
		let con = await connection;
		let final;
		if(req.query.id){
			let [rows, columns] = await con.execute('SELECT * FROM community WHERE id=?', [req.query.id]);
			if(!rows.length){
				res.status(400).send({error: "community id invalid"});
				return;
			}
			else{
				final = {community: rows[0]};
				let getUser = await getUsernameInternal(req);
				if(getUser.username){
					await con.execute(
						'REPLACE INTO recent_community VALUES (?, ?, DEFAULT)',
						[getUser.username, req.query.id]
					);
				}
			}
		}
		else{
			res.status(400).send({error: "Bad Request"});
			return;
		}
		res.status(200).json(final);
	} catch (err) {
		next(err);
	}
}

async function getHomePosts(req, res, next){
	try {
		let con = await connection;
		let final = {};
		let [rows, columns] = await con.execute(
			'SELECT * FROM home_post WHERE community_id=?',
			[req.query.communityid]
		);
		final.posts = rows;
		[rows, columns] = await con.execute(
			'SELECT * FROM home_media WHERE community_id=?',
			[req.query.communityid]
		);
		final.posts = final.posts.map(post => {
			return {...post, media: rows.filter(obj => obj.post_id === post.id)};
		});
		res.status(200).send(final);
	}
	catch(err) {
		next(err);
	}
}

async function postHomePost(req, res, next){
	try {
		let con = await connection;
		let getUser = await getUsernameInternal(req);
		if(getUser.error){
			res.status(400).send(getUser.error);
			return;
		}
		let [rows, columns] = await con.execute(
			'INSERT INTO home_post VALUES (DEFAULT, ?, DEFAULT, DEFAULT, ?)',
			[req.query.communityid, req.body.description]
		);
		if(req.body.files.length){
			let query = 'INSERT INTO home_media VALUES';
			let arg_array = [];
			for(let i of req.body.files){
				query += ' (?, ?, ?, ?, ?),';
				arg_array.push(req.query.communityid, rows.insertId, i.id, i.position, i.type);
			}
			query = query.substring(0, query.length-1);
			await con.execute(query, arg_array);
		}
		res.status(200).send({response: "Post successfully created"});
	}
	catch(err){
		next(err);
	}
}

async function getMember(req, res, next){
	try {
		let con = await connection;
		let getUser = await getUsernameInternal(req);
		let username;
		if(!req.query.communityid){
			res.status(400).send({error: "Bad Request"});
			return;
		}
		if(getUser.error){
			res.status(400).send(getUser.error);
			return;
		}
		username = req.query.user || getUser.username;
		let [rows, columns] = await con.execute(
			'SELECT * FROM member WHERE community_id=? AND username=?',
			[req.query.communityid, username]
		);
		if(rows.length){
			res.status(200).send({member: true});
		}
		else{
			res.status(200).send({member: false});
		}
	}
	catch (err){
		next(err);
	}
}

async function setMember(req, res, next){
	try {
		let con = await connection;
		let getUser = await getUsernameInternal(req);
		let username = "";
		if(!req.query.communityid){
			res.status(400).send({error: "Bad Request"});
			return;
		}
		if(getUser.error){
			res.status(400).send(getUser.error);
			return;
		}
		username = req.body.username || getUser.username;
		await con.execute(
			'REPLACE INTO member VALUES (?, ?)',
			[req.query.communityid, username]
		);
		res.status(200).send({response: 'successful'});
	}
	catch (err){
		next(err);
	}
}

async function deleteMember(req, res, next){
	try {
		let con = await connection;
		let getUser = await getUsernameInternal(req);
		let username = "";
		if(!req.query.communityid){
			res.status(400).send({error: "Bad Request"});
			return;
		}
		if(getUser.error){
			res.status(400).send(getUser.error);
			return;
		}
		username = req.body.username || getUser.username;
		await con.execute(
			'DELETE FROM member WHERE community_id=? AND username=?',
			[req.query.communityid, username]
		);
		res.status(200).send({response: "successful"});
	}
	catch (err){
		next(err);
	}
}

async function getAdmin(req, res, next){
	try{
		let con = await connection;
		let final = {admin: false};
		let getUser = await getUsernameInternal(req);
		let username;
		if(!req.query.communityid){
			res.status(400).send({error: "Bad Request"});
			return;
		}
		if(getUser.error){
			res.status(400).send(final);
			return;
		}
		username = req.query.user || getUser.username;
		let [rows, columns] = await con.execute(
			'SELECT * FROM admin WHERE username=? AND community_id=?',
			[username, req.query.communityid]
		);
		if(rows.length){
			final.admin = true;
		}
		res.status(200).send(final);
	}
	catch(err){
		next(err);
	}
}

async function setAdmin(req, res, next){
	try{
		let con = await connection;
		let username = req.body.username;
		if(!req.query.communityid || !username){
			res.status(400).send({error: "Bad request"});
			return;
		}
		await con.execute(
			'REPLACE INTO admin VALUES (?, ?)',
			[req.query.communityid, username]
		);
		res.status(200).send({response: "successful"});
	}
	catch(err){
		next(err);
	}
}

async function deleteAdmin(req, res, next){
	try{
		let con = await connection;
		let username = req.body.username;
		if(!req.query.communityid || !username){
			res.status(400).send({error: "Bad request"});
			return;
		}
		await con.execute(
			'DELETE FROM admin WHERE username=? AND community_id=?',
			[username, req.query.communityid]
		);
		res.status(200).send({response: "successful"});
	}
	catch(err){
		next(err);
	}
}

async function updateBanner(req, res, next){
	try {
		let con = await connection;
		if(!req.query.communityid){
			res.status(400).send({error: "Bad Request"});
			return;
		}
		await con.execute('UPDATE community SET banner=? WHERE id=?', [req.body.banner, req.query.communityid]);
		res.status(200).send({response: "successful"});
	}
	catch (err) {
		next(err);
	}
}

async function getFeedPosts(req, res, next){
	try {
		let con = await connection;
		let getUser = await getUsernameInternal(req);
		let final = {};
		if(getUser.error){
			res.status(400).send(getUser.error);
			return;
		}
		let [rows, columns] = await con.execute(
			'SELECT * FROM feed_post WHERE community_id=?',
			[req.query.communityid]
		);
		final.posts = rows;
		[rows, columns] = await con.execute(
			'SELECT * FROM feed_media WHERE community_id=?',
			[req.query.communityid]
		);
		final.posts = final.posts.map(post => {
			return {...post, media: rows.filter(obj => obj.post_id === post.id)};
		});
		res.status(200).send(final);
	}
	catch (err) {
		next(err);
	}
}

async function postFeedPost(req, res, next){
	try {
		let con = await connection;
		let getUser = await getUsernameInternal(req);
		if(getUser.error){
			res.status(400).send(getUser.error);
			return;
		}
		let [rows, columns] = await con.execute(
			'INSERT INTO feed_post VALUES (DEFAULT, ?, 0, ?, NOW(), ?)',
			[req.query.communityid, getUser.username, req.body.caption]
		);
		if(req.body.files.length){
			let query = 'INSERT INTO feed_media VALUES';
			let arg_array = [];
			for(let i of req.body.files){
				query += ' (?, ?, ?, ?, ?),';
				arg_array.push(req.query.communityid, rows.insertId, i.id, i.position, i.type);
			}
			query = query.substring(0, query.length-1);
			await con.execute(query, arg_array);
		}
		res.status(200).send({response: "Post successfully created"});
	}
	catch (err) {
		next(err);
	}
}

async function getFollow(req, res, next){
	try {
		let con = await connection;
		let getUser = await getUsernameInternal(req);
		if(getUser.error){
			res.status(200).send(getUser.error);
			return;
		}
		if(!req.query.username){
			res.status(200).send({error: "Bad Request"});
			return;
		}
		let [rows, columns] = await con.execute(
			'SELECT * FROM follow WHERE username=? AND follows=?',
			[getUser.username, req.query.username]
		);
		if(!rows.length){
			res.status(200).send({follows: false});
		}
		else{
			res.status(200).send({follows: true});
		}
	}
	catch (err) {
		next(err);
	}
}

async function setFollow(req, res, next){
	try {
		let con = await connection;
		let getUser = await getUsernameInternal(req);
		if(getUser.error){
			res.status(400).send(getUser.error);
			return;
		}
		if(!req.body.username){
			res.status(400).send({error: "Bad Request"});
			return;
		}
		await con.execute(
			'REPLACE INTO follow VALUES (?, ?)',
			[getUser.username, req.body.username]
		);
		res.status(200).send({response: "successful"});
	}
	catch (err) {
		next(err);
	}
}

async function deleteFollow(req, res, next){
	try {
		let con = await connection;
		let getUser = await getUsernameInternal(req);
		if(getUser.error){
			res.status(400).send(getUser.error);
			return;
		}
		if(!req.body.username){
			res.status(400).send({error: "Bad Request"});
			return;
		}
		await con.execute(
			'DELETE FROM follow WHERE username=? AND follows=?',
			[getUser.username, req.body.username]
		);
		res.status(200).send({response: "successful"});
	}
	catch (err) {
		next(err);
	}
}

async function getSearch(req, res, next){
	try{
		let con = await connection;
		let final = {};
		let [rows, columns] = await con.execute(
			'SELECT username FROM user WHERE username LIKE ?',
			[`%${req.query.search}%`]
		);
		final.users = rows;
		[rows, columns] = await con.execute(
			'SELECT name, id FROM community WHERE name LIKE ?',
			[`%${req.query.search}%`]
		);
		final.communities = rows;
		res.status(200).send(final);
	}
	catch(err){
		next(err);
	}
}

async function testing(req, res, next){
	try {
		let con = await connection;
		console.log(req.query)
		let out = await con.execute(`SELECT * FROM user WHERE username = ?`, [req.query.username]);
		res.status(200).send(out[0]);
	} catch (err) {
		next(err);
	}
}

module.exports = {
	postLogin,
	postSignup, 
	getCommunity,
	getCommunities,
	getRecentCommunities,
	getProfile,
	createCommunity,
	getHomePosts,
	postHomePost,
	setMember,
	getMember,
	deleteMember,
	updateBanner,
	getAdmin,
	setAdmin,
	deleteAdmin,
	getUsername,
	getFollow,
	setFollow,
	deleteFollow,
	getFeedPosts,
	postFeedPost,
	getSearch,
	testing
};