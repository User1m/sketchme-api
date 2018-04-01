"use strict";

const uuidv1 = require("uuid/v1"); //timestamp
const uuidv4 = require("uuid/v4"); //random
const shell = require("shelljs");
const fs = require("fs");
const PythonShell = require("python-shell");
const async = require("async");

const PY_PATH = process.env.PY_PATH || "/usr/bin/python";
const WORKSPACE_PATH = process.env.WORKSPACE_PATH || "/home";
const SKETCH_PATH = `${WORKSPACE_PATH}/Sketch`;

const sketchAPI = "/sketch",
  modelAPI = "/model";
let apiRoute = "";
let resAlias = null;

const options = {
  pythonPath: PY_PATH,
  pythonOptions: ["-u"],
  args: []
};

let id,
  imageName,
  imageUploadDir,
  imagePath,
  savedImagesPath,
  faceImagePath,
  faceImage,
  edgeImagePath,
  edgeImage,
  sketchModelOutputImage,
  uploadedImage;


function packImages(files, imageType) {
  async.eachSeries(
    files,
    function (file, callback) {
      fs.stat(file, function (err, stats) {
        if (err == null) {
          //exists
          console.log(`${file} EXISTS.....`);
          fs.readFile(file, "binary", function (err, data) {
            if (err) {
              throw err;
              console.log("ERROR!!! COMBINING IMAGE FILES.....");
            } else {
              let base64Image = new Buffer(data, "binary").toString("base64");
              resAlias.write(base64Image + ",");
              console.log("FINISH COMBINING IMAGE FILES.....");
            }
            callback(err);
          });
        } else if (err.code == "ENOENT") {
          //doesn't
          console.log(`${file} DOESN'T EXISTS.....`);
        }
      });
    },
    function (err, result) {
      resAlias.end();
      console.log("CLEANING UP TEMP FOLDERS.....");
      shell.rm("-rf", imageUploadDir);
      shell.rm("-rf", sketchModelOutputImage);
    }
  );
}

function runValScript() {
  console.log("RUNNING VAL SCRIPT.....");
  shell.cd(SKETCH_PATH);
  shell.exec(
    `${PY_PATH} ${SKETCH_PATH}/sketchMe.py ${edgeImagePath} ${faceImagePath}`,
    function (code, stdout, stderr) {
      if (code != 0) {
        console.log("Exit code:", code);
        console.log("Program stderr:", stderr);
        console.log("runValScript ERRORED OUT");
      } else {
        console.log("Program output:", stdout);
        console.log("FINISH RUNNING VAL SCRIPT.....");
        packImages([edgeImage, sketchModelOutputImage, faceImage], "image/jpg");
      }
    }
  );
}

function executeSketchScript() {
  console.log("RUNNING SKETCH SCRIPT.....");
  //   must include pythonPath or python will fail "No Module Named X Found"
  options.args = [imagePath, faceImagePath, edgeImagePath];
  shell.cd(`${WORKSPACE_PATH}/dataset/PencilSketch/`);
  PythonShell.run("gen_sketch_and_gen_resized_face.py", options, function (err) {
    if (err) {
      console.log("ERROR!!! RUNNING SKETCH SCRIPT.....");
      console.log(err);
    } else {
      console.log("FINISH RUNNING SKETCH SCRIPT.....");
      if (apiRoute == sketchAPI) {
        packImages(
          [`${edgeImagePath}/${imageName}`, `${faceImagePath}/${imageName}`],
          "image/jpg"
        );
      } else if (apiRoute == modelAPI) {
        runValScript();
      }
    }
  });
}

function smartCropImage() {
  console.log("STARTING IMAGE SMART CROP.....");
  shell.cd(SKETCH_PATH);
  shell.exec(
    `${PY_PATH} ${SKETCH_PATH}/smartcrop.py --width 353 --height 435 ${uploadedImage} ${uploadedImage}`,
    function (code, stdout, stderr) {
      if (code != 0) {
        console.log("Exit code:", code);
        console.log("Program stderr:", stderr);
        console.log("smartCropImage ERROR-ED OUT");
      } else {
        console.log("Program output:", stdout);
        console.log("FINISH RUNNING SMART CROP SCRIPT.....");
        shell.cp("-f", uploadedImage, `${savedImagesPath}/${imageName}`);
        executeSketchScript();
      }
    }
  );
}

function saveImageToDisk(data) {
  console.log("SAVING IMAGE TO DISK.....");
  shell.cd(imagePath);
  fs.writeFile(imageName, data, "binary", function (err) {
    if (err) {
      console.log("ERROR!!! SAVING IMAGE TO DISK.....");
      console.log(err);
    } else {
      console.log("FINISH SAVING IMAGE TO DISK.....");
      console.log(`${imageName}: IMAGE SAVED`);
      smartCropImage();
      // executeSketchScript();
    }
  });
}

function createFolders() {
  shell.mkdir("-p", imagePath, faceImagePath, edgeImagePath);
}

function readAndProcessImage(req, res) {
  createFolders();
  let contentType = req.headers["content-type"] || "";
  let mime = contentType.split(";")[0];
  if (req.method == "POST" && mime == "application/octet-stream") {
    console.log("PROCESSING IMAGE RAW DATA.....");
    let data = "";
    req.setEncoding("binary");

    req.on("data", function (chunk) {
      data += chunk;
      // 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 ~~~ 1MB
      if (data.length > 10 * Math.pow(10, 6)) {
        console.log("TOO MUCH DATA.....KILLING CONNECTION");
        res.send(`Image too large! Please upload an image under 10MB`);
        req.connection.destroy();
      }
    });

    req.on("end", function () {
      console.log("FINISH PROCESSING IMAGE RAW DATA.....");
      saveImageToDisk(data);
      // next();
    });
  }
}

function setupVars() {
  id = uuidv1(); //uuidv4();
  imageName = `${id}.jpg`;
  imageUploadDir = `${WORKSPACE_PATH}/uploads/${id}`;
  // api/uploads/{ID}/image
  imagePath = `${imageUploadDir}/image`;
  // api/uploads/{ID}/image/{ID}.jpg
  uploadedImage = `${imagePath}/${imageName}`;
  savedImagesPath = `${WORKSPACE_PATH}/savedImages`;
  // api/uploads/{ID}/face/test
  faceImagePath = `${imageUploadDir}/face/test`;
  faceImage = `${faceImagePath}/${imageName}`;
  // api/uploads/{ID}/edge/test
  edgeImagePath = `${imageUploadDir}/edge/test`;
  edgeImage = `${edgeImagePath}/${imageName}`;
  // api/uploads/{ID}/face2edge/test
  // sketch2pix/Sketch/results/{id}.jpg
  sketchModelOutputImage = `${SKETCH_PATH}/results/${imageName}`;
}

function execute(req, res) {
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
  let msg = `<h1>Welcome</h1> <br/> <p>Apis available:</p> <ul><li>post: /sketch</li><li>post: /model</li></ul>`;
  res.send(msg);
};