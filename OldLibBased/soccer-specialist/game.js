var camera, scene, renderer;
var state = {
    phase: "loading",
    score: 0,
    tries: 3,
    shots: 0
};

var loadingService = {
	count: 0,
	max: 0,
	display: document.querySelector('progress'),
	registerFinFunc: function(func) {
		loadingService.onFinished = func;
	},
	push: function(amount) {
		loadingService.count += typeof amount === 'undefined' ? 1 : amount;
		if (loadingService.count > loadingService.max) {
			loadingService.max = loadingService.count;
		}
	},
	pop: function() {
		if(--loadingService.count === 0) {
			loadingService.onFinished();
		}
		loadingService.display.value = (loadingService.max - loadingService.count) / loadingService.max;
	}
};

var isDebug = isMute = false;
var origin = new THREE.Vector3(0, 15, 0);
var isIntersected = false;
var shotDir = new THREE.Vector3(0, 0, 1);
var goalDir = new THREE.Vector3(0, 0, 1);
var shotPow = 0;
var ballSize = .11;
var goalieSpeed = 1;
var ballBend = new CANNON.Vec3;
var arrow, ball, goalie, wall, intersectionPlane;
var world, time, lastTime = performance.now();
var ballBody, goalieBody, wallBody;
var ballBodyMaterial;
var ballGround;
var cheerSound = new Audio;
var collideSound = new Audio;
var crossbarSound = new Audio;
var crowdSound = new Audio;
var goalSound = new Audio;
var jeerSound = new Audio;
var kickSound = new Audio;
if (crowdSound.canPlayType("audio/ogg")) {
    cheerSound.src = "sounds/cheer.ogg";
    collideSound.src = "sounds/collide.ogg";
    crossbarSound.src = "sounds/crossbar.ogg";
    crowdSound.src = "sounds/crowd1.ogg";
    goalSound.src = "sounds/goal.ogg";
    jeerSound.src = "sounds/jeer.ogg";
    kickSound.src = "sounds/kick.ogg"
} else if (crowdSound.canPlayType("audio/mpeg")) {
    cheerSound.src = "sounds/cheer.mp3";
    collideSound.src = "sounds/collide.mp3";
    crossbarSound.src = "sounds/crossbar.mp3";
    crowdSound.src = "sounds/crowd1.mp3";
    goalSound.src = "sounds/goal.mp3";
    jeerSound.src = "sounds/jeer.mp3";
    kickSound.src = "sounds/kick.mp3"
}
var sounds = [
	cheerSound,
	collideSound,
	crossbarSound,
	crowdSound,
	goalSound,
	jeerSound,
	kickSound
];
loadingService.push(sounds.length);
sounds.forEach(function(sound) {
	sound.addEventListener('canplaythrough', loadingService.pop);
});
var ballTexture = THREE.ImageUtils.loadTexture(
	"textures/ballTexture.png",
	new THREE.UVMapping(),
	loadingService.pop
);
var pitchTexture = THREE.ImageUtils.loadTexture(
	"textures/pitch.png",
	new THREE.UVMapping(),
	loadingService.pop
);
var wallTexture = THREE.ImageUtils.loadTexture(
	"textures/mannequin.png",
	new THREE.UVMapping(),
	loadingService.pop
);
loadingService.push(3);
var projector, ray, mouse3D;
var mouseClick = {
    x: 0,
    y: 0,
    is: false,
    setPos: function (e, t) {
        this.x = e;
        this.y = t
    }
};
var mouseDrag = {
    x: 0,
    y: 0,
    is: false,
    setPos: function (e, t) {
        this.x = e;
        this.y = t
    }
};
var failTimer;
document.addEventListener("mousedown", function (e) {
    mouseDown(e.clientX, e.clientY);
    e.preventDefault()
}, false);
document.addEventListener("mousemove", function (e) {
    mouseMove(e.clientX, e.clientY);
    e.preventDefault()
}, false);
document.addEventListener("mouseup", function (e) {
    mouseUp();
    e.preventDefault()
}, false);
document.addEventListener("touchstart", function(e) {
	if(e.targetTouches.length === 1) {
		mouseDown(e.targetTouches[0].clientX, e.targetTouches[0].clientY);
	}
	e.preventDefault();
}, false);
document.addEventListener("touchmove", function(e) {
	if(e.targetTouches.length === 1) {
		mouseMove(e.targetTouches[0].clientX, e.targetTouches[0].clientY);
	}
	e.preventDefault();
}, false);
document.addEventListener("touchend", function(e) {
	mouseUp();
	e.preventDefault();
}, false);
document.addEventListener("touchcancel", function(e) {
	mouseUp();
	e.preventDefault();
}, false);
document.addEventListener("visibilitychange", visibilityChange(), false);
document.addEventListener("webkitvisibilitychange", visibilityChange(), false);
window.addEventListener("resize", onWindowResized, false);
loadingService.registerFinFunc(function() {
	var j = '<p class="popupText">Controls: click on the ball to choose spin, then drag back to choose direction and power.</p>' + '<p class="popupTitle">Click here to play!</p>';
	printDialog(j, play, false);
});
init();

function init() {
    renderer = new THREE.WebGLRenderer({
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    var e = document.getElementById("gameWrap");
    e.appendChild(renderer.domElement);
    camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 1, 1e3);
    renderer.shadowCameraNear = 3;
	renderer.shadowCameraFar = 1000;
	renderer.shadowCameraFov = 60;
	renderer.shadowMapBias = 0.0039;
	renderer.shadowMapDarkness = 0.5;
	renderer.shadowMapWidth = 1024;
	renderer.shadowMapHeight = 1024;
    renderer.shadowMapSoft = true;
    renderer.shadowMapEnabled = true;
    scene = new THREE.Scene;
    var t = new THREE.MeshLambertMaterial({
        color: 16777215
    });
    var n = new THREE.MeshLambertMaterial({
        color: 0
    });
    var r = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0
    });
    var i = new THREE.HemisphereLight(12312063, 11184810, .6);
    i.position.set(0, 500, 0);
    scene.add(i);
    var s = new THREE.DirectionalLight(16772829, .8);
    s.position.set(-10, 30, -20);
    s.target.position.set(0, 0, 30);
    s.castShadow = true;
    s.shadowDarkness = .5;
    s.shadowCameraRight = 5;
    s.shadowCameraLeft = -5;
    s.shadowCameraTop = 5;
    s.shadowCameraBottom = -5;
    scene.add(s);
    var o = new THREE.PlaneGeometry(50, 100, 1, 1);
    var u = new THREE.MeshLambertMaterial({
        map: pitchTexture
    });
    var a = new THREE.Mesh(o, u);
    a.rotation.x = -Math.PI / 2;
    a.recieveShadow = true;
    scene.add(a);
    var f = new THREE.CubeGeometry(.12, 2.56, .12);
    var l = new THREE.Mesh(f, t);
    l.position.set(3.72, 1.28, 48);
    scene.add(l);
    var c = new THREE.Mesh(f, t);
    c.position.set(-3.72, 1.28, 48);
    scene.add(c);
    var h = new THREE.CubeGeometry(7.44, .12, .12);
    var p = new THREE.Mesh(h, t);
    p.position.set(0, 2.5, 48);
    scene.add(p);
    var d = THREE.ImageUtils.loadTexture(
    	"textures/mannequins.png",
    	new THREE.UVMapping(),
    	loadingService.pop
	);
	loadingService.push();
    var v = new THREE.MeshLambertMaterial({
        map: d,
        transparent: true,
        opacity: .5
    });
    var m = [];
    for (var g = 0; g < 4; g++) {
        m.push(r)
    }
    m.push(v);
    m.push(r);
    var o = new THREE.CubeGeometry(2.4, 1.8, .6, 1, 1, 1);
    wall = new THREE.Mesh(o, new THREE.MeshFaceMaterial(m));
    wall.position.set(0, .9, 0);
    scene.add(wall);
    var d = THREE.ImageUtils.loadTexture(
    	"textures/keeper.png",
    	new THREE.UVMapping(),
    	loadingService.pop
	);
	loadingService.push();
    var v = new THREE.MeshLambertMaterial({
        map: d,
        transparent: true
    });
    var m = [];
    for (var g = 0; g < 4; g++) {
        m.push(r)
    }
    m.push(r);
    m.push(v);
    var o = new THREE.CubeGeometry(1, 1.8, .6, 1, 1, 1);
    goalie = new THREE.Mesh(o, new THREE.MeshFaceMaterial(m));
    goalie.position.set(0, .9, 0);
    scene.add(goalie);
    var y = new THREE.IcosahedronGeometry(ballSize, 2);
    var m = [t, n];
    for (var g = 0; g < y.faces.length; g++) {
        if (g % 8 < 4) {
            y.faces[g].materialIndex = 0
        } else {
            y.faces[g].materialIndex = 1
        }
    }
    ball = new THREE.Mesh(y, new THREE.MeshFaceMaterial(m));
    ball.useQuaternion = true;
    ball.castShadow = true;
    scene.add(ball);
    var b = [new THREE.Vector2(.05, 0), new THREE.Vector2(.05, 3), new THREE.Vector2(.2, 3), new THREE.Vector2(0, 4), new THREE.Vector2(-.2, 3), new THREE.Vector2(-.05, 3), new THREE.Vector2(-.05, 0)];
    var w = new THREE.Shape(b);
    var E = {
        bevelEnabled: false,
        amount: .1
    };
    var S = new THREE.ExtrudeGeometry(w, E);
    var x = new THREE.MeshLambertMaterial({
        color: new THREE.Color(16711680),
        visible: false
    });
    arrow = new THREE.Mesh(S, x);
    scene.add(arrow);
    var o = new THREE.PlaneGeometry(ballSize * 2, ballSize * 2);
    intersectionPlane = new THREE.Mesh(o);
    intersectionPlane.visible = false;
    scene.add(intersectionPlane);
    world = new CANNON.World;
    world.broadphase = new CANNON.NaiveBroadphase;
    world.gravity.set(0, -9.8, 0);
    world.solver.iterations = 7;
    world.solver.tolerance = .1;
    var T = new CANNON.Plane;
    var N = new CANNON.Material;
    var C = new CANNON.RigidBody(0, T, N);
    C.position.set(0, 0, 0);
    C.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    world.add(C);
    var k = new CANNON.Compound;
    var L = new CANNON.Material;
    var A = new CANNON.Box(new CANNON.Vec3(.12, 1.28, .12));
    var O = new CANNON.Box(new CANNON.Vec3(3.72, .12, .12));
    k.addChild(A, new CANNON.Vec3(3.72, 0, 0));
    k.addChild(A, new CANNON.Vec3(-3.72, 0, 0));
    k.addChild(O, new CANNON.Vec3(0, 2.5, 0));
    var M = new CANNON.RigidBody(0, k, L);
    M.position.set(0, 0, 46);
    world.add(M);
    var _ = new CANNON.Box(new CANNON.Vec3(1.2, .9, .3));
    var D = new CANNON.Material;
    wallBody = new CANNON.RigidBody(0, _, D);
    wallBody.position.set(0, .9, 0);
    world.add(wallBody);
    var P = new CANNON.Box(new CANNON.Vec3(.4, .9, .3));
    var H = new CANNON.Material;
    goalieBody = new CANNON.RigidBody(0, P, H);
    goalieBody.position.set(0, .9, 0);
    world.add(goalieBody);
    ballBodyMaterial = new CANNON.Material;
    var B = new CANNON.Sphere(ballSize);
    ballBody = new CANNON.RigidBody(.1, B, ballBodyMaterial);
    ballGround = new CANNON.ContactMaterial(N, ballBodyMaterial, 5, .5);
    world.addContactMaterial(ballGround);
    M.addEventListener("collide", function () {
        if (!isMute) crossbarSound.play()
    }, false);
    C.addEventListener("collide", function () {
        if (!isMute) collideSound.play()
    }, false);
    wallBody.addEventListener("collide", function () {
        if (!isMute) collideSound.play()
    }, false);
    goalieBody.addEventListener("collide", function () {
        if (state.phase == "simulate") {
            if (!isMute) collideSound.play();
            stopBall();
            setTimeout(function () {
                newBall(false)
            }, 1e3);
            clearTimeout(failTimer);
            state.phase = "wait"
        }
    }, false);
    projector = new THREE.Projector;
    ray = new THREE.Raycaster;
    mouse3D = new THREE.Vector3;
    document.body.style.cursor = "pointer";
    onWindowResized(null);
    update();
}

function onWindowResized(e) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight)
}

function mouseDown(x, y) {
    if (!mouseClick.is) {
        mouse3D.set(x / window.innerWidth * 2 - 1, -(y / window.innerHeight) * 2 + 1, .5);
        projector.unprojectVector(mouse3D, camera);
        ray.set(camera.position, mouse3D.sub(camera.position).normalize());
        var t = ray.intersectObject(intersectionPlane);
        if (t.length > 0) {
            origin.subVectors(intersectionPlane.position, t[0].point);
            isIntersected = true
        }
        mouseClick.setPos(x, y);
        mouseClick.is = true
    }
}

function mouseMove(x, y) {
    if (state.phase == "drag") {
        mouseDrag.is = true;
        mouseDrag.setPos(x, y)
    }
}

function mouseUp() {
    if (state.phase == "drag") {
        state.phase = "shoot"
    }
    mouseClick.is = false;
    mouseDrag.is = false
}

function visibilityChange() {
    if (document.webkitHidden === false) {
        lastTime = performance.now()
    }
}

function play() {
	// play all the sounds - android workaround
	sounds.forEach(function(sound) {
		sound.volume = 0;
		sound.play();
		sound.pause();
		sound.position = 0;
		sound.volume = 1;
	});

    removeDialog();
    crowdSound.loop = true;
    if (!isMute) crowdSound.play();
    collideSound.muted = true;
    var e = document.getElementById("uiWrap");
    uiWrap.style.display = "block";
    uiUpdate();
    placeBall(0, ballSize, 30);
    world.add(ballBody)
}

function reset() {
    removeDialog();
    wall.position.set(0, .9, 0);
    wallBody.position.set(0, .9, 0);
    goalie.position.set(0, .9, 0);
    goalieBody.position.set(0, .9, 0);
    goalieSpeed = 1;
    state.score = 0;
    state.tries = 3;
    state.shots = 0;
    placeBall(0, ballSize, 30);
    uiUpdate()
}

var curListener;

function printDialog(e, t, n) {
    var r = document.querySelector("#popup");
    r.innerHTML = e;
    curListener = t;
    if (t) {
        r.addEventListener('mousedown', t);
    	r.addEventListener('touchstart', t);
    }
    if (n) {
        setTimeout(removeDialog, n)
    }
    r.style.opacity = 1;
}

function removeDialog() {
    var r = document.querySelector("#popup");
    r.removeEventListener('mousedown', curListener);
    r.removeEventListener('touchstart', curListener);
    r.style.opacity = 0;
}

function uiUpdate() {
    var e = [document.getElementById("try1"), document.getElementById("try2"), document.getElementById("try3")];
    for (var t = 0; t < 3; t++) {
        t < state.tries ? e[t].style.display = "block" : e[t].style.display = "none"
    }
    var n = document.getElementById("score");
    n.innerHTML = "Goals: " + state.score + "<br />Total tries: " + state.shots
}

function playSound(e) {
    e.currentTime = 0;
    e.play()
}

function doMute() {
    isMute = !isMute;
    if (!isMute) crowdSound.play();
    else crowdSound.pause()
}

function newBall(e) {
    if (e) {
        state.score++;
        if (goalieSpeed < 10) {
            goalieSpeed += .1
        }
        if (state.tries < 3) {
            state.tries++
        }
    } else {
        state.tries--
    }
    var t = 30 - Math.log(state.score + 1);
    if (t < 0) {
        t = 0
    }
    if (state.score > 4) {
        xPos = Math.pow(state.score, (Math.random() - .5) * 2);
        if (xPos > 22) {
            xPos = 22
        } else if (xPos < -22) {
            xPos = -22
        }
    } else {
        xPos = 0
    } if (state.tries > 0 || isDebug) {
        placeBall(xPos, ballSize, t)
    } else if (!isDebug) {
        setTimeout(function () {
            printDialog('<p class="popupText">You scored ' + state.score + ' goals.</p><p class="popupTitle">Click here to try again!</p>', reset, false)
        }, 1e3)
    }
    collideSound.muted = true;
    uiUpdate()
}

function stopBall() {
    ballBody.angularVelocity.set(0, 0, 0);
    ballBody.inertia.set(0, 0, 0);
    ballBody.velocity.set(0, 0, 0)
}

function placeBall(e, t, n) {
    stopBall();
    ballBody.position.set(e, ballSize, n);
    var r = new THREE.Vector3(e, ballSize, n);
    var i = new THREE.Vector3(0, 0, 48);
    var s = new THREE.Vector3;
    s.subVectors(i, r);
    s.y = 0;
    s.normalize();
    s.multiplyScalar(3);
    var o = new THREE.Vector3;
    o.subVectors(r, s);
    camera.position.set(o.x, 1, o.z);
    intersectionPlane.position = r;
    intersectionPlane.lookAt(camera.position);
    if (state.score > 1) {
        goalieBody.position.set(0, .9, 47.5);
        goalie.position.set(0, .9, 47.5)
    }
    if (state.score > 9) {
        s.multiplyScalar(3);
        var u = new THREE.Vector3;
        u.addVectors(r, s);
        wall.position.set(u.x, .9, u.z);
        wallBody.position.set(u.x, .9, u.z);
        wall.lookAt(new THREE.Vector3(r.x, .9, r.z));
        wallBody.quaternion.set(wall.quaternion.x, wall.quaternion.y, wall.quaternion.z, wall.quaternion.w)
    }
    var a = new THREE.Vector3(r.x, .5, r.z);
    camera.lookAt(a);
    state.phase = "play"
}

function kickBall(e, t, n) {
    var r = new CANNON.Vec3(e, t, n);
    ballBody.force = r;
    var i = new CANNON.Vec3(-origin.y * 250, origin.x * 250, 0);
    ballBody.angularVelocity = i;
    if (!isMute) kickSound.play();
    collideSound.muted = false;
    state.shots++
}

function goalieUpdate(e) {
    if (state.score < 2) {
        return
    }
    var t;
    if (state.phase == "simulate" && ballBody.velocity.z > 0) {
        var n = (48 - ballBody.position.z) / ballBody.velocity.z;
        var r = ballBody.position.x + ballBody.velocity.x * n;
        t = r - goalieBody.position.x
    } else if (goalieBody.position.x != 0) {
        t = -goalieBody.position.x
    }
    if (t > 0 && goalieBody.position.x < 3.6) {
        if (t > goalieSpeed) {
            goalieBody.position.x += goalieSpeed * e
        } else {
            goalieBody.position.x += t * e
        }
    } else if (t < 0 && goalieBody.position.x > -3.6) {
        if (t < -goalieSpeed) {
            goalieBody.position.x -= goalieSpeed * e
        } else {
            goalieBody.position.x += t * e
        }
    }
    goalie.position.copy(goalieBody.position)
}

function bendBall(e) {
    ballBend = ballBody.velocity;
    ballBend = ballBend.cross(ballBody.angularVelocity);
    ballBend = ballBend.mult(e * .005);
    ballBody.velocity = ballBody.velocity.vsub(ballBend)
}

function update() {
    if (state.phase == "play") {
        if (mouseClick.is && isIntersected && !mouseDrag.is) {
            if (Math.sqrt(origin.x * origin.x + origin.y * origin.y) < ballSize) {
                goalDir.set(-ball.position.x, 0, 48 - ball.position.z);
                goalDir.normalize();
                shotDir.copy(goalDir);
                shotPow = 0;
                state.phase = "drag"
            }
            isIntersected = false
        }
    } else if (state.phase == "drag") {
    	var diffX = (mouseDrag.x - mouseClick.x) / window.innerHeight;
        var diffY = (mouseDrag.y - mouseClick.y) / window.innerHeight;
        shotDir.set(goalDir.x + Math.sin(diffX), 0, goalDir.z + 1 - Math.cos(diffX));
        var t = new THREE.Vector3;
        t.addVectors(ball.position, shotDir);
        arrow.position = t;
        arrow.rotation.set(Math.PI / 2, 0, -Math.atan(shotDir.x / shotDir.z));
        if (diffY > 0) {
        	shotPow = diffY;
        	shotPow = shotPow > 0.25 ? 0.25 : shotPow;
            arrow.scale.y = shotPow;
            arrow.material.visible = true
        } else {
            arrow.material.visible = false
        }
    } else if (state.phase == "shoot") {
        if (shotPow > .01 && shotDir.z > 0) {
            var n = new THREE.Vector3;
            var r = 20 + 60 * shotPow * 4;
            n.copy(shotDir);
            n.multiplyScalar(r * 2);
            kickBall(n.x, r / 2, n.z);
            state.phase = "simulate";
            failTimer = setTimeout(function () {
                newBall(false)
            }, 6e3)
        } else {
            state.phase = "play"
        }
        arrow.material.visible = false
    } else if (state.phase == "simulate") {
        if (ballBody.position.z > 48 && ballBody.position.z < 50) {
            if (ballBody.position.x > -3.72 && ballBody.position.x < 3.72 && ballBody.position.y < 2.56) {
                stopBall();
                if (!isMute) {
                    goalSound.play();
                    playSound(cheerSound)
                }
                printDialog('<p class="popupTitle">Goal!</p>', false, 1e3);
                setTimeout(function () {
                    newBall(true)
                }, 1e3);
                clearTimeout(failTimer);
                state.phase = "wait"
            } else {
                if (ballBody.position.x < -5.2 || ballBody.position.x > 5.2 || ballBody.position.y > 3.2) {
                    if (!isMute) playSound(jeerSound)
                }
                printDialog('<p class="popupTitle">Miss...</p>', false, 1e3);
                setTimeout(function () {
                    newBall(false)
                }, 1e3);
                clearTimeout(failTimer);
                state.phase = "wait"
            }
        }
    }

    render();

    requestAnimationFrame(update);
}

function render() {
    time = performance.now();
    var e = (time - lastTime) * .001;
    if (state.phase == "simulate" || state.phase == "wait") {
        goalieUpdate(e);
        bendBall(e);
        world.step(e)
    }
    lastTime = time;
    ball.position.copy(ballBody.position);
    ball.quaternion.copy(ballBody.quaternion);
    renderer.render(scene, camera)
}
