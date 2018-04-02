#!/bin/bash

ln -sf /workdir/api/package.json /workdir/package.json
mkdir -p /workdir/model/Sketch/results
cd /workdir/api && npm start &
bash
