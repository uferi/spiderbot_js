//console.log("js02.js loaded");

var camera, scene, renderer;
var spotLight = new THREE.SpotLight( 0xffffff, 1 );
var grid;
var locator = [];
var axisHelper = [];
var guideSphere;

var vel = new THREE.Vector3( 0.05, 0, 0.05);

var legs = [];
var lengthA = 5;
var lengthB = 8;
var lengthC = 12;
var bodyHeight = 4;         // initial height of the body
var legPosition = new THREE.Vector3( 5, 0, 7 );       // Front Left Leg Root Position
var legRestAngle = 35; // angle of the front left leg measured from the z axis to the left -- in degrees

var cnt;

// Object Constructors

var locatorConstructor = function ( size, color ){
    var w = 0.1;
    this.material = new THREE.MeshBasicMaterial( { color: color } );
    this.geometry = [];
    this.mesh = [];
    this.group = new THREE.Group();
    
    this.geometry.push( new THREE.BoxGeometry( size, w, w, 1, 1, 1 ));
    this.geometry.push( new THREE.BoxGeometry( w, size, w, 1, 1, 1 ));
    this.geometry.push( new THREE.BoxGeometry( w, w, size, 1, 1, 1 ));
    
    for( i=0; i<this.geometry.length; i++ ){
        this.mesh.push( new THREE.Mesh(this.geometry[i], this.material));
        this.group.add( this.mesh[i] );
    }
    scene.add(this.group);
}


var locatorAxisConstructor = function ( size ){
    var w = 0.1;
    this.materialRed = new THREE.MeshBasicMaterial( { color: 0xff0000 } );
    this.materialGreen = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
    this.materialBlue = new THREE.MeshBasicMaterial( { color: 0x0000ff } );
    this.geometry = [];
    this.mesh = [];
    this.group = new THREE.Group();
    
    this.geometry.push( new THREE.BoxGeometry( size, w, w, 1, 1, 1 ));
    this.geometry.push( new THREE.BoxGeometry( w, size, w, 1, 1, 1 ));
    this.geometry.push( new THREE.BoxGeometry( w, w, size, 1, 1, 1 ));
    
    this.mesh.push( new THREE.Mesh(this.geometry[0], this.materialRed));
    this.mesh.push( new THREE.Mesh(this.geometry[1], this.materialGreen));
    this.mesh.push( new THREE.Mesh(this.geometry[2], this.materialBlue));
    this.group.add( this.mesh[0] );
    this.group.add( this.mesh[1] );
    this.group.add( this.mesh[2] );
    scene.add(this.group);
}


var legConstructor = function ( rootPos, restAngle, lengthSegA, lengthSegB, lengthSegC ){
    // build up a whole leg
    this.lengthSegA = lengthSegA;
    this.lengthSegB = lengthSegB;
    this.lengthSegC = lengthSegC;
    this.ikHandlerPos = new THREE.Vector3( rootPos.x, 0, rootPos.z);
    this.rootPos = new THREE.Vector3( rootPos.x, rootPos.y, rootPos.z);
    this.restDir = new THREE.Vector3( 0, 0, 1);
    this.segments = [];
    this.groupA = new THREE.Group();
    this.groupB = new THREE.Group();
    this.groupC = new THREE.Group();
    
    this.restDir.applyAxisAngle(new THREE.Vector3( 0, 1, 0), (Math.PI/180)*restAngle);
    
    this.ikHandlerPos.add(this.restDir.multiplyScalar(15));
    
    this.segments.push( new boneConstructor( lengthSegA ) );
    this.groupA.add(this.segments[0].group);
    this.groupA.position.x = rootPos.x;
    this.groupA.position.y = rootPos.y;
    this.groupA.position.z = rootPos.z;
    this.groupA.rotation.y = (Math.PI/180)*restAngle;
    
    this.segments.push( new boneConstructor( lengthSegB ) );
    this.groupB.add(this.segments[1].group);
    this.groupB.position.z = lengthSegA;
    this.groupA.add(this.groupB);
    
    this.segments.push( new boneConstructor( lengthSegC ) );
    this.groupC.add( this.segments[2].group);
    this.groupC.position.z = lengthSegB;
    this.groupB.add(this.groupC);
    
    scene.add(this.groupA);
    
    this.ikUpdate = function (){
        
        var grpAaxisZ = new THREE.Vector3();
        var grpBaxisZ = new THREE.Vector3();
        var grpAangle, grpBangle, grpCangle ;
        var triHeight, sideA, sideB, sideC ;
        var alpha, beta, gamma;
        var threshold;
        
        grpAaxisZ.copy( this.ikHandlerPos );
        grpAaxisZ.sub( this.rootPos );
        grpAaxisZ.setComponent(1,0);
        grpAaxisZ.normalize();
        grpAaxisZ.multiplyScalar(this.lengthSegA);
        
        grpAangle = Math.atan2(grpAaxisZ.x, grpAaxisZ.z);
        
        this.groupA.rotation.y = grpAangle;
        
        grpBaxisZ.copy( this.rootPos );
        grpBaxisZ.add( grpAaxisZ );
        //axisHelper[0].group.position.set(grpBaxisZ.x, grpBaxisZ.y, grpBaxisZ.z)
        grpBaxisZ.sub( this.ikHandlerPos );
        //console.log(grpBaxisZ.length());
        
        sideA = this.lengthSegB;
        sideB = this.lengthSegC;
        sideC = grpBaxisZ.length();
        
        triHeight = Math.sqrt( (sideA+sideB+sideC)*(-sideA+sideB+sideC)*(sideA-sideB+sideC)*(sideA+sideB-sideC) ) / (2*sideC);
        //console.log(triHeight);
        
        alpha = Math.asin( triHeight/ sideB);
        beta = Math.asin( triHeight/ sideA );
        
        if ( sideC < Math.sqrt( sideB*sideB - sideA*sideA ) ){
            beta = Math.PI - beta;
        }
        
        gamma = Math.PI-(alpha+beta);
        
        grpBangle = Math.PI/2-Math.acos( grpBaxisZ.y / grpBaxisZ.length() );
        grpBangle -= beta;
        //grpBangle = 2*Math.PI - Math.acos( grpBaxisZ.y / grpBaxisZ.length() ) - beta;
        
        this.groupB.rotation.x = grpBangle;
        this.groupC.rotation.x = Math.PI-gamma;
                
    }
}


var boneConstructor = function ( length ){
    this.length = length;
    this.group = new THREE.Group();
    this.geometry = [];
    this.mesh = [];
    this.geometry.push( new THREE.CylinderGeometry( 1, 0, length*0.2, 4, 1, true ));
    this.geometry.push( new THREE.CylinderGeometry( 0, 1, length*0.8, 4, 1, true ));
    
    this.geometry[0].rotateX(Math.PI/2);
    this.geometry[1].rotateX(Math.PI/2);
    this.geometry[0].scale( 0.5, 1, 1 );
    this.geometry[1].scale( 0.5, 1, 1 );
    this.geometry[0].translate( 0, 0, length*0.1 );
    this.geometry[1].translate( 0, 0, length*0.6 );
    
    this.material = new THREE.MeshStandardMaterial( { color: 0xaaaaff, shading: THREE.FlatShading } );
    
    this.mesh.push( new THREE.Mesh( this.geometry[0], this.material ));
    this.mesh.push( new THREE.Mesh( this.geometry[1], this.material ));
    
    this.group.add(this.mesh[0]);
    this.group.add(this.mesh[1]);
    
    //scene.add(this.mesh[0]);
    //scene.add(this.mesh[1]);
    scene.add(this.group);
}


function fit( value, oldMin, oldMax, newMin, newMax ){
    var newValue;
    var ratio =  (value-oldMin)/(oldMax-oldMin);
    
    newValue = Math.max(Math.min(newMax,(newMin+ratio*(newMax-newMin)) ), newMin);
    
    return newValue;    
}

function Grid( size, stepSize, fadeDist ){
    this.size = size;
    this.stepSize = stepSize;
    this.fadeDist = fadeDist;
    
    this.linesX = [];
    this.linesZ = [];
    
    lineAmount = Math.floor(size/stepSize)+1;
    var lineMatX = [];
    var lineGeoX = [];
    var lineMeshX = [];
    var lineMatZ = [];
    var lineGeoZ = [];
    var lineMeshZ = [];

    var points = [];
    var colors = [];
    
    // let's build the grid
    
    for( i=0; i<=size; i++){
        
        points.push(i-size/2);
        colors[i] = new THREE.Color( 0xffffff );
        colors[i].setHSL(0,0,1-fit(Math.abs(i-size/2),size/2-fadeDist,size/2,0,0.8));
        
    }
    
    for( i=0; i<lineAmount; i++){
        
        lineMatX[i] = new THREE.LineBasicMaterial( { color: 0x888888, transparent: true, opacity: 1, linewidth: 1, vertexColors: THREE.VertexColors } );
        lineMatZ[i] = new THREE.LineBasicMaterial( { color: 0x888888, transparent: true, opacity: 1, linewidth: 1, vertexColors: THREE.VertexColors } );
        
        lineGeoX[i] = new THREE.Geometry();
        lineGeoZ[i] = new THREE.Geometry();
        
        for (j=0; j<points.length; j++){
            lineGeoX[i].vertices.push(new THREE.Vector3( points[j], -0.05, 0 ) );
            lineGeoZ[i].vertices.push(new THREE.Vector3( 0, -0.05, points[j] ) );
            
            lineGeoX[i].colors = colors;
            lineGeoZ[i].colors = colors;
        }
        
        lineMeshX[i] = new THREE.Line(lineGeoX[i],lineMatX[i]);
        lineMeshX[i].position.setZ((-size/2)+i*stepSize);
        lineMatX[i].opacity = 1-fit(Math.abs(lineMeshX[i].position.z), size/2-fadeDist,size/2,0,1) ;

        lineMeshZ[i] = new THREE.Line(lineGeoZ[i],lineMatZ[i]);
        lineMeshZ[i].position.setX((-size/2)+i*stepSize);
        lineMatZ[i].opacity = 1-fit(Math.abs(lineMeshZ[i].position.x), size/2-fadeDist,size/2,0,1) ;
        
        this.linesX[i]=lineMeshX[i];
        this.linesZ[i]=lineMeshZ[i];
        
        scene.add(this.linesX[i]);
        scene.add(this.linesZ[i]);

    }
    
    this.move = function( vel ){
        
        for(i=0; i<this.linesX.length; i++) {
            
            this.linesX[i].position.z += vel.z;
            lineMatX[i].opacity = 1-fit(Math.abs(lineMeshX[i].position.z), size/2-fadeDist,size/2,0,1) ;
            
            if (this.linesX[i].position.z > this.size/2){
                this.linesX[i].position.z -= this.size;
            }
            if (this.linesX[i].position.z < -this.size/2){
                this.linesX[i].position.z += this.size;
            }
        }

        for(i=0; i<this.linesZ.length; i++) {
            
            this.linesZ[i].position.x += vel.x;
            lineMatZ[i].opacity = 1-fit(Math.abs(lineMeshZ[i].position.x), size/2-fadeDist,size/2,0,1) ;
            
            if (this.linesZ[i].position.x > this.size/2){
                this.linesZ[i].position.x -= this.size;
            }
            if (this.linesZ[i].position.x < -this.size/2){
                this.linesZ[i].position.x += this.size;
            }
        }        
    };
}



init()
animate()


function init(){
    camera = new THREE.PerspectiveCamera( 40, window.innerWidth / window.innerHeight, 1, 800 );
    camera.position.set( -40, 30, -50);
    camera.lookAt( new THREE.Vector3( 0, 0, 0) );
    
    scene = new THREE.Scene();
    
    
    // Mesh ---------------------------------------------------------------------------------
    
    
    locator.push( new locatorConstructor( 3, 0xff0000 ) );
    locator.push( new locatorConstructor( 3, 0xff0000 ) );
    locator.push( new locatorConstructor( 3, 0xff0000 ) );
    locator.push( new locatorConstructor( 3, 0xff0000 ) );
    
    axisHelper.push( new locatorAxisConstructor(3) );
    
    var material = new THREE.MeshStandardMaterial( { color: 0x88aaff } ); // colorof the grid
    
    object = new THREE.Mesh( new THREE.BoxBufferGeometry( 2*legPosition.x, 0.2, 2*legPosition.z, 1, 1, 1 ), material );
    object.position.set( 0, bodyHeight, 0 );
    object.castShadow = true;
    object.recieveShadow = true;
    scene.add( object );
    
    grid = new Grid( 60, 4, 10);
    
    legs[0] = new legConstructor( new THREE.Vector3( legPosition.x, bodyHeight, legPosition.z), legRestAngle, lengthA, lengthB, lengthC);
    legs[1] = new legConstructor( new THREE.Vector3( -legPosition.x, bodyHeight, legPosition.z), -legRestAngle, lengthA, lengthB, lengthC);
    legs[2] = new legConstructor( new THREE.Vector3( legPosition.x, bodyHeight, -legPosition.z), 180-legRestAngle, lengthA, lengthB, lengthC);
    legs[3] = new legConstructor( new THREE.Vector3( -legPosition.x, bodyHeight, -legPosition.z), 180+legRestAngle, lengthA, lengthB, lengthC);
    

    //ikTester = new THREE.Mesh( new THREE.SphereGeometry(0.5, 6, 6 ), material );
    //ikTemp = new THREE.Mesh( new THREE.SphereGeometry(0.5, 6, 6 ), material );
    //ikTester.position.set( 0, 0, 0 );
    //legs[0].ikHandlerPos.add(new THREE.Vector3( 3, 0, -15));
    //ikTester.position.set( legs[0].ikHandlerPos.x, legs[0].ikHandlerPos.y, legs[0].ikHandlerPos.z );
    
    //scene.add( ikTester );
    //scene.add( ikTemp );
    //legs[0].ikUpdate();
    //legs[0].ikUpdate();
    
    // Lights ---------------------------------------------------------------------------------
    
    var light = new THREE.HemisphereLight( 0xffffbb, 0x080820, 1 );
    var dirLight1 = new THREE.DirectionalLight( 0x888888, 1 );
    var dirLight2 = new THREE.DirectionalLight( 0xaaaa88, 1 );
    var dirLight3 = new THREE.DirectionalLight( 0xaaaaff, 1 );
    dirLight1.position.set(-1.41, 1, -1.41);
    dirLight2.position.set( 1.41, 0.5, -1.41);
    dirLight3.position.set( 1.41, -0.1, 1.41);
    dirLight1.castShadow = true;
    scene.add( light );
    scene.add( dirLight1 );
    scene.add( dirLight2 );
    scene.add( dirLight3 );

    // Renderer ---------------------------------------------------------------------------------
    
    var container = document.body;
    
    renderer = new THREE.WebGLRenderer();
    renderer.antialias = true;
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize ( window.innerWidth, window.innerHeight );
    renderer.setClearColor ( 0x222222 );
    renderer.localClippingEnabled = true;
    
    window.addEventListener( 'resize', onWindowResize, false );
    container.appendChild( renderer.domElement );
    
    
    // Stats ---------------------------------------------------------------------------------
    
    stats = new Stats();
    container.appendChild( stats.dom );
    
    
    // Controls ---------------------------------------------------------------------------------
    
    var controls = new THREE.OrbitControls( camera, renderer.domElement );
    controls.target.set( 0, 1, 0 );
    controls.update();
    
    
    // Start
    
    startTime = Date.now()
    Time = 0;
    stats.begin();
}


function onWindowResize(){
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    
    renderer.setSize ( window.innerWidth, window.innerHeight );
    
}

function animate(){
    requestAnimationFrame( animate );
    stats.update();
    
    grid.move(vel);
    vel.applyAxisAngle( new THREE.Vector3( 0, 1, 0 ), 0.02);
    
    for ( i=0; i<legs.length; i++ ){
        //legs[i].ikHandlerPos.add(new THREE.Vector3( 0, 0, -0.1));
        legs[i].ikHandlerPos.add( vel );
        legs[i].ikUpdate();
    }
    
    
    //legs[0].ikHandlerPos.add( vel );
    //legs[0].ikUpdate();
    
    //console.log(legs[0].groupB.rotation.x);

    
    for( i=0 ; i<locator.length; i++ ){
        locator[i].group.position.set( legs[i].ikHandlerPos.x, legs[i].ikHandlerPos.y, legs[i].ikHandlerPos.z );
    }
    
    
    //for( i=0; i<legs.length; i++ ){
      //  legs[i].groupB.rotation.x = -1;
      //  legs[i].groupC.rotation.x = 2;
    //}
    //legs[0].groupA.rotation.y += 0.01;
    //legs[0].groupB.rotation.x -= 0.005;
    //legs[0].groupC.rotation.x += 0.01;
    
    renderer.render( scene, camera );
        
}