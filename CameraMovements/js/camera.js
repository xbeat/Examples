
////////////////////////
// 3D Camera
///Basic scene

const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true } );
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

const camera = new THREE.PerspectiveCamera( 40, window.innerWidth / window.innerHeight, 1, 1000 );

window.addEventListener( "resize", ( function size() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  })()
);

// remove shaderlog warnings
let ctx = renderer.context;
ctx.getShaderInfoLog = function () { return '' };
   
const orbitControl = new THREE.OrbitControls( camera );

const aLight = new THREE.AmbientLight( 0x222222 );
scene.add( aLight );

const dLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
scene.add( dLight );
dLight.position.set( 50, 20, 0 );

const gridXZ = new THREE.GridHelper( 100, 10 );
scene.add( gridXZ );

const helper = new THREE.CameraHelper( dLight.shadow.camera );
scene.add( helper );

camera.position.y = 20;
camera.position.z = 20;
camera.position.x = 20;
camera.lookAt( new THREE.Vector3(0, 0, 0) );

( function animate() {
  requestAnimationFrame( animate );
  renderer.render( scene, camera );
  orbitControl.update();
} )();

/////////////////////////
// 3D + Camera preset
let cameraPresets = [
  {
    position: {
      x: -2965.8590458155036,
      y: 2235.5054451015108,
      z: 3467.8805523319147
    },
    rotation: {
      x: -0.5725920499272357,
      y: -0.6232494536532424,
      z: -0.35987178331501773
    }
  },
  {
    position: {
      x: 0,
      y: 1e4,
      z: 0
    },
    rotation: {
      x: -Math.PI / 2,
      y: 0,
      z: 0
    }
  },
  {
    position: {
      x: 4952.937923945333,
      y: -75.39736997065991,
      z: 1132.5728047255002
    },
    rotation: {
      x: 0.06647368377615936,
      y: 1.345513565303963,
      z: -0.06479871684945059
    }
  },
  {
    position: {
      x: 0,
      y: 0,
      z: 5080
    },
    rotation: {
      x: 0,
      y: 0,
      z: 0
    }
  },
  {
    position: {
      x: 1220,
      y: 400,
      z: 2080
    },
    rotation: {
      x: -0.2725920499272357,
      y: -0.1232494536532424,
      z: -0.05987178331501773
    }
  }  
];

let heavenPreset = {
	position: {
		x: -340.39172412110474,
		y: 210.1353999906835,
		z: 403.68047358695467
	},
	rotation: {
		x: -0.4799512237452751,
		y: -0.6421887695903379,
		z: -0.3022310914885656
	}
};

let hellPreset = {
	position: {
		x: 84.14507216747498,
		y: 56.819398648365755,
		z: 94.01286879037296
	},
	rotation: {
		x: -0.5436330948854619,
		y: 0.6536657347543198,
		z: 0.35219959109808424
	}
};

/**
* Tween
*/
class cameraView {

	constructor( mode, cameraPresets, duration ){
		this.duration = duration;
		this.cameraPresets = cameraPresets;

		this.options =  {
			onUpdate: function( position, rotation ) {
				camera.position.x = position.x;				
				camera.position.y = position.y;
				camera.position.z = position.z;
				camera.rotation.x = rotation.x;
				camera.rotation.y = rotation.y;
				camera.rotation.z = rotation.z;						
			},

			onComplete: function() {
				console.log( "complete" );
			},

			ease: Easing.easeOutCubic
		};

		this.onComplete = this.options.onComplete;
		this.onUpdate = this.options.onUpdate;
		this.ease = this.options.ease;
		
		this[mode]();
	};

	tween() {
		this.cameraStart = {
			position: new THREE.Vector3(),
			rotation: new THREE.Vector3(),
			fov: 0
		};

		this.cameraStart.position.copy( camera.position );
		this.cameraStart.rotation.copy( camera.rotation );
		this.cameraStart.fov = camera.fov;
		this.cameraEnd = this.cameraPresets;
		
		// Animation start time
		this.start = Date.now();
		this.animate();
	};

	lerp( min, max, amount ) {
		return min + amount * (max - min);
	};

	animate() {
		let now = Date.now();
		let t = this.duration > 0 ? (now - this.start) / this.duration : 1;
		let progress = this.ease( t );
		let position = new Object;
		let rotation = new Object;

		position.x = this.lerp( this.cameraStart.position.x, this.cameraEnd.position.x / 20, progress );
		position.y = this.lerp( this.cameraStart.position.y, this.cameraEnd.position.y / 20, progress );
		position.z = this.lerp( this.cameraStart.position.z, this.cameraEnd.position.z / 20, progress );
		rotation.x = this.lerp( this.cameraStart.rotation.x, this.cameraEnd.rotation.x, progress );
		rotation.y = this.lerp( this.cameraStart.rotation.y, this.cameraEnd.rotation.y, progress );
		rotation.z = this.lerp( this.cameraStart.rotation.z, this.cameraEnd.rotation.z, progress );		
		
		// If complete
		if ( t >= 1 ) {
			this.onUpdate( position, rotation );
			this.onComplete( position, rotation );
		} else {
			// Run update callback and loop until finished
			this.onUpdate( position, rotation );
			let scope = this;
			requestAnimationFrame( function() { scope.animate(); } );
		};
	};

	direct() {
		camera.position.x = this.cameraPresets.position.x;				
		camera.position.y = this.cameraPresets.position.y;
		camera.position.z = this.cameraPresets.position.z;
		camera.rotation.x = this.cameraPresets.rotation.x;
		camera.rotation.y = this.cameraPresets.rotation.y;
		camera.rotation.z = this.cameraPresets.rotation.z;		
	};

};

var presetButton = document.getElementById( "camera-presets" ).getElementsByTagName( "li" );
presetButton[0].addEventListener("click", function() {
  new cameraView( "tween", cameraPresets[0], 1000 );
}, false);

presetButton[1].addEventListener("click", function() {
  new cameraView( "tween", cameraPresets[1], 1000 );
}, false);

presetButton[2].addEventListener("click", function() {
  new cameraView( "tween", cameraPresets[2], 1000 );
}, false);

presetButton[3].addEventListener("click", function() {
  new cameraView( "tween", cameraPresets[3], 1000 );
}, false);

presetButton[4].addEventListener("click", function() {
  new cameraView( "direct", hellPreset, null );
}, false);

presetButton[5].addEventListener("click", function() {
  new cameraView( "tween", cameraPresets[4], 1000 );
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
