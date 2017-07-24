'use strict';

const uuidv4 = require('uuid/v4');
const shell = require('shelljs');
const fs = require('fs');
const PythonShell = require('python-shell');

const id = uuidv4();
const imageName = `${id}.jpg`;

const WORKSPACE_PATH = "/home/user1m/workspace";

const API_PATH = `${WORKSPACE_PATH}/api`,
PIX_PATH = `${WORKSPACE_PATH}/sketch2pix`;

const model_gen_name = 'small_face2edge_gen';
const imageUploadDir = `${API_PATH}/uploads/${id}`;
const imagePath = `${imageUploadDir}/image`,
facePath = `${imageUploadDir}/face/test`,
edgePath = `${imageUploadDir}/edge/test`,
face2edgePath = `${imageUploadDir}/face2edge/test`,
resultsPath = `${PIX_PATH}/pix2pix/results/${id}`,
modelOutputPath = `${resultsPath}/latest_net_G_test/images/output`;

const apiSketch = "/sketch", apiModel = "/model";
var apiRoute = '';
var resAlias = null;


function saveImageToDisk(data) {
	console.log("SAVING IMAGE TO DISK.....");
	shell.cd(imagePath)
	fs.writeFile(imageName, data, "binary", function (err) {
		if (err) {
			console.log("ERROR!!! SAVING IMAGE TO DISK.....");
			console.log(err);
		} else {
			console.log("FINISH SAVING IMAGE TO DISK.....");
			console.log(`${imageName}: IMAGE SAVED`);
			executeSketchScript();
		}
	});
}

function executeSketchScript(){
	console.log("RUNNING SKETCH SCRIPT.....");
	//must include pythonPath or python will fail "No Module Named X Found"
	var options = {
		pythonPath: '/home/user1m/anaconda3/bin/python',
		pythonOptions: ['-u'],
		args: [imagePath,facePath,edgePath]
	};
	shell.cd(`${PIX_PATH}/dataset/PencilSketch/`)
	PythonShell.run("gen_sketch_and_gen_resized_face.py", options, 
	function (err) {
		if (err){ 
			throw err;
			console.log("ERROR!!! RUNNING SKETCH SCRIPT.....");
		} else{
			console.log("FINISH RUNNING SKETCH SCRIPT.....");
			if (apiRoute == apiSketch) {
				readAndSendImage(edgePath,imageName);
			} else if (apiRoute == apiModel) {
				runCombineScript();
			}
		}
	});
}

function runCombineScript(){
	console.log("RUNNING COMBINE SCRIPT.....");
	shell.cd(`${PIX_PATH}/dataset/`);
	shell.exec(`./combine.sh --path ${imageUploadDir}`, 
	function(code, stdout, stderr) {
		if(code != 0){
			console.log('Exit code:', code);
			console.log('Program stderr:', stderr);
			console.log("./combine.sh ERRORED OUT");
		} else {
			console.log('Program output:', stdout);
			console.log("FINISH RUNNING COMBINE SCRIPT.....");
			runValScript();
		}
	});
}

function runValScript(){
	console.log("RUNNING VAL SCRIPT.....");
	shell.cd(PIX_PATH);
	shell.exec(`./test.sh --data-root ${imageUploadDir}/face2edge --name ${model_gen_name} --direction BtoA --custom_image_dir ${id}`,
	function(code, stdout, stderr) {
		if(code != 0){
			console.log('Exit code:', code);
			console.log('Program stderr:', stderr);	
			console.log("./test.sh ERRORED OUT");
		} else {
			console.log('Program output:', stdout);
			console.log("FINISH RUNNING VAL SCRIPT.....");
			readAndSendImage(modelOutputPath,imageName);
		}
	});
}

function combineDataAndSend(data1){
	shell.cd(edgePath);
	fs.readFile(`${image}`, 'binary', function(err, data) {
		if (err) { 
			throw err;
			console.log("ERROR!!! COMBINING IMAGE FILES.....");
		} else {
			console.log("FINISH COMBINING IMAGE FILES.....");
			resAlias.setHeader('Content-Type', 'image/jpg');
			resAlias.writeHead(200);
			var base64Image = new Buffer(data, 'binary').toString('base64');
			base64Image = base64Image + "," + data1;
			resAlias.end(base64Image); // Send the file data to the browser.
			// if (apiRoute == apiModel){
			// 	shell.rm('-rf', imageUploadDir);
			// 	shell.rm('-rf', resultsPath);
			// } else if (apiRoute == apiSketch) {
			// 	shell.rm('-rf', imageUploadDir);
			// }
		}
	});	
}


function readAndSendImage(dir, image, cb){
	console.log("READING IMAGE FILE.....");
	shell.cd(dir);
	fs.stat(image, function(err, stat) {
		if(err == null) { //exists
			console.log(`${image} EXISTS.....`);
			fs.readFile(`${image}`, 'binary', function(err, data) {
				if (err) { 
					throw err;
					console.log("ERROR!!! READING IMAGE FILE.....");
				} else {
					console.log("FINISH READING IMAGE FILE.....");
					var base64Image = new Buffer(data, 'binary').toString('base64');
					if(apiRoute == apiSketch){
						resAlias.setHeader('Content-Type', 'image/jpg');
						resAlias.writeHead(200);
						resAlias.end(base64Image); // Send the file data to the browser.
					} else if(apiRoute == apiModel){
						cb(base64Image);
					}
				}
			});	
		} else if(err.code == 'ENOENT') { //doesn't
			console.log(`${image} DOESN'T EXISTS.....`);
		}
	});
}

function createFolders(){
	shell.mkdir("-p", 
	imagePath,
	facePath,
	edgePath,  
	face2edgePath);
}

function readAndProcessImage(req, res){
	createFolders();
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
			// next();
		});
	}
}

function execute(req, res){
	resAlias = res;
	readAndProcessImage(req, res);
}


exports.generate_sketch = function (req, res, next) {
	apiRoute = apiSketch;
	execute(req, res);
};


exports.generate_image_from_model = function (req, res, next) {
	apiRoute = apiModel;
	execute(req, res)
};


exports.home = function (req, res, next) {
	var msg = `<h1>Welcome</h1> <br/> <p>Apis available:</p> <ul><li>post: /sketch</li><li>post: /model</li></ul>`;
	res.send(msg);
};


