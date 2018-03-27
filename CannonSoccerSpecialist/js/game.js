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
		this.ballSize = 5;
		this.lastTime = performance.now();

        this.cylinders = new Array();
        this.cylinderMeshes = new Array();

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

	    this.container = document.getElementById( "gameWrap" );
	    this.container.appendChild( this.renderer.domElement );

	    this.camera = new THREE.PerspectiveCamera( 30, window.innerWidth / window.innerHeight, 1, 20000 );

		//controls
		this.controls = new THREE.OrbitControls( this.camera, this.renderer.domElement );
		this.controls.rotateSpeed = 0.4;
		this.controls.zoomSpeed = 0.4;
		this.controls.panSpeed = 0.4;
		    

		let aspect = window.innerWidth / window.innerHeight;
		let radius = 60;

		this.camera = new THREE.PerspectiveCamera( 45, aspect, 1, 20000 );
		this.camera.position.set( 0.0, radius * 6, radius * 6.5 );

		this.controls = new THREE.OrbitControls( this.camera, this.renderer.domElement );
		this.controls.target.set( 0, radius, 0 );
		this.controls.enabled = true;

	   	this.raycaster = new THREE.Raycaster;

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
		    forceX: 0, // left right
		    forceY: 900, // up down
		    forceZ: -900, // forward backward
		    originX: -1.22570099936076236, //spin x
		    originY: -0.550141484066893546, // spin y
		    shoot: this.kickBall.bind( this )
		};

		let gui = new dat.GUI( { autoPlace: false } );
		document.getElementById( "container" ).appendChild( gui.domElement );
		gui.add( this.shotControl, 'forceX', -3200, 3200 );
		gui.add( this.shotControl, 'forceY', -900, 900 );
		gui.add( this.shotControl, 'forceZ', -3200, 3200 );
		gui.add( this.shotControl, 'originX', -0.55, 0.55 );
		gui.add( this.shotControl, 'originY', -0.55, 0.55 );
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
	    this.ballBody = new CANNON.Body( { mass: .8, shape: ballBodyShape, material: ballBodyMaterial } );    
	    let ballGround = new CANNON.ContactMaterial( fieldMaterial, ballBodyMaterial,{ friction: 5, restitution: .5 } );
	    
	    this.world.addContactMaterial( ballGround );

	    golieBody.addEventListener( "collide", function () {}, false );
	    field.addEventListener( "collide", function () {}, false );
	        
	    this.world.add( this.ballBody );

	    this.resetBall();
	    this.createWall()

    	// ---------- Cylinder and Target for dragging ------------
	    let gridWidth = 60;
	    let gridHeight = 100;
		this.start = { x: 0, y: 0 };
		this.prev = { x: 0,	y: 0 };	    

		// An Object3D that contains all the mesh objects in the scene.
		// Rotation of the scene is done by rotating the world about its
		// y-axis.  (I couldn't rotate the camera about the scene since
		// the Raycaster wouldn't work with a camera that was a child
		// of a rotated object.)
		this.worldContainer = new THREE.Object3D();
		this.scene.add( this.worldContainer );

		// An invisible object that is used as the target for raycasting while
		// dragging a cylinder.  I use it to find the new location of the
		// cylinder.  I tried using the ground for this purpose, but to get
		// the motion right, I needed a target that is at the same height
		// above the ground as the point where the user clicked the cylinder.
		this.targetForDragging = new THREE.Mesh(
			new THREE.BoxGeometry( gridWidth*100, 0.01, gridHeight*100 ),
			new THREE.MeshBasicMaterial()
		);

		this.targetForDragging.material.visible = false;

		this.ground = new THREE.Mesh(
			new THREE.BoxGeometry( gridWidth*100, 1, gridHeight*100 ),
			new THREE.MeshLambertMaterial( { color:"green" } )
		);
		this.ground.material.visible = false;
		this.ground.receiveShadow = true;

		this.ground.position.y = -0.5;  // top of base lies in the plane y = -5;
		this.worldContainer.add( this.ground );

		//targetForDragging.material.transparent = true;  // This was used for debugging
		//targetForDragging.material.opacity = 0.1;
		//world.add(targetForDragging);	    

		this.addCylinder( 100, 100 );
		this.addCylinder( 0, 150 );
		this.addCylinder( -150, -70 );
		this.addCylinder( -80, 50 );
		this.addCylinder( 50, -120 );

		this.eventAction = this.DRAG;
		this.container.addEventListener( "mousedown", this.doEventStart.bind( this ) );
		this.container.addEventListener( "touchstart", this.doEventStart.bind( this ) );

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
	    this.ballBody.angularVelocity = new CANNON.Vec3( -originY * 25, originX * 25, 0 );

	};

	render() {

		const render = this.render.bind( this ); 
		requestAnimationFrame( render );

	    let time = performance.now();
	    let elapsed = ( time - this.lastTime ) * .003;

	    if ( this.state.phase == "simulate" ) {

	    	//bend ball
		    let ballBend = this.ballBody.velocity;
		    ballBend = ballBend.cross( this.ballBody.angularVelocity );
	    	ballBend = ballBend.mult( elapsed * .0002 );
	    	this.ballBody.velocity = this.ballBody.velocity.vsub( ballBend );
	
	        this.world.step( elapsed );
	    };

	    this.lastTime = time;

	    this.ball.position.copy( this.ballBody.position );
	    this.ball.quaternion.copy( this.ballBody.quaternion );
	    this.renderer.render( this.scene, this.camera )
	    
	    this.cannonDebugRenderer.update();// Update the debug renderer

	};

	createWall(){

		let walls = new Array();
		let wallsShape = new Array();
		let wallsBody = new Array();
		this.meshes = new Array();
		this.bodies = new Array();

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

		for ( let i = 0; i !== walls.length; i++ ) {
			walls[ i ].position.copy( wallsBody[ i ].position );
			walls[ i ].quaternion.copy( wallsBody[ i ].quaternion );
		};
	
	};

	addCylinder( x, z ) {

		this.cylinderSpec = new THREE.Mesh(
			new THREE.CylinderGeometry( 10, 20, 60, 16, 32 ),
			new THREE.MeshLambertMaterial( { color:"yellow" } )
		);

		let cylinderMesh = this.cylinderSpec.clone();
		cylinderMesh.position.set( x, 30, z );

		this.worldContainer.add( cylinderMesh );

		// The cylinder in Cannon is different than Three.js cylinder.
    	// We need to rotate it before attaching it to the mesh.
    	// CylinderGeometry( radiusTop, radiusBottom, height, radialSegments, heightSegments, openEnded , thetaStart, thetaLength );

    	let cylinderShape = new CANNON.Cylinder( 10, 20, 60, 16 );

    	let quaternion = new CANNON.Quaternion();
    	quaternion.setFromAxisAngle( new CANNON.Vec3( 1, 0, 0 ), -Math.PI / 2 );
    	var translation = new CANNON.Vec3( 0, 0, 0 );

    	cylinderShape.transformAllPoints( translation, quaternion );

		// add cylinder
		let mass = 5;
		let cylinderBody = new CANNON.Body( mass );
		cylinderBody.addShape( cylinderShape );

		cylinderBody.position.set( x, 30, z );
		this.world.add( cylinderBody );

        this.cylinders.push( cylinderBody );
        this.cylinderMeshes.push( cylinderMesh );

	};

	////////////////////////////
	// Mouse / Touch Events
	doChangeEventAction() {

		this.controls.enabled = false;

		if ( document.getElementById( "eventDrag" ).checked ) {
			this.eventAction = this.DRAG;
		
		} else if ( document.getElementById( "eventAdd" ).checked ) {
			this.eventAction = this.ADD;
		
		} else {
			this.eventAction = this.DELETE;
		};

	};	
		
	objectSelect( x, y ) {

  		// I don't want to check for hits on targetForDragging
		if ( this.targetForDragging.parent == this.worldContainer ) {
			this.worldContainer.remove( this.targetForDragging );
		};

		let a = 2 * x / window.innerWidth - 1;
		let b = 1 - 2 * y / window.innerHeight;

		this.raycaster.setFromCamera( new THREE.Vector2( a, b ), this.camera );
		let intersects = this.raycaster.intersectObjects( this.worldContainer.children );

		if ( intersects.length == 0 ) {
			return false;
		};

		let item = intersects[ 0 ];
		let objectHit = item.object;
		let idx = this.cylinderMeshes.indexOf( objectHit );

		switch ( this.eventAction ) {

			case this.DRAG:

				if ( objectHit == this.ground ) {
					return false;
				} else {
					
				    if ( idx !== -1 ) {
						this.dragItemBody = this.cylinders[ idx ];
				    };

					this.dragItem = objectHit;
					this.worldContainer.add( this.targetForDragging );
					this.targetForDragging.position.set( 0, item.point.y, 0 );
					return true;
				};

			case this.ADD:

				if ( objectHit == this.ground ) {

					// Gives the point of intersection in world coords
					let locationX = item.point.x;
					let locationZ = item.point.z;
					let coords = new THREE.Vector3( locationX, 0, locationZ );
					
					// to add cylider in correct position, neew local coords for the world object
					this.worldContainer.worldToLocal( coords );
					this.addCylinder( coords.x, coords.z );
				};
				return false;
			
			case this.DELETE: // DELETE

				if ( objectHit != this.ground ) {

				    if ( idx !== -1 ) {
				    	this.world.remove( this.cylinders[ idx ] );
				    };

					this.worldContainer.remove( objectHit );
				};
				return false;
		};
	};

	objectMove( x, y ) {

		this.controls.enabled = false;

		// drag
		let a = 2 * x / window.innerWidth - 1;
		let b = 1 - 2 * y / window.innerHeight;
		this.raycaster.setFromCamera( new THREE.Vector2( a, b ), this.camera );
		let intersects = this.raycaster.intersectObject( this.targetForDragging ); 

		if ( intersects.length == 0 ) {
			return;
		};

		let locationX = intersects[0].point.x;
		let locationZ = intersects[0].point.z;
		let coords = new THREE.Vector3( locationX, 0, locationZ );
		
		this.worldContainer.worldToLocal( coords );
		
		// clamp coords to a range so object stays on ground
		//a = Math.min( 45, Math.max( -45, coords.x ) );
		//b = Math.min( 45, Math.max( -45, coords.z ) );
	
		this.dragItem.position.set( coords.x, 30, coords.z );
		
		if ( this.dragItemBody ){
			this.dragItemBody.position.set( coords.x, 30, coords.z );
		};

	};

	doEventStart( event ) {
		
		if ( event.changedTouches ) {

			if ( event.touches.length != 1 ) {
				this.doEventEnd( event );
				return;
			};

		};
		
		event.preventDefault();

		if ( this.dragging ) {
			return;
		};

		let r = this.container.getBoundingClientRect();

		if ( event.changedTouches ) {

			var x = event.touches[ 0 ].clientX - r.left;
			var y = event.touches[ 0 ].clientY - r.top;

		} else {
	
			var x = event.clientX - r.left;
			var y = event.clientY - r.top;

		};
	
		this.prev.x = this.start.x = x;
		this.prev.y= this.start.x = y;
		this.dragging = this.objectSelect( x, y );

		let scope = this;

		if ( this.dragging ) {

			if ( event.changedTouches ) {
			
				this.container.addEventListener( "touchmove", scope.doEventMove.bind( this ) );
				this.container.addEventListener( "touchend", scope.doEventEnd.bind( this ) );
			
			} else {
			
				this.container.addEventListener( "mousemove", scope.doEventMove.bind( this ) );
				this.container.addEventListener( "mouseup", scope.doEventEnd.bind( this ) );
			
			};
		};
	};

	doEventMove( event ) {
	
		if ( this.dragging ) {

			if ( event.changedTouches ) {

				if ( event.touches.length != 1 ) {
					this.doEventEnd( event );
					return;
				};

			};

			event.preventDefault();
			let r = this.container.getBoundingClientRect();

			if ( event.changedTouches ) {
				var x = event.touches[ 0 ].clientX - r.left;
				var y = event.touches[ 0 ].clientY - r.top;
			
			} else {

				var x = event.clientX - r.left;
				var y = event.clientY - r.top;
			};

			this.objectMove( x, y );
			this.prev.x = x;
			this.prev.y = y;

		};
	};

	doEventEnd( event ) {
		
		this.controls.enabled = true;
		this.dragItem = null;
		this.dragItemBody = null;
		
		let scope = this;

		if ( this.dragging ) {

			this.dragging = false;
			
			if ( event.changedTouches ) {

				this.container.removeEventListener( "touchmove", scope.doEventMove.bind( this ) );
				this.container.removeEventListener( "touchend", scope.doEventEnd.bind( this ) );

			} else {

				this.container.removeEventListener( "mousemove", scope.doEventMove.bind( this ) );
				this.container.removeEventListener( "mouseup", scope.doEventEnd.bind( this ) );

			};
		};

		if ( this.endCallback ) {
			this.endCallback( event );
		};
						
		if ( this.cancelCallback ) {
			this.cancelCallback( event );
		
		};			

	};

};

let kickBall = new KickBall();

document.getElementById( "buttonShoot" ).addEventListener( "click", function() {
	kickBall.kickBall();
});

document.getElementById( "buttonReset" ).addEventListener( "click", function() {
	kickBall.resetBall();
});

