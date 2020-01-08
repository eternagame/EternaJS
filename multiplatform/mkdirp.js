const fs = require('fs');

for (path of process.argv.slice(2)) {
    fs.mkdirSync(path, { recursive: true });
}
