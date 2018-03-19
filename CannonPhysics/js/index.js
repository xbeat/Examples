class Physics3D{

	constructor(){

		this.meshes = new Array(),
		this.bodies = new Array();

		this.aspect = window.innerWidth / window.innerHeight;
		this.cameraRadius = 60;

		this.camera = new THREE.PerspectiveCamera( 45, this.aspect, 1, 20000 );
		this.camera.position.set( 0.0, this.cameraRadius * 6, this.cameraRadius * 6.5 );

		this.scene = new THREE.Scene();

		this.renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true } );
		this.renderer.shadowMap.enabled = true;
		this.renderer.setSize( window.innerWidth, window.innerHeight );
		document.body.appendChild( this.renderer.domElement );

		this.controls = new THREE.OrbitControls( this.camera, this.renderer.domElement );
		this.controls.target.set( 0, 20, 0 );

		let ctx = this.renderer.context;
		ctx.getShaderInfoLog = function () { return '' };

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

		// Setup Cannon world
		this.world = new CANNON.World();
		this.world.quatNormalizeSkip = 0;
		this.world.quatNormalizeFast = false;

		this.world.gravity.set( 0, -30, 0 );
		this.world.broadphase = new CANNON.NaiveBroadphase();

		this.mass = 5;
		this.radius = 1.3;
	
		// events
		window.addEventListener( 'resize', function() {
			this.camera.aspect = window.innerWidth / window.innerHeight;
			this.camera.updateProjectionMatrix();
			this.renderer.setSize( window.innerWidth, window.innerHeight );
		}.bind( this ), false );

		window.addEventListener( 'mousemove', this.rayTest.bind( this ), false );

		this.createPitch();

	};


	createPitch(){

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

			let content = new THREE.Object3D();
			content.add( pitch );
			scope.scene.add( content ); 

		});

		this.createPlane();
		this.createWall();
		this.createBall();
		this.createPaddle();
		this.createDummyObjects();

		this.render();

	};

	createPlane(){

		let groundShape = new CANNON.Plane();
		this.groundMaterial = new CANNON.Material();
		let groundBody = new CANNON.Body( { mass: 0, material: this.groundMaterial } );
		groundBody.addShape( groundShape );

		groundBody.quaternion.setFromAxisAngle( new CANNON.Vec3( 1, 0, 0 ), -Math.PI / 2 );
		this.world.add( groundBody );

	};

	createBall(){

		let w = 50;
		let ballSize = 15;

		let buffgeoSphere = new THREE.BufferGeometry();
		buffgeoSphere.fromGeometry( new THREE.SphereGeometry( ballSize, 20, 10 ) );

		let textureBall = new THREE.TextureLoader().load('images/ball.png');                    
		let materialBall = new THREE.MeshBasicMaterial( { color: 0xffffff, map: textureBall } );

		let ball3D = new THREE.Mesh( buffgeoSphere, materialBall );

		//ball3DBody.angularVelocity.set(0, 0, 0);
		//ball3DBody.inertia.set( 1, 1, 1 );
		//ball3DBody.velocity.set(0, 0, 0)

		let ball3DBodyMaterial = new CANNON.Material();
		this.ball3DBody = new CANNON.Body( { mass: .1, material: ball3DBodyMaterial } );
		this.ball3DBody.addShape( new CANNON.Sphere( ballSize ) );
		this.ball3DBody.position.set( 1000, 24, 1000 );

		let ball3DGround = new CANNON.ContactMaterial( this.groundMaterial, ball3DBodyMaterial, { friction: 5, restitution: .5 } );

		this.ball3DBody.linearDamping = 0.01;

		this.world.addContactMaterial( ball3DGround );

		this.scene.add( ball3D );
		this.world.add( this.ball3DBody );
		this.meshes.push( ball3D );
		this.bodies.push( this.ball3DBody );

	};

	createWall(){

		let walls = new Array();
		let wallsShape = new Array();
		let wallsBody = new Array();

		let matWall = new THREE.MeshBasicMaterial( { color: 0x004400 } );

		let wallLeft = { x: 0, y: 15, z: -1950, w: 6000, h: 150, d: 10 };
		let wallRight = { x: 0, y: 15, z: 1950, w: 6000, h: 150, d: 10 };
		let wallTop = { x: -3000, y: 15, z: 0, w: 10, h: 150, d: 3900 };
		let wallBottom = { x: 3000, y: 15, z: 0, w: 10, h: 150, d: 3900 };

		//---------------------------
		walls.push( new THREE.Mesh( new THREE.BoxGeometry( wallLeft.w, wallLeft.h, wallLeft.d ), matWall ) );
		wallsShape[0] = new CANNON.Box( new CANNON.Vec3( wallLeft.w, wallLeft.h, wallLeft.d ) );
		wallsBody.push( new CANNON.Body( { mass: 0 } ) );

		wallsBody[0].addShape( wallsShape[0] );
		wallsBody[0].position.set( wallLeft.x, wallLeft.y, wallLeft.z );

		this.scene.add( walls[0] );
		this.world.add( wallsBody[0] );
		this.meshes.push( walls[0] );
		this.bodies.push( wallsBody[0] );

		//---------------------------
		walls.push( new THREE.Mesh( new THREE.BoxGeometry( wallRight.w, wallRight.h, wallRight.d ), matWall ) );
		wallsShape[1] = new CANNON.Box( new CANNON.Vec3( wallRight.w, wallRight.h, wallRight.d ) );
		wallsBody.push( new CANNON.Body( { mass: 0 } ) );

		wallsBody[1].addShape( wallsShape[1] );
		wallsBody[1].position.set( wallRight.x, wallRight.y, wallRight.z );

		this.scene.add( walls[1] );
		this.world.add( wallsBody[1] );
		this.meshes.push( walls[1] );
		this.bodies.push( wallsBody[1] );

		//---------------------------
		walls.push( new THREE.Mesh( new THREE.BoxGeometry( wallTop.w, wallTop.h, wallTop.d ), matWall ) );
		wallsShape[2] = new CANNON.Box( new CANNON.Vec3( wallTop.w, wallTop.h, wallTop.d ) );
		wallsBody.push( new CANNON.Body( { mass: 0 } ) );

		wallsBody[2].addShape( wallsShape[2] );
		wallsBody[2].position.set( wallTop.x, wallTop.y, wallTop.z );

		this.scene.add( walls[2] );
		this.world.add( wallsBody[2] );
		this.meshes.push( walls[2] );
		this.bodies.push( wallsBody[2] );

		//---------------------------
		walls.push( new THREE.Mesh( new THREE.BoxGeometry( wallBottom.w, wallBottom.h, wallBottom.d ), matWall ) );
		wallsShape[3] = new CANNON.Box( new CANNON.Vec3( wallTop.w, wallTop.h, wallTop.d ) );
		wallsBody.push( new CANNON.Body( { mass: 0 } ) );

		wallsBody[3].addShape( wallsShape[3] );
		wallsBody[3].position.set( wallBottom.x, wallBottom.y, wallBottom.z );

		this.scene.add( walls[3] );
		this.world.add( wallsBody[3] );
		this.meshes.push( walls[3] );
		this.bodies.push( wallsBody[3] );
	
	};

	createPaddle(){

		let buffgeoBox = new THREE.BufferGeometry();
		buffgeoBox.fromGeometry( new THREE.BoxGeometry( 140, 40, 140 ) );
		this.vPaddle = new THREE.Mesh( buffgeoBox, new THREE.MeshBasicMaterial( { color: 0x58AA80 } ) );
		this.vPaddle.castShadow = true;

		this.paddleBody = new CANNON.Body( { mass: 0 } );
		this.paddleBody.addShape( new CANNON.Box( new CANNON.Vec3( 70, 30, 70 ) ) );
		this.paddleBody.position.set( 800, 24, -800 );

		this.scene.add( this.vPaddle );
		this.world.add( this.paddleBody );

		this.meshes.push( this.vPaddle );
		this.bodies.push( this.paddleBody );

	};

	createDummyObjects(){

		var maxObjects = 5;
		var ballSize = 5;
	
		// sphere
		let sphereGeo = new THREE.SphereGeometry( 10, 32, 32 );
		let sphereMaterial = new THREE.MeshPhongMaterial( { color: 0xdd88aa } ); 

		for ( let i = 0; i < maxObjects; i++ ) {    

		  let sphereMesh = new THREE.Mesh( sphereGeo, sphereMaterial );
		  sphereMesh.castShadow = true;

		  let sphereBody = new CANNON.Body( { mass: this.mass } );
		  sphereBody.addShape( new CANNON.Sphere( 5 ) );
		  sphereBody.position.set( i-15*10, 24, i-12*15 );

		  this.scene.add( sphereMesh );
		  this.world.add( sphereBody );

		  this.meshes.push( sphereMesh );
		  this.bodies.push( sphereBody );

		};

		// cubes
		var cubeGeo = new THREE.BoxGeometry( 30, 30, 30, 100, 100 );
		var cubeMaterial = new THREE.MeshPhongMaterial( { color: 0xdd88aa } );

		for ( let i = 0; i < maxObjects; i++ ) {

		  let cubeMesh = new THREE.Mesh( cubeGeo, cubeMaterial );
		  cubeMesh.castShadow = true;

		  let boxBody = new CANNON.Body( { mass: this.mass } );
		  boxBody.addShape( new CANNON.Box( new CANNON.Vec3( 15, 15, 15 ) ) );
		  boxBody.position.set( i*40, 24, i*40 );

		  this.scene.add( cubeMesh );
		  this.world.add( boxBody );

		  this.meshes.push( cubeMesh );
		  this.bodies.push( boxBody );

		};

	};

	kickBall() {

		let shotPow = 0.15;
		let t = 20 + 60 * shotPow * 4;

		let g = {
			x: 17.83852412501812,
			y: 0,
			z: 160.99752499712105
		};

		//kickBall ( g.x, r / 2, g.z );

		let origin = new THREE.Vector3( 0, 15, 0 );
		let r = new CANNON.Vec3( g.x, t, g.z );
		this.ball3DBody.force = r;
		let i = new CANNON.Vec3( -origin.y * 250, origin.x * 250, 0 );
		this.ball3DBody.angularVelocity = i;

	};

	bendBall( e ) {
	    let ballBend = this.ball3DBody.velocity;
    	ballBend = ballBend.cross( this.ball3DBody.angularVelocity );
    	ballBend = ballBend.mult( e * .005 );
    	this.ball3DBody.velocity = this.ball3DBody.velocity.vsub( ballBend )
	};

	render() {
		const render = this.render.bind( this ); 
		requestAnimationFrame( render );

		//var e = ( time - lastTime ) * .001;
		//this.bendBall( e );

		// Update Physics
		this.world.step( 1 / 120 );

		for ( let i = 0; i !== this.meshes.length; i++ ) {
			this.meshes[ i ].position.copy( this.bodies[ i ].position );
			this.meshes[ i ].quaternion.copy( this.bodies[ i ].quaternion );
		};

		this.renderer.render( this.scene, this.camera );

	};


	//----------------------------------
	//  RAY TEST
	//----------------------------------
	rayTest( event ) {

		let rayCaster = new THREE.Raycaster();
		let mouse = new THREE.Vector2();

		mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
		mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

		rayCaster.setFromCamera( mouse, this.camera );
		let intersects = rayCaster.intersectObjects( this.scene.children, true );

		if ( intersects.length ) {
			this.paddleBody.position.set( intersects[ 0 ].point.x, 20,  intersects[ 0 ].point.z );
		};

	};

};

let physics3D = new Physics3D();


