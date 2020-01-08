const fs = require('fs');
const path = require('path');

function deleteFolderRecursive(dirPath) {
    if( fs.existsSync(dirPath) ) {
        for (file of fs.readdirSync(dirPath)) {
            var curPath = path.join(dirPath, file);
            if(fs.lstatSync(curPath).isDirectory()) {
                deleteFolderRecursive(curPath);
            } else {
                fs.unlinkSync(curPath);
            }
        }
        fs.rmdirSync(dirPath);
    }
};


for (dirPath of process.argv.slice(2)) {
    deleteFolderRecursive(dirPath);
}
