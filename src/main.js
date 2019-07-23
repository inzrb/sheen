import * as FBO from './modules/fbo.js';
import * as CLOTH from './modules/cloth.js';
import * as MOUSE from './modules/mouse.js';

let
renderer, camera, scene,
mesh, stats, lights,
position,
interacting = false,
psel = undefined,
clock = new THREE.Clock();

const
particles = [],
constraints = [],
v0 = new THREE.Vector3();

function init() {

	// core
	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setPixelRatio( window.devicePixelRatio );

	renderer.gammaOutput = true;
	renderer.physicallyCorrectLights = true;

	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFShadowMap;

	document.body.appendChild( renderer.domElement );

	scene = new THREE.Scene();
	renderer.setClearColor( 0x121312 );

	camera = new THREE.PerspectiveCamera( 60, window.innerWidth/window.innerHeight, 1, 10000 );
	camera.position.z = -350;
	camera.position.y = -50;
	camera.position.x = 0;

	camera.lookAt( new THREE.Vector3() );

	// lights
	const light = new THREE.AmbientLight( 0x455045, 0 );
	scene.add( light );

	const spotLight = new THREE.SpotLight( 0xfd8b8b, 0, 4000, Math.PI/6, 0.2, 0.11 );
	spotLight.position.set( 0.9, 0.1, -0.5 ).multiplyScalar( 400 );
	spotLight.castShadow = true;
	spotLight.shadow.radius = 20;
	spotLight.shadow.camera.far = 4000
	spotLight.shadow.mapSize.height = 4096;
	spotLight.shadow.mapSize.width = 4096;
	scene.add( spotLight );

	const spotLight2 = new THREE.SpotLight( 0x6b7af4, 0, 4000, Math.PI/6, 0.2, 0.11 );
	spotLight2.position.set( -0.91, 0.1, -0.5 ).multiplyScalar( 400 );
	spotLight2.castShadow = true;
	spotLight2.shadow.radius = 20;
	spotLight2.shadow.camera.far = 4000;
	spotLight2.shadow.mapSize.height = 4096;
	spotLight2.shadow.mapSize.width = 4096;
	scene.add( spotLight2 );

	const spotLight3 = new THREE.SpotLight( 0x858585, 0, 4000, Math.PI/5.5, 1.4, 0.02 );
	spotLight3.position.set( 0, 0, -1 ).multiplyScalar( 400 );
	spotLight3.castShadow = true;
	spotLight3.shadow.radius = 5;
	spotLight3.shadow.camera.far = 4000;
	spotLight3.shadow.mapSize.height = 4096;
	spotLight3.shadow.mapSize.width = 4096;
	scene.add( spotLight3 );

	lights = [ light, spotLight, spotLight2, spotLight3 ];

	// scene
	const bgMaterial = new THREE.MeshPhysicalMaterial( {

		color: 0x393939,
		metalness: 0.9,
		roughness: 0.4,
		dithering: true

	} );

	const bgGeometry = new THREE.PlaneBufferGeometry( 16000, 16000 );

	const bg = new THREE.Mesh( bgGeometry, bgMaterial );
	scene.add( bg );
	bg.receiveShadow = true;
	bg.rotation.x += Math.PI * 0.9;
	bg.position.set( 0, -100, 2000 );

	const ico = new THREE.IcosahedronBufferGeometry( 100, 5 );
	const geometry = THREE.BufferGeometryUtils.mergeVertices( ico, 1.5 );
	position = geometry.attributes.position;

	createParticles( geometry );

	MOUSE.init( particles, camera );

	FBO.init( renderer, position, particles, MOUSE );

	CLOTH.init( geometry );
	scene.add( CLOTH.mesh );

	animate();

}

function createParticles( geometry ) {

	const index = geometry.index;

	for ( let i = 0, il = position.count; i < il; i++ ) {

		v0.fromBufferAttribute( position, i );
		particles.push( new Particle( v0.x, v0.y, v0.z ) );

	}

	for ( let i = 0, il = index.count / 3; i < il; i++ ) {

		const i3 = i * 3;

		const a = index.getX( i3 + 0 );
		const b = index.getX( i3 + 1 );
		const c = index.getX( i3 + 2 );

		particles[ a ].faces.push( [ b, c ] );
		particles[ b ].faces.push( [ c, a ] );
		particles[ c ].faces.push( [ a, b ] );

		if ( ! particles[ b ].adj.includes( a ) ) {

			const dist = particles[ a ].original.distanceTo( particles[ b ].original );

			particles[ a ].adj.push( b );
			particles[ b ].adj.push( a );
			constraints.push( [ a, b, dist * dist ] );

		}

		if ( ! particles[ c ].adj.includes( a ) ) {

			const dist = particles[ a ].original.distanceTo( particles[ c ].original );

			particles[ a ].adj.push( c );
			particles[ c ].adj.push( a );
			constraints.push( [ a, c, dist * dist ] );

		}

		if ( ! particles[ c ].adj.includes( b ) ) {

			const dist = particles[ b ].original.distanceTo( particles[ c ].original );

			particles[ b ].adj.push( c );
			particles[ c ].adj.push( b );
			constraints.push( [ b, c, dist * dist ] );

		}

	}

	for ( let i = 0, il = constraints.length; i < il; i++ ) {

		const con = constraints[i];

		let k = 1;
		while ( true ) {

			while ( particles[ con[0] ].colors[k] !== undefined ) k++;

			if ( particles[ con[1] ].colors[k] === undefined ) {

				con.push( k );
				particles[ con[0] ].colors[k] = con[1];
				particles[ con[1] ].colors[k] = con[0];
				break;

			} else {

				k++;

			}

		}

	}

}

function updateLights() {

	function easing( t, c ) {
	if ((t/=1/2) < 1) return c/2*t*t*t;
	return c/2*((t-=2)*t*t + 2);
}

	const time = clock.getElapsedTime();

	if ( time > 1 && time < 4 ) {

		for ( let i = 0; i < lights.length; i++ ) {

			lights[i].intensity = easing( ( time - 1 ) / 3, 2.6 );

		}

	}


}

function animate() {

	const t = requestAnimationFrame( animate );

	updateLights();

	FBO.update();

	renderer.setRenderTarget( null );
	renderer.render( scene, camera );

}


window.onresize = function() {

	const w = window.innerWidth;
	const h = window.innerHeight;

	camera.aspect = w / h;
	camera.updateProjectionMatrix();

	renderer.setSize( w, h );

};

init();