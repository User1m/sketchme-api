#!/bin/bash

if [ -z "$1" ]; then
	echo "missing image tag. use 'latest' if you want 'latest' tag"
	exit 1
fi

docker run --rm -it -p 8081:80 \
	-v /Users/claudius/Documents/workspace/_ML/sketchme/sketchme-docker/backend/sketchme-api/docker/scripts/init.sh:/scripts/init.sh \
	-v /Users/claudius/Documents/workspace/_ML/sketchme/sketchme-docker/backend/sketchme-api/:/workdir/api/ \
	-v /Users/claudius/Documents/workspace/_ML/sketchme/sketchme-docker/backend/sketch2pix/Sketch:/workdir/model/Sketch/ \
	-v /Users/claudius/Documents/workspace/_ML/sketchme/sketchme-docker/backend/sketch2pix/dataset/PencilSketch:/workdir/model/dataset/PencilSketch \
	-e PORT=80 \
	-e WORKSPACE_PATH=/workdir/model \
	-e PY_PATH=/usr/local/bin/python \
	--name sketchme-backend \
	sketchme-backend:prod-$1 \
	bash -c "/scripts/init.sh"
