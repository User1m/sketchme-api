'use strict';

const uuidv1 = require('uuid/v1'); //timestamp
const uuidv4 = require('uuid/v4'); //random
const shell = require('shelljs');
const fs = require('fs');
const PythonShell = require('python-shell');
const async = require('async');

const PY_PATH = process.env.PY_PATH || "/usr/bin/python";
const WORKSPACE_PATH = process.env.WORKSPACE_PATH || "/home";
const model_gen_name = process.env.MODEL_NAME || 'celebfaces_tr5000_te1500';//'small_face2edge_gen';
const API_PATH = `${WORKSPACE_PATH}/api`;
const SKETCH2PIX_PATH = `${WORKSPACE_PATH}/sketch2pix`;

const sketchAPI = "/sketch", modelAPI = "/model";
var apiRoute = '';
var resAlias = null;

var id = '',
imageName = '',
imageUploadDir = '',
imagePath = '',
savedImagesPath = '',
facePath = '',
edgePath = '',
face2edgePath = '',
pixResultsPath = '',
pixPyResultsPath = '',
pixModelTarget = '',
pixModelOutput = '',
pixModelInput = '',
pixPyModelRealA = '',
pixPyModelRealB = '',
pixPyModelFakeB = '';


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
			shell.cp('-f', imageName, `${savedImagesPath}/${imageName}`);
			executeSketchScript();
		}
	});
}

function executeSketchScript(){
	console.log("RUNNING SKETCH SCRIPT.....");
	//must include pythonPath or python will fail "No Module Named X Found"
	var options = {
		pythonPath: PY_PATH,
		pythonOptions: ['-u'],
		args: [imagePath,facePath,edgePath]
	};
	shell.cd(`${SKETCH2PIX_PATH}/dataset/PencilSketch/`)
	PythonShell.run("gen_sketch_and_gen_resized_face.py", options, 
	function (err) {
		if (err){ 
			throw err;
			console.log("ERROR!!! RUNNING SKETCH SCRIPT.....");
		} else{
			console.log("FINISH RUNNING SKETCH SCRIPT.....");
			if (apiRoute == sketchAPI) {
				packImages([`${edgePath}/${imageName}`, `${facePath}/${imageName}`], 'image/jpg');
			} else if (apiRoute == modelAPI) {
				runCombineScript();
			}
		}
	});
}

function runCombineScript(){
	console.log("RUNNING COMBINE SCRIPT.....");
	shell.cd(`${SKETCH2PIX_PATH}/dataset/`);
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
	shell.cd(SKETCH2PIX_PATH);
	// shell.exec(`./test.sh --data-root ${imageUploadDir}/face2edge --name ${model_gen_name} --direction BtoA --custom_image_dir ${id}`,
	// shell.exec(`nohup python  ${SKETCH2PIX_PATH}/pix2pix-pytorch/test.py --dataroot ${imageUploadDir}/face2edge --name ${model_gen_name} --model pix2pix --which_model_netG unet_256 --which_direction BtoA --dataset_mode aligned --norm batch --display_id 0 --custom_image_dir ${id} > output.log &`,
	shell.exec(`${PY_PATH} ${SKETCH2PIX_PATH}/pix2pix-pytorch/test.py --dataroot ${imageUploadDir}/face2edge --name ${model_gen_name} --gpu_ids -1 --model pix2pix --which_model_netG unet_256 --which_direction BtoA --dataset_mode aligned --norm batch --display_id 0 --custom_image_dir ${id}`,
	function(code, stdout, stderr) {
		if(code != 0){
			console.log('Exit code:', code);
			console.log('Program stderr:', stderr);	
			console.log("./test.sh ERRORED OUT");
		} else {
			console.log('Program output:', stdout);
			console.log("FINISH RUNNING VAL SCRIPT.....");
			// packImages([pixModelInput, pixModelOutput, pixModelTarget], 'image/jpg');
			packImages([pixPyModelRealA, pixPyModelFakeB, pixPyModelRealB], 'image/png');
		}
	});
}


function packImages(files, imageType){
	// resAlias.setHeader('Content-Type', imageType);
	async.eachSeries(files, function (file, callback) {
		fs.stat(file, function(err, stats){
			if(err == null) { //exists
				console.log(`${file} EXISTS.....`);
				fs.readFile(file, 'binary', function(err, data) {
					if (err) { 
						throw err;
						console.log("ERROR!!! COMBINING IMAGE FILES.....");
					} else {
						var base64Image = new Buffer(data, 'binary').toString('base64');
						resAlias.write(base64Image+",");
						console.log("FINISH COMBINING IMAGE FILES.....");
					}
					callback(err);
				});	
			} else if(err.code == 'ENOENT') { //doesn't
				console.log(`${file} DOESN'T EXISTS.....`);
			}
		});
	}, function(err, result){
		resAlias.end();
		console.log("CLEANING UP TEMP FOLDERS.....");
		shell.rm('-rf', imageUploadDir);
		shell.rm('-rf', pixPyResultsPath); 
		// shell.rm('-rf', pixResultsPath); 
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

function setupVars(){
	id = uuidv1();//uuidv4();
	imageName = `${id}.jpg`;
	imageUploadDir = `${API_PATH}/uploads/${id}`,
	imagePath = `${imageUploadDir}/image`,
	savedImagesPath = `${API_PATH}/savedImages`,
	facePath = `${imageUploadDir}/face/test`,
	edgePath = `${imageUploadDir}/edge/test`,
	face2edgePath = `${imageUploadDir}/face2edge/test`,
	pixResultsPath = `${SKETCH2PIX_PATH}/pix2pix/results/${id}`,
	pixPyResultsPath = `${SKETCH2PIX_PATH}/results/${id}`,
	pixModelTarget = `${pixResultsPath}/latest_net_G_test/images/target/${id}.jpg`,
	pixModelOutput = `${pixResultsPath}/latest_net_G_test/images/output/${id}.jpg`,
	pixModelInput = `${pixResultsPath}/latest_net_G_test/images/input/${id}.jpg`,
	pixPyModelRealA = `${pixPyResultsPath}/test_latest/images/${id}_real_A.png`,
	pixPyModelRealB = `${pixPyResultsPath}/test_latest/images/${id}_real_B.png`,
	pixPyModelFakeB = `${pixPyResultsPath}/test_latest/images/${id}_fake_B.png`;
}

function execute(req, res){
	resAlias = res;
	setupVars();
	readAndProcessImage(req, res);
}


exports.generate_sketch = function (req, res, next) {
	apiRoute = sketchAPI;
	execute(req, res);
};


exports.generate_image_from_model = function (req, res, next) {
	// id = uuidv4();
 	// imageName = `${id}.jpg`;
	apiRoute = modelAPI;
	execute(req, res);
};


exports.home = function (req, res, next) {
	var msg = `<h1>Welcome</h1> <br/> <p>Apis available:</p> <ul><li>post: /sketch</li><li>post: /model</li></ul>`;
	res.send(msg);
};


