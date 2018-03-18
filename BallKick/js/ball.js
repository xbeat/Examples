
'use strict';

class Shot {

    constructor( options = {} ) {

        this.points = new Array();
        let initPoint = new ShotPoint();
        initPoint.position = new THREE.Vector3( 0, 0, 0 );

        // ball properties
        this.mass = 0.459; // kg;
        this.crossSectionalArea = 0.04267 * Math.PI / 4; //m^2
        this.smashFactor = ( options.smashFactor == null ) ? 1.49 : options.smashFactor; // ball initial speed ratio

        // nature
        this.gravityMagnitude = -9.8; // 9.8 m/s^2
        this.airDensity = 1.2041; // kg/m^3

        // ball aerodynamics properties        
        this.dragCoefficient = ( options.dragCoefficient == null ) ? 0.4 : options.dragCoefficient;
        this.liftCoefficient = ( options.liftCoefficient == null ) ? 0.00001 : options.liftCoefficient; // made this up?
        this.spinDecayRateConstant = 23; // made this up?

        // initial shot attributes
        this.initSpeedMPS = options.initSpeedMPS || 0.0;
        this.initVerticalAngleDegrees = options.initVerticalAngleDegrees || 0.0;
        this.initHorizontalAngleDegrees = options.initHorizontalAngleDegrees || 0.0;
        this.initBackspinRPM = options.initBackspinRPM || 0.0;
        this.initSpinAngle = options.initSpinAngle || 0.0;

        // simulation properties
        this.dt = options.dt || 0.001; //seconds

        // initial velocity        
        initPoint.velocity = this.getInitialVelocity( this.initSpeedMPS, this.smashFactor, this.initVerticalAngleDegrees, this.initHorizontalAngleDegrees );

        // initial angular velocity (spin rate)
        initPoint.angularVelocity = this.getInitialSpin( this.initBackspinRPM, this.initSpinAngle );

        this.projectShot( initPoint );

    };

    getInitialSpin( spinRPM, spinAngle ) {
        let spin = new THREE.Vector3(0, 0, 0);
        spin.x = -1; // full backspin
        spin.y = Math.sin( spinAngle * Math.PI / 180 );

        spin.normalize().multiplyScalar( spinRPM * 2 * Math.PI / 60 );

        return spin;
    };

    getInitialVelocity( speedMPS, smashFactor, verticalDegrees, horizontalDegrees ) {

        let velocity = new THREE.Vector3( 0, 0, 0 );
        velocity.x = Math.sin( horizontalDegrees * Math.PI / 180 );
        velocity.y = Math.sin( verticalDegrees * Math.PI / 180 );
        velocity.z = Math.cos( verticalDegrees * Math.PI / 180 );

        let ballSpeed = speedMPS * smashFactor;        

        return velocity.normalize().multiplyScalar( ballSpeed );
    };

    projectShot( initPoint ) {

        // initial point
        let lastPoint = initPoint.clone();
        this.points.push( lastPoint ); 

        while( true ) {
            let newPoint = lastPoint.clone();

            // calculate velocity change            
            let accel = this.getAcceleration( lastPoint );
            newPoint.velocity.add( accel.clone().multiplyScalar( this.dt ) );
            newPoint.position.add( newPoint.velocity.clone().multiplyScalar( this.dt ) );

            // calculate spin rate decay
            let decayRate = this.angularDecayVector( newPoint );
            newPoint.angularVelocity.add( decayRate );

            this.points.push( newPoint ); 

            if ( newPoint.position.y <= 0 ) {
                break;
            };

            lastPoint = newPoint;
        };
    };

    getAcceleration( currentPoint ) {

        // gravity: -9.8 m/s^2
        let gravityAcceleration = new THREE.Vector3( 0, this.gravityMagnitude, 0 );

        // drag acceleration = drag force / mass
        let adjustedDragCoefficient = this.dragCoefficient * Math.min( 1.0, 14 / currentPoint.velocity.length() );
        let dragForceAcceleration = currentPoint.velocity.clone().multiplyScalar( -1 * adjustedDragCoefficient * this.airDensity * this.crossSectionalArea / this.mass );

        // magnus acceleration (from ball spin) = magnus force / mass
        let magnusForceAcceleration = currentPoint.angularVelocity.clone().cross( currentPoint.velocity).multiplyScalar( this.liftCoefficient / this.mass );

        // combined acceleration = gravity + drag + magnus
        let totalAccel = ( new THREE.Vector3( 0, 0, 0 ) ).add( gravityAcceleration ).add( dragForceAcceleration ).add( magnusForceAcceleration );

        return totalAccel;

    };

    angularDecayVector( currentPoint ) {

        let decay = currentPoint.angularVelocity.clone();
        decay.normalize().negate().multiplyScalar( this.spinDecayRateConstant * this.dt );
        return decay;

    };

};

class ShotPoint {

    constructor() {

        this.position = new THREE.Vector3( 0, 0 ,0 );
        this.velocity = new THREE.Vector3( 0, 0, 0 );
        this.angularVelocity = new THREE.Vector3( 0, 0, 0 );
        this.acceleration = new THREE.Vector3( 0, 0, 0 );

    };

    clone() {

        let point = new ShotPoint();
        point.position = this.position.clone();
        point.velocity = this.velocity.clone();
        point.acceleration = this.acceleration.clone();
        point.angularVelocity = this.angularVelocity.clone();
        return point;

    };

};

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

		// status elements
		this.statusElementTime = document.getElementById( 'status-time' );
		this.statusElementSpeed = document.getElementById( 'status-speed' );
		this.statusElementHeight = document.getElementById( 'status-height' );
		this.statusElementDistance = document.getElementById( 'status-distance' );
		this.statusElementSpin = document.getElementById( 'status-spin' );

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
		
		const hLight = new THREE.HemisphereLight( 0xffffff );
		this.scene.add( hLight );

		// Note: coordinate unit of 1 = 1 meter
		this.shotControl = {
		    dt: 0.001, //seconds
		    displaySpeed: 1.0, // display time multiplier
		    initSpeedMPS: 25,
		    initVerticalAngleDegrees: 20,
		    initHorizontalAngleDegrees: 0,
		    initBackspinRPM: 6000,
		    initSpinAngle: 0,
		    shoot: this.beginShot.bind( this )
		};

		let gui = new dat.GUI( { autoPlace: false } );
		this.container.appendChild( gui.domElement );
		gui.add( this.shotControl, 'initSpeedMPS', 5, 80 );
		gui.add( this.shotControl, 'initVerticalAngleDegrees', 0, 90 );
		gui.add( this.shotControl, 'initHorizontalAngleDegrees', -45, 45 );
		gui.add( this.shotControl, 'initBackspinRPM', 0, 6000 );
		gui.add( this.shotControl, 'initSpinAngle', -45, 45 );
		gui.add( this.shotControl, 'displaySpeed', 0, 5 );
		gui.add( this.shotControl, 'shoot' );

		window.addEventListener( 'resize', function(){
	    	this.camera.aspect = window.innerWidth / window.innerHeight;
		    this.camera.updateProjectionMatrix();
	    	this.renderer.setSize( window.innerWidth, window.innerHeight );
		}.bind( this ), false );

		this.addInitialElements();
		this.beginShot();
		this.render();

	};

	render() {

		const render = this.render.bind( this ); 
		requestAnimationFrame( render );
	
	    this.controls.update();
	    this.renderer.render( this.scene, this.camera );

	    if ( this.shot ) {
	        this.updateShot();
	    };

	    /*
		//MoveBall ?!?
		let heading = joystick[0].getHeading();
		
		if( heading.up == true ){
			this.ball3D.position.x += 0.1;
		};

		if( heading.down == true ){
			this.ball3D.position.x -= 0.1;
		};

		if( heading.left == true ){
			this.ball3D.position.z -= 0.1;
		};

		if( heading.right == true ){
			this.ball3D.position.z += 0.1;
		};
		*/

	};

	beginShot() {

		this.points.length = 0
	    this.shot = new Shot( this.shotControl );
	    this.points.push( this.shot.points[0] );
	    this.displaySpeed = this.shotControl.displaySpeed;
	    this.displayStartTime = Date.now();

	};

	updateShot() {

	    let now = Date.now();
	    let rawTimeElapsed = now - this.displayStartTime;
	    let displayTimeElapsed = Math.floor( this.displaySpeed * rawTimeElapsed );
	    let lineColor = new THREE.Color( 0xe34f4f );
	    let splineInterpolationNum = 2;

	    if ( displayTimeElapsed <= this.shot.points.length ) {

	        let point = this.shot.points[ displayTimeElapsed ];        
	        if ( point == null ) {
	            return;
	        };

	        this.points.push( point.position.clone() );

			// Update screen data
	        this.statusElementTime.innerHTML = ( displayTimeElapsed / 1000 ).toFixed( 1 ) + ' s';
	        this.statusElementSpeed.innerHTML = point.velocity.length().toFixed( 1 ) + ' mps';
	        this.statusElementHeight.innerHTML = point.position.y.toFixed( 0 ) + ' p.y mt';
	        this.statusElementDistance.innerHTML = point.position.z.toFixed( 0 ) + ' p.z mt';
	        this.statusElementSpin.innerHTML = point.angularVelocity.length().toFixed( 0 ) + ' rpm';

	        //let ball = this.scene.getObjectByName( 'ball' );
	        this.ball3D.position.set( point.position.x, point.position.y, point.position.z + this.sceneZOffset );
	        this.ball3D.rotation.y =  ( point.angularVelocity.length() / 60 ) * displayTimeElapsed;
	        this.ball3D.rotation.z =  ( point.angularVelocity.length() / 600 ) * displayTimeElapsed;

	        this.ring.position.set( point.position.x, 0, point.position.z + this.sceneZOffset );

	    };
	};

    getGrid( sizeX, sizeZ, step, color ) {

        let geometry = new THREE.Geometry();
        let material = new THREE.LineBasicMaterial( { vertexColors: THREE.VertexColors, opacity: 0.2 } );

        for ( let i = - sizeX; i <= sizeX; i += step ) {

            for ( let j = - sizeZ; j <= sizeZ; j += step ) {

                geometry.vertices.push(
                    new THREE.Vector3( - sizeX, 0, j ), new THREE.Vector3( sizeX, 0, j ),
                    new THREE.Vector3( i, 0, - sizeZ ), new THREE.Vector3( i, 0, sizeZ )
                );

                geometry.colors.push( color, color, color, color );

            };

        };

        let grid = new THREE.LineSegments( geometry, material );

        return grid;
    };

	addInitialElements() {
	    
	    let scope = this;
	    let gridWidth = 60;
	    let gridHeight = 100;

	    this.sceneZOffset = -gridHeight/2.0;

	    // add ground grid
	    let gridColor = new THREE.Color( 0x69ba6d )
	    let grid = this.getGrid( gridWidth, gridHeight, 10, gridColor );

	    this.scene.add( grid );

	    // Add text
	    let loader = new THREE.FontLoader();
	    loader.load( 'fonts/helvetiker_regular.typeface.json', function ( font ) {

	        // add marker indicators
	        let markerColor = 0x00ffff;
	        let textMesh = new THREE.MeshNormalMaterial();

	        let markerMeterage = 0;
	        while( markerMeterage <= gridHeight + 15 ) {

	            // text
	            let textGeometry = new THREE.TextGeometry( markerMeterage + "mt", {
	                size: 3,
	                height: 0.1,
	                curveSegments: 1,
	                font: font
	            });

	            textGeometry.computeBoundingBox();
	            textGeometry.computeVertexNormals();
	            
	            let words = new THREE.Mesh( textGeometry, textMesh );
	            words.position.x = gridWidth/2.0 + 5;
	            words.position.z = markerMeterage + scope.sceneZOffset - 0.5 * ( textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x );
	            words.rotation.y = -1 * Math.PI / 2;
	            scope.scene.add( words );

	            // line across grid
	            let pointA = new THREE.Vector3( -gridWidth/2.0, 0, markerMeterage + scope.sceneZOffset );
	            let pointB = new THREE.Vector3( gridWidth/2.0, 0, markerMeterage + scope.sceneZOffset );
	            let lineGeometry = new THREE.Geometry();
	            lineGeometry.vertices = [pointA, pointB];
	            let lineMaterial = new THREE.LineBasicMaterial( { color: markerColor, linewidth: 2 } );
	            let markerLine = new THREE.Line( lineGeometry, lineMaterial );
	            scope.scene.add( markerLine );

	            markerMeterage += 15;

	        };

	    });
			
 		// --------- Soccer Ball ----------		
     	let buffgeoSphere = new THREE.BufferGeometry();
        buffgeoSphere.fromGeometry( new THREE.SphereGeometry( 1, 20, 10 ) );
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

		//------------ Ring -------------
		let ringGeom = new THREE.RingGeometry( 3, 7, 32 );
		let ringMaterial = new THREE.MeshLambertMaterial( { color: 0xff0000, transparent: true, opacity: 0.5 } );

		this.ring = new THREE.Mesh( ringGeom, ringMaterial );
		this.ring.name = 'ring';
		this.ring.position.set( 0, 0, 0 );
		this.ring.rotation.x = -0.5 * Math.PI;

		this.scene.add( this.ring );

		//------------ GOAL ----------------
    	let postLeft = new THREE.Mesh( new THREE.CylinderGeometry( 0.7, 0.7, 25.6, 32 ),
							    	new THREE.MeshLambertMaterial( { color: 0xffffff } ) );

    	postLeft.position.set( 37.2, 12.8, 48 );
    	this.scene.add( postLeft );
    
    	let postRight = postLeft.clone();
    	postRight.position.set( -37.2, 12.8, 48 );
    	this.scene.add( postRight );
    
    	let crossbar = new THREE.Mesh( new THREE.CylinderGeometry( 0.7, 0.7, 75, 32 ),
							    	new THREE.MeshLambertMaterial( { color: 0xffffff } ) );

    	crossbar.rotation.z = Math.PI / 2;
    	crossbar.position.set( 0, 25, 48 );
    	this.scene.add( crossbar );

	};

};

//let scene3D = new Scene3D();

'use strict';

class DragDrop3D extends Scene3D {
	
	constructor(){

		super();
		/*
		this.renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true } );
		this.renderer.setSize( window.innerWidth, window.innerHeight );

		this.scene = new THREE.Scene();
		this.renderer.setClearColor( 0x333333 );
		this.camera = new THREE.PerspectiveCamera( 27, window.innerWidth / window.innerHeight, 10, 1000 );
		this.camera.position.z = 60;
		this.camera.position.y = 30;
		this.camera.lookAt( new THREE.Vector3( 0, 0, 0 ) );
		this.camera.add( new THREE.PointLight( 0xffffff, 0.7 ) ); // point light at camera position
		this.scene.add( this.camera );
		this.scene.add( new THREE.DirectionalLight( 0xffffff,0.5 ) ); // light shining from above.
		this.controls = new THREE.OrbitControls( this.camera, this.renderer.domElement );
		this.controls.enabled = false;
		this.container = document.getElementById( "content" );
		*/

		this.ROTATE = 1;
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

		window.addEventListener( 'resize', function () {
			this.camera.aspect = window.innerWidth / window.innerHeight;
			this.camera.updateProjectionMatrix();
			//controls.handleResize();
			this.renderer.setSize( window.innerWidth, window.innerHeight );
		}.bind( this ), false );

		this.raycaster = new THREE.Raycaster();
		
		document.getElementById( "eventDrag" ).checked = true;
		document.getElementById( "eventRotate" ).onchange = this.doChangeEventAction.bind( this );
		document.getElementById( "eventDrag" ).onchange = this.doChangeEventAction.bind( this );
		document.getElementById( "eventAdd" ).onchange = this.doChangeEventAction.bind( this );
		document.getElementById( "eventDelete" ).onchange = this.doChangeEventAction.bind( this );

		this.createWorld();
	
	};

	doChangeEventAction() {

		this.controls.enabled = false;

		if ( document.getElementById( "eventRotate" ).checked ) {
			this.eventAction = this.ROTATE;
		
		} else if ( document.getElementById( "eventDrag" ).checked ) {
			this.eventAction = this.DRAG;
		
		} else if ( document.getElementById( "eventAdd" ).checked ) {
			this.eventAction = this.ADD;
		
		} else {
			this.eventAction = this.DELETE;
		};

	};	
		
	createWorld() {

		// An Object3D that contains all the mesh objects in the scene.
		// Rotation of the scene is done by rotating the world about its
		// y-axis.  (I couldn't rotate the camera about the scene since
		// the Raycaster wouldn't work with a camera that was a child
		// of a rotated object.)
		this.world = new THREE.Object3D();
		this.scene.add( this.world );

		this.ground = new THREE.Mesh(
			new THREE.BoxGeometry( 40, 1, 40 ),
			new THREE.MeshLambertMaterial( { color:"green" } )
		);

		this.ground.position.y = -0.5;  // top of base lies in the plane y = -5;
		this.world.add( this.ground );

		// An invisible object that is used as the target for raycasting while
		// dragging a cylinder.  I use it to find the new location of the
		// cylinder.  I tried using the ground for this purpose, but to get
		// the motion right, I needed a target that is at the same height
		// above the ground as the point where the user clicked the cylinder.
		this.targetForDragging = new THREE.Mesh(
			new THREE.BoxGeometry( 100, 0.01, 100 ),
			new THREE.MeshBasicMaterial()
		);

		this.targetForDragging.material.visible = false;

		//targetForDragging.material.transparent = true;  // This was used for debugging
		//targetForDragging.material.opacity = 0.1;
		//world.add(targetForDragging);

		this.cylinder = new THREE.Mesh(
			new THREE.CylinderGeometry( 1, 2, 6, 16, 32 ),
			new THREE.MeshLambertMaterial( { color:"yellow" } )
		);
		this.cylinder.position.y = 3;  // places base at y = 3;

		this.addCylinder( 10, 10 );
		this.addCylinder( 0, 15 );
		this.addCylinder( -15, -7 );
		this.addCylinder( -8, 5 );
		this.addCylinder( 5, -12 );

		this.world.add( this.ball3D );

	};

	addCylinder( x, z ) {

		let obj = this.cylinder.clone();
		obj.position.x = x;
		obj.position.z = z;
		this.world.add( obj );

	};

	objectSelect( x, y ) {

		if ( this.eventAction == this.ROTATE ) {
			return true;
		};

  		// I don't want to check for hits on targetForDragging
		if ( this.targetForDragging.parent == this.world ) {
			this.world.remove( this.targetForDragging );
		};

		let a = 2 * x / window.innerWidth - 1;
		let b = 1 - 2 * y / window.innerHeight;

		this.raycaster.setFromCamera( new THREE.Vector2( a, b ), this.camera );
		let intersects = this.raycaster.intersectObjects( this.world.children );

		if ( intersects.length == 0 ) {
			return false;
		};

		let item = intersects[ 0 ];
		let objectHit = item.object;

		switch ( this.eventAction ) {

			case this.DRAG:

				if ( objectHit == this.ground ) {
					return false;
				} else {
					this.dragItem = objectHit;
					this.world.add( this.targetForDragging );
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
					this.world.worldToLocal( coords );
					this.addCylinder( coords.x, coords.z );
				};
				return false;
			
			case this.DELETE: // DELETE

				if ( objectHit != this.ground ) {
					this.world.remove( objectHit );
				};
				return false;
		};
	};

	objectMove( x, y ) {

		this.controls.enabled = false;

		if ( this.eventAction == this.ROTATE ) {

			let dx = x - this.prev.x;
			this.world.rotateY( dx / 200 );

		} else {  

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
			
			this.world.worldToLocal( coords );
			
			// clamp coords to the range -19 to 19, so object stays on ground
			a = Math.min( 19, Math.max( -19, coords.x ) );
			b = Math.min( 19, Math.max( -19, coords.z ) );
			
			this.dragItem.position.set( a, 3, b );
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
		
		if ( this.eventAction == this.ROTATE ) {
			this.eventAction = this.DRAG;
			document.getElementById( "eventDrag" ).checked = true;
		};

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

document.addEventListener( "DOMContentLoaded", function( event ) {
	let scene3D = new DragDrop3D();
});

