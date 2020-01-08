const fs = require('fs');
const path = require('path');

function copyFolderRecursive(srcPath, destPath) {
    if( fs.existsSync(srcPath) ) {
        if (!fs.existsSync(destPath)) fs.mkdirSync(destPath);
        for (file of fs.readdirSync(srcPath)) {
            var newSrcPath = path.join(srcPath, file);
            var newDestPath = path.join(destPath, file);
            if(fs.lstatSync(newSrcPath).isDirectory()) {
                copyFolderRecursive(newSrcPath, newDestPath);
            } else {
                fs.copyFileSync(newSrcPath, newDestPath);
            }
        }
    }
};

for (srcPath of process.argv.slice(2, -1)) {
    copyFolderRecursive(srcPath, process.argv.slice(-1)[0]);
}
