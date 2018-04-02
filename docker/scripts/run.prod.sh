#!/bin/bash

if [ -z "$1" ]; then
	echo "missing image prod tag. use 'latest' if you want 'latest' tag"
	exit 1
fi

docker run --rm -itd -p 8081:80 \
	-e PORT=80 \
	-e WORKSPACE_PATH=/workdir/model \
	-e PY_PATH=/usr/local/bin/python \
	--name sketchme-backend \
	sketchme-backend:prod-$1
