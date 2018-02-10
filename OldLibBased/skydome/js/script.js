/**
 *
 * WebGL With Three.js - Lesson 5 - spherical skybox and bubble
 * http://www.script-tutorials.com/webgl-with-three-js-lesson-5/
 *
 * Licensed under the MIT license.
 * http://www.opensource.org/licenses/mit-license.php
 * 
 * Copyright 2014, Script Tutorials
 * http://www.script-tutorials.com/
 */
var player = [], animation = [];

var lesson5 = {
    scene: null,
    camera: null,
    renderer: null,
    container: null,
    controls: null,
    clock: null,
    stats: null,
    bSphere: null,
    bSphereCamera: null,
	
    init: function() { // Initialization
	    
        // create main scene
        this.scene = new THREE.Scene();

        var SCREEN_WIDTH = window.innerWidth,
            SCREEN_HEIGHT = window.innerHeight;

	    var loader = new THREE.ColladaLoader();
		var stadium;
		loader.options.convertUpAxis = true;
	    loader.load( 'models/archive/pitch/De+Nieuwe+Kuip_pitch.dae', function ( collada ) {
	        stadium = collada.scene;
	        stadium.scale.x = stadium.scale.y = stadium.scale.z = 0.05;
	     	stadium.rotation.y = 90 * (Math.PI / 180);
	     	//dae.rotation.x = 1 * (Math.PI / 180);
	     	stadium.position.z = 0;
	     	stadium.castShadow = true;
			stadium.receiveShadow = true;
	        stadium.updateMatrix();
	        lesson5.scene.add( stadium );			
		} ); 

		///////////
		//players
		loader.load( 'models/archive/playerDAE/jog_forward2.dae', function ( collada ) {
			var playerObj = collada.scene;
		    for (var playerNum = 0; playerNum < 22; playerNum++) {
			
	    		player[playerNum] = playerObj.clone();      
				player[playerNum].traverse( function ( child ) {
					if ( child instanceof THREE.SkinnedMesh ) {
						animation[playerNum] = new THREE.Animation( child, child.geometry.animation );
						//if(i == 5) 
						animation[playerNum].play();
					}
				} );
		
				player[playerNum].scale.x = player[playerNum].scale.y = player[playerNum].scale.z = 0.018;
				player[playerNum].position.y = 1;
				//player[playerNum].position.x = 0.3*playerNum;
				player[playerNum].rotation.x = 90 * (Math.PI / 180);
				player[playerNum].castShadow = true;
				player[playerNum].receiveShadow = true;
				
				player[playerNum].updateMatrix();
				lesson5.scene.add( player[playerNum] );
				
				//x = getRandomInt(-18.5, 18.5);
				//z = getRandomInt(-12, 12);
				//addPlayer(x, z, playerNum);
				
			}
			animatePlayer();

		} );

		

        // prepare camera
        var VIEW_ANGLE = 45, ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT, NEAR = 1, FAR = 1000;
        this.camera = new THREE.PerspectiveCamera( VIEW_ANGLE, ASPECT, NEAR, FAR);
        this.scene.add(this.camera);
        this.camera.position.set(0, 0, 300);
        this.camera.lookAt(new THREE.Vector3(0,0,0));

        // prepare renderer
        this.renderer = new THREE.WebGLRenderer({antialias:true, alpha: true});
        this.renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
        this.renderer.setClearColor( 0x000000, 0 );
		this.renderer.setPixelRatio(window.devicePixelRatio);

        this.renderer.shadowMapEnabled = true;
        this.renderer.shadowMapSoft = true;

        // prepare container
        this.container = document.getElementById('container');
        this.container.appendChild(this.renderer.domElement);

        // events
        //THREEx.WindowResize(this.renderer, this.camera);

        // prepare controls (OrbitControls)
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.target = new THREE.Vector3(0, 0, 0);
        this.controls.maxDistance = 700;

        // prepare clock
        this.clock = new THREE.Clock();

        // prepare stats
        this.stats = new Stats();
        this.stats.domElement.style.position = 'absolute';
        this.stats.domElement.style.left = '50px';
        this.stats.domElement.style.bottom = '50px';
        this.stats.domElement.style.zIndex = 1;
        this.container.appendChild( this.stats.domElement );

        // add point light
        var spLight = new THREE.PointLight(0xdddddd, 1.75, 1000);
        spLight.position.set(-100, 200, 200);
        this.scene.add(spLight);


	    // Lights
	    var light = new THREE.DirectionalLight( 0xffffff );
	    light.position.set( 1, 1, 1 );
	    this.scene.add( light );
	
	    light = new THREE.DirectionalLight( 0x999999 );
	    light.position.set( -1, -1, -1 );
	    this.scene.add( light );
	
	    //light = new THREE.AmbientLight( 0x555555 );
	    //this.scene.add( light );

        // add simple cube
        var cube = new THREE.Mesh( new THREE.CubeGeometry(240, 210, 240), new THREE.MeshLambertMaterial({color:0xff0000 * Math.random()}) );
        cube.position.set(75, 0, 0);
        //this.scene.add(cube);

        // add spherical skybox
        this.drawSphericalSkybox();

        // add bubble object
        //this.drawBubbleObject();
    },
    drawSphericalSkybox: function() {
        // prepare ShaderMaterial
        var uniforms = {
            texture: { type: 't', value: THREE.ImageUtils.loadTexture('images/stadium.jpg') }
        };
        
        
        var skyMaterial = new THREE.ShaderMaterial( {
            uniforms: uniforms,
            vertexShader: document.getElementById('sky-vertex').textContent, fragmentShader: document.getElementById('sky-fragment').textContent
        });

        // create Mesh with sphere geometry and add to the scene
        var skyBox = new THREE.Mesh(new THREE.SphereGeometry(150, 160, 140), skyMaterial);
        skyBox.scale.set(-1, 1, 1);
        skyBox.eulerOrder = 'XZY';
        skyBox.renderDepth = 1500.0;

        this.scene.add(skyBox);
        
    }
    /*
    ,
    drawBubbleObject: function() {
		
        // create additional camera
        this.bSphereCamera = new THREE.CubeCamera(0.1, 1000, 1000);
        this.scene.add(this.bSphereCamera);

        // prepare custom ShaderMaterial
        var uniforms =  {
            "mRefractionRatio": { type: "f", value: 1.02 },
            "mBias":     { type: "f", value: 0.1 },
            "mPower":    { type: "f", value: 2.0 },
            "mScale":    { type: "f", value: 1.0 },
            "tCube":     { type: "t", value: this.bSphereCamera.renderTarget } //  textureCube }
        };

        // create custom material for the shader
        var customMaterial = new THREE.ShaderMaterial({
            uniforms:       uniforms,
            vertexShader:   document.getElementById('bubble-vertex').textContent,
            fragmentShader: document.getElementById('bubble-fragment').textContent
        });

        // create spherical mesh
        this.bSphere = new THREE.Mesh( new THREE.SphereGeometry(50, 32, 32), customMaterial);
        this.bSphere.position.set(-75, 0, 0);
        //this.scene.add(this.bSphere);

        this.bSphereCamera.position = this.bSphere.position;
    }
    */
};

// Animate the scene
function animate() {
    requestAnimationFrame(animate);
    render();
    update();
}

function animatePlayer() {
	var ball = {},
			playerA = {},
			playerB = {},
			action = {};

	var minX = 35,
			maxX = 370,
			minY = 22,
			maxY = 205,
			minT = 2500,
			maxT = 8500;

	var easing = {
		// easing equation
		easeInOutSine: (function(t) {
			return -1 / 2 * (Math.cos(Math.PI * t) - 1);
		})			
	};

	ball.x = 10,
	ball.y = 10,
	playerA.x = 10,
	playerA.y = 10,
	playerB.x = 10,
	playerB.y = 10;

	// The animation equation with user friendly argument
	// This will take care of normalization before calling the easing equation,     
	// * tickHook - function that get called on each tick with the updated number
	// * startX - initial value
	// * endX - final value
	// * startY - initial value
	// * endY - final value			
	// * duration - how long animation last in milliseconds
	// * callback - (optional) function to call when animation finishes
	// * easingEq - (optional) easing equation
	var animateObj = function(startX, endX, startY, endY, duration, obj, num) {
		var changeInX = endX - startX,
			changeInY = endY - startY,
			startTime = new Date().getTime(),
			engine = function() {
				var now = new Date().getTime(),
					timeNorm = (now - startTime) / duration,
					completionNorm = easing.easeInOutSine(timeNorm),
					newNumX = startX + completionNorm * changeInX,
					newNumY = startY + completionNorm * changeInY;

				if (now - startTime > duration) {
					// clearTimeout(engine);
					//if (callback) {	
						callback(obj, endX, endY, num);
					//}
				} else {
					tickHook(newNumX, newNumY, obj, num);						
					requestAnimationFrame(engine);								
				}
			};
			requestAnimationFrame(engine);
	},

	tickHook = function(newNumberX, newNumberY, obj, num) {
		obj.style.left = newNumberX + "px";
		obj.style.top = newNumberY + "px";
		//3D object
		if(obj.id != "ball" && num > -1 && num < 22 ){
			//var playerMoved = scene.getObjectByName(obj.id);
			//playerMoved.position.set((newNumberX/10)-25, 0.3, (newNumberY/10)-15);
			//console.log(parseInt(obj.id.replace( /^\D+/g, '')));
			//player[parseInt(obj.id.replace( /^\D+/g, ''))].position.set((newNumberX/10)-25, 0.3, (newNumberY/10)-15);
			player[num].position.set((newNumberX/1.5)-130, 2, (newNumberY/1.5)-110);
			player[num].updateMatrix();
		}
	},

	callback = function(obj, startX, startY, num) {
		var endX = getRandomInt(minX, maxX),		
			endY = getRandomInt(minY, maxY);
						
		var duration = getRandomInt(minT, maxT);
		if(obj.id != "ball" && num > -1 && num < 22 ){
			player[num].rotation.z = getRandomInt(-180, 180) * (Math.PI / 180);
			player[num].updateMatrix();
		}
		animateObj(startX, endX, startY, endY, duration, obj, num);
	},
	getRandomInt = function(min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	},
	getPositionAtCenter = function(element) {
		var data = element.getBoundingClientRect();
		return {
			x: data.left + data.width / 2,
			y: data.top + data.height / 2
		};
	},
	getDistanceBetweenElements = function(a, b) {
		var aPosition = getPositionAtCenter(a);
		var bPosition = getPositionAtCenter(b);
		var distance = Math.sqrt(Math.pow(aPosition.x - bPosition.x, 2) + Math.pow(aPosition.y - bPosition.y, 2));
		document.getElementById("result").innerText = distance;
		return distance;
	};
	
	//make player & ball
	var field = document.getElementById("field");
	for (playerNum = 0; playerNum < 22; playerNum++) {
		var player2D = document.createElement("div");
		if (playerNum % 2 == 0){
			player2D.classList.add("playerA");
			player2D.innerText = playerNum;
			player2D.setAttribute("team", "A");
		}else{
			player2D.classList.add("playerB");
			player2D.innerText = playerNum-11;
			player2D.setAttribute("team", "B");
		}
		player2D.id = "Player#"+playerNum;
		player2D.style.top = "10px";
		player2D.style.left = "10px";
		field.appendChild(player2D);

		startX = getRandomInt(minX, maxX),
		endX = getRandomInt(minX, maxX),
		startY = getRandomInt(minY, maxY),
		endY = getRandomInt(minY, maxY),
		duration = getRandomInt(minT, maxT);

		animateObj(startX, endX, startY, endY, duration, player2D, playerNum);
	}
	var ball = document.getElementById("ball");
	animateObj(startX, endX, startY, endY, duration, ball, -1);
	
};

// Update controls and stats
function update() {
    lesson5.controls.update(lesson5.clock.getDelta());
    lesson5.stats.update();
}


var clock = new THREE.Clock();

// Render the scene
function render() {
    if (lesson5.renderer) {

        // update bubble object
        //lesson5.bSphere.visible = false;
        //lesson5.bSphereCamera.updateCubeMap(lesson5.renderer, lesson5.scene);
        //lesson5.bSphere.visible = true;
		THREE.AnimationHandler.update( clock.getDelta() );
        lesson5.renderer.render(lesson5.scene, lesson5.camera);
    }
}

// Initialize lesson on page load
function initializeLesson() {
    lesson5.init();
    animate();
}

///////////////
//Addplayer
function addPlayer(x, z, playerNum) {
	playerDummy = new THREE.Mesh(
		new THREE.CylinderGeometry(1, 1, 6, 16, 32),
		new THREE.MeshLambertMaterial({
			color: "blue"
		})
	);

	playerDummy.position.y = 0.4;
	playerDummy.position.x = x;
	playerDummy.position.z = z;
	playerDummy.castShadow = true;
	playerDummy.receiveShadow = true;
	playerDummy.scale.x = playerDummy.scale.z = 0.09;
	playerDummy.scale.y = 0.09;
	playerDummy.name = "Player#" + playerNum;
	if (playerNum % 2 == 0){
		playerDummy.material.color.setHex( 0xff0000 );
	}
	world.add(playerDummy);
}


if (window.addEventListener)
    window.addEventListener('load', initializeLesson, false);
else if (window.attachEvent)
    window.attachEvent('onload', initializeLesson);
else window.onload = initializeLesson;
