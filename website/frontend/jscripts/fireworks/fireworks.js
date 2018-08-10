var SCREEN_WIDTH = window.innerWidth,
    SCREEN_HEIGHT = window.innerHeight,
    mousePos = {
        x: 400,
        y: 300
    },

    // create canvas
    fireworksCanvas = null,//document.createElement('canvas'),
    fireworksContext = null,//fireworksCanvas.getContext('2d'),
    fireworksLaunchInterval = null,
    fireworksLoopInterval = null,
    particles = [],
    rockets = [],
    MAX_ROCKETS = 20,
    MAX_PARTICLES = 400,
    colorCode = 0,
    COLOR_CODES = [
	[
	    203, // blue #3193D1
	    14, // red #F05122
	    116, // green #4FB748
	    54 // yellow #FFE500
	]
    ];
  

function fireworksDestroy(duration) {
    if (typeof duration == undefined){
	duration = 3000;
    }
    $('#fireworks-canvas').fadeOut(duration, "linear", function() {
	$(this).remove();
    });
}


function fireworksSafeDestroy() {
    if (rockets.length > 0) {
	return;
    }
    fireworksDestroy(1000);
    clearInterval(intervalSafeDestroy);
}


function fireworksStop() {
    alert("Stoppig fireworks...");
    clearInterval(fireworksLaunchInterval);
    clearInterval(fireworksLoopInterval);
    $(document).mousedown(function(e) {
        return false;
    });
    fireworksContext.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    particles = [];
    rockets = [];
}


// init
function fireworksStart(n) {
    n = n*10;
    fireworksCanvas = document.createElement('canvas');
    fireworksContext = fireworksCanvas.getContext('2d');

    $(document).ready(function() {
        document.body.appendChild(fireworksCanvas);
        fireworksCanvas.id = 'fireworks-canvas'
        fireworksCanvas.width = SCREEN_WIDTH;
        fireworksCanvas.height = SCREEN_HEIGHT;
        fireworksCanvas.style.position = 'absolute';
        fireworksCanvas.style.top = '0px';
	fireworksCanvas.style.zIndex = 9997;
	fireworksCanvas.style.backgroundColor = 'rgba(0, 0, 0, 0.0)';
        //fireworksLaunchInterval = setInterval(fireworksLaunch, 100);
	var offset = 0;
	for (var ii = 1; ii <= n ; ii++) {
	    offset = (SCREEN_WIDTH / 2) * (ii/n);
	    setTimeout(function() {
		fireworksLaunch(0 + offset); 
		setTimeout(function() {
		    fireworksLaunch(SCREEN_WIDTH - offset);
		}, 1);
	    }, (ii-1)*1.5);
        }
	fireworksLoopInterval = setInterval(fireworksLoop, 1);
        intervalSafeDestroy = setInterval(fireworksSafeDestroy, 2);
	
    });
    
    // update mouse position
    $(document).mousemove(function(e) {
        e.preventDefault();
        mousePos = {
            x: e.clientX,
            y: e.clientY
        };
    });

    // launch more rockets!!!
    //$(document).mousedown(function(e) {
        //for (var i = 0; i < 5; i++) {
        //    launchFrom(Math.random() * SCREEN_WIDTH * 2 / 3 + SCREEN_WIDTH / 6);
        //}
    //});

    return fireworksCanvas;
}

    
function fireworksLaunch() {
    launchFrom(Math.random() * SCREEN_WIDTH * 2 / 3 + SCREEN_WIDTH / 6);
    //var positions = [SCREEN_WIDTH * (1/4), SCREEN_WIDTH * (3/4)];
    //launchFrom(positions[Math.floor(Math.random()*2)]);
}

function launchFrom(x) {
    if (rockets.length < MAX_ROCKETS) {
        var rocket = new Rocket(x);
        explosionColorIdx = Math.floor(Math.random() * COLOR_CODES[colorCode].length);
        rocket.explosionColor = COLOR_CODES[colorCode][explosionColorIdx];
        rocket.vel.y = Math.random() * -3 - 7 ;
        rocket.vel.x = Math.random() * 6 - 3;
        rocket.size = 2;
        rocket.shrink = 0.999;
        rocket.gravity = 0.01;
        rockets.push(rocket);
    } else {
	return;
    }
    
}

function fireworksLoop() {
    // update screen size
    if (SCREEN_WIDTH != window.innerWidth) {
        fireworksCanvas.width = SCREEN_WIDTH = window.innerWidth;
    }
    if (SCREEN_HEIGHT != window.innerHeight) {
        fireworksCanvas.height = SCREEN_HEIGHT = window.innerHeight;
    }

    // clear canvas
    fireworksContext.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    var existingRockets = [];

    for (var i = 0; i < rockets.length; i++) {
        // update and render
        rockets[i].update();
        rockets[i].render(fireworksContext);

        // calculate distance with Pythagoras
        var distance = Math.sqrt(Math.pow(mousePos.x - rockets[i].pos.x, 2) + Math.pow(mousePos.y - rockets[i].pos.y, 2));

        // random chance of 1% if rockets is above the middle
        var randomChance = rockets[i].pos.y < (SCREEN_HEIGHT * 2 / 3) ? (Math.random() * 100 <= 1) : false;

/* Explosion rules
             - 80% of screen
            - going down
            - close to the mouse
            - 1% chance of random explosion
        */
        if (rockets[i].pos.y < SCREEN_HEIGHT / 5 || rockets[i].vel.y >= 0 || distance < 50 || randomChance) {
            rockets[i].explode();
        } else {
            existingRockets.push(rockets[i]);
        }
    }

    // update array with existing rockets - garbage collect old rockets
    rockets = existingRockets;
   
    while (rockets.length > MAX_ROCKETS) {
        rockets.shift();
    }
    
    var existingParticles = [];

    for (var i = 0; i < particles.length; i++) {
        particles[i].update();

        // render and save particles that can be rendered
        if (particles[i].exists()) {
            particles[i].render(fireworksContext);
            existingParticles.push(particles[i]);
        }
    }

    // update array with existing particles - old particles should be garbage collected
    particles = existingParticles;

    while (particles.length > MAX_PARTICLES) {
        particles.shift();
    }
}

function Particle(pos) {
    this.pos = {
        x: pos ? pos.x : 0,
        y: pos ? pos.y : 0
    };
    this.vel = {
        x: 0,
        y: 0
    };
    this.shrink = .97;
    this.size = 2;

    this.resistance = 1;
    this.gravity = 0;

    this.flick = false;

    this.alpha = 1;
    this.fade = 0;
    this.color = 0;
}

Particle.prototype.update = function() {
    // apply resistance
    this.vel.x *= this.resistance;
    this.vel.y *= this.resistance;

    // gravity down
    this.vel.y += this.gravity;

    // update position based on speed
    this.pos.x += this.vel.x;
    this.pos.y += this.vel.y;

    // shrink
    this.size *= this.shrink;

    // fade out
    this.alpha -= this.fade;
};

Particle.prototype.render = function(c) {
    if (!this.exists()) {
        return;
    }

    c.save();

    c.globalCompositeOperation = 'lighter';

    var x = this.pos.x,
        y = this.pos.y,
        r = this.size / 2;

    var gradient = c.createRadialGradient(x, y, 0.1, x, y, r);
    gradient.addColorStop(0.001, "rgba(255,255,255," + this.alpha + ")");
    gradient.addColorStop(0.02, "hsla(" + this.color + ", 100%, 50%, " + this.alpha + ")");
    gradient.addColorStop(1, "hsla(" + this.color + ", 100%, 50%, 0.1)");

    c.fillStyle = gradient;

    c.beginPath();
    c.arc(this.pos.x, this.pos.y, this.flick ? Math.random() * this.size : this.size, 0, Math.PI * 2, true);
    c.closePath();
    c.fill();

    c.restore();
};

Particle.prototype.exists = function() {
    return this.alpha >= 0.1 && this.size >= 1;
};

function Rocket(x) {
    Particle.apply(this, [{
        x: x,
        y: SCREEN_HEIGHT}]);

    this.explosionColor = 0;
}

Rocket.prototype = new Particle();
Rocket.prototype.constructor = Rocket;

Rocket.prototype.explode = function() {
    var count = Math.random() * 10 + 80;

    for (var i = 0; i < count; i++) {
        var particle = new Particle(this.pos);
        var angle = Math.random() * Math.PI * 2;

        // emulate 3D effect by using cosine and put more particles in the middle
        var speed = Math.cos(Math.random() * Math.PI / 2) * 15;

        particle.vel.x = Math.cos(angle) * speed;
        particle.vel.y = Math.sin(angle) * speed;

        particle.size = 10;

        particle.gravity = 0.2;
        particle.resistance = 0.92;
        particle.shrink = Math.random() * 0.05 + 0.93;

        particle.flick = true;
        particle.color = this.explosionColor;

        particles.push(particle);
    }
};

Rocket.prototype.render = function(c) {
    if (!this.exists()) {
        return;
    }

    c.save();

    c.globalCompositeOperation = 'lighter';

    var x = this.pos.x,
        y = this.pos.y,
        r = this.size / 2;

    var gradient = c.createRadialGradient(x, y, 0.1, x, y, r);
    gradient.addColorStop(0.01, "rgba(255, 255, 255 ," + this.alpha + ")");
    gradient.addColorStop(0.01, "rgba(0, 0, 0, " + this.alpha + ")");

    c.fillStyle = gradient;

    c.beginPath();
    c.arc(this.pos.x, this.pos.y, this.flick ? Math.random() * this.size / 2 + this.size / 2 : this.size, 0, Math.PI * 2, true);
    c.closePath();
    c.fill();

    c.restore();
};



