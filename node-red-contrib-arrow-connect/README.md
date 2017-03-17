## Requirements

The code has been tested using the configuration below:

* Node.js v6.5.0
* NPM 3.10.3
* Node-RED v0.15.1

## Local installation

Based on http://nodered.org/docs/creating-nodes/packaging, see **Testing a node module locally**

* Go to the **node-red-contrib-arrow-connect** directory
* Run `sudo npm link` (Linux) or `npm link` (Windows, command prompt (Admin))
* Go to the **~/.node-red** (Linux) or **\Users\<login>\.node-red** (Windows) directory
* Run `npm link node-red-contrib-arrow-connect`
* Note for Windows: make sure to run `node-red` from the directory located at the disk drive having the **\Users\<login>\.node-red** directory.
