var world;
var dt = 1 / 60;

var constraintDown = false;
var camera, scene, renderer, gplane = false,
    clickMarker = false;
var geometry, material, mesh;
var controls, time = Date.now();

var jointBody, constrainedBody, mouseConstraint;

var N = 5;

// To be synced
var meshes = [],
    bodies = [];

// Initialize Three.js
//if (!Detector.webgl) Detector.addGetWebGLMessage();

initCannon();
init();
animate();

function init() {

  container = document.createElement('div');
  document.body.appendChild(container);

  // scene
  scene = new THREE.Scene();

  // camera
  camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.5, 10000);
  camera.position.set(10, 2, 0);  
  scene.add(camera);  

  // controls
  controls = new THREE.OrbitControls( camera );
  //controls.target.set(0, 20, 0);
  //controls.update();

  // lights
  var light, materials;
  scene.add(new THREE.AmbientLight(0x666666));

  light = new THREE.DirectionalLight(0xffddaa, 1.75);
  scene.add(light);
  var d = 20;

  light.position.set(d, d, d);
  light.castShadow = true;

  light.shadow.mapSize.width = 1024;
  light.shadow.mapSize.height = 1024;


  light.shadow.camera.left = -d;
  light.shadow.camera.right = d;
  light.shadow.camera.top = d;
  light.shadow.camera.bottom = -d;
  light.shadow.camera.far = 3 * d;
  light.shadow.camera.near = d;

  //light.rotation.y = 100 * Math.PI / 180  

  var helper = new THREE.DirectionalLightHelper( light );
  scene.add( helper );  

  var helper = new THREE.CameraHelper( light.shadow.camera );
  scene.add( helper );

  // floor
  geometry = new THREE.PlaneGeometry(100, 100, 1, 1);
  //geometry.applyMatrix( new THREE.Matrix4().makeRotationX( -Math.PI / 2 ) );
  material = new THREE.MeshLambertMaterial({ color: 0x333333 });    
  markerMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 });

  //THREE.ColorUtils.adjustHSV( material.color, 0, 0, 0.9 );
  mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  mesh.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  scene.add(mesh);

  // cubes
  var cubeGeo = new THREE.BoxGeometry(1, 1, 1, 10, 10);
  var cubeMaterial = new THREE.MeshPhongMaterial({
    color: 0xdd88aa
  });

  // sphere
  var sphereGeo = new THREE.SphereGeometry(0.5, 32, 32);
  var sphereMaterial = new THREE.MeshPhongMaterial({
    color: 0xdd88aa
  }); 

  for (var i = 0; i < N; i++) {
    cubeMesh = new THREE.Mesh(cubeGeo, cubeMaterial);
    cubeMesh.castShadow = true;
    meshes.push(cubeMesh);
    scene.add(cubeMesh);
  }

  for (var i = 0; i < N; i++) {    
    sphereMesh = new THREE.Mesh(sphereGeo, sphereMaterial);
    sphereMesh.castShadow = true;
    meshes.push( sphereMesh );
    scene.add( sphereMesh );
  }

  renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true } );
	renderer.shadowMap.enabled = true;
  renderer.setSize( window.innerWidth, window.innerHeight );
  container.appendChild(renderer.domElement);
  let ctx = renderer.context;
  ctx.getShaderInfoLog = function () { return '' };
  
  
  //renderer.gammaInput = true;
  //renderer.gammaOutput = true;
  
  window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }, false);

  window.addEventListener("mousemove", onMouseMove, false);
  window.addEventListener("mousedown", onMouseDown, false);
  window.addEventListener("mouseup", onMouseUp, false);
}

function setClickMarker(x, y, z) {
  if (!clickMarker) {
    var shape = new THREE.SphereGeometry(0.2, 8, 8);
    clickMarker = new THREE.Mesh(shape, markerMaterial);
    scene.add(clickMarker);
  }
  controls.enabled = false;
  clickMarker.visible = true;
  clickMarker.position.set(x, y, z);
}

function removeClickMarker() {
  clickMarker.visible = false;
}

function dispatchMouseUp(){
  controls.enabled = true;
  var clickEvent = document.createEvent ('MouseEvents');
  clickEvent.initEvent ('mouseup', true, true);
  document.dispatchEvent (clickEvent);
}

function onMouseMove(e) {
  // Move and project on the plane
  if (gplane && mouseConstraint) {
    var pos = projectOntoPlane(e.clientX, e.clientY, gplane, camera);
    if (pos) {
      setClickMarker(pos.x, pos.y, pos.z, scene);
      moveJointToPoint(pos.x, pos.y, pos.z);
    }
  }
}

function onMouseDown(e) {
  // Find mesh from a ray
  var entity = findNearestIntersectingObject(e.clientX, e.clientY, camera, meshes);
  var pos = entity.point;

  if (pos && (entity.object.geometry instanceof THREE.BoxGeometry || entity.object.geometry instanceof THREE.SphereGeometry )) {
    constraintDown = true;
    // Set marker on contact point
    setClickMarker(pos.x, pos.y, pos.z, scene);

    // Set the movement plane
    setScreenPerpCenter(pos, camera);

    var idx = meshes.indexOf(entity.object);
    if (idx !== -1) {
      addMouseConstraint(pos.x, pos.y, pos.z, bodies[idx]);
    }
  }
}

// This function creates a virtual movement plane for the mouseJoint to move in
function setScreenPerpCenter(point, camera) {
  // If it does not exist, create a new one
  if (!gplane) {
    var planeGeo = new THREE.PlaneGeometry(100, 100);
    gplane = new THREE.Mesh(planeGeo, material);
    gplane.visible = false; // Hide it..
    gplane.position.set
    scene.add(gplane);
  }

  // Center at mouse position
  gplane.position.copy(point);

  // Make it face toward the camera
  gplane.quaternion.copy(camera.quaternion);
}

function onMouseUp(e) {
  constraintDown = false;
  // remove the marker
  removeClickMarker();
  controls.restore = true;
  // Send the remove mouse joint to server
  removeJointConstraint();
}

function projectOntoPlane(screenX, screenY, thePlane, camera) {
  var x = screenX;
  var y = screenY;
  var now = new Date().getTime();
  // project mouse to that plane
  var hit = findNearestIntersectingObject(screenX, screenY, camera, [thePlane]);

  if (hit)
    return hit.point;
  return false;
}

function findNearestIntersectingObject(clientX, clientY, camera, objects) {
  // Get the picking ray from the point
  var raycaster = getRayCasterFromScreenCoord(clientX, clientY, camera);

  // Find the closest intersecting object
  // Now, cast the ray all render objects in the scene to see if they collide. Take the closest one.

  // instead of
  //var hits = raycaster.intersectObjects( objects, true );

  var intersects = [];
  var closest = false;

  for (i = 0; i < objects.length; i++){
    objects[i].raycast( raycaster, intersects ); //for invisible object
    if (intersects.length > 0) {
      closest = intersects[0];
      break;
    }
  }
  return closest;
}

// Function that returns a raycaster to use to find intersecting objects
// in a scene given screen pos and a camera, and a projector
function getRayCasterFromScreenCoord(screenX, screenY, camera) {
  var raycaster = new THREE.Raycaster();
  var mouse3D = new THREE.Vector3();
  // Get 3D point form the client x y
  mouse3D.x = (screenX / window.innerWidth) * 2 - 1;
  mouse3D.y = -(screenY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse3D, camera);
  return raycaster;
}

function animate() {
  requestAnimationFrame(animate);
  updatePhysics();
  if (controls.restore == true){
    dispatchMouseUp();
    controls.restore = false;
  }
  renderer.render(scene, camera);
}

function updatePhysics() {
  world.step(dt);
  for (var i = 0; i !== meshes.length; i++) {
    meshes[i].position.copy(bodies[i].position);
    meshes[i].quaternion.copy(bodies[i].quaternion);
  }
}

function initCannon() {
  // Setup our world
  world = new CANNON.World();
  world.quatNormalizeSkip = 0;
  world.quatNormalizeFast = false;

  world.gravity.set(0, -10, 0);
  world.broadphase = new CANNON.NaiveBroadphase();

  // Create boxes
  var mass = 5,
      radius = 1.3;
  boxShape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));
  for (var i = 0; i < N; i++) {
    boxBody = new CANNON.Body({
      mass: mass
    });
    boxBody.addShape(boxShape);
    boxBody.position.set(i, 5, i);
    world.add(boxBody);
    bodies.push(boxBody);
  }

  // Create sphere
  sphereShape = new CANNON.Sphere(0.5);
  for (var i = 0; i < N; i++) {
    sphereBody = new CANNON.Body({
      mass: mass
    });
    sphereBody.addShape(sphereShape);
    sphereBody.position.set(i-12, 5, i-12);
    world.add(sphereBody);
    bodies.push(sphereBody);
  }

  // Create a plane
  var groundShape = new CANNON.Plane();
  var groundBody = new CANNON.Body({
    mass: 0
  });
  groundBody.addShape(groundShape);
  groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
  world.add(groundBody);

  // Joint body
  var shape = new CANNON.Sphere(0.1);
  jointBody = new CANNON.Body({
    mass: 0
  });
  jointBody.addShape(shape);
  jointBody.collisionFilterGroup = 0;
  jointBody.collisionFilterMask = 0;
  world.add(jointBody)
}

function addMouseConstraint(x, y, z, body) {
  // The cannon body constrained by the mouse joint
  constrainedBody = body;

  // Vector to the clicked point, relative to the body
  var v1 = new CANNON.Vec3(x, y, z).vsub(constrainedBody.position);

  // Apply anti-quaternion to vector to tranform it into the local body coordinate system
  var antiRot = constrainedBody.quaternion.inverse();
  pivot = antiRot.vmult(v1); // pivot is not in local body coordinates

  // Move the cannon click marker particle to the click position
  jointBody.position.set(x, y, z);

  // Create a new constraint
  // The pivot for the jointBody is zero
  mouseConstraint = new CANNON.PointToPointConstraint(constrainedBody, pivot, jointBody, new CANNON.Vec3(0, 0, 0));

  // Add the constriant to world
  world.addConstraint(mouseConstraint);
}

// This functions moves the transparent joint body to a new postion in space
function moveJointToPoint(x, y, z) {
  // Move the joint body to a new position
  jointBody.position.set(x, y, z);
  mouseConstraint.update();
}

function removeJointConstraint() {
  // Remove constriant from world
  world.removeConstraint(mouseConstraint);
  mouseConstraint = false;
}