async function errorMiddleware(err, req, res, next){
	console.log("Error encountered");
	console.log(err);
	res.status(500).send({error: "Some error has occured", code: err.code});
}

module.exports = errorMiddleware;