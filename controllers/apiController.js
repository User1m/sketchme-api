'use strict';

const uuidv4 = require('uuid/v4');
const shell = require('shelljs');
const fs = require('fs');
const WORKSPACE_PATH = "/home/user1m/workspace";
const API_PATH = "/home/user1m/workspace/api";
const PIX_PATH = "/home/user1m/workspace/sketch2pix";
const id = uuidv4();

function saveImageToDisk(data) {
	//	var base64Data,
	var binaryData;

	//	base64Data  =   data.replace(/^data:image\/png;base64,/, "");
	//	base64Data  =   data.replace(/^data:([A-Za-z-+\/]+);base64,(.+)$/, "");
	//	base64Data  +=  base64Data.replace('+', ' ');
	//	binaryData  =   new Buffer(base64Data, 'base64').toString('binary');

	shell.cd(`${API_PATH}/uploads/${id}`)
	fs.writeFile(`${id}.jpg`, data, "binary", function (err) {
		if (err) {
			console.log(err);
		} else {
			console.log(`${id}: IMAGE SAVED`);
		}
	});
	shell.cd(WORKSPACE_PATH)
}

exports.generate_sketch = function (req, res, next) {
	shell.mkdir("-p", `${API_PATH}/uploads/${id}`)
	var contentType = req.headers['content-type'] || '';
   	var mime = contentType.split(';')[0];
	if (req.method == 'POST' && mime == 'application/octet-stream') {
		console.log("PROCESSING IMAGE.....");
		var data = "";
		req.setEncoding('binary');

		req.on('data', function (chunk) {
			data += chunk;

			// 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 ~~~ 1MB
			if (data.length > (10 * Math.pow(10, 6))) {
				res.send(`Image too large! Please upload an image under 10MB`);
				req.connection.destroy();
			}
		});

		req.on('end', function () {
			saveImageToDisk(data);
			res.send(`Done`);
			next();
		});
	}
	//	res.send("Hello Sketch");
	//	function puts(error, stdout, stderr) { sys.puts(stdout) }
	//	exec("ls -la", puts);

	//  Task.find({}, function(err, task) {
	//    if (err)
	//      res.send(err);
	//    res.json(task);
	//  });
};


exports.generate_image_from_model = function (req, res, next) {

	res.send("Hello Model");
};


exports.home = function (req, res, next) {
	var msg = `<h1>Welcome</h1> <br/> <p>Apis available:</p> <ul><li>post: /sketch</li><li>post: /model</li></ul>`;
	res.send(msg);
};


