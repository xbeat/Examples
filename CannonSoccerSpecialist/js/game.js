
var camera, scene, renderer;
var state = {
    phase: "loading",
    score: 0,
    tries: 3,
    shots: 0
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
var ballBody;
var ballBodyMaterial;
var ballGround;



var pitchTexture = THREE.ImageUtils.loadTexture(
	"textures/pitch.png"

);

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

document.addEventListener( "mousedown", function (e) {
    mouseDown( e.clientX, e.clientY );
    e.preventDefault()
}, false);

document.addEventListener( "mousemove", function (e) {
    mouseMove( e.clientX, e.clientY );
    e.preventDefault()
}, false);

document.addEventListener( "mouseup", function (e) {
    mouseUp();
    e.preventDefault()
}, false);


window.addEventListener("resize", onWindowResized, false);

init();

function init() {
    renderer = new THREE.WebGLRenderer({
        antialias: true, alpha: true
    });

    renderer.setSize( window.innerWidth, window.innerHeight );

    var e = document.getElementById("gameWrap");
    e.appendChild( renderer.domElement );

    camera = new THREE.PerspectiveCamera( 30, window.innerWidth / window.innerHeight, 1, 1e3 );

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
    
    var t = new THREE.MeshLambertMaterial( { color: 16777215 } );
    
    var n = new THREE.MeshLambertMaterial( { color: 0 } );
    
    var r = new THREE.MeshBasicMaterial({ 
        transparent: true,
        opacity: 0
    });

    var i = new THREE.HemisphereLight( 12312063, 11184810, .6 );
    i.position.set( 0, 500, 0 );
    scene.add( i );

    var s = new THREE.DirectionalLight( 16772829, .8 );
    s.position.set( -10, 30, -20 );
    s.target.position.set( 0, 0, 30 );
    s.castShadow = true;
    s.shadowDarkness = .5;
    s.shadowCameraRight = 5;
    s.shadowCameraLeft = -5;
    s.shadowCameraTop = 5;
    s.shadowCameraBottom = -5;
    scene.add(s);
    
    var o = new THREE.PlaneGeometry( 50, 100, 1, 1 );
    var u = new THREE.MeshLambertMaterial( { map: pitchTexture } );
    var a = new THREE.Mesh(o, u);

    a.rotation.x = -Math.PI / 2;
    a.recieveShadow = true;
    scene.add(a);
    
    var f = new THREE.CubeGeometry( .12, 2.56, .12 );
    var l = new THREE.Mesh(f, t);
    l.position.set(3.72, 1.28, 48);
    scene.add(l);
    
    var c = new THREE.Mesh(f, t);
    c.position.set( -3.72, 1.28, 48 );
    scene.add(c);
    
    var h = new THREE.CubeGeometry( 7.44, .12, .12 );
    var p = new THREE.Mesh( h, t );
    p.position.set( 0, 2.5, 48 );
    scene.add( p );
  
    
    var y = new THREE.IcosahedronGeometry( ballSize, 2 );
    var m = [t, n];
    for (var g = 0; g < y.faces.length; g++) {
        if (g % 8 < 4) {
            y.faces[g].materialIndex = 0
        } else {
            y.faces[g].materialIndex = 1
        }
    };

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
    world.gravity.set( 0, -9.8, 0 );
    world.solver.iterations = 7;
    world.solver.tolerance = .1;
    
    var T = new CANNON.Plane;
    var N = new CANNON.Material;
    var C = new CANNON.RigidBody( 0, T, N );
    C.position.set( 0, 0, 0 );
    C.quaternion.setFromAxisAngle(new CANNON.Vec3( 1, 0, 0 ), -Math.PI / 2 );
    world.add(C);
            
    ballBodyMaterial = new CANNON.Material;
    var B = new CANNON.Sphere( ballSize );
    ballBody = new CANNON.RigidBody( .1, B, ballBodyMaterial );
    ballGround = new CANNON.ContactMaterial( N, ballBodyMaterial, 5, .5 );
    world.addContactMaterial( ballGround );

    C.addEventListener("collide", function () {}, false);
        
    projector = new THREE.Projector;
    ray = new THREE.Raycaster;
    mouse3D = new THREE.Vector3;
    document.body.style.cursor = "pointer";
    update();

    placeBall( 0, ballSize, 30 );
    world.add( ballBody )

};

function onWindowResized( e ) {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight)

};

function mouseDown( x, y ) {

    if (!mouseClick.is) {
        mouse3D.set(x / window.innerWidth * 2 - 1, -(y / window.innerHeight) * 2 + 1, .5);
        projector.unprojectVector(mouse3D, camera);
        ray.set(camera.position, mouse3D.sub(camera.position).normalize());
        var t = ray.intersectObject(intersectionPlane);
        if (t.length > 0) {
            origin.subVectors(intersectionPlane.position, t[0].point);
            isIntersected = true
        };
        mouseClick.setPos(x, y);
        mouseClick.is = true
    };
};

function mouseMove(x, y) {
    if ( state.phase == "drag" ) {
        mouseDrag.is = true;
        mouseDrag.setPos(x, y)
    };
};

function mouseUp() {
    if ( state.phase == "drag" ) {
        state.phase = "shoot"
    };
    mouseClick.is = false;
    mouseDrag.is = false
};

function reset() {
    removeDialog();
    wall.position.set( 0, .9, 0 );
    wallBody.position.set( 0, .9, 0 );
    goalie.position.set( 0, .9, 0 );
    goalieBody.position.set( 0, .9, 0 );
    goalieSpeed = 1;
    state.score = 0;
    state.tries = 3;
    state.shots = 0;
    placeBall( 0, ballSize, 30 );
};


function newBall( e ) {
    xPos = Math.pow(state.score, (Math.random() - .5) * 2);
    if (xPos > 22) {
        xPos = 22
    } else if (xPos < -22) {
        xPos = -22
    };
    placeBall(xPos, ballSize, 28)
  
};

function stopBall() {
    ballBody.angularVelocity.set( 0, 0, 0 );
    ballBody.inertia.set( 0, 0, 0 );
    ballBody.velocity.set( 0, 0, 0 );
};

function placeBall( e, t, n ) {
    stopBall();
    ballBody.position.set( e, ballSize, n );
    var r = new THREE.Vector3( e, ballSize, n );
    var i = new THREE.Vector3( 0, 0, 48 );
    var s = new THREE.Vector3;
    s.subVectors( i, r );
    s.y = 0;
    s.normalize();
    s.multiplyScalar( 3 );
    var o = new THREE.Vector3;
    o.subVectors(r, s);
    camera.position.set(o.x, 1, o.z);
    intersectionPlane.position = r;
    intersectionPlane.lookAt( camera.position );

    var a = new THREE.Vector3(r.x, .5, r.z);
    camera.lookAt(a);
    state.phase = "play"
};

function kickBall( e, t, n ) {
    var r = new CANNON.Vec3( e, t, n );
    ballBody.force = r;
    var i = new CANNON.Vec3(-origin.y * 250, origin.x * 250, 0);
    ballBody.angularVelocity = i;
    state.shots++
};

function bendBall(e) {
    ballBend = ballBody.velocity;
    ballBend = ballBend.cross(ballBody.angularVelocity);
    ballBend = ballBend.mult(e * .005);
    ballBody.velocity = ballBody.velocity.vsub(ballBend)
};

function update() {
    if ( state.phase == "play" ) {
        if ( mouseClick.is && isIntersected && !mouseDrag.is ) {
            if (Math.sqrt(origin.x * origin.x + origin.y * origin.y) < ballSize) {
                goalDir.set(-ball.position.x, 0, 48 - ball.position.z);
                goalDir.normalize();
                shotDir.copy(goalDir);
                shotPow = 0;
                state.phase = "drag"
            };
            isIntersected = false
        };

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
        };

    } else if (state.phase == "shoot") {
        if (shotPow > .01 && shotDir.z > 0) {
            var n = new THREE.Vector3;
            var r = 20 + 60 * shotPow * 4;
            n.copy(shotDir);
            n.multiplyScalar(r * 2);
            kickBall(n.x, r / 2, n.z);
            state.phase = "simulate";
        } else {
            state.phase = "play"
        };
        arrow.material.visible = false

    } else if (state.phase == "simulate") {
        if (ballBody.position.z > 48 && ballBody.position.z < 50) {
            if (ballBody.position.x > -3.72 && ballBody.position.x < 3.72 && ballBody.position.y < 2.56) {
                stopBall();
                setTimeout(function () {
                    newBall(true)
                }, 2000);
                state.phase = "wait"
            } else {
                setTimeout(function () {
                    newBall(false)
                }, 2000);
                state.phase = "wait"
            };
        };
    };

    render();

    requestAnimationFrame( update );
};

function render() {
    time = performance.now();
    var e = (time - lastTime) * .001;
    if ( state.phase == "simulate" || state.phase == "wait" ) {
        bendBall(e);
        world.step(e)
    };

    lastTime = time;
    ball.position.copy( ballBody.position );
    ball.quaternion.copy( ballBody.quaternion );
    renderer.render( scene, camera )

};
