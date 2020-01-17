Visual Studio Code Integration
==============================

This directory (.vscode) can contain two files, **launch.json** and **tasks.json**, 
which control project-specific actions including building and debugging a project.  However, these files
include settings which may be developer-specific as well as developer-specific.   To address this, 
.json in this directory files have been excluded from source control using the **.gitignore** file in the root directory.  Examples developers may want to start from are in .vscode/example, the instructions below assume you have copied these files into the .vscode directory.

Building
--------

The build process can be invoked, using the default build task, using Ctrl+Shift+B.   This invokes `npm start`, which both invokes webpack in watch mode, and runs the local web server on port 63343.   There is some integration of webpack error messages implemented in tasks.json, but its not displaying the best possible errors (though it captures the file names).  See 
issue microsoft/vscode #88817.

Debugging
---------

Debug configurations for both Chrome and the new Edge browser (based on chrome).  You can choose which configuration to use near the top of the Debug tab in visual studio, and launch the debugger using F5.  This assumes you have invoked the build task.
