'use strict';

const uuidv4 = require('uuid/v4');
const shell = require('shelljs');
const fs = require('fs');
const WORKSPACE_PATH = "/home/user1m/workspace";
const API_PATH = "/home/user1m/workspace/api";
const PIX_PATH = "/home/user1m/workspace/sketch2pix";
const id = uuidv4();
var PythonShell = require('python-shell');
const apiSketch = "/sketch", apiModel = "/model";
var apiRoute = '';
var resAlias = null;

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
			executeSketchScript();
		}
		shell.cd(WORKSPACE_PATH);
	});
}

function executeSketchScript(){
	console.log("RUNNING SKETCH SCRIPT.....");
	//must include pythonPath or python will fail "No Module Named X Found"
	var options = {
		pythonPath: '/home/user1m/anaconda3/bin/python',
		pythonOptions: ['-u'],
		args: [`${API_PATH}/uploads/${id}/image`,`${API_PATH}/uploads/${id}/face`,`${API_PATH}/uploads/${id}/edge`]
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
				readAndSendImage(resAlias,`${API_PATH}/uploads/${id}/edge`,`${id}.jpg`);
			} else if (apiRoute == apiModel) {
				runCombineScript();
			}
		};
		shell.cd(WORKSPACE_PATH);
	});
}

function runCombineScript(){
	console.log("RUNNING COMBINE SCRIPT.....");
	shell.cd(`${PIX_PATH}/dataset/`);
	shell.exec(`./combine.sh --path ${API_PATH}/uploads/${id}/`, 
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
		shell.cd(WORKSPACE_PATH);
	});
}

function runValScript(){
	console.log("RUNNING VAL SCRIPT.....");
	shell.cd(PIX_PATH);
	shell.exec(`./test.sh --data-root ${API_PATH}/uploads/${id}/face2edge --name celebfacesfull_generation --direction BtoA`,
	function(code, stdout, stderr) {
		if(code != 0){
			console.log('Exit code:', code);
			console.log('Program stderr:', stderr);	
			console.log("./test.sh ERRORED OUT");
		} else {
			console.log('Program output:', stdout);
			console.log("FINISH RUNNING VAL SCRIPT.....");
			readAndSendImage(resAlias,
				`${PIX_PATH}/pix2pix/results/celebfacesfull_generation/latest_net_G_test/images/output`,`${id}.jpg`);
		}
		shell.cd(WORKSPACE_PATH);
	});
}

function readAndSendImage(res, dir, image){
	console.log("READING IMAGE FILE.....");
	shell.cd(dir);
	if (fs.existsSync(image)) {
		console.log(`${image} EXISTS.....`);
		fs.readFile(`${image}`, 'binary', function(err, data) {
			if (err) { 
				throw err;
				console.log("ERROR!!! READING IMAGE FILE.....");
			} else {
				console.log("FINISH READING IMAGE FILE.....");
				res.setHeader('Content-Type', 'image/jpg');
				res.writeHead(200);
        		var base64Image = new Buffer(data, 'binary').toString('base64');
				res.end(base64Image); // Send the file data to the browser.
			}
			shell.cd(WORKSPACE_PATH);
		});
	} else {console.log(`${image} DOESN'T EXISTS.....`);}
}

function createFolders(){
	shell.mkdir("-p", `${API_PATH}/uploads/${id}/image`,`${API_PATH}/uploads/${id}/face`,`${API_PATH}/uploads/${id}/edge`, `${API_PATH}/uploads/${id}/face2edge`);
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


