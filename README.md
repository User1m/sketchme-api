# Installation

* `npm install`
* `sudo npm start`

# Running

```
WORKSPACE_PATH="/home/user1m/workspace" PY_PATH="/home/user1m/anaconda3/bin/python" nodemon server.js
```


#Testing API via curl

```sh
curl -v -i -X POST -H "Content-Type: multipart/form-data" -F "data=@/home/user1m/workspace/api/uploads/163385.jpg" http://localhost:3000/sketch
```
