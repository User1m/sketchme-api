## Running

```
docker run --rm -itd -p 8081:80 \
    -e PORT=80 \
    -e WORKSPACE_PATH=/workdir/model \
    -e PY_PATH=/usr/local/bin/python \
    --name sketchme-backend \
    sketchme-backend:prod-v#
```

* **#** = version number (e.g 2)


## Testing API via curl

```sh
curl -v -i -X POST -H "Content-Type: multipart/form-data" \
-F "data=@/path/to/image/163385.jpg" http://localhost:8081/sketch
```

## Acknowledgements

* [https://hub.docker.com/r/user1m/sketchme-backend](https://hub.docker.com/r/user1m/sketchme-backend)
* [https://hub.docker.com/r/user1m/sketchme-webapp](https://hub.docker.com/r/user1m/sketchme-webapp)
* [https://github.com/User1m/sketch2pix](https://github.com/User1m/sketch2pix)
