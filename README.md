# Installation

* `npm install`
* `sudo npm start`

# Running Locally

```
WORKSPACE_PATH="/home/user1m/workspace" PY_PATH="/home/user1m/anaconda3/bin/python" nodemon server.js
```

# Change API
```
tf-model: git checkout master
pixmodel: git checkout pixmodel
```

#Testing API via curl

```sh
curl -v -i -X POST -H "Content-Type: multipart/form-data" -F "data=@/home/user1m/workspace/api/uploads/163385.jpg" http://localhost:3000/sketch
```
