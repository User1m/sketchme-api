"use strict";

const uuidv1 = require("uuid/v1"); //timestamp
const uuidv4 = require("uuid/v4"); //random
const shell = require("shelljs");
const fs = require("fs");
const PythonShell = require("python-shell");
const async = require("async");

const PY_PATH = process.env.PY_PATH || "/usr/bin/python";
const WORKSPACE_PATH = process.env.WORKSPACE_PATH || "/home";
const model_gen_name = process.env.MODEL_NAME || "celebfaces_tr5000_te1500"; //'small_face2edge_gen';
const API_PATH = `${WORKSPACE_PATH}/api`;
const SKETCH2PIX_PATH = `${WORKSPACE_PATH}/sketch2pix`;
const SKETCH_PATH = `${SKETCH2PIX_PATH}/Sketch`;

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
  face2edgePath,
  pixResultsPath,
  pixPyResultsPath,
  pixModelTarget,
  pixModelOutput,
  pixModelInput,
  pixPyModelRealA,
  pixPyModelRealB,
  pixPyModelFakeB,
  sketchModelOutputImage,
  uploadedImage;





// @deprecated
function runCombineScript() {
  console.log("RUNNING COMBINE SCRIPT.....");
  shell.cd(`${SKETCH2PIX_PATH}/dataset/`);
  shell.exec(`./combine.sh --path ${imageUploadDir}`, function (
    code,
    stdout,
    stderr
  ) {
    if (code != 0) {
      console.log("Exit code:", code);
      console.log("Program stderr:", stderr);
      console.log("./combine.sh ERRORED OUT");
    } else {
      console.log("Program output:", stdout);
      console.log("FINISH RUNNING COMBINE SCRIPT.....");
      runValScript();
    }
  });
}

function packImages(files, imageType) {
  // resAlias.setHeader('Content-Type', imageType);
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
      //   shell.rm("-rf", pixPyResultsPath);
      // shell.rm('-rf', pixResultsPath);
    }
  );
}

function runValScript() {
  console.log("RUNNING VAL SCRIPT.....");
  shell.cd(SKETCH2PIX_PATH);
  // shell.exec(`./test.sh --data-root ${imageUploadDir}/face2edge --name ${model_gen_name} --direction BtoA --custom_image_dir ${id}`,
  // shell.exec(`nohup python  ${SKETCH2PIX_PATH}/pix2pix-pytorch/test.py --dataroot ${imageUploadDir}/face2edge --name ${model_gen_name} --model pix2pix --which_model_netG unet_256 --which_direction BtoA --dataset_mode aligned --norm batch --display_id 0 --custom_image_dir ${id} > output.log &`,
  // shell.exec(`${PY_PATH} ${SKETCH2PIX_PATH}/pix2pix-pytorch/test.py --dataroot ${imageUploadDir}/face2edge --name ${model_gen_name} --gpu_ids -1 --model pix2pix --which_model_netG unet_256 --which_direction BtoA --dataset_mode aligned --norm batch --display_id 0 --custom_image_dir ${id}`,
  shell.exec(
    `${PY_PATH} ${SKETCH2PIX_PATH}/Sketch/sketchMe.py ${edgeImagePath} ${faceImagePath}`,
    function (code, stdout, stderr) {
      if (code != 0) {
        console.log("Exit code:", code);
        console.log("Program stderr:", stderr);
        console.log("runValScript ERRORED OUT");
      } else {
        console.log("Program output:", stdout);
        console.log("FINISH RUNNING VAL SCRIPT.....");
        // packImages([pixModelInput, pixModelOutput, pixModelTarget], 'image/jpg');
        // packImages( [pixPyModelRealA, pixPyModelFakeB, pixPyModelRealB],"image/png" );
        packImages([edgeImage, sketchModelOutputImage, faceImage], "image/jpg");
      }
    }
  );
}

function executeSketchScript() {
  console.log("RUNNING SKETCH SCRIPT.....");
  //   shell.exec(
  //     `${PY_PATH} ${SKETCH2PIX_PATH}/Sketch/DrawSketches.py ${imagePath}/${id}.jpg ${edgeImagePath}`,
  //     function(code, stdout, stderr) {
  //       if (apiRoute == sketchAPI) {
  //         packImages(
  //           [`${edgeImagePath}/${imageName}`, `${faceImagePath}/${imageName}`],
  //           "image/jpg"
  //         );
  //       } else if (apiRoute == modelAPI) {
  //         runCombineScript();
  //       }
  //     }
  //   );
  //   must include pythonPath or python will fail "No Module Named X Found"
  options.args = [imagePath, faceImagePath, edgeImagePath];
  shell.cd(`${SKETCH2PIX_PATH}/dataset/PencilSketch/`);
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
        // runCombineScript();
        runValScript();
      }
    }
  });
}

function smartCropImage() {
  console.log("STARTING IMAGE SMART CROP.....");
  shell.cd(SKETCH2PIX_PATH);
  shell.exec(
    `${PY_PATH} ${SKETCH2PIX_PATH}/Sketch/smartcrop.py --width 300 --height 300 ${uploadedImage} ${uploadedImage}`,
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
    }
  });
}

function createFolders() {
  shell.mkdir("-p", imagePath, faceImagePath, edgeImagePath, face2edgePath);
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
  imageUploadDir = `${API_PATH}/uploads/${id}`;
  // api/uploads/{ID}/image
  imagePath = `${imageUploadDir}/image`;
  // api/uploads/{ID}/image/{ID}.jpg
  uploadedImage = `${imagePath}/${imageName}`;
  savedImagesPath = `${API_PATH}/savedImages`;
  // api/uploads/{ID}/face/test
  faceImagePath = `${imageUploadDir}/face/test`;
  faceImage = `${faceImagePath}/${imageName}`;
  // api/uploads/{ID}/edge/test
  edgeImagePath = `${imageUploadDir}/edge/test`;
  edgeImage = `${edgeImagePath}/${imageName}`;
  // api/uploads/{ID}/face2edge/test
  face2edgePath = `${imageUploadDir}/face2edge/test`;
  pixResultsPath = `${SKETCH2PIX_PATH}/pix2pix/results/${id}`;
  pixPyResultsPath = `${SKETCH2PIX_PATH}/results/${id}`;
  pixModelTarget = `${pixResultsPath}/latest_net_G_test/images/target/${imageName}`;
  pixModelOutput = `${pixResultsPath}/latest_net_G_test/images/output/${imageName}`;
  pixModelInput = `${pixResultsPath}/latest_net_G_test/images/input/${imageName}`;
  pixPyModelRealA = `${pixPyResultsPath}/test_latest/images/${id}_real_A.png`;
  pixPyModelRealB = `${pixPyResultsPath}/test_latest/images/${id}_real_B.png`;
  pixPyModelFakeB = `${pixPyResultsPath}/test_latest/images/${id}_fake_B.png`;
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