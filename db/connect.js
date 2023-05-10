const mysql = require('mysql2/promise');
require('dotenv').config();

function connect(){
  const connection = mysql.createConnection({
    host     : process.env.host,
    user     : process.env.USERNAME,
    password : process.env.PASSWORD,
    database : process.env.database
  });
  return connection;
}

module.exports = connect;