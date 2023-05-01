const mysql = require('mysql2/promise');
require('dotenv').config();

function connect(){
  const connection = mysql.createConnection({
    host     : 'localhost',
    user     : process.env.USERNAME,
    password : process.env.PASSWORD,
    database : 'kucatu'
  });
  return connection;
}

module.exports = connect;