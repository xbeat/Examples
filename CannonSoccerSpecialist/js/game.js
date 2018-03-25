var camera, scene, renderer;
var state = {
    phase: "loading",
    score: 0
};

var origin = new THREE.Vector3( 0, 15, 0 );
var isIntersected = false;
var shotDir = new THREE.Vector3( 0, 0, 1 );
var goalDir = new THREE.Vector3( 0, 0, 1 );
var shotPow = 0;
var ballSize = .11;
var arrow, ball, goalie, wall;
var world, time, lastTime = performance.now();
var ballBody;
var ballBodyMaterial;
var ballGround;

//var raycaster = new THREE.Raycaster();

var mouseClick = {
    x: 0,
    y: 0,
    is: false,
    setPos: function ( e, t ) {
        this.x = e;
        this.y = t
    }
};

var mouseDrag = {
    x: 0,
    y: 0,
    is: false,
    setPos: function ( e, t ) {
        this.x = e;
        this.y = t
    }
};


document.addEventListener( "mousedown", function( event ) {

	if ( controls.enabled == true ) return;

    event.preventDefault()

	let x = event.clientX; 
	let y = event.clientY;

	//this.controls.enabled = false;
	if ( !mouseClick.is ) {

		// drag
		let a = 2 * x / window.innerWidth - 1;
		let b = 1 - 2 * y / window.innerHeight;

		ray.setFromCamera( new THREE.Vector2( a, b ), camera );

		let intersects = ray.intersectObject( ball ); 

		if ( intersects.length == 0 ) {
			return;
		};

	    origin.subVectors( ball.position, intersects[0].point );
        isIntersected = true;

        mouseClick.setPos( x, y );
        mouseClick.is = true;

	};

});

document.addEventListener( "mousemove", function ( event ) {

    event.preventDefault()

    let x = event.clientX; 
    let y = event.clientY;
    
    if ( state.phase == "drag" ) {
        mouseDrag.is = true;
        mouseDrag.setPos( x, y );
    };

});

document.addEventListener( "mouseup", function ( event ) {

    event.preventDefault()

    if ( state.phase == "drag" ) {
        state.phase = "shoot"
    };

    mouseClick.is = false;
    mouseDrag.is = false;

});

document.addEventListener( "keydown", function( event ) {

    if ( event.shiftKey ){
    	controls.enabled = true;
    };
});

document.addEventListener( "keyup", function( event ) {

	controls.enabled = false;
});

window.addEventListener( "resize", onWindowResized, false );

init();

function init() {

    renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true } );

    renderer.setSize( window.innerWidth, window.innerHeight );

    document.getElementById( "gameWrap" ).appendChild( renderer.domElement );

    camera = new THREE.PerspectiveCamera( 30, window.innerWidth / window.innerHeight, 1, 20000 );

    renderer.shadowCameraNear = 3;
	renderer.shadowCameraFar = 1000;
	renderer.shadowCameraFov = 60;
	renderer.shadowMapBias = 0.0039;
	renderer.shadowMapDarkness = 0.5;
	renderer.shadowMapWidth = 1024;
	renderer.shadowMapHeight = 1024;
    renderer.shadowMapSoft = true;
    renderer.shadowMap.enabled = true;

	let ctx = renderer.context;
	ctx.getShaderInfoLog = function () { return '' };
    
    scene = new THREE.Scene;
    
    var t = new THREE.MeshLambertMaterial( { color: 16777215 } );    
    var n = new THREE.MeshLambertMaterial( { color: 0 } );
    
    var r = new THREE.MeshBasicMaterial( { 
        transparent: true,
        opacity: 0
    } );

    let hLight = new THREE.HemisphereLight( 12312063, 11184810, .6 );
    hLight.position.set( 0, 500, 0 );
    scene.add( hLight );

    var dLight = new THREE.DirectionalLight( 16772829, .8 );
    dLight.position.set( -10, 30, -20 );
    dLight.target.position.set( 0, 0, 30 );
    dLight.castShadow = true;
    dLight.shadow.camera.right = 5;
    dLight.shadow.camera.left = -5;
    dLight.shadow.camera.top = 5;
    dLight.shadow.camera.bottom = -5;
    scene.add( dLight );
    
	//controls
	controls = new THREE.OrbitControls( camera, renderer.domElement );
	controls.rotateSpeed = 0.4;
	controls.zoomSpeed = 0.4;
	controls.panSpeed = 0.4;
	controls.enabled = false;

	var pitchTexture = new THREE.TextureLoader().load(	"textures/pitch.png" );
    var pitch = new THREE.Mesh( new THREE.PlaneGeometry( 50, 100, 1, 1 ), new THREE.MeshLambertMaterial( { map: pitchTexture } ) );

    pitch.rotation.x = -Math.PI / 2;
    pitch.recieveShadow = true;
    scene.add( pitch );
    
    var f = new THREE.CubeGeometry( .12, 2.56, .12 );
    var l = new THREE.Mesh( f, t );
    l.position.set( 3.72, 1.28, 48 );
    scene.add( l );
    
    var c = new THREE.Mesh( f, t );
    c.position.set( -3.72, 1.28, 48 );
    scene.add( c );
    
    var h = new THREE.CubeGeometry( 7.44, .12, .12 );
    var p = new THREE.Mesh( h, t );
    p.position.set( 0, 2.5, 48 );
    scene.add( p );
    
    var y = new THREE.IcosahedronGeometry( ballSize, 2 );
    var m = [ t, n ];
    for ( var g = 0; g < y.faces.length; g++ ) {
        if ( g % 8 < 4 ) {
            y.faces[ g ].materialIndex = 0;
        } else {
            y.faces[ g ].materialIndex = 1;
        };
    };

    ball = new THREE.Mesh( y, m );
    ball.castShadow = true;
    scene.add(ball);

    //arrow
    var b = [ new THREE.Vector2( .05, 0 ), new THREE.Vector2( .05, 3 ), new THREE.Vector2( .2, 3 ), new THREE.Vector2( 0, 4 ), new THREE.Vector2( -.2, 3 ), new THREE.Vector2( -.05, 3 ), new THREE.Vector2( -.05, 0 ) ];
    var w = new THREE.Shape( b );
    var E = {
        bevelEnabled: false,
        amount: .1
    };
    var S = new THREE.ExtrudeGeometry( w, E );
    var x = new THREE.MeshLambertMaterial( { color: "red", visible: false } );

    arrow = new THREE.Mesh( S, x );
    scene.add( arrow );
    
    //init cannon
    world = new CANNON.World;
    world.broadphase = new CANNON.NaiveBroadphase;
    world.gravity.set( 0, -9.8, 0 );
    world.solver.iterations = 7;
    world.solver.tolerance = .1;
    
    // Field
    var T = new CANNON.Plane;
    var N = new CANNON.Material;
   
    let field = new CANNON.Body( { mass:0, shape: T, material: N } );

    field.position.set(0, 0, 0);
    field.quaternion.setFromAxisAngle( new CANNON.Vec3( 1, 0, 0 ), -Math.PI / 2 );
    world.add( field );
     
    // Golie 
    var L = new CANNON.Material;
    var A = new CANNON.Box( new CANNON.Vec3( .12, 1.28, .12 ) );
    var O = new CANNON.Box( new CANNON.Vec3( 3.72, .12, .12 ) );
    
    var M = new CANNON.Body( { mass: 0, material: L } );
    
	M.addShape(A, new CANNON.Vec3( 3.72, 0, 0 ) );
    M.addShape(A, new CANNON.Vec3( -3.72, 0, 0 ) );
    M.addShape(O, new CANNON.Vec3( 0, 2.5, 0 ) );
    
    M.position.set( 0, 0, 46 );
    
    world.add(M);
    
    //Wall
    var W = new CANNON.Box( new CANNON.Vec3( 1.2, .9, .3 ) );
    var D = new CANNON.Material;
    
    wallBody = new CANNON.Body( { mass:0, shape: W, material: D } );

    wallBody.position.set( 0, .9, 0 );
    world.add( wallBody );
    
    //Golie
    var P = new CANNON.Box( new CANNON.Vec3( .4, .9, .3 ) );
    var H = new CANNON.Material;
    
    goalieBody = new CANNON.Body( { mass:0, shape: P, material: H } );
    goalieBody.position.set( 0, .9, 0 );
    world.add( goalieBody );
    
    //ball
    ballBodyMaterial = new CANNON.Material;
    var B = new CANNON.Sphere( ballSize );
    ballBody = new CANNON.Body( { mass: .1, shape: B, material: ballBodyMaterial } );    
    ballGround = new CANNON.ContactMaterial( N, ballBodyMaterial,{ friction: 5, restitution: .5 } );
    
    world.addContactMaterial( ballGround );

    M.addEventListener( "collide", function () {}, false );
    field.addEventListener( "collide", function () {}, false );
        
    ray = new THREE.Raycaster;
    document.body.style.cursor = "pointer";
    update();

    placeBall( 0, ballSize, 30 );
    world.add( ballBody );

	//cannonDebugRenderer = new THREE.CannonDebugRenderer( scene, world );    

};

function onWindowResized( e ) {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight)

};

function reset() {

    removeDialog();
    wall.position.set( 0, .9, 0 );
    wallBody.position.set( 0, .9, 0 );
    goalie.position.set( 0, .9, 0 );
    goalieBody.position.set( 0, .9, 0 );
    state.score = 0;
    placeBall( 0, ballSize, 30 );
};

function newBall( e ) {

    let xPos = Math.pow( state.score, ( Math.random() - .5 ) * 2 );
    if ( xPos > 22 ) {
        xPos = 22
    } else if ( xPos < -22 ) {
        xPos = -22
    };
    placeBall( xPos, ballSize, 28 );
  
};

function stopBall() {

    ballBody.angularVelocity.set( 0, 0, 0 );
    ballBody.inertia.set( 0, 0, 0 );
    ballBody.velocity.set( 0, 0, 0 );
};

function placeBall( e, t, n ) {

    stopBall();
    ballBody.position.set( e, ballSize, n );
    let r = new THREE.Vector3( e, ballSize, n );
    let i = new THREE.Vector3( 0, 0, 48 );
    let s = new THREE.Vector3;
    s.subVectors( i, r );
    s.y = 0;
    s.normalize();
    s.multiplyScalar( 3 );
    var o = new THREE.Vector3;
    o.subVectors(r, s);
    camera.position.set( o.x, 1, o.z );
    var a = new THREE.Vector3( r.x, .5, r.z );
    controls.target.set( r.x, .5, r.z );
    camera.lookAt( a );
    state.phase = "play";
};

function kickBall( e, t, n ) {

    let r = new CANNON.Vec3( e, t, n );
    ballBody.force = r;
    let i = new CANNON.Vec3( -origin.y * 250, origin.x * 250, 0 );
    ballBody.angularVelocity = i;
};

function bendBall( e ) {

    let ballBend = ballBody.velocity;
    ballBend = ballBend.cross( ballBody.angularVelocity );
    ballBend = ballBend.mult( e * .005 );
    ballBody.velocity = ballBody.velocity.vsub( ballBend );
};

function update() {

    if ( state.phase == "play" ) {

        if ( mouseClick.is && isIntersected && !mouseDrag.is ) {
            if ( Math.sqrt( origin.x * origin.x + origin.y * origin.y ) < ballSize ) {
                goalDir.set( -ball.position.x, 0, 48 - ball.position.z );
                goalDir.normalize();
                shotDir.copy( goalDir );
                shotPow = 0;
                state.phase = "drag";
            };
            isIntersected = false;
        };

    } else if ( state.phase == "drag" ) {

    	var diffX = ( mouseDrag.x - mouseClick.x ) / window.innerHeight;
        var diffY = ( mouseDrag.y - mouseClick.y ) / window.innerHeight;
        shotDir.set( goalDir.x + Math.sin( diffX ), 0, goalDir.z + 1 - Math.cos( diffX ) );
        var t = new THREE.Vector3;
        t.addVectors( ball.position, shotDir );
        arrow.position.set( t.x, t.y, t.z );
        arrow.rotation.set( Math.PI / 2, 0, -Math.atan( shotDir.x / shotDir.z ) );

        if ( diffY > 0 ) {
        	shotPow = diffY;
        	shotPow = shotPow > 0.25 ? 0.25 : shotPow;
            arrow.scale.y = shotPow;
            arrow.material.visible = true;
        } else {
            arrow.material.visible = false;
        };

    } else if ( state.phase == "shoot" ) {

        if ( shotPow > .01 && shotDir.z > 0 ) {
            var n = new THREE.Vector3;
            var r = 20 + 60 * shotPow * 4;
            n.copy( shotDir );
            n.multiplyScalar(r * 2);
            kickBall(n.x, r / 2, n.z);
            state.phase = "simulate";
        } else {
            state.phase = "play";
        };

        arrow.material.visible = false

    } else if ( state.phase == "simulate" ) {

        if ( ballBody.position.z > 48 && ballBody.position.z < 50 ) {
            if ( ballBody.position.x > -3.72 && ballBody.position.x < 3.72 && ballBody.position.y < 2.56 ) {
                stopBall();
                setTimeout( function () {
                    newBall( true )
                }, 2000 );
                state.phase = "wait";
            } else {
                setTimeout( function () {
                    newBall( false )
                }, 2000 );
                state.phase = "wait";
            };
        };
    };

    render();

    requestAnimationFrame( update );
};

function render() {

    time = performance.now();
    var e = ( time - lastTime ) * .001;
    if ( state.phase == "simulate" || state.phase == "wait" ) {
        bendBall( e );
        world.step( e )
    };

    lastTime = time;
    ball.position.copy( ballBody.position );
    ball.quaternion.copy( ballBody.quaternion );
    renderer.render( scene, camera )
    //cannonDebugRenderer.update();// Update the debug renderer

};
