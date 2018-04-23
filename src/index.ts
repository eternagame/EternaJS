import * as PIXI from 'pixi.js';

let app: PIXI.Application = new PIXI.Application({width: 512, height: 512});
document.body.appendChild(app.view);

app.renderer.backgroundColor = 0x061639;