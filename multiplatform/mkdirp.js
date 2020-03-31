const fs = require('fs');

for (path of process.argv.slice(2)) {
    if (!fs.existsSync(path)) {
        fs.mkdirSync(path, { recursive: true });
    }
}
