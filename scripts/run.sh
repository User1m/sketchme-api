#!/bin/bash

# ./build.sh

docker run --rm -it \
	-v /Users/claudius/Documents/workspace/_ML/sketchme/sketchme-docker/sketchme-api/:/workdir/app/ \
	-e PORT=80 -e WORKSPACE_PATH='/home/user1m/workspace' \
	-p 8080:80 \
	sketchme-backend bash
