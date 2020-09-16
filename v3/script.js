//browser-sync start --server --directory --files "*"
//variable declaration section
let physicsWorld, scene, camera, renderer, rigidBodies = []
var rod, cart, track;
var controls, drag_controls;
//Ammojs Initialization
Ammo().then(start)

function start (){

    tmpTrans = new Ammo.btTransform();

    setupPhysicsWorld();

    setupGraphics();

    createPlatform();
    
    LoadParts();

    renderFrame();

}

function setupPhysicsWorld(){

    let collisionConfiguration  = new Ammo.btDefaultCollisionConfiguration(),
        dispatcher              = new Ammo.btCollisionDispatcher(collisionConfiguration),
        overlappingPairCache    = new Ammo.btDbvtBroadphase(),
        solver                  = new Ammo.btSequentialImpulseConstraintSolver();

    physicsWorld           = new Ammo.btDiscreteDynamicsWorld(dispatcher, overlappingPairCache, solver, collisionConfiguration);
    physicsWorld.setGravity(new Ammo.btVector3(0, -10, 0));

}

function setupGraphics(){

    //create clock for timing
    clock = new THREE.Clock();

    //create the scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0xbfd1e5 );

    //create camera
    camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.2, 5000 );
    camera.position.set( 70, 30, 0 );
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    //Add hemisphere light
    let hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 1 );
    hemiLight.color.setHSL( 0.6, 0.6, 0.6 );
    hemiLight.groundColor.setHSL( 0.1, 1, 0.4 );
    hemiLight.position.set( 0, 50, 0 );
    scene.add( hemiLight );

    //Add directional light
    let dirLight = new THREE.DirectionalLight( 0xffffff , 1);
    dirLight.color.setHSL( 0.1, 1, 0.95 );
    dirLight.position.set( 1, 1.75, 1 );
    dirLight.position.multiplyScalar( 100 );
    scene.add( dirLight );

    dirLight.castShadow = true;

    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;

    let d = 50;

    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;

    dirLight.shadow.camera.far = 13500;

    //Setup the renderer
    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setClearColor( 0xbfd1e5 );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );
    renderer.gammaInput = true;
    renderer.gammaOutput = true;
    renderer.shadowMap.enabled = true;

    controls = new THREE.OrbitControls( camera, renderer.domElement );

    //controls.addEventListener( 'change', render ); // call this only in static scenes (i.e., if there is no animation loop)

    controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
    controls.dampingFactor = 0.05;

    controls.screenSpacePanning = false;

    controls.minDistance = 70;
    controls.maxDistance = 500;

    controls.maxPolarAngle = Math.PI / 2;
}

function renderFrame(){

    let deltaTime = clock.getDelta();

    updatePhysics( deltaTime );
    renderer.render( scene, camera );
    requestAnimationFrame( renderFrame );
}

function updatePhysics( deltaTime ){

    // Step world
    physicsWorld.stepSimulation( deltaTime, 10 );

    // Update rigid bodies
    for ( let i = 0; i < rigidBodies.length; i++ ) {
        let objThree = rigidBodies[ i ];
        let objAmmo = objThree.userData.physicsBody;
        let ms = objAmmo.getMotionState();
        if ( ms ) {

            ms.getWorldTransform( tmpTrans );
            let p = tmpTrans.getOrigin();
            let q = tmpTrans.getRotation();
            objThree.position.set( p.x(), p.y(), p.z() );
            objThree.quaternion.set( q.x(), q.y(), q.z(), q.w() );

        }
    }

}

function createPlatform(){
    
    let pos = {x: 0, y: 0, z: 0};
    let scale = {x: 50, y: 1, z: 80};
    let quat = {x: 0, y: 0, z: 0, w: 1};
    let mass = 0;

    //threeJS Section
    let blockPlane = new THREE.Mesh(new THREE.BoxBufferGeometry(), new THREE.MeshPhongMaterial({color: 0xa0afa4}));

    blockPlane.position.set(pos.x, pos.y, pos.z);
    blockPlane.scale.set(scale.x, scale.y, scale.z);

    blockPlane.castShadow = true;
    blockPlane.receiveShadow = true;

    scene.add(blockPlane);


    //Ammojs Section
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin( new Ammo.btVector3( pos.x, pos.y, pos.z ) );
    transform.setRotation( new Ammo.btQuaternion( quat.x, quat.y, quat.z, quat.w ) );
    let motionState = new Ammo.btDefaultMotionState( transform );

    let colShape = new Ammo.btBoxShape( new Ammo.btVector3( scale.x * 0.5, scale.y * 0.5, scale.z * 0.5 ) );
    colShape.setMargin( 0.05 );

    let localInertia = new Ammo.btVector3( 0, 0, 0 );
    colShape.calculateLocalInertia( mass, localInertia );

    let rbInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, colShape, localInertia );
    let body = new Ammo.btRigidBody( rbInfo );


    physicsWorld.addRigidBody( body );

}

function LoadParts(){
    let scale = {x: 80, y: 80, z: 80};

    let loader = new THREE.GLTFLoader();
    loader.load( 'pendulum_v2.glb', function ( gltf ) {

        gltf.scene.traverse( function ( child ) {

            if ( child.isMesh ) {
                child.scale.set(scale.x, scale.y, scale.z);
                child.receiveShadow = true;
                child.castShadow = true;
                if (child.name=="rod"){
                rod = child;
                }
                if (child.name=="cart"){
                cart = child; 
                }				
                if (child.name=="track"){
                track = child; 
                }	
            }

        } );

        //rod
        let pos_rod = {x: 0, y: 35, z: 0};
        // let quat_rod = {x: Math.sqrt(2)/2, y: 0, z: 0, w: Math.sqrt(2)/2}; //90
        let quat_rod = {x: 1/2, y: 0, z: 0, w: Math.sqrt(3)/2}; //90  
        // let quat = {x: 1, y: 0, z: 0, w: 0}; //180
        let mass_rod = 1;

        rod.position.set(pos_rod.x, pos_rod.y, pos_rod.z);
        scene.add( rod );

        //Ammojs Section
        let transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin( new Ammo.btVector3( pos_rod.x, pos_rod.y, pos_rod.z ) );
        transform.setRotation( new Ammo.btQuaternion( quat_rod.x, quat_rod.y, quat_rod.z, quat_rod.w ) );
        let motionState = new Ammo.btDefaultMotionState( transform );

        let colShape_rod = new Ammo.btBoxShape( new Ammo.btVector3( scale.x * 0.5 *0.005, scale.y * 0.5 * 0.01, scale.z * 0.5 * 0.3 ) );
        colShape_rod.setMargin( 0.05 );

        let localInertia = new Ammo.btVector3( 0, 0, 0 );
        colShape_rod.calculateLocalInertia( mass_rod, localInertia );

        let rbInfo = new Ammo.btRigidBodyConstructionInfo( mass_rod, motionState, colShape_rod, localInertia );
        let body_rod = new Ammo.btRigidBody( rbInfo );


        physicsWorld.addRigidBody( body_rod );

        rod.userData.physicsBody = body_rod;
        rigidBodies.push(rod);

        //cart
        let pos_cart = {x: 0, y: 20, z: 0};
        let quat_cart = {x: Math.sqrt(2)/2, y: 0, z: 0, w: Math.sqrt(2)/2}; //90 
        // let quat_cart = {x: 1, y: 0, z: 0, w: 0}; //180
        let mass_cart = 1;

        cart.position.set(pos_cart.x, pos_cart.y, pos_cart.z);
        scene.add( cart );

        //Ammojs Section
        transform.setIdentity();
        transform.setOrigin( new Ammo.btVector3( pos_cart.x, pos_cart.y, pos_cart.z ) );
        transform.setRotation( new Ammo.btQuaternion( quat_cart.x, quat_cart.y, quat_cart.z, quat_cart.w ) );
        motionState = new Ammo.btDefaultMotionState( transform );

        let colShape_cart = new Ammo.btBoxShape( new Ammo.btVector3( scale.x * 0.5 *0.045, scale.y * 0.5 * 0.04, scale.z * 0.5 * 0.02 ) );
        colShape_cart.setMargin( 0.05 );

        localInertia = new Ammo.btVector3( 0, 0, 0 );
        colShape_cart.calculateLocalInertia( mass_cart, localInertia );

        rbInfo = new Ammo.btRigidBodyConstructionInfo( mass_cart, motionState, colShape_cart, localInertia );
        let body_cart = new Ammo.btRigidBody( rbInfo );


        physicsWorld.addRigidBody( body_cart );

        cart.userData.physicsBody = body_cart;
        rigidBodies.push(cart);

        //track
        let pos_track = {x: -20, y: 10, z: 0};
        let quat_track = {x: 1, y: 0, z: 0, w: 0}; //180 
        // let quat = {x: 1, y: 0, z: 0, w: 0}; //180
        let mass_track = 1;

        track.position.set(pos_track.x, pos_track.y, pos_track.z);
        scene.add( track );

        //Ammojs Section
        transform.setIdentity();
        transform.setOrigin( new Ammo.btVector3( pos_track.x, pos_track.y, pos_track.z ) );
        transform.setRotation( new Ammo.btQuaternion( quat_track.x, quat_track.y, quat_track.z, quat_track.w ) );
        motionState = new Ammo.btDefaultMotionState( transform );

        let colShape_track = new Ammo.btBoxShape( new Ammo.btVector3( scale.x * 0.5 *0.05, scale.y * 0.5 * 0.025, scale.z * 0.5 * 0.74 ) );
        colShape_track.setMargin( 0.05 );

        localInertia = new Ammo.btVector3( 0, 0, 0 );
        colShape_track.calculateLocalInertia( mass_track, localInertia );

        rbInfo = new Ammo.btRigidBodyConstructionInfo( mass_track, motionState, colShape_track, localInertia );
        let body_track = new Ammo.btRigidBody( rbInfo );


        physicsWorld.addRigidBody( body_track );

        track.userData.physicsBody = body_track;
        rigidBodies.push(track);

        //create joint
        let rod_Pivot = new Ammo.btVector3( 0, 0, 11.5 );
        let cart_Pivot = new Ammo.btVector3( 0, 0, -2 );
        let rod_axis = new Ammo.btVector3( 1, 0, 0 );
        let cart_axis = new Ammo.btVector3( 1, 0, 0 ); 

        // let p2p = new Ammo.btPoint2PointConstraint( body_rod, body_cart, rod_Pivot, cart_Pivot);
        let p2p = new Ammo.btHingeConstraint( body_rod, body_cart, rod_Pivot, cart_Pivot, rod_axis, cart_axis, false);
        physicsWorld.addConstraint( p2p, false );
    }); //loader
}

        