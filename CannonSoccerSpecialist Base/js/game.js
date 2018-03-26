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
  
		//controls
		this.controls = new THREE.OrbitControls( this.camera, this.renderer.domElement );
		this.controls.rotateSpeed = 0.4;
		this.controls.zoomSpeed = 0.4;
		this.controls.panSpeed = 0.4;
		this.controls.enabled = false;
	    
		// Dat Gui 
		this.shotControl = {
		    forceX: 0,
		    forceY: 45,
		    forceZ: 162,
		    originX: 0.02570099936076236,
		    originY: -0.050141484066893546,
		    shoot: this.kickBallParam.bind( this )
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

	    //arrow
	    let arrowGeometry = new THREE.Shape( [ new THREE.Vector2( .05, 0 ), new THREE.Vector2( .05, 3 ), new THREE.Vector2( .2, 3 ), new THREE.Vector2( 0, 4 ), new THREE.Vector2( -.2, 3 ), new THREE.Vector2( -.05, 3 ), new THREE.Vector2( -.05, 0 ) ] );
	  
	    let arrowMesh = new THREE.ExtrudeGeometry( arrowGeometry, {
	        bevelEnabled: false,
	        amount: .1
	    } );
	   
	    this.arrow = new THREE.Mesh( arrowMesh, new THREE.MeshLambertMaterial( { color: "red", visible: false } ) );
	    this.scene.add( this.arrow );
	    
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
	    this.placeBall( 0, this.ballSize, 30 );

		this.event();


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

			scope.update();

		});

	};

	newBall() {

		let limit = 22;
	    let xPos = Math.pow( this.state.score, ( Math.random() - .5 ) * 2 );
	    if ( xPos > limit ) {
	        xPos = limit
	    } else if ( xPos < -limit ) {
	        xPos = -limit
	    };

	    this.placeBall( xPos, this.ballSize, 28 );
	  
	};

	stopBall() {

	    this.ballBody.angularVelocity.set( 0, 0, 0 );
	    this.ballBody.inertia.set( 0, 0, 0 );
	    this.ballBody.velocity.set( 0, 0, 0 );
	};

	placeBall( x, y, z ) {

	    this.stopBall();
	    this.ballBody.position.set( x, this.ballSize, z );

	    this.camera.position.set ( 10, 10, 10 );
	    this.controls.target.set( 0, .5, 48 );
	    this.camera.lookAt( 0, .5, 48 );
	    
	    let newBallBodyPosition = new THREE.Vector3( x, this.ballSize, z );
	    let offsetCamera = new THREE.Vector3;
	    offsetCamera.subVectors( new THREE.Vector3( 0, 0, 48 ), newBallBodyPosition );
	    offsetCamera.y = 0;
	    offsetCamera.normalize();
	    offsetCamera.multiplyScalar( 3 );
	    let newCameraPosition = new THREE.Vector3;
	    newCameraPosition.subVectors( newBallBodyPosition, offsetCamera );
	    this.camera.position.set( newCameraPosition.x, 1, newCameraPosition.z );
	    this.controls.target.set( newBallBodyPosition.x, .5, newBallBodyPosition.z );
	    this.camera.lookAt( new THREE.Vector3( newBallBodyPosition.x, .5, newBallBodyPosition.z ) );
	    this.state.phase = "play";
	    
	};

	kickBall( x, y, z ) {

	    this.ballBody.force = new CANNON.Vec3( x, y, z );
	    this.ballBody.angularVelocity = new CANNON.Vec3( -this.origin.y * 250, this.origin.x * 250, 0 );
	};

	resetBall(){
		this.lastTime = performance.now();
		this.state.phase == "reset"
		this.stopBall();
	    this.placeBall( 0, this.ballSize, 30 );

	};

	kickBallParam() {

	    this.state.phase = "simulate";
		this.stopBall();

	    let x = this.shotControl.forceX;
	    let y = this.shotControl.forceY;
	    let z = this.shotControl.forceZ;
	    let originX = this.shotControl.originX;
	    let originY = this.shotControl.originY;

	    this.ballBody.force = new CANNON.Vec3( x, y, z );
	    this.ballBody.angularVelocity = new CANNON.Vec3( -originY * 250, originX * 250, 0 );

	};

	update() {

		const update = this.update.bind( this ); 
		requestAnimationFrame( update );

		// pseudo finite state machine
		switch( true ) {

		    case ( this.state.phase == "play" ):

		        if ( this.mouseClick.is && this.isIntersected && !this.mouseDrag.is ) {
		            if ( Math.sqrt( this.origin.x * this.origin.x + this.origin.y * this.origin.y ) < this.ballSize ) {
		                this.goalDir.set( -this.ball.position.x, 0, 48 - this.ball.position.z );
		                this.goalDir.normalize();
		                this.shotDir.copy( this.goalDir );
		                this.shotPow = 0;
		                this.state.phase = "drag";
		            };
		            this.isIntersected = false;
		        };
		        break;

		    case ( this.state.phase == "drag" ):

		    	let diffX = ( this.mouseDrag.x - this.mouseClick.x ) / window.innerHeight;
		        let diffY = ( this.mouseDrag.y - this.mouseClick.y ) / window.innerHeight;
		        this.shotDir.set( this.goalDir.x + Math.sin( diffX ), 0, this.goalDir.z + 1 - Math.cos( diffX ) );
		       	
		       	let arrowPosition = new THREE.Vector3;
		        arrowPosition.addVectors( this.ball.position, this.shotDir );
		        this.arrow.position.set( arrowPosition.x, arrowPosition.y, arrowPosition.z );
		        this.arrow.rotation.set( Math.PI / 2, 0, -Math.atan( this.shotDir.x / this.shotDir.z ) );

		        if ( diffY > 0 ) {
		        	this.shotPow = diffY;
		        	this.shotPow = this.shotPow > 0.25 ? 0.25 : this.shotPow;
		            this.arrow.scale.y = this.shotPow;
		            this.arrow.material.visible = true;
		        } else {
		            this.arrow.material.visible = false;
		        };
		        break;

		    case ( this.state.phase == "shoot" ):

		        if ( this.shotPow > .01 && this.shotDir.z > 0 ) {
		            let newBallPos = new THREE.Vector3;
		            let newBallForce = 20 + 60 * this.shotPow * 4;
		            newBallPos.copy( this.shotDir );
		            newBallPos.multiplyScalar( newBallForce * 2 );
		            this.kickBall( newBallPos.x, newBallForce / 2, newBallPos.z );
		            this.state.phase = "simulate";
		        } else {
		            this.state.phase = "play";
		        };

		        this.arrow.material.visible = false;
		        break;

		    case ( this.state.phase == "simulate" ):

		        if ( this.ballBody.position.z > 48 && this.ballBody.position.z < 50 ) {
		            if ( this.ballBody.position.x > -3.72 && this.ballBody.position.x < 3.72 && this.ballBody.position.y < 2.56 ) {
		                this.stopBall();
		                setTimeout( function () {
		                    this.newBall();
		                }.bind( this ), 2000 );
		                this.state.phase = "wait";
		            } else {
		                setTimeout( function () {
		                    this.newBall();
		                }.bind( this ), 2000 );
		                this.state.phase = "wait";
		            };
		        };
		        break;

		};

	    this.render();

	};

	render() {

	    let time = performance.now();
	    let elapsed = ( time - this.lastTime ) * .001;

	    if ( this.state.phase == "simulate" || this.state.phase == "wait" ) {

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

	event(){

		document.addEventListener( "mousedown", function( event ) {

			if ( this.controls.enabled == true ) return;

		    event.preventDefault()

			let x = event.clientX; 
			let y = event.clientY;

			if ( !this.mouseClick.is ) {

				// drag
				let a = 2 * x / window.innerWidth - 1;
				let b = 1 - 2 * y / window.innerHeight;

				this.ray.setFromCamera( new THREE.Vector2( a, b ), this.camera );

				let intersects = this.ray.intersectObject( this.ball ); 

				if ( intersects.length == 0 ) {
					return;
				};

			    this.origin.subVectors( this.ball.position, intersects[0].point );
		        this.isIntersected = true;

		        this.mouseClick.setPos( x, y );
		        this.mouseClick.is = true;

			};

		}.bind( this ) );

		document.addEventListener( "mousemove", function ( event ) {

		    event.preventDefault()

		    let x = event.clientX; 
		    let y = event.clientY;
		    
		    if ( this.state.phase == "drag" ) {
		        this.mouseDrag.is = true;
		        this.mouseDrag.setPos( x, y );
		    };

		}.bind( this ) );

		document.addEventListener( "mouseup", function ( event ) {
		    event.preventDefault()

		    if ( this.state.phase == "drag" ) {
		        this.state.phase = "shoot"
		    };

		    this.mouseClick.is = false;
		    this.mouseDrag.is = false;

		}.bind( this ) );

		document.addEventListener( "keydown", function( event ) {

		    if ( event.shiftKey ){
		    	this.controls.enabled = true;
		    };

		}.bind( this ) );

		document.addEventListener( "keyup", function( event ) {

			this.controls.enabled = false;

		}.bind( this ));

		window.addEventListener( "resize", function( event ){

			this.camera.aspect = window.innerWidth / window.innerHeight;
			this.camera.updateProjectionMatrix();
			this.renderer.setSize(window.innerWidth, window.innerHeight);

		}.bind( this ), false );

		document.body.style.cursor = "pointer";
	};	

};

let kickBall = new KickBall();

document.getElementById( "buttonShoot" ).addEventListener( "click", function() {
	kickBall.kickBallParam();
});

document.getElementById( "buttonReset" ).addEventListener( "click", function() {
	kickBall.resetBall();
});

