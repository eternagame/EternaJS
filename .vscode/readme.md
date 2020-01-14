Visual Studio Code Integration
==============================

This directory (.vscode) can contain two files, **launch.json** and **tasks.json**, 
which control project-specific actions including building and debugging a project.  However, these files
include settings which may be developer-specific as well as developer-specific.   To address this, 
.json in this directory files have been excluded from source control using the **.gitignore** file in the root directory.


-----------------
To use the Microsoft Edge browser for debugging, you must install the [Debugger for Microsoft Edge](https://marketplace.visualstudio.com/items?itemName=msjsdiag.debugger-for-edge) extension to vsc.   