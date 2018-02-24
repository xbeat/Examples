
'use strict';

////////////////////////
// 3D Camera
//

class Scene3D{

	constructor(){
		const scope = this;
		const w = window.innerWidth;
		const h = window.innerHeight;

		this.scene = new THREE.Scene();
		this.renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true } );
		
		this.renderer.setSize( w, h );
		document.body.appendChild( this.renderer.domElement );

		this.camera = new THREE.PerspectiveCamera( 40, w / h, 1, 5000 );
		this.camera.position.set( 20, 20, 20 );
		this.camera.lookAt( new THREE.Vector3(0, 0, 0) );

		window.addEventListener( "resize", ( function size() {
		    scope.camera.aspect = w / h;
		    scope.camera.updateProjectionMatrix();
		  })()
		);

		// remove shaderlog warnings
		let ctx = this.renderer.context;
		ctx.getShaderInfoLog = function () { return '' };
		   
			//controls
		this.controls = new THREE.OrbitControls( this.camera );
		this.controls.rotateSpeed = 1.0;
		this.controls.zoomSpeed = 1.2;
		this.controls.panSpeed = 0.8;

		const aLight = new THREE.AmbientLight( 0x222222 );
		this.scene.add( aLight );

		const dLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
		this.scene.add( dLight );
		dLight.position.set( 50, 20, 0 );

		const hLight = new THREE.HemisphereLight( 0xffbf67, 0x15c6ff );
		this.scene.add( hLight );

		const gridXZ = new THREE.GridHelper( 100, 10 );
		this.scene.add( gridXZ );

		const helper = new THREE.CameraHelper( dLight.shadow.camera );
		this.scene.add( helper );

		// Torus Geometry
		const torus = new THREE.Mesh( new THREE.TorusGeometry( 6, 2.5, 40, 40 ), new THREE.MeshNormalMaterial() );
		torus.position.set( 0, 0, 0 );
		this.scene.add( torus );
		
		this.animate();

	};

	animate() {
		const scope = this;
		requestAnimationFrame( function() { scope.animate(); } );
		this.renderer.render( this.scene, this.camera );
		this.controls.update();
	};

};

let scene3D = new Scene3D();


/**
* 3D Camera 
*/
class cameraShot {

	constructor( camera, mode, cameraPresets, duration ){
		this.duration = duration;
		this.cameraEnd = cameraPresets;
		this.ease = Easing.easeOutCubic;
		this.camera = camera;
		this.position = new Object;
		this.rotation = new Object;
		this[mode]();

	};

	onUpdate() {
		this.camera.position.set( this.position.x, this.position.y, this.position.z );
		this.camera.rotation.set( this.rotation.x, this.rotation.y, this.rotation.z );
		this.camera.lookAt( new THREE.Vector3( 0, 0, 0 ) );
	};

	onComplete() {
		this.camera.lookAt( new THREE.Vector3( 0, 0, 0 ) );
		console.log( "complete" );
	};

	tween() {
		this.cameraStart = {
			position: new THREE.Vector3(),
			rotation: new THREE.Vector3(),
			fov: 0
		};

		this.cameraStart.position.copy( this.camera.position );
		this.cameraStart.rotation.copy( this.camera.rotation );
		this.cameraStart.fov = this.camera.fov;
		
		
		// Animation start time
		this.start = Date.now();
		this.animate();
	};

	direct() {
		this.camera.position.set( this.cameraEnd.position.x, this.cameraEnd.position.y, this.cameraEnd.position.z );
		this.camera.rotation.set( this.cameraEnd.rotation.x, this.cameraEnd.rotation.y, this.cameraEnd.rotation.z );
		this.camera.lookAt( new THREE.Vector3( 0, 0, 0 ) );
	};

	lerp( min, max, amount ) {
		return min + amount * ( max - min );
	};

	animate() {
		let now = Date.now();
		let t = this.duration > 0 ? ( now - this.start ) / this.duration : 1;
		let progress = this.ease( t );
		const scope = this;

		if ( t <= 1 ) {
			this.position.x = this.lerp( this.cameraStart.position.x, this.cameraEnd.position.x / 20, progress );
			this.position.y = this.lerp( this.cameraStart.position.y, this.cameraEnd.position.y / 20, progress );
			this.position.z = this.lerp( this.cameraStart.position.z, this.cameraEnd.position.z / 20, progress );
			this.rotation.x = this.lerp( this.cameraStart.rotation.x, this.cameraEnd.rotation.x, progress );
			this.rotation.y = this.lerp( this.cameraStart.rotation.y, this.cameraEnd.rotation.y, progress );
			this.rotation.z = this.lerp( this.cameraStart.rotation.z, this.cameraEnd.rotation.z, progress );		
		};

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
    position: { x: -2965.8590458155036, y: 2235.5054451015108, z: 3467.8805523319147 },
    rotation: { x: -0.5725920499272357, y: -0.6232494536532424, z: -0.35987178331501773 }
  },
  {
    position: { x: 0, y: 1e4, z: 0 },
    rotation: { x: -Math.PI / 2, y: 0, z: 0 }
  },
  {
    position: { x: 4952.937923945333, y: -75.39736997065991, z: 1132.5728047255002 },
    rotation: { x: 0.06647368377615936, y: 1.345513565303963, z: -0.06479871684945059 }
  },
  {
    position: { x: 0, y: 0, z: 5080 },
    rotation: { x: 0, y: 0, z: 0 }
  },
  {
    position: { x: 1220, y: 400, z: 2080 },
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


var presetButton = document.getElementById( "camera-presets" ).getElementsByTagName( "li" );
presetButton[0].addEventListener("click", function() {
  new cameraShot( scene3D.camera, "tween", cameraPresets[0], 1000 );
}, false);

presetButton[1].addEventListener("click", function() {
  new cameraShot( scene3D.camera, "tween", cameraPresets[1], 1000 );
}, false);

presetButton[2].addEventListener("click", function() {
  new cameraShot( scene3D.camera, "tween", cameraPresets[2], 1000 );
}, false);

presetButton[3].addEventListener("click", function() {
  new cameraShot( scene3D.camera, "tween", cameraPresets[3], 1000 );
}, false);

presetButton[4].addEventListener("click", function() {
  new cameraShot( scene3D.camera, "direct", hellPreset, null );
}, false);

presetButton[5].addEventListener("click", function() {
  new cameraShot( scene3D.camera, "tween", cameraPresets[4], 1000 );
}, false);

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
