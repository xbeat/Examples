
'use strict';

class DrawLib {

    constructor(){};

    static getGrid( sizeX, sizeZ, step, color ) {

        let adjSizeX = sizeX / 2.0;
        let adjSizeZ = sizeZ / 2.0;
        let geometry = new THREE.Geometry();
        let material = new THREE.LineBasicMaterial( { vertexColors: THREE.VertexColors, opacity: 0.2 } );

        for ( let i = - adjSizeX; i <= adjSizeX; i += step ) {

            for ( let j = - adjSizeZ; j <= adjSizeZ; j += step ) {

                geometry.vertices.push(
                    new THREE.Vector3( - adjSizeX, 0, j ), new THREE.Vector3( adjSizeX, 0, j ),
                    new THREE.Vector3( i, 0, - adjSizeZ ), new THREE.Vector3( i, 0, adjSizeZ )
                );

                geometry.colors.push( color, color, color, color );

            };

        };

        //let grid = new THREE.Line( geometry, material, THREE.LinePieces );
        let grid = new THREE.LineSegments( geometry, material )

        return grid;
    };

    static getSplinedLine( points, interpolationNum, color ) {

        let geometry = new THREE.Geometry();  
        //let spline = new THREE.Spline( points );
        let spline = new THREE.SplineCurve( points );

        for ( let i = 0; i < points.length * interpolationNum; i++ ) {
            let index = i / ( points.length * interpolationNum );
            let position = spline.getPoint( index );
            geometry.vertices[i] = new THREE.Vector3( position.z, position.y, position.x );
            geometry.colors[i] = color;
        };

        let material = new THREE.LineBasicMaterial( { color: color, opacity: 1.0, linewidth: 2 } );
        let line = new THREE.Line( geometry, material );

        return line;   
    };

};

class Shot {

    constructor( options ) {

        this.points = [];
        let initPoint = new ShotPoint();
        initPoint.position = new THREE.Vector3( 0, 0, 0 );

        options = options || {};

        // ball properties
        this.mass = 0.0459; // kg;
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
        this.initSpeedMPH = options.initSpeedMPH || 0.0;
        this.initVerticalAngleDegrees = options.initVerticalAngleDegrees || 0.0;
        this.initHorizontalAngleDegrees = options.initHorizontalAngleDegrees || 0.0;
        this.initBackspinRPM = options.initBackspinRPM || 0.0;
        this.initSpinAngle = options.initSpinAngle || 0.0;

        // simulation properties
        this.dt = options.dt || 0.001; //seconds

        // initial velocity        
        initPoint.velocity = this.getInitialVelocity( this.initSpeedMPH, this.smashFactor, this.initVerticalAngleDegrees, this.initHorizontalAngleDegrees );

        // initial angular velocity (spin rate)
        initPoint.angularVelocity = this.getInitialSpin( this.initBackspinRPM, this.initSpinAngle );

        this.projectShot( initPoint );
    };

    getInitialSpin( spinRPM, spinAngle ) {
        let spin = new THREE.Vector3(0, 0, 0);
        spin.x = -1; // full backspin
        spin.y = Math.sin( spinAngle * Math.PI / 180 );

        spin.normalize().multiplyScalar( spinRPM * 2 * Math.PI /60 );

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

class Scene3D extends DrawLib {

	constructor(){

		super();
		this.containerWidth;
		this.containerHeight;

		this.points = new Array();
		this.shot;
		this.line;

		this.sceneZOffset;
		this.displayStartTime;
		this.displaySpeed;

		// add renderer
		this.renderer = new THREE.WebGLRenderer( { antialias: true, alpha:true } );

		// add container
		this.container = document.getElementById( 'display-container' );
		this.container.appendChild( this.renderer.domElement );
		this.calculateContainerWidthHeight();

		// status elements
		this.statusElementTime = document.getElementById( 'status-time' );
		this.statusElementSpeed = document.getElementById( 'status-speed' );
		this.statusElementHeight = document.getElementById( 'status-height' );
		this.statusElementDistance = document.getElementById( 'status-distance' );
		this.statusElementSpin = document.getElementById( 'status-spin' );

		this.scene = new THREE.Scene();
		
		//this.camera = new THREE.PerspectiveCamera( 45, this.containerWidth / this.containerHeight, 0.1, 20000 );
		//this.camera.lookAt( this.scene.position );
		
		this.camera = new THREE.PerspectiveCamera( 40, this.containerWidth / this.containerHeight, 1, 5000 );
		this.camera.position.set( 200, 200, 200 );
		this.camera.lookAt( new THREE.Vector3( 0, 0, 0 ) );

		this.controls = new THREE.OrbitControls( this.camera, this.renderer.domElement );

		window.addEventListener( "resize", function() {
		    scope.camera.aspect = w / h;
		    scope.camera.updateProjectionMatrix();
		});

		// remove shaderlog warnings
		let ctx = this.renderer.context;
		ctx.getShaderInfoLog = function () { return '' };
		   
		//controls
		this.controls = new THREE.OrbitControls( this.camera );
		this.controls.rotateSpeed = 1.0;
		this.controls.zoomSpeed = 1.2;
		this.controls.panSpeed = 0.8;

		//const aLight = new THREE.AmbientLight( 0x222222 );
		//this.scene.add( aLight );

		//const dLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
		//this.scene.add( dLight );
		//dLight.position.set( 50, 20, 0 );

		//const hLight = new THREE.HemisphereLight( 0xffbf67, 0x15c6ff );
		//this.scene.add( hLight );

		const spotLight = new THREE.SpotLight();
        spotLight.position.set( 0, 80, 30 );
        spotLight.castShadow = true;
        this.scene.add( spotLight );

		const gridXZ = new THREE.GridHelper( 100, 10 );
		this.scene.add( gridXZ );

		//const helper = new THREE.CameraHelper( spotLight.shadow.camera );
		//this.scene.add( helper );

		// Note: coordinate unit of 1 = 1 meter
		this.shotControl = {
		    dt: 0.001, //seconds
		    displaySpeed: 1.0, // display time multiplier
		    initSpeedMPH: 50,
		    initVerticalAngleDegrees: 9,
		    initHorizontalAngleDegrees: 40,
		    initBackspinRPM: 6000,
		    initSpinAngle: 45,
		    shoot: this.beginShot.bind( this )
		};

		let gui = new dat.GUI( { autoPlace: false } );
		this.container.appendChild( gui.domElement );
		gui.add( this.shotControl, 'initSpeedMPH', 50, 150 );
		gui.add( this.shotControl, 'initVerticalAngleDegrees', 0, 90 );
		gui.add( this.shotControl, 'initHorizontalAngleDegrees', -45, 45 );
		gui.add( this.shotControl, 'initBackspinRPM', 0, 6000 );
		gui.add( this.shotControl, 'initSpinAngle', -45, 45 );
		gui.add( this.shotControl, 'displaySpeed', 0, 5 );
		gui.add( this.shotControl, 'shoot' );

		this.onWindowResize();
		window.addEventListener('resize', this.onWindowResize.bind( this ), false);

		this.addBouncingSphere();
		this.addFloor();
		this.addInitialElements();
		this.beginShot();
		this.animate();

	};

	animate() {
		let scope = this;
	    requestAnimationFrame( function() { scope.animate(); } );

	    this.controls.update();
	    this.renderer.render( this.scene, this.camera );

	    if ( this.shot ) {
	        this.updateShot();
	    };

	};

	calculateContainerWidthHeight() {
	    let comStyle = window.getComputedStyle( this.container, null );
	    this.containerWidth = parseInt( comStyle.getPropertyValue( "width" ), 10 );
	    this.containerHeight = parseInt( comStyle.getPropertyValue( "height" ), 10 );
	};

	onWindowResize() {
	    this.calculateContainerWidthHeight();
	    this.camera.aspect = this.containerWidth / this.containerHeight;
	    this.camera.updateProjectionMatrix();
	    this.renderer.setSize( this.containerWidth, this.containerHeight );
	};

	addInitialElements() {
	    
	    let scope = this;
	    let gridWidth = 60;
	    let gridHeight = 300;

	    this.sceneZOffset = -gridHeight/2.0;

	    // adjust camera position
	    this.camera.position.x = 0;
	    this.camera.position.y = 20;
	    this.camera.position.z = -gridHeight/2.0 * 1.3;

	    // add ground grid
	    let gridColor = new THREE.Color( 0x69ba6d )
	    let grid = DrawLib.getGrid( gridWidth, gridHeight, 10, gridColor );
	    grid.position.z = this.sceneZOffset + gridHeight / 2.0;

	    this.scene.add( grid );

	    let loader = new THREE.FontLoader();
	    loader.load( 'fonts/helvetiker_regular.typeface.json', function ( font ) {

	        // add marker indicators
	        let markerColor = 0x00ffff;
	        let textMesh = new THREE.MeshNormalMaterial();

	        let markerMeterage = 0;
	        while( markerMeterage < gridHeight ) {

	            // text
	            markerMeterage += 50;
	            let textGeometry = new THREE.TextGeometry( markerMeterage + "mt", {
	                size: 4,
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

	        };

	    });

	};

    addBouncingSphere() {
        let sphereGeometry = new THREE.SphereGeometry( 1.5, 20, 20 );
        let matProps = {
            specular: '#a9fcff',
            color: '#00abb1',
            emissive: '#006063',
            shininess: 10
        };

        let sphereMaterial = new THREE.MeshPhongMaterial( matProps );
        let sphereMesh = new THREE.Mesh( sphereGeometry, sphereMaterial );
        sphereMesh.castShadow = true;
        sphereMesh.name = 'sphere';
        this.scene.add( sphereMesh );
    };

    addFloor() {
        let floorGeometry = new THREE.PlaneGeometry( 100, 100, 20, 20 );
        let floorMaterial = new THREE.MeshPhongMaterial();
        floorMaterial.map = new THREE.TextureLoader().load( 'img/floor_2-1024x1024.jpg' )

        floorMaterial.map.wrapS = floorMaterial.map.wrapT = THREE.RepeatWrapping;
        floorMaterial.map.repeat.set( 8, 8 );
        
        let floorMesh = new THREE.Mesh( floorGeometry, floorMaterial );
        floorMesh.receiveShadow = true;
        floorMesh.rotation.x = -0.5 * Math.PI;
        this.scene.add( floorMesh );
    };

	beginShot() {

		this.points.length = 0
		this.scene.remove( this.line );
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

	        // draw interpolated line
	        let newline = DrawLib.getSplinedLine( this.points, splineInterpolationNum, lineColor );
	        this.scene.remove( this.line );
	        this.line = newline;
	        this.line.position.set( 0, 0, this.sceneZOffset );
	        this.scene.add( this.line );

	        this.statusElementTime.innerHTML = ( displayTimeElapsed / 1000 ).toFixed( 1 ) + ' s';
	        this.statusElementSpeed.innerHTML = point.velocity.length().toFixed( 1 ) + ' mps';
	        this.statusElementHeight.innerHTML = point.position.y.toFixed( 0 ) + ' p.y mt';
	        this.statusElementDistance.innerHTML = point.position.z.toFixed( 0 ) + ' p.z mt';
	        this.statusElementSpin.innerHTML = point.angularVelocity.length().toFixed( 0 ) + ' rpm';

	        let sphere = this.scene.getObjectByName( 'sphere' );
	        sphere.position.set( 0, point.position.y, point.position.z - 150 );


	    };
	};

};

let scene3D = new Scene3D();

class SoccerBall extends Scene3D{
    
    constructor(){

    	super();
		this.dt;
		this.animTime = 20;
		this.t0 = new Date().getTime(); 
		this.t = 0;
		this.RAF;

	    this.velocity = {
	    	x: 1.2,
	    	y: 0,
	    	z: 1.2
	    };

	    this.angle = {
	    	direction: 10,
	    	inclination: 30
	    };

	    this.position = {
	    	x: 10,
	    	y: 0,
	    	z: 10

	    };

		this.force = 0.3

	    this.kick ( this.angle, this.force )

	    this.render();
	};

	onTimer(){
		
		this.t1 = new Date().getTime(); 
		this.dt = 0.001 * ( this.t1 - this.t0 ); 
		this.t0 = this.t1;
		
		if ( this.dt > 0.2 ) { 
			this.dt = 0; 
		};	
		
		this.t += this.dt;
		
		if ( this.t < this.animTime ){
			this.move( this.t );
		} else {
			this.stop();
		};
	
	};


	render() {

		const scope = this;
        let sphere = this.scene.getObjectByName( 'sphere' );

		this.renderer.render( this.scene, this.camera );
		this.camera.getWorldDirection( this.CameraLookAt );
		
		if ( this.followObject ){
			this.camera.lookAt( sphere.position );
        } else {
			//this.camera.lookAt( new THREE.Vector3( 0, 0, 0 ) );
			this.camera.lookAt( this.CameraLookAt );
        };

        //this.step += 0.02;
        //sphere.position.x = 0 + ( 10 * ( Math.cos( this.step ) ) );
        //sphere.position.y = 0.75 * Math.PI / 2 + ( 6 * Math.abs( Math.sin( this.step ) ) );
		
        this.onTimer();

		this.RAF = requestAnimationFrame( function() { scope.render(); } );

	};

    kick( angle, force ) {

        // calculate based on direction
        this.velocity.x = force * Math.cos( angle.direction );
        this.velocity.y = force * Math.sin( angle.direction );
        // take into account inclination
        this.velocity.z = force * Math.sin( angle.inclination );
        this.velocity.x *= Math.cos( angle.inclination );
        this.velocity.y *= Math.cos( angle.inclination );

    };

    getInitialVelocity( speedMPS, smashFactor, verticalDegrees, horizontalDegrees ) {

        let velocity = new THREE.Vector3( 0, 0, 0 );
        velocity.x = Math.sin( -1 * horizontalDegrees * Math.PI / 180 );
        velocity.y = Math.sin( verticalDegrees * Math.PI / 180 );
        velocity.z = Math.cos( verticalDegrees * Math.PI / 180 );

        let ballSpeed = speedMPS * smashFactor;        

        return velocity.normalize().multiplyScalar( ballSpeed );
    };

    move( delta_time ) {
        // this function assumes our location
        // units are in meters
        // and our velocity units
        // are in meters/second

 		let sphere = this.scene.getObjectByName( 'sphere' );

        this.gravityMagnitude = -9.8; // 9.8 m/s^2
        this.airDensity = 1.2041; // kg/m^3

        // apply gravity
        this.velocity.z -= 9.8 * delta_time;

        // move
        sphere.position.x += this.velocity.x * delta_time;
        sphere.position.y += this.velocity.y * delta_time;
        sphere.position.z += this.velocity.z * delta_time;
    };

    stop() {
    	cancelAnimationFrame ( this.RAF );
        console.log( stop );
    };

};

//let soccerBall = new SoccerBall();





