'use strict';

const uuidv4 = require('uuid/v4');
const shell = require('shelljs');
const fs = require('fs');
const WORKSPACE_PATH = "/home/user1m/workspace";
const API_PATH = "/home/user1m/workspace/api";
const PIX_PATH = "/home/user1m/workspace/sketch2pix";
const id = uuidv4();
var PythonShell = require('python-shell');

function saveImageToDisk(data) {
	console.log("SAVING IMAGE TO DISK.....");
	shell.cd(`${API_PATH}/uploads/${id}/image`)
	fs.writeFile(`${id}.jpg`, data, "binary", function (err) {
		if (err) {
			console.log("ERROR!!! SAVING IMAGE TO DISK.....");
			console.log(err);
		} else {
			console.log("FINISH SAVING IMAGE TO DISK.....");
			console.log(`${id}: IMAGE SAVED`);
			shell.cd(WORKSPACE_PATH);
		}
	});
}

function executeSketchScript(){
	console.log("RUNNING SKETCH SCRIPT.....");
	// ${PIX_PATH}/dataset/PencilSketch/gen_sketch_and_gen_resized_face.py
	PythonShell.run(`${PIX_PATH}/dataset/sketch.sh --image-path ${API_PATH}/uploads/${id}/image --face-path ${API_PATH}/uploads/${id}/face --sketch-path ${API_PATH}/uploads/${id}/sketch`, function (err) {
		if (err) throw err;
		console.log('finished');
	});
	// shell.exec(`./sketch.sh --image-path ${API_PATH}/uploads/${id}/image --face-path ${API_PATH}/uploads/${id}/face --sketch-path ${API_PATH}/uploads/${id}/sketch`);
	console.log("FINISH RUNNING SKETCH SCRIPT.....");
	shell.cd(WORKSPACE_PATH);
}

exports.generate_sketch = function (req, res, next) {
	shell.mkdir("-p", `${API_PATH}/uploads/${id}/image`,`${API_PATH}/uploads/${id}/face`,`${API_PATH}/uploads/${id}/sketch`);
	var contentType = req.headers['content-type'] || '';
   	var mime = contentType.split(';')[0];
	if (req.method == 'POST' && mime == 'application/octet-stream') {
		console.log("PROCESSING IMAGE RAW DATA.....");
		var data = "";
		req.setEncoding('binary');

		req.on('data', function (chunk) {
			data += chunk;
			// 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 ~~~ 1MB
			if (data.length > (10 * Math.pow(10, 6))) {
				console.log("TOO MUCH DATA.....KILLING CONNECTION");
				res.send(`Image too large! Please upload an image under 10MB`);
				req.connection.destroy();
			}
		});

		req.on('end', function () {
			console.log("FINISH PROCESSING IMAGE RAW DATA.....");
			saveImageToDisk(data);
			executeSketchScript();
			res.send(`Done`);
			next();
		});
	}
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


