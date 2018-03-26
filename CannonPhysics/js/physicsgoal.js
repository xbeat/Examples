'use strict';

class Scene3D {

	constructor(){

		this.points = new Array();
		this.shot;
		this.line;

		this.sceneZOffset;
		this.displayStartTime;
		this.displaySpeed;
		
		// add renderer
		this.renderer = new THREE.WebGLRenderer( { antialias: true, alpha:true } );
		this.renderer.setSize( window.innerWidth, window.innerHeight )
		
		// add container
		this.container = document.getElementById( 'container' );
		this.container.appendChild( this.renderer.domElement );

		this.scene = new THREE.Scene();
		
		let aspect = window.innerWidth / window.innerHeight;
		//let radius = player.geometry.boundingSphere.radius;
		let radius = 60;

		this.camera = new THREE.PerspectiveCamera( 45, aspect, 1, 20000 );
		this.camera.position.set( 0.0, radius * 1.5, radius * 4.5 );

		// disable orbitControl to rotate a camera!!
		//this.camera.rotation.order = 'YXZ'
		//this.camera.rotation.y = 1.7;  // Y first
		//this.camera.rotation.x = 2.5;  // X second
		//this.camera.rotation.z = 1.8;

		this.angle = -0.5 * Math.PI;
		let x = this.camera.position.x;
		let z = this.camera.position.z;

        this.camera.position.x = x * Math.cos( this.angle ) + z * Math.sin( this.angle );
        this.camera.position.z = z * Math.cos( this.angle ) - x * Math.sin( this.angle );

        this.camera.lookAt( this.scene.position );
	
		// remove shaderlog warnings
		let ctx = this.renderer.context;
		ctx.getShaderInfoLog = function () { return '' };
		   
		//controls
		this.controls = new THREE.OrbitControls( this.camera, this.renderer.domElement );
		this.controls.rotateSpeed = 1.0;
		this.controls.zoomSpeed = 1.2;
		this.controls.panSpeed = 0.8;
		
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
  
		this.balls = new Array();
		this.ballMeshes = new Array();

        this.boxMeshes = new Array();
        this.boxes = new Array();

        //---------- Cannon init ----------------
        this.world = new CANNON.World();
        this.world.quatNormalizeSkip = 0;
        this.world.quatNormalizeFast = false;

        let solver = new CANNON.GSSolver();

        this.world.defaultContactMaterial.contactEquationStiffness = 1e9;
        this.world.defaultContactMaterial.contactEquationRelaxation = 4;

        solver.iterations = 7;
        solver.tolerance = 0.1;

        this.world.solver = new CANNON.SplitSolver( solver );

        this.world.gravity.set( 0, -20, 0 );
        this.world.broadphase = new CANNON.NaiveBroadphase();

		//----- CANNON debug -----
		this.cannonDebugRenderer = new THREE.CannonDebugRenderer( this.scene, this.world );

		// Dat Gui 
		this.shotControl = {
		    shootVelo: 15,
		    VerticalAngle: Math.PI / 4,
		    HorizontalAngle: Math.PI / 4,
		    shoot: this.beginShot.bind( this )
		};

		let gui = new dat.GUI( { autoPlace: false } );
		this.container.appendChild( gui.domElement );
		gui.add( this.shotControl, 'shootVelo', 0, 300 );
		gui.add( this.shotControl, 'VerticalAngle', 0, Math.PI / 2 );
		gui.add( this.shotControl, 'HorizontalAngle', 0, Math.PI * 2 );
		gui.add( this.shotControl, 'shoot' );

		window.addEventListener( 'resize', function(){
	    	this.camera.aspect = window.innerWidth / window.innerHeight;
		    this.camera.updateProjectionMatrix();
	    	this.renderer.setSize( window.innerWidth, window.innerHeight );
		}.bind( this ), false );

		// Menu
		this.DRAG = 2;
		this.ADD = 3, 
		this.DELETE = 4, 
		this.ORBIT = 5;
		
		this.eventAction = this.DRAG;
		this.container.addEventListener( "mousedown", this.doEventStart.bind( this ) );
		this.container.addEventListener( "touchstart", this.doEventStart.bind( this ) );

		this.endCallback = null;
		this.cancelCallback = null;
		this.dragging = false;
		this.start = { x: 0, y: 0 };
		this.prev = { x: 0,	y: 0 };

		this.raycaster = new THREE.Raycaster();
		
		document.getElementById( "eventDrag" ).checked = true;
		document.getElementById( "eventDrag" ).onchange = this.doChangeEventAction.bind( this );
		document.getElementById( "eventAdd" ).onchange = this.doChangeEventAction.bind( this );
		document.getElementById( "eventDelete" ).onchange = this.doChangeEventAction.bind( this );

		this.createPitch();

	};

	createPitch(){

		/*
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
		*/

		this.addInitialElements();
		this.createWall();
		this.beginShot();

		this.render();

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

	updateShot() {

	    let now = Date.now();
	    let rawTimeElapsed = now - this.displayStartTime;
	    let displayTimeElapsed = Math.floor( this.displaySpeed * rawTimeElapsed );

		// Update screen data
        document.getElementById( 'status-time' ).innerHTML = ( displayTimeElapsed / 1000 ).toFixed( 1 ) + ' s';
        document.getElementById( 'status-speed' ).innerHTML = point.velocity.length().toFixed( 1 ) + ' mps';
        document.getElementById( 'status-height' ).innerHTML = point.position.y.toFixed( 0 ) + ' p.y mt';
        document.getElementById( 'status-distance' ).innerHTML = point.position.z.toFixed( 0 ) + ' p.z mt';
        document.getElementById( 'status-spin' ).innerHTML = point.angularVelocity.length().toFixed( 0 ) + ' rpm';

		this.ring.position.set( point.position.x, 1.1, point.position.z + this.sceneZOffset );

	};

	beginShot() {

        // ----------- ball -------------

        this.getShootDir( this.shootDirection );
        
		// Position
		this.ballBody.position.setZero();
		this.ballBody.previousPosition.setZero();
		this.ballBody.interpolatedPosition.setZero();
		this.ballBody.initPosition.setZero();

		// orientation
		this.ballBody.quaternion.set( 0, 0, 0, 1 );
		this.ballBody.initQuaternion.set( 0, 0, 0, 1 );
		this.ballBody.interpolatedQuaternion.set( 0, 0, 0, 1 );

		// Velocity
		this.ballBody.velocity.setZero();
		this.ballBody.initVelocity.setZero();
		this.ballBody.angularVelocity.setZero();
		this.ballBody.initAngularVelocity.setZero();

		// Force
		this.ballBody.force.setZero();
		this.ballBody.torque.setZero();

		// Sleep state reset
		this.ballBody.sleepState = 0;
		this.ballBody.timeLastSleepy = 0;
		this.ballBody.wakeUpAfterNarrowphase = false;


        var radius = 4, mass = 2, f = 500;
        var dt = 1 / 60, damping = 0.5;
       	
        //this.ballBody.linearDamping = this.ballBody.angularDamping = damping;
        
        // Add an force to the center
        var worldPoint = new CANNON.Vec3( 0, 0, 4 );
        var force = new CANNON.Vec3( f, f/4, 0 );
        //this.ballBody.applyImpulse( force, worldPoint );
        //this.ballBody.angularVelocity.set( 1500, 10, 500 );


        // Move the ball outside the player sphere
        let x = this.ball3D.position.x;
        let y = this.ball3D.position.y;
        let z = this.ball3D.position.z;
        this.ballBody.position.set( x + 30, 1, z + 30 );
        this.ballMesh.position.set( x + 30, 1, z + 30 );


	    var distance = 40;
	    var projectileSpeed = 100;
		var firingDirection = new CANNON.Vec3( -1, 0, 1 );
		var firingDirection = this.ballBody.quaternion.vmult( firingDirection );
		
		this.ballBody.velocity.set( firingDirection.x * projectileSpeed, -10, firingDirection.z * projectileSpeed );


	};

    getShootDir( targetVec ){    	
    	
        let vector = targetVec;
        targetVec.set( 0, 0, 1 );
		vector.unproject( this.camera );
        //let ray = new THREE.Ray( this.ball3D.position, vector.sub( this.ball3D.position ).normalize() );
        
        //targetVec.copy( ray.direction );
        //targetVec.set( ray.direction.x, Math.PI / 4, ray.direction.y )

        targetVec.set( Math.cos ( this.shotControl.HorizontalAngle ), Math.sin ( this.shotControl.VerticalAngle ), Math.sin( this.shotControl.HorizontalAngle ) );

    };

	render() {

		const render = this.render.bind( this ); 
		requestAnimationFrame( render );
	
	    this.controls.update();
	    this.renderer.render( this.scene, this.camera );

	    this.ring.position.copy( this.ball3D.position );

        this.world.step( 1/60 );

        // Update mesh positions
        for( let i = 0; i < this.balls.length; i++ ){
            this.ballMeshes[i].position.copy( this.balls[i].position );
            this.ballMeshes[i].quaternion.copy( this.balls[i].quaternion );
        };

	    this.cannonDebugRenderer.update();// Update the debug renderer

	};

	resetShot() {
		this.ball3D.position.set( 0, 1, this.sceneZOffset );
	};

	addInitialElements() {
	    
	    let gridWidth = 60;
	    let gridHeight = 100;

			
		// Cannon Plane		
        // Create a slippery material (friction coefficient = 0.0)
        let physicsMaterial = new CANNON.Material( { name: "slipperyMaterial", friction: 0.4, restitution: 0.3 } );
        //let physicsContactMaterial = new CANNON.ContactMaterial( physicsMaterial, physicsMaterial, { friction: 0.5, restitution: 0.3 } );

        //this.world.addContactMaterial( physicsContactMaterial );

        // Create a plane
        let groundShape = new CANNON.Plane();
        let groundBody = new CANNON.Body( { mass: 0, material: physicsMaterial } );
        groundBody.addShape( groundShape );
        groundBody.quaternion.setFromAxisAngle( new CANNON.Vec3( 1, 0, 0 ), -Math.PI/2 );
        this.world.addBody( groundBody );

        //----------------- Ball -----------------
        this.ballShape = new CANNON.Sphere( 8 );
        this.ballGeometry = new THREE.SphereGeometry( this.ballShape.radius, 32, 32 );
        this.shootDirection = new THREE.Vector3();

        this.ballBody = new CANNON.Body( { mass: 1.5, linearDamping: 0.1 } );
        this.ballBody.addShape( this.ballShape );
        this.shootVelo = this.shotControl.shootVelo;

        this.material = new THREE.MeshLambertMaterial( { color: 0xff0000 } );
        this.ballMesh = new THREE.Mesh( this.ballGeometry, this.material );
        this.world.addBody( this.ballBody );
        this.scene.add( this.ballMesh );

        this.ballMesh.castShadow = true;
        this.ballMesh.receiveShadow = true;
        this.balls.push( this.ballBody );
        this.ballMeshes.push( this.ballMesh );

		//------------ Ring -------------
		let ringGeom = new THREE.RingGeometry( 30, 70, 32 );
		let ringMaterial = new THREE.MeshLambertMaterial( { color: 0xff0000, transparent: false, opacity: 1 } );

		this.ring = new THREE.Mesh( ringGeom, ringMaterial );
		this.ring.name = 'ring';
		this.ring.position.set( 0, 1.2, 0 );
		this.ring.rotation.x = -0.5 * Math.PI;

		this.scene.add( this.ring );

		//------------ GOAL ----------------
    	let postLeft = new THREE.Mesh( new THREE.CylinderGeometry( 4, 4, 170, 32 ),
							    	new THREE.MeshLambertMaterial( { color: 0xffffff } ) );

    	postLeft.position.set( -2950, 60, 240 );
    	this.scene.add( postLeft );
    
    	let postRight = postLeft.clone();
    	postRight.position.set( -2950, 60, -210 );
    	this.scene.add( postRight );
    
    	let crossbar = new THREE.Mesh( new THREE.CylinderGeometry( 4, 4, 450, 32 ),
							    	new THREE.MeshLambertMaterial( { color: 0xffffff } ) );

    	crossbar.rotation.z = Math.PI / 2;
    	crossbar.rotation.y = Math.PI / 2;
    	crossbar.position.set( -2950, 140, 20 );
    	this.scene.add( crossbar );


    	// ---------- Cylinder and Target for dragging ------------

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
		this.ground.material.visible = true;
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

 		// --------- Soccer Ball ----------		
     	let buffgeoSphere = new THREE.BufferGeometry();
        buffgeoSphere.fromGeometry( new THREE.SphereGeometry( 10, 20, 10 ) );
	    let ballTexture = new THREE.TextureLoader().load( 'models/ball/ball.png' );			        
        var ballMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xffffff, 
            map: ballTexture
        });
        
        this.ball3D = new THREE.Mesh( buffgeoSphere, ballMaterial );
        
        this.ball3D.castShadow = true;
        this.ball3D.name = 'ball';

		//ball[i].receiveShadow = true;
		this.scene.add( this.ball3D );
		this.worldContainer.add( this.ball3D );
        
	};

	addCylinder( x, z ) {

		this.cylinder = new THREE.Mesh(
			new THREE.CylinderGeometry( 10, 20, 60, 16, 32 ),
			new THREE.MeshLambertMaterial( { color:"yellow" } )
		);

		let cylinderMesh = this.cylinder.clone();
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

        this.boxes.push( cylinderBody );
        this.boxMeshes.push( cylinderMesh );

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
		let idx = this.boxMeshes.indexOf( objectHit );

		switch ( this.eventAction ) {

			case this.DRAG:

				if ( objectHit == this.ground ) {
					return false;
				} else {
					
				    if ( idx !== -1 ) {
						this.dragItemBody = this.boxes[ idx ];
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
				    	this.world.remove( this.boxes[ idx ] );
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

	// CCD Continous Collision Detection
	// Must predict next position and check if the ray trajectory if it intersects anything!
	limitSphere( ball, objs ){
		let raycaster = new THREE.Raycaster();
  		raycaster.set( ball.position.clone(), ball.velocity.clone().unit() );
  		raycaster.far = ball.velocity.length();
  		let arr = raycaster.intersectObjects( objs );

  		if( arr.length ){
    		ball.position.copy( arr[0].point );
  		};
	};

};

let scene3D;
document.addEventListener( "DOMContentLoaded", function( event ) {
	scene3D = new Scene3D();
});

