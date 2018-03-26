'use strict';

class KickBall{

	constructor() {

		this.state = {
		    phase: "loading",
		    score: 0
		};

		this.origin = new THREE.Vector3( 0, 15, 0 );
		this.isIntersected = false;
		this.shotDir = new THREE.Vector3( 0, 0, 1 );
		this.goalDir = new THREE.Vector3( 0, 0, 1 );
		this.shotPow = 0;
		this.ballSize = .11;
		this.lastTime = performance.now();

		this.mouseClick = {
		    x: 0,
		    y: 0,
		    is: false,
		    setPos: function ( e, t ) {
		        this.x = e;
		        this.y = t
		    }
		};

		this.mouseDrag = {
		    x: 0,
		    y: 0,
		    is: false,
		    setPos: function ( e, t ) {
		        this.x = e;
		        this.y = t
		    }
		};

	    this.renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true } );
	    this.renderer.setSize( window.innerWidth, window.innerHeight );

	    document.getElementById( "gameWrap" ).appendChild( this.renderer.domElement );

	    this.camera = new THREE.PerspectiveCamera( 30, window.innerWidth / window.innerHeight, 1, 20000 );

		//controls
		this.controls = new THREE.OrbitControls( this.camera, this.renderer.domElement );
		this.controls.rotateSpeed = 0.4;
		this.controls.zoomSpeed = 0.4;
		this.controls.panSpeed = 0.4;
		    
	    this.camera.position.set ( 10, 10, 10 );
	    this.controls.target.set( 0, .5, 48 );
	    this.camera.lookAt( 0, .5, 48 );	    

	   	this.ray = new THREE.Raycaster;

		let ctx = this.renderer.context;
		ctx.getShaderInfoLog = function () { return '' };
	    
	    this.scene = new THREE.Scene;
  	    
		//Lights
		this.scene.add( new THREE.AmbientLight( 0xffffff ) );

		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap

		this.lightOffset = new THREE.Vector3( 0, 1000, 1000.0 ); 
		this.light = new THREE.DirectionalLight( 0x888888, 1 );
		this.light.position.copy( this.lightOffset );
		this.light.castShadow = true;
		this.light.shadow.mapSize.width = 2048;
		this.light.shadow.mapSize.height = 2048;
		this.light.shadow.camera.near = 10;
		this.light.shadow.camera.far = 10000;
		this.light.shadow.bias = 0.00001;
		this.light.shadow.camera.right = 3200;
		this.light.shadow.camera.left = -3400;
		this.light.shadow.camera.top = 1500;
		this.light.shadow.camera.bottom = -2500;
		this.scene.add( this.light );
  
		// Dat Gui 
		this.shotControl = {
		    forceX: 0,
		    forceY: 45,
		    forceZ: 162,
		    originX: 0.02570099936076236,
		    originY: -0.050141484066893546,
		    shoot: this.kickBall.bind( this )
		};

		let gui = new dat.GUI( { autoPlace: false } );
		document.getElementById( "container" ).appendChild( gui.domElement );
		gui.add( this.shotControl, 'forceX', -120, 42 );
		gui.add( this.shotControl, 'forceY', 30, 60 );
		gui.add( this.shotControl, 'forceZ', 160, 163 );
		gui.add( this.shotControl, 'originX', -0.15, 0.15 );
		gui.add( this.shotControl, 'originY', -0.15, 0.15 );
		gui.add( this.shotControl, 'shoot' );

	    //objects
	    let materialWhite = new THREE.MeshLambertMaterial( { color: 16777215 } );    
	    let materialBlack = new THREE.MeshLambertMaterial( { color: 0 } );
	    
	    let postShape = new THREE.CubeGeometry( .12, 2.56, .12 );
	    let postLeft = new THREE.Mesh( postShape, materialWhite );
	    postLeft.position.set( 3.72, 1.28, 48 );
	    this.scene.add( postLeft );
	    
	    let postRight = new THREE.Mesh( postShape, materialWhite );
	    postRight.position.set( -3.72, 1.28, 48 );
	    this.scene.add( postRight );
	    
	    let crossbarShape = new THREE.CubeGeometry( 7.44, .12, .12 );
	    let crossbar = new THREE.Mesh( crossbarShape, materialWhite );
	    crossbar.position.set( 0, 2.5, 48 );
	    this.scene.add( crossbar );
	    
     	let buffgeoSphere = new THREE.BufferGeometry();
        buffgeoSphere.fromGeometry( new THREE.SphereGeometry( this.ballSize, 20, 10 ) );
	    let ballTexture = new THREE.TextureLoader().load( 'models/ball/ball.png' );			        
        var ballMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xffffff, 
            map: ballTexture
        });
        
        this.ball = new THREE.Mesh( buffgeoSphere, ballMaterial );
        this.ball.castShadow = true;
        this.ball.name = 'ball';

	    this.scene.add( this.ball );
	    
	    //init cannon
	    this.world = new CANNON.World;
	    this.world.broadphase = new CANNON.NaiveBroadphase;
	    this.world.gravity.set( 0, -9.8, 0 );
	    this.world.solver.iterations = 7;
	    this.world.solver.tolerance = .1;
		this.cannonDebugRenderer = new THREE.CannonDebugRenderer( this.scene, this.world );  
	    
	    // Field
	    let fieldShape = new CANNON.Plane;
	    let fieldMaterial = new CANNON.Material;   
	    let field = new CANNON.Body( { mass: 0, shape: fieldShape, material: fieldMaterial } );
	    field.position.set( 0, 0, 0 );
	    field.quaternion.setFromAxisAngle( new CANNON.Vec3( 1, 0, 0 ), -Math.PI / 2 );
	    this.world.add( field );
	     
	    // Golie 
	    let goalieMaterial = new CANNON.Material;
	    let goalieShapeVert = new CANNON.Box( new CANNON.Vec3( .12, 1.28, .12 ) );
	    let goalieShapeHoriz = new CANNON.Box( new CANNON.Vec3( 3.72, .12, .12 ) );
	    let golieBody = new CANNON.Body( { mass: 0, material: goalieMaterial } );

		golieBody.addShape( goalieShapeVert, new CANNON.Vec3( 3.72, 0, 0 ) );
	    golieBody.addShape( goalieShapeVert, new CANNON.Vec3( -3.72, 0, 0 ) );
	    golieBody.addShape( goalieShapeHoriz, new CANNON.Vec3( 0, 2.5, 0 ) );
	    
	    golieBody.position.set( 0, 0, 46 );
	    this.world.add( golieBody );
	    
	    //ball
	    let ballBodyMaterial = new CANNON.Material;
	    let ballBodyShape = new CANNON.Sphere( this.ballSize );
	    this.ballBody = new CANNON.Body( { mass: .1, shape: ballBodyShape, material: ballBodyMaterial } );    
	    let ballGround = new CANNON.ContactMaterial( fieldMaterial, ballBodyMaterial,{ friction: 5, restitution: .5 } );
	    
	    this.world.addContactMaterial( ballGround );

	    golieBody.addEventListener( "collide", function () {}, false );
	    field.addEventListener( "collide", function () {}, false );
	        
	    this.world.add( this.ballBody );

	    this.resetBall();

		window.addEventListener( "resize", function( event ){

			this.camera.aspect = window.innerWidth / window.innerHeight;
			this.camera.updateProjectionMatrix();
			this.renderer.setSize(window.innerWidth, window.innerHeight);

		}.bind( this ), false );

		document.body.style.cursor = "pointer";


		let scope = this;
		new THREE.ObjectLoader().load( "models/pitch/stadium.json", function( pitch ) {
			
			// Pitch Base look in the plus          
			//materials[0].side = THREE.DoubleSide;                 
			//let ground =  new THREE.Mesh( geometry, materials[0] );
			//ground.scale.set( 20, 20, 20 );
			//ground.receiveShadow = true;
			//scope.scene.add( ground );

			pitch.position.set( -50, -30, -100 );
			pitch.scale.set( 800, 800, 800 );
			pitch.receiveShadow = true;

			let content = new THREE.Object3D();
			content.add( pitch );
			scope.scene.add( content ); 

			scope.render();

		});

	};

	resetBall(){

 		this.state.phase = "wait";

		this.ballBody.quaternion.set( 1, 0, 0, 0 );
		this.ballBody.angularVelocity.set( 0, 0, 0 );
	    this.ballBody.inertia.set( 0, 0, 0 );
	    this.ballBody.velocity.set( 0, 0, 0 );
	    this.ballBody.position.set( 0, this.ballSize, 30 );

	};

	kickBall() {

	    this.state.phase = "simulate";

	    let x = this.shotControl.forceX;
	    let y = this.shotControl.forceY;
	    let z = this.shotControl.forceZ;
	    let originX = this.shotControl.originX;
	    let originY = this.shotControl.originY;

	    this.ballBody.force = new CANNON.Vec3( x, y, z );
	    this.ballBody.angularVelocity = new CANNON.Vec3( -originY * 250, originX * 250, 0 );

	};

	render() {

		const render = this.render.bind( this ); 
		requestAnimationFrame( render );

	    let time = performance.now();
	    let elapsed = ( time - this.lastTime ) * .001;

	    if ( this.state.phase == "simulate" ) {

	    	//bend ball
		    let ballBend = this.ballBody.velocity;
		    ballBend = ballBend.cross( this.ballBody.angularVelocity );
	    	ballBend = ballBend.mult( elapsed * .005 );
	    	this.ballBody.velocity = this.ballBody.velocity.vsub( ballBend );
	
	        this.world.step( elapsed );
	    };

	    this.lastTime = time;
	    
	    this.ball.position.copy( this.ballBody.position );
	    this.ball.quaternion.copy( this.ballBody.quaternion );
	    this.renderer.render( this.scene, this.camera )
	    //this.cannonDebugRenderer.update();// Update the debug renderer

	};

};

let kickBall = new KickBall();

document.getElementById( "buttonShoot" ).addEventListener( "click", function() {
	kickBall.kickBall();
});

document.getElementById( "buttonReset" ).addEventListener( "click", function() {
	kickBall.resetBall();
});

