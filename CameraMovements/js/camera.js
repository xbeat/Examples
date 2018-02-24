
'use strict';

/**
* 3D Scene 
*/

class Scene3D{

	constructor(){
		const scope = this;
		const w = window.innerWidth;
		const h = window.innerHeight;
		this.step = 0;
		this.followObject = false;
		this.lastCameraLookAt = new THREE.Vector3(0, 0, 0);

		this.scene = new THREE.Scene();
		this.renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true } );
		
		this.renderer.setSize( w, h );
		this.renderer.shadowMap.enabled = true;

		document.body.appendChild( this.renderer.domElement );

		this.camera = new THREE.PerspectiveCamera( 40, w / h, 1, 5000 );
		this.camera.position.set( 200, 200, 200 );
		this.camera.lookAt( new THREE.Vector3( 0, 0, 0 ) );

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

		const helper = new THREE.CameraHelper( spotLight.shadow.camera );
		this.scene.add( helper );

		// Torus Geometry
		//const torus = new THREE.Mesh( new THREE.TorusGeometry( 6, 2.5, 40, 40 ), new THREE.MeshNormalMaterial() );
		//torus.position.set( 0, 0, 0 );
		//this.scene.add( torus );
		
		this.addBouncingSphere();
		this.addFloor();
		this.addCube();

		this.render();

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
        sphereMesh.position.y = 0.75 * Math.PI / 2;
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

    addCube() {
        let cubeGeometry = new THREE.BoxGeometry( 2.5, 4.5, 20 );
        let cubeMaterial = new THREE.MeshLambertMaterial( { color: 0xff0000 } );
        let cubeMesh = new THREE.Mesh( cubeGeometry, cubeMaterial );
        cubeMesh.castShadow = true;
        cubeMesh.receiveShadow = true;
        cubeMesh.position.z = -5;
        this.scene.add( cubeMesh );
    };

	render() {
		const scope = this;

        let sphere = this.scene.getObjectByName( 'sphere' );
		this.renderer.render( this.scene, this.camera );

		if ( this.followObject ){
			this.lastCameraLookAt.copy( sphere.position ); 
			this.camera.lookAt( sphere.position );
        } else {
			this.camera.lookAt( this.lastCameraLookAt );        	
        };

        this.step += 0.02;
        sphere.position.x = 0 + ( 10 * ( Math.cos( this.step ) ) );
        sphere.position.y = 0.75 * Math.PI / 2 + ( 6 * Math.abs( Math.sin( this.step ) ) );
		
		requestAnimationFrame( function() { scope.render(); } );

	};

};

/**
* 3D Camera 
*/
class CameraShot {

	constructor( scene ){
		this.camera = scene.camera;
		this.controls = scene.controls;
		this.followObject = scene.followObject;
		this.lastCameraLookAt = scene.lastCameraLookAt;
		this.position = new Object();
		this.rotation = new Object();
		//this[mode]();
	};

	onUpdate() {
		this.camera.position.set( this.position.x, this.position.y, this.position.z );
		this.camera.rotation.set( this.rotation.x, this.rotation.y, this.rotation.z );
		this.camera.lookAt( this.lastCameraLookAt );
	};

	onComplete() {
		console.log( "complete" );
		this.followObject = true;
	};

	tween( cameraPresets, duration, ease ) {
		this.followObject = false;
		this.ease = ease;
		this.duration = duration;
		this.cameraEnd = cameraPresets;

		this.cameraStart = {
			position: new THREE.Vector3(),
			rotation: new THREE.Vector3()
		};

		this.cameraStart.position.copy( this.camera.position );
		this.cameraStart.rotation.copy( this.camera.rotation );
		
		// Animation start time
		this.start = Date.now();
		this.animate();
	};

	direct( cameraPresets ) {
		this.camera.position.set( cameraPresets.position.x, cameraPresets.position.y, cameraPresets.position.z );
		this.camera.rotation.set( cameraPresets.rotation.x, cameraPresets.rotation.y, cameraPresets.rotation.z );
		this.camera.lookAt( this.lastCameraLookAt );
	};

	lerp( min, max, amount ) {
		return min + amount * ( max - min );
	};

	animate() {
		let now = Date.now();
		let t = this.duration > 0 ? ( now - this.start ) / this.duration : 1;
		let progress = this.ease( t );
		const scope = this;

		this.position.x = this.lerp( this.cameraStart.position.x, this.cameraEnd.position.x, progress );
		this.position.y = this.lerp( this.cameraStart.position.y, this.cameraEnd.position.y, progress );
		this.position.z = this.lerp( this.cameraStart.position.z, this.cameraEnd.position.z, progress );
		this.rotation.x = this.lerp( this.cameraStart.rotation.x, this.cameraEnd.rotation.x, progress );
		this.rotation.y = this.lerp( this.cameraStart.rotation.y, this.cameraEnd.rotation.y, progress );
		this.rotation.z = this.lerp( this.cameraStart.rotation.z, this.cameraEnd.rotation.z, progress );		

		// If complete
		if ( t >= 1 ) {
			this.onUpdate();
			this.onComplete();
		} else {
			// Run update callback and loop until finished
			this.onUpdate();
			requestAnimationFrame( function() { scope.animate(); } );
		};

	};

};

/////////////////////////
// 3D Camera preset
let cameraPresets = [
  {
    position: { x: -296.8590458155036, y: 223.5054451015108, z: 346.8805523319147 },
    rotation: { x: -0.5725920499272357, y: -0.6232494536532424, z: -0.35987178331501773 }
  },
  {
    position: { x: 0, y: 100, z: 0 },
    rotation: { x: -Math.PI / 2, y: 0, z: 0 }
  },
  {
    position: { x: 495.937923945333, y: -75.39736997065991, z: 113.5728047255002 },
    rotation: { x: 0.06647368377615936, y: 1.345513565303963, z: -0.06479871684945059 }
  },
  {
    position: { x: 0, y: 0, z: 508 },
    rotation: { x: 0, y: 0, z: 0 }
  },
  {
    position: { x: 122, y: 40, z: 108 },
    rotation: { x: -0.2725920499272357, y: -0.1232494536532424, z: -0.05987178331501773 }
  }  
];

let heavenPreset = {
	position: {	x: -340.39172412110474,	y: 210.1353999906835, z: 403.68047358695467	},
	rotation: {	x: -0.4799512237452751,	y: -0.6421887695903379,	z: -0.3022310914885656 }
};

let hellPreset = {
	position: {	x: 84.14507216747498, y: 56.819398648365755, z: 94.01286879037296 },
	rotation: { x: -0.5436330948854619,	y: 0.6536657347543198, z: 0.35219959109808424 }
};


let presetButton = document.getElementsByClassName( "preset-button" );

let scene3D = new Scene3D();
let cameraShot = new CameraShot( scene3D );

presetButton[0].addEventListener( "click", function() {
  cameraShot.tween( cameraPresets[0], 1000, Easing.easeOutCubic );
}, false );

presetButton[1].addEventListener( "click", function() {
  cameraShot.tween( cameraPresets[1], 1000, Easing.easeOutCubic );
}, false );
 
presetButton[2].addEventListener( "click", function() {
  cameraShot.tween( cameraPresets[2], 1000, Easing.easeOutCubic );
}, false );

presetButton[3].addEventListener( "click", function() {
  cameraShot.tween( cameraPresets[3], 1000, Easing.easeOutCubic );
}, false );

presetButton[4].addEventListener( "click", function() {
  cameraShot.direct( hellPreset );
}, false );

presetButton[5].addEventListener( "click", function() {
  cameraShot.tween( cameraPresets[4], 1000, Easing.easeOutCubic );
}, false );

presetButton[6].addEventListener( "click", function() {
  scene3D.followObject = scene3D.followObject == true ? false : true;
}, false );
/*
* Easing Functions
* only considering the t value for the range [0, 1] => [0, 1]
*/
var Easing = {
	// no easing, no acceleration
	linear: function linear(t) {
		return t;
	},
	// accelerating from zero velocity
	easeInQuad: function easeInQuad(t) {
		return t * t;
	},
	// decelerating to zero velocity
	easeOutQuad: function easeOutQuad(t) {
		return t * (2 - t);
	},
	// acceleration until halfway, then deceleration
	easeInOutQuad: function easeInOutQuad(t) {
		return t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
	},
	// accelerating from zero velocity
	easeInCubic: function easeInCubic(t) {
		return t * t * t;
	},
	// decelerating to zero velocity
	easeOutCubic: function easeOutCubic(t) {
		return --t * t * t + 1;
	},
	// acceleration until halfway, then deceleration
	easeInOutCubic: function easeInOutCubic(t) {
		return t < .5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
	},
	// accelerating from zero velocity
	easeInQuart: function easeInQuart(t) {
		return t * t * t * t;
	},
	// decelerating to zero velocity
	easeOutQuart: function easeOutQuart(t) {
		return 1 - --t * t * t * t;
	},
	// acceleration until halfway, then deceleration
	easeInOutQuart: function easeInOutQuart(t) {
		return t < .5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t;
	},
	// accelerating from zero velocity
	easeInQuint: function easeInQuint(t) {
		return t * t * t * t * t;
	},
	// decelerating to zero velocity
	easeOutQuint: function easeOutQuint(t) {
		return 1 + --t * t * t * t * t;
	},
	// acceleration until halfway, then deceleration
	easeInOutQuint: function easeInOutQuint(t) {
		return t < .5 ? 16 * t * t * t * t * t : 1 + 16 * --t * t * t * t * t;
	},
	// elastic bounce effect at the beginning
	easeInElastic: function easeInElastic(t) {
		return (.04 - .04 / t) * Math.sin(25 * t) + 1;
	},
	// elastic bounce effect at the end
	easeOutElastic: function easeOutElastic(t) {
		return .04 * t / --t * Math.sin(25 * t);
	},
	// elastic bounce effect at the beginning and end
	easeInOutElastic: function easeInOutElastic(t) {
		return (t -= .5) < 0 ? (.01 + .01 / t) * Math.sin(50 * t) : (.02 - .01 / t) * Math.sin(50 * t) + 1;
	}
};
