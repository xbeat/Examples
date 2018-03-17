
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
		this.container = document.getElementById( 'display-container' );
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

		// disable orbitControl!! to rotate a camera
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

		let scope = this;
	    requestAnimationFrame( function() { scope.render(); } );

	    this.controls.update();
	    this.renderer.render( this.scene, this.camera );

	    if ( this.shot ) {
	        this.updateShot();
	    };

	    /*
		//MoveBall ?!?
		let heading = joystick[0].getHeading();
		
		if( heading.up == true ){
			this.ball.position.x += 0.1;
		};

		if( heading.down == true ){
			this.ball.position.x -= 0.1;
		};

		if( heading.left == true ){
			this.ball.position.z -= 0.1;
		};

		if( heading.right == true ){
			this.ball.position.z += 0.1;
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
	        this.ball.position.set( point.position.x, point.position.y, point.position.z + this.sceneZOffset );
	        this.ball.rotation.y =  ( point.angularVelocity.length() / 60 ) * displayTimeElapsed;
	        this.ball.rotation.z =  ( point.angularVelocity.length() / 600 ) * displayTimeElapsed;

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
        
        this.ball = new THREE.Mesh( buffgeoSphere, ballMaterial );
        
        this.ball.castShadow = true;
        this.ball.name = 'ball';

		//ball[i].receiveShadow = true;
		this.scene.add( this.ball );

		//------------ Ring -------------
		let ringGeom = new THREE.RingGeometry( 3, 7, 32 );
		let ringMaterial = new THREE.MeshLambertMaterial( { color: 0xff0000, transparent: true, opacity: 0.5 } );

		this.ring = new THREE.Mesh( ringGeom, ringMaterial );
		this.ring.name = 'ring';
		this.ring.position.set( 0, 0, 0 );
		this.ring.rotation.x = -0.5 * Math.PI;

		this.scene.add( this.ring );

	};

};

//let scene3D = new Scene3D();

class Drag3D extends Scene3D {

    constructor(){

    	super();
        this.selectedObject;
        this.offset = new THREE.Vector3();
        this.objects = new Array();
        this.mouse = new Object();

        this.plane = new THREE.Mesh( new THREE.PlaneGeometry( window.innerWidth, window.innerHeight, 18, 18 ), new THREE.MeshBasicMaterial( {
            color: 0x00ff00,
            opacity: 0,
            transparent: true
        } ));

        this.plane.visible = false;
        this.scene.add( this.plane );

        for ( let i = 0; i < 10; i++ ) {
            // create a cube and add to scene
            let cubeGeometry = new THREE.BoxGeometry( 2, 2, 2 );
            let cubeMaterial = new THREE.MeshLambertMaterial( { color: Math.random() * 0xffffff } );
            cubeMaterial.transparent = true;
            let cube = new THREE.Mesh( cubeGeometry, cubeMaterial );
            this.objects.push( cube );

            cube.scale.x = Math.random() + 0.5 * 2;
            cube.scale.y = Math.random() + 0.5 * 2;
            cube.scale.z = Math.random() + 0.5 * 2;

            cube.position.x = Math.random() * 50 - 25;
            cube.position.y = Math.random() * 50 - 25;
            cube.position.z = Math.random() * 50 - 25;

            cube.rotation.x = Math.random() * Math.PI * 2;
            cube.rotation.y = Math.random() * Math.PI * 2;
            cube.rotation.z = Math.random() * Math.PI * 2;
            this.scene.add( cube );
        };

		this.objects.push( this.ball );
        
        // add the output of the renderer to the html element
        document.body.appendChild( this.renderer.domElement );

        document.addEventListener( 'mousedown', this.eventDown.bind( this ), true ); 
        document.addEventListener( 'mousemove', this.eventMove.bind( this ) );
        document.addEventListener( 'mouseup', this.eventUp.bind( this ), true );        

    };

    eventMove( event ) {
        // make sure we don't access anything else
        event.preventDefault();

        // get the mouse positions
        this.mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
        this.mouse.y = -( event.clientY / window.innerHeight ) * 2 + 1;

        // get the 3D position and create a raycaster
        var vector = new THREE.Vector3( this.mouse.x, this.mouse.y, 0.5 );
        vector.unproject( this.camera );
        
        var raycaster = new THREE.Raycaster( this.camera.position,
                vector.sub( this.camera.position ).normalize() );

        // first check if we've already selected an object by clicking
        if ( this.selectedObject ) {
            // check the position where the plane is intersected
            this.plane.visible = true;
            var intersects = raycaster.intersectObject( this.plane );
            this.plane.visible = false;
            // reposition the selectedobject based on the intersection with the plane
            this.selectedObject.position.copy( intersects[0].point.sub( this.offset ) );

        } else {
            // if we haven't selected an object, we check if we might need
            // to reposition our plane. We need to do this here, since
            // we need to have this position before the onmousedown
            // to calculate the offset.
            var intersects = raycaster.intersectObjects( this.objects );

            if ( intersects.length > 0 ) {
                // now reposition the plane to the selected objects position
                this.plane.position.copy( intersects[0].object.position );
                // and align with the camera.
                this.plane.lookAt( this.camera.position );

            };
        };
    };

    eventDown( event ) {

        // get the mouse positions
        this.mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
        this.mouse.y = -( event.clientY / window.innerHeight ) * 2 + 1;

        // use the projector to check for intersections. First thing to do is unproject
        // the vector.
        var vector = new THREE.Vector3( this.mouse.x, this.mouse.y, 0.5 );
        // we do this by using the unproject function which converts the 2D mouse
        // position to a 3D vector.
        vector.unproject( this.camera );

        // now we cast a ray using this vector and see what is hit.
        var raycaster = new THREE.Raycaster( this.camera.position,
                vector.sub( this.camera.position ).normalize() );

        // intersects contains an array of objects that might have been hit
        var intersects = raycaster.intersectObjects( this.objects );

        if ( intersects.length > 0 ) {
            this.controls.enabled = false;

            // the first one is the object we'll be moving around
            this.selectedObject = intersects[0].object;

            // and calculate the offset
            this.plane.visible = true;
            intersects = raycaster.intersectObject( this.plane );
            this.plane.visible = false;
            this.offset.copy( intersects[0].point ).sub( this.plane.position );
        };
    };

    eventUp( event ) {
        this.controls.enabled = true;
        this.selectedObject = null;
    };

};

let scene3D = new Drag3D();


