
// Mecho 4.10
// CC-3.0-SA-NC
//
//
// new Matrix()
//		identity()
//		rotateXZ(a) - angle in degrees
//		rotateXY(a) - angle in degrees
//		rotateYZ(a) - angle in degrees
//		translate(v)
//		untranslate(v) = translate(-v)
//		scale(s)
//
// Suica
//		Suica.version
//		{Suica.}random(<from>,<to>)
//		{Suica.}radians(<degrees>)
//		{Suica.}unitVector(<vector>)
//		{Suica.}vectorProduct(<vector>,<vector>)
//		{Suica.}scalarProduct(<vector>,<vector>)
//		{Suica.}vectorPoints(<vector-point>,<vector-point>)
//		{Suica.}sameAs(<object>)
//		{Suica.}sameAs(<array>)
//		{Suica.}getPosition(<vector>)
//		{Suica.}startTraceDraw(zScale)
//		{Suica.}endTraceDraw()
//		{Suica.}view
//		optimize
//
// mainAnimationLoop()
//
// {<scene> =} new Mecho(<canvas-id>)
//		{<scene>.}background = <color>						default:[1,1,1]
//		{<scene>.}lookAt(<eye>,<target>,<up>)				default:[100,100,30],[0,0,0],[0,0,1]
//		{<scene>.}perspective(<angle>,<near>,<far>)		default:30,1,40000
//		{<scene>.}orthographic(<near>,<far>)
//		
// Viewpoint(<context>)
//		rotate(dX,dY)
//		pan(dX,dY)
//		recalculate()
//		distance
//		alpha
//		beta
//		eye
//		target
//		up
//===================================================
//
// SUICA SHADERS
//
//===================================================

var vsSource = 
'	uniform mat4 uProjectionMatrix;	'+
'	uniform mat4 uViewMatrix;		'+
'	uniform mat4 uModelMatrix;		'+
'	uniform vec3 uScale;			'+
'	uniform vec3 uPos;				'+
'	uniform vec4 uRr;				'+
'	uniform bool uLight;			'+
'	uniform bool uSharpCone;		'+
'	attribute vec3 aXYZ;			'+
'	varying   vec2 vXY;				'+
'	varying   vec3 vPos;			'+
'	varying   float vZ;				'+
'	attribute vec3 aNormal;			'+
'	varying   vec3 vNormal;			'+
'	attribute vec2 aTexCoord;		'+
'	varying   vec2 vTexCoord;		'+
'	varying   float vDepth;			'+
'	void main ()					'+
'	{								'+
'		mat4 mvMatrix = uViewMatrix * uModelMatrix;'+
'		if (uLight) 				'+
'		{							'+
'			vec3 normal = aNormal;'+
'			if (aXYZ.z<0.5 || uSharpCone) normal =vec3(uRr.z,uRr.z,1)*normal+vec3(0,0,uRr.w);'+
'			vNormal = normalize(mat3(mvMatrix)*normal); 	'+
'		}							'+
'		vTexCoord = aTexCoord; '+
'		vec3 cone = vec3(vec2((uRr.y-uRr.x)*aXYZ.z+uRr.x),1);'+
'		vec4 pos = mvMatrix * vec4(aXYZ*uScale*cone+uPos,1);'+
'		gl_Position = uProjectionMatrix * pos;	'+
'		vPos = pos.xyz/pos.w;'+
'		vXY = aXYZ.xy;'+
'		vDepth = gl_Position.w;'+
'		vZ = (uModelMatrix * vec4(aXYZ*uScale*cone+uPos,1)).z;'+
'	}								';

var fsSource =	
'	uniform sampler2D uSampler; 	'+
'	precision mediump float;		'+
'	uniform bool uLight;			'+
'	uniform bool uTexture;			'+
'	uniform vec2 uTexScale;			'+
'	uniform float uTeeth;			'+
'	uniform vec3 uColor;			'+
'	uniform vec3 uBackground;		'+
'	uniform float uGears;			'+
'	uniform float uClip;			'+
'	uniform float uShininess;		'+
'	uniform float uReflection;		'+
'	uniform float uTransparancy;	'+
'	uniform float uFog;				'+
'	varying vec3 vNormal;			'+
'	varying vec2 vTexCoord;			'+
'	varying vec3 vPos;				'+
'	varying vec2 vXY;				'+
'	varying float vDepth;			'+
'	varying float vZ;				'+
'	const float PI = 3.1415926535897932384626433832795;'+
'	void main( )					'+
'	{								'+
'		if (uClip*vZ<0.0) discard;/*2019*/'+
'		vec3 normal = vNormal;'+
'		vec3 viewDir = normalize(vPos);'+

'		vec3 light = vec3(0,0,1);'+

'		vec3 reflectedLight = normalize(reflect(light,normal));'+
'		float cosa = max(dot(reflectedLight,viewDir),0.0);'+
'		vec3 specularColor = vec3(uReflection*pow(cosa,uShininess));'+

'		float m = (cosa+0.05)*uTeeth*(sin(uGears*atan(vXY.y,vXY.x)));'+

'		vec4 color = vec4(uColor,1.0);									'+
'		if (uTexture)													'+
'			color = color * texture2D(uSampler,vTexCoord*uTexScale);'+
'		float diffLight = uLight? (normal.z>0.0?normal.z:-0.1*normal.z):1.0;'+
'		diffLight=pow(max(diffLight,0.075),0.25)+m;'+
'		float k = uFog*smoothstep(0.0,160.0,vDepth);'+
'		gl_FragColor = vec4(mix(diffLight*color.rgb+specularColor,uBackground,k),uTransparancy);			'+
'	}																	';


var vsSourceSelect = 
'	uniform mat4 uProjectionMatrix;	'+
'	uniform mat4 uViewMatrix;		'+
'	uniform mat4 uModelMatrix;		'+
'	attribute vec3 aXYZ;			'+
'	void main ()					'+
'	{								'+
'		gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(aXYZ,1);	'+
'	}								';

var fsSourceSelect =	
'	precision mediump float;	'+
'	uniform vec3 uColor;		'+
'	void main( )				'+
'	{							'+
'		gl_FragColor = vec4(uColor,1.0);'+
'	}							';


//===================================================
//
// SUICA OBJECT
//
//===================================================


var Mecho = function( canvasId )
{
	// check uri for 'file' only if localImages does not exis
	if (!Mecho.localImages)
	if (document.documentURI.substring(0,4)=='file')
	{
		var div = document.createElement('div');
		document.body.appendChild(div);
		div.className = 'mechoerror';
		div.innerHTML = 'ВНИМАНИЕ: Вероятно примерът е стартиран локално. Декорациите може да не се покажат.';
	}


	// if no canvasId - use the first canvas
	if (!canvasId)
	{
		var cvx;
		var cvxs = document.getElementsByTagName('canvas');
		if (!cvxs.length)
		{	// no canvas? create one
			cvx = document.createElement('canvas');
			document.body.appendChild(cvx);
			cvx.width = window.innerWidth;
			cvx.height = window.innerHeight;
			cvx.className = 'mechocanvas';
		}
		else
			cvx = cvxs[0];
		
		// if no Id, create id
		if (!cvx.id) cvx.id = 'suica_canvas';

		canvasId = cvx.id;
	}
	this.gl = Mecho.getContext(canvasId,{
				//preserveDrawingBuffer: true,
				premultipliedAlpha: false,
				antialias: true,
				alpha: false,
			});

	this.shaderProgram = Mecho.getProgram(this.gl,vsSource,fsSource);
	this.shaderProgramSelect = Mecho.getProgram(this.gl,vsSourceSelect,fsSourceSelect);

	var that = this;
	this.mouseButton = 0;
	this.gl.canvas.addEventListener('mousedown',function(e){that.mouseDown(e);},false);
	this.gl.canvas.addEventListener('mousemove',function(e){that.mouseMove(e);},false);
	this.gl.canvas.addEventListener('mouseup',  function(e){that.mouseUp(e);},false);
	this.gl.canvas.addEventListener('mouseleave',  function(e){that.mouseUp(e);},false);
	this.gl.canvas.addEventListener('contextmenu',function(e){e.preventDefault();},false);
	window.addEventListener('keydown',function(e){that.keyDown(e);},false);
	window.addEventListener('keyup',function(e){that.keyUp(e);},false);

	this.viewObject = new Mecho.Viewpoint(this);
	
	this.viewMatrix = this.identityMatrix();
	this.modelMatrix = this.identityMatrix();
	this.projectionMatrix = this.identityMatrix();

	this.useShader(this.shaderProgram);

	this.gl.enable(this.gl.DEPTH_TEST);
	this.gl.enableVertexAttribArray(this.aXYZ);
	this.gl.disable(this.gl.CULL_FACE);
	this.gl.cullFace(this.gl.BACK);
	this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

	this.gl.uniform1f(this.uTeeth,0);
	this.gl.uniform3f(this.uScale,1,1,1);
	this.gl.uniform3f(this.uPos,0,0,0);
	this.gl.uniform4f(this.uRr,1,1,1,0);
	this.gl.uniform1i(this.uSharpCone,false);

	this.modelMatrixStack = [];
	this.normalMatrix = new Float32Array(9);

	this.perspective(30,0.5,1000);

	this.backgroundColor = [1,1,1];

	this.onTime = null;
	
	Mecho.contextList.push(this);
	Mecho.lastContext = this;

	this.defineGeometries();

	this.mecholetList = [];	// local list of all context objects
	this.traceletList = [];	// local list of all context traces
	this.groundObject = new Mecho.Ground();
	this.tagetObject = undefined;//new Mecho.Target();
	this.optimize = false;
	
	this.sky = Mecho.WHITE;
	this.ground = Mecho.TILE;
	
	// create buttons pannel
	this.buttons = 0;
	this.buttonList = [];
	this.panel = document.createElement('div');
	this.panel.className = 'mechopanel';
	this.panel.setAttribute('active','true');
	document.body.appendChild(this.panel);
}

// switch shaders
Mecho.prototype.useShader = function(shader)
{

	var gl = this.gl;
	var glprog = this.shaderProgram;
	for (var i=0; i<gl.getProgramParameter(glprog,gl.ACTIVE_UNIFORMS); i++)
	{
		var name = gl.getActiveUniform(glprog,i).name;
		this[name] = gl.getUniformLocation(glprog,name);
	}

	for (var i=0; i<gl.getProgramParameter(glprog,gl.ACTIVE_ATTRIBUTES); i++)
	{
		var name = gl.getActiveAttrib(glprog,i).name;
		this[name] = gl.getAttribLocation(glprog,name);
	}

	this.gl.useProgram(shader);
	this.gl.uniformMatrix4fv(this.uProjectionMatrix,false,this.projectionMatrix);
	this.gl.uniformMatrix4fv(this.uViewMatrix,false,this.viewMatrix);
	this.gl.uniformMatrix4fv(this.uModelMatrix,false,this.modelMatrix);

	if (shader==this.shaderProgram)
	{
		Mecho.normalRender = true;
	}

	if (shader==this.shaderProgramSelect)
	{
		if (this.aTexCoord) this.gl.disableVertexAttribArray(this.aTexCoord);
		if (this.aNormal) this.gl.disableVertexAttribArray(this.aNormal);
		Mecho.normalRender = false;
	}
}

Mecho.contextList = [];	// global list of all SUICA contexts
Mecho.lastContext = null;
Mecho.startTime = (new Date()).getTime(); // SUICA start time (in ms)
Mecho.time = 0;
Mecho.dTime = 0;
Mecho.FLOATS = Float32Array.BYTES_PER_ELEMENT; // should be 4

Mecho.normalRender = true; // false = render for object selection

Mecho.X = 0;
Mecho.Y = 1;
Mecho.Z = 2;
Mecho.T = 3;

Mecho.POINT = 1;
Mecho.LINE = 2;
Mecho.SOLID = 3;
Mecho.ALL = 4;
Mecho.NONPOINT = 5;

Mecho.PRECISION = 48;
Mecho.id = 0;

Mecho.getContext = function(canvasId,options)
{
	var canvas = document.getElementById(canvasId);
	if (!canvas)
	{
		alert('Не е намерен елемент canvas с id='+canvasId+' [getContext]');
		return null;
	}
	canvas.addEventListener('webglcontextlost',function(event){event.preventDefault();},false);
	canvas.addEventListener('webglcontextrestored',function(event){console.log('Boo!');},false);

	var context = canvas.getContext('webgl',options) || canvas.getContext('experimental-webgl',options);
	if (!context)
	{
		alert('Не е създаден графичен контекст [getContext]');
	}
	
	return context;
}


Mecho.getShader = function(gl,source,type)
{
	var shader = gl.createShader(type);

	gl.shaderSource(shader,source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader,gl.COMPILE_STATUS))
	{
		alert(gl.getShaderInfoLog(shader));
		return null;
	}
	
	return shader;
}


Mecho.getProgram = function(gl,vsSource,fsSource)
{
	var vShader = Mecho.getShader(gl,vsSource,gl.VERTEX_SHADER);
	var fShader = Mecho.getShader(gl,fsSource,gl.FRAGMENT_SHADER);

	if (!vShader || !fShader) {return null;}
	
	var shaderProgram = gl.createProgram();
	gl.bindAttribLocation(shaderProgram,0,"aXYZ");

	gl.attachShader(shaderProgram,vShader);
	gl.attachShader(shaderProgram,fShader);
	gl.linkProgram(shaderProgram);

	if (!gl.getProgramParameter(shaderProgram,gl.LINK_STATUS))
	{
		alert(gl.getProgramInfoLog(shaderProgram));
		return null;
	}

	return shaderProgram;
}


Mecho.prototype.perspective = function(angle,near,far)
{
	var aspect = this.gl.canvas.clientWidth/this.gl.canvas.clientHeight;
	var fov = 1/Math.tan(radians(angle)/2);
	this.projectionMatrix = new Float32Array([
		fov/aspect, 0, 0, 0,
		0, fov, 0, 0,
		0, 0, (far+near)/(near-far), -1,
		0, 0, 2.0*near*far/(near-far), 0]);
	this.gl.uniformMatrix4fv(this.uProjectionMatrix,false,this.projectionMatrix);
}

function perspective(angle,near,far)
{
	if (Mecho.lastContext) Mecho.lastContext.perspective(angle,near,far);
}


Mecho.prototype.lookAt = function(eye,target,up)
{
	this.viewObject.target = target;
	this.viewObject.eye = eye;
	this.viewObject.up = up;
}


function lookAt(eye,target,up)
{
	if (Mecho.lastContext) Mecho.lastContext.lookAt(eye,target,up);
}


Object.defineProperty(Mecho.prototype,'sky',
{
	get: function()  {return this.backgroundColor;},
	set: function(a)
		{
			a = a.color||a;
			this.backgroundColor=a;
			this.gl.uniform3fv(this.uBackground,a);
		}
});

Object.defineProperty(Mecho.prototype,'ground',
{
	get: function()  {return this.groundObject.material;},
	set: function(a)
		{
			this.groundObject.material=a;
		}
});

Mecho.prototype.identityMatrix = function()
{
	return new Float32Array( [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1] );
}
	

Mecho.prototype.matrixMultiply = function(a,b)
{
	var res=[];
    var b0  = b[0], b1 = b[1], b2 = b[2], b3 = b[3];  
    res[0] = b0*a[0] + b1*a[4] + b2*a[8] + b3*a[12];
    res[1] = b0*a[1] + b1*a[5] + b2*a[9] + b3*a[13];
    res[2] = b0*a[2] + b1*a[6] + b2*a[10] + b3*a[14];
    res[3] = b0*a[3] + b1*a[7] + b2*a[11] + b3*a[15];

    b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
    res[4] = b0*a[0] + b1*a[4] + b2*a[8] + b3*a[12];
    res[5] = b0*a[1] + b1*a[5] + b2*a[9] + b3*a[13];
    res[6] = b0*a[2] + b1*a[6] + b2*a[10] + b3*a[14];
    res[7] = b0*a[3] + b1*a[7] + b2*a[11] + b3*a[15];

    b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
    res[8] = b0*a[0] + b1*a[4] + b2*a[8] + b3*a[12];
    res[9] = b0*a[1] + b1*a[5] + b2*a[9] + b3*a[13];
    res[10] = b0*a[2] + b1*a[6] + b2*a[10] + b3*a[14];
    res[11] = b0*a[3] + b1*a[7] + b2*a[11] + b3*a[15];

    b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
    res[12] = b0*a[0] + b1*a[4] + b2*a[8] + b3*a[12];
    res[13] = b0*a[1] + b1*a[5] + b2*a[9] + b3*a[13];
    res[14] = b0*a[2] + b1*a[6] + b2*a[10] + b3*a[14];
    res[15] = b0*a[3] + b1*a[7] + b2*a[11] + b3*a[15];
    return res;
};

Mecho.prototype.transposeInverse = function()
{
	var a = this.matrixMultiply(this.viewMatrix,this.modelMatrix);
	
    var b00 =  a[0]*a[5]  -  a[1]*a[4],
        b01 =  a[0]*a[6]  -  a[2]*a[4],
        b02 =  a[0]*a[7]  -  a[3]*a[4],
        b03 =  a[1]*a[6]  -  a[2]*a[5],
        b04 =  a[1]*a[7]  -  a[3]*a[5],
        b05 =  a[2]*a[7]  -  a[3]*a[6],
        b06 =  a[8]*a[13] -  a[9]*a[12],
        b07 =  a[8]*a[14] - a[10]*a[12],
        b08 =  a[8]*a[15] - a[11]*a[12],
        b09 =  a[9]*a[14] - a[10]*a[13],
        b10 =  a[9]*a[15] - a[11]*a[13],
        b11 = a[10]*a[15] - a[11]*a[14],
        det = 1/(b00*b11 - b01*b10 + b02*b09 + b03*b08 - b04*b07 + b05*b06);

	this.normalMatrix[0] = (a[5] * b11 - a[6] * b10 + a[7] * b09) * det;
    this.normalMatrix[1] = (a[6] * b08 - a[4] * b11 - a[7] * b07) * det;
    this.normalMatrix[2] = (a[4] * b10 - a[5] * b08 + a[7] * b06) * det;

    this.normalMatrix[3] = (a[2] * b10 - a[1] * b11 - a[3] * b09) * det;
    this.normalMatrix[4] = (a[0] * b11 - a[2] * b08 + a[3] * b07) * det;
    this.normalMatrix[5] = (a[1] * b08 - a[0] * b10 - a[3] * b06) * det;

    this.normalMatrix[6] = (a[13] * b05 - a[14] * b04 + a[15] * b03) * det;
    this.normalMatrix[7] = (a[14] * b02 - a[12] * b05 - a[15] * b01) * det;
    this.normalMatrix[8] = (a[12] * b04 - a[13] * b02 + a[15] * b00) * det;
	
};

Mecho.prototype.cloneMatrix = function(a)
{
	var b = new Float32Array(a.length);
	b.set(a);
	return b;
}


Mecho.prototype.pushMatrix = function()
{
	this.modelMatrixStack.push(this.cloneMatrix(this.modelMatrix));
}


Mecho.prototype.popMatrix = function()
{
	if (this.modelMatrix.length)
		this.modelMatrix = this.modelMatrixStack.pop();
	else
		identity();
}


Mecho.prototype.redrawFrame = function()
{
	this.gl.clearColor(this.backgroundColor[0],this.backgroundColor[1],this.backgroundColor[2],1);
	this.gl.clear(this.gl.COLOR_BUFFER_BIT+this.gl.DEPTH_BUFFER_BIT);
	if (this.onTime) this.onTime();
}

Mecho.prototype.objectAtPoint = function(x,y)
{
	var rec = this.gl.canvas.getBoundingClientRect();
	
	this.useShader(this.shaderProgramSelect);
	
	// redraw all elements
	this.gl.clearColor(1,1,1,1);
	this.gl.clear(this.gl.COLOR_BUFFER_BIT+this.gl.DEPTH_BUFFER_BIT);
	for (var i=0; i<this.mecholetList.length; i++)
		this.mecholetList[i].drawObject();

	var pixelValues = new Uint8Array(4);//*2*2);
	this.gl.readPixels(	x-rec.left, rec.bottom-y, 1, 1, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixelValues);

	var id = pixelValues[0]+(pixelValues[1]<<8)+(pixelValues[2]<<16); 

	var foundObject = null;
	if (id<=Mecho.id)
	{
		for (var i=0; i<this.mecholetList.length; i++)
			if (this.mecholetList[i].interactive)
				if (this.mecholetList[i].id==id)
					{	// maybe object [i] is the correct? we may get wrong result because
						// of antialiasing, so check again, but draw only the suspected object
						this.gl.clearColor(1,1,1,1);
						this.gl.clear(this.gl.COLOR_BUFFER_BIT+this.gl.DEPTH_BUFFER_BIT);
						this.mecholetList[i].drawObject();
						this.gl.readPixels(	x-rec.left, rec.bottom-y, 1, 1, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixelValues);
						var checkedId = pixelValues[0]+(pixelValues[1]<<8)+(pixelValues[2]<<16); 
						if (id==checkedId)
						{	// Yes!!!
							foundObject=this.mecholetList[i];
							break;
						}
					}
	}
	
	this.useShader(this.shaderProgram);
	return foundObject;
}

Mecho.prototype.getPosition = function(center)
{
	var m = this.matrixMultiply(this.projectionMatrix,this.viewMatrix);
	var c = center;
	var x = m[0]*c[0]+m[4]*c[1]+m[8]*c[2]+m[12];
	var y = m[1]*c[0]+m[5]*c[1]+m[9]*c[2]+m[13];
	var w = m[3]*c[0]+m[7]*c[1]+m[11]*c[2]+m[15];

	var p = this.gl.canvas;
	var br = p.getBoundingClientRect();
	x = x*p.width/w/2;
	y = y*p.height/w/2;
	return [br.left+x+p.width/2+Mecho.scrollLeft(), br.top-y+p.height/2+Mecho.scrollTop()];
}

function getPosition(center)
{
	if (Mecho.lastContext) return Mecho.lastContext.getPosition(center);
}

Mecho.prototype.startTraceDraw = function(zScale)
{
	var gl = this.gl;
	this.pushMatrix();
	var mat = this.identityMatrix();
	gl.uniformMatrix4fv(this.uModelMatrix,false,mat);

	gl.uniform1i(this.uLight,false);
	gl.enableVertexAttribArray(this.aXYZ);
	gl.disableVertexAttribArray(this.aNormal);
	gl.disableVertexAttribArray(this.aTexCoord);
	gl.uniform1f(this.uReflection,0);
	gl.uniform1f(this.uShininess,1);
	gl.uniform3f(this.uScale,1,1,zScale);
	gl.uniform3f(this.uPos,0,0,0);
	gl.bindTexture(gl.TEXTURE_2D,null);
	gl.uniform1i(this.uTexture,false);
}
Mecho.prototype.endTraceDraw = function()
{
	this.popMatrix();
}

Mecho.prototype.mouseDown = function(event)
{
	this.gl.canvas.style.cursor = 'move';
	this.mouseButton = event.which;
	this.mousePos = [event.clientX,event.clientY];
	if (this.targetObject && !this.viewObject.follow)
	{
		this.targetObject.visible = true;
		this.targetObject.center = this.viewObject.target;
	}
}


Mecho.prototype.mouseUp = function(event)
{
	this.gl.canvas.style.cursor = 'auto';
	this.panel.setAttribute('active','true');
	//this.panel.style.display = 'block';
	this.mouseButton = 0;
	if (this.targetObject)
		this.targetObject.visible = false;
}

Mecho.prototype.mouseClick = function(event,elem)
{
	if (!elem) return;
	
	//process clicks on buttons
	if (elem.nextState) elem.nextState();
	if (elem.handler) elem.handler();
}

Mecho.keysDown = [];
Mecho.prototype.keyUp = function(event)
{
	Mecho.keysDown[event.keyCode]=false;
	if (this.targetObject)
		this.targetObject.visible = false;
}
Mecho.prototype.keyDown = function(event)
{
	Mecho.keysDown[event.keyCode]=true;

	var done = false;
	for (var elem = this.panel.firstChild; elem; elem=elem.nextSibling)
	{
		if( elem.button.key==event.keyCode )
		{
			if (elem.button.nextState) elem.button.nextState();
			if (elem.button.handler) elem.button.handler();
			done = true;
		}
	}
	if (done) return;
	
	// key navigation
	if (event.keyCode==Mecho.KEYS.LEFT)
		this.viewObject.rotate(-10,0);
	if (event.keyCode==Mecho.KEYS.RIGHT)
		this.viewObject.rotate(+10,0);
	if (event.keyCode==Mecho.KEYS.UP)
		this.viewObject.rotate(0,+5);
	if (event.keyCode==Mecho.KEYS.DOWN)
		this.viewObject.rotate(0,-5);
	if (this.targetObject && !this.viewObject.follow)
		if (event.keyCode==Mecho.KEYS.LEFT || event.keyCode==Mecho.KEYS.RIGHT || event.keyCode==Mecho.KEYS.UP || event.keyCode==Mecho.KEYS.DOWN)
		{
			this.targetObject.visible = true;
			this.targetObject.center = this.viewObject.target;
		}
}

Mecho.prototype.mouseMove = function(event)
{
	//this.mouseButton = event.which;
	if (!this.mouseButton) return;
	this.panel.setAttribute('active','false');
	//this.panel.style.display = 'none';
	var dX = event.clientX-this.mousePos[0];
	var dY = -event.clientY+this.mousePos[1];
	
	// left button - rotation
	if (this.mouseButton==1)
	{
		this.viewObject.rotate(dX,dY);
	}
	
	// right button - panning
	if (this.mouseButton==3)
	{
		this.viewObject.pan(dX,dY);
	}
	
	this.mousePos = [event.clientX,event.clientY];
}

function mainAnimationLoop()
{
	var time = new Date();
	time = (time.getTime()-Mecho.startTime)/1000; // milliseconds->seconds
	Mecho.dTime = time-Mecho.time;
	Mecho.time = time;
	
	// update objects from all suicas
	for (var s=0; s<Mecho.contextList.length; s++)
	{
		Mecho.contextList[s].redrawFrame(time);
	}
	
	// draw objects from all suicas
	for (var s=0; s<Mecho.contextList.length; s++)
	{
		var ctx = Mecho.contextList[s];
		var gl = ctx.gl;
		
		function drawMecholets()
		{
			for (var i=0; i<ctx.mecholetList.length; i++)
				ctx.mecholetList[i].draw();
		}

		function drawTraces(mirror)
		{	// mirror=1 draw above ground, -1 below ground
			ctx.startTraceDraw(mirror);
			for (var i=0; i<ctx.traceletList.length; i++)
				ctx.traceletList[i].draw();
			ctx.endTraceDraw();
		}

		function mirrorMatrix()
		{
			ctx.modelMatrix[8] *= -1;
			ctx.modelMatrix[9] *= -1;
			ctx.modelMatrix[10] *= -1;
		}
		
		gl.uniform1f(ctx.uClip,0);
		if (ctx.groundObject && ctx.groundObject.visible)
		{
			gl.uniform1f(ctx.uTransparancy,1);
			gl.uniform1f(ctx.uFog,1);
			ctx.groundObject.draw();
			gl.uniform1f(ctx.uFog,0.9);

			/* 2019.10.15: set to FALSE if "discard" in the
			   fragment shader cannot be translated to Direct3D,
			   this also removes the mirror image is removed */
			if (true)
			{
				gl.clear(gl.DEPTH_BUFFER_BIT);
				
				// draw mirror objects (reflections)
				gl.uniform1f(ctx.uClip,-1);
				mirrorMatrix();
				drawMecholets();
				drawTraces(-1);
				mirrorMatrix();

				gl.uniform1f(ctx.uTransparancy,ctx.groundObject.material[0].groundReflection);
				gl.enable(gl.BLEND);
				gl.uniform1f(ctx.uFog,1);
				ctx.groundObject.draw();
				gl.uniform1f(ctx.uFog,0.9);
				gl.uniform1f(ctx.uTransparancy,1);
				gl.disable(gl.BLEND);
			}
			// next (outside the IF) draw normal objects above the ground
			gl.uniform1f(ctx.uClip,1);
		}

		if (ctx.targetObject && ctx.targetObject.visible)
		{
			var k = 0.9*(1-Mecho.dTime);
			var cen = [0,0,0];
			for (var i=0; i<3; i++)
				cen[i] = ctx.targetObject.center[i]*k+(1-k)*ctx.viewObject.target[i];
			ctx.targetObject.center = cen;
			ctx.targetObject.draw();
		}
		drawMecholets();
		drawTraces(1);

		ctx.viewObject.recalculate();
	}
	
	requestAnimationFrame(mainAnimationLoop);
}

Mecho.random = function(a,b)
{
	return a+(b-a)*Math.random();
}


Mecho.radians = function(degrees)
{
	return degrees*Math.PI/180;
}


Mecho.N = function(x)
{
	x = Math.round(x);
	if (x<1) x=1;
	return x;
}


Mecho.unitVector = function(x)
{
	var len = 1/Math.sqrt( x[0]*x[0]+x[1]*x[1]+x[2]*x[2] );
	return [ len*x[0], len*x[1], len*x[2] ];
}


Mecho.vectorProduct = function(x,y)
{
	return [
		x[1]*y[2]-x[2]*y[1],
		x[2]*y[0]-x[0]*y[2],
		x[0]*y[1]-x[1]*y[0] ];
}


Mecho.scalarProduct = function(x,y)
{
	return x[0]*y[0] + x[1]*y[1] + x[2]*y[2];
}


Mecho.vectorPoints = function(x,y)
{
	return [ x[0]-y[0], x[1]-y[1], x[2]-y[2] ];
}


Mecho.sameAs = function(obj)
{
	if (obj instanceof Array)
	{
		return obj.slice(0);
	}
	else
	{
		var result={};
		for(var n in obj) result[n]=obj[n];
		obj.ctx.mecholetList.push(result);
		return result;
	}
}

Mecho.scrollLeft = function() {
	return Math.max (
		window.pageXOffset ? window.pageXOffset : 0,
		document.documentElement ? document.documentElement.scrollLeft : 0,
		document.body ? document.body.scrollLeft : 0
	);
}

Mecho.scrollTop = function() {
	return Math.max (
		window.pageYOffset ? window.pageYOffset : 0,
		document.documentElement ? document.documentElement.scrollTop : 0,
		document.body ? document.body.scrollTop : 0
	);
}


//===================================================
//
// new Matrix()
//		identity()
//		rotateXZ(a) - angle in degrees
//		rotateXY(a) - angle in degrees
//		rotateYZ(a) - angle in degrees
//		translate(v)
//		untranslate(v) = translate(-v)
//		scale(s)
//
//===================================================

Mecho.Matrix = function()
{
	this.identity();
}


Mecho.Matrix.prototype.identity = function()
{
	this.matrix = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
}


Mecho.Matrix.prototype.rotateXZ = function(a)
{
	a = radians(a);
	var s = Math.sin(a), c = Math.cos(a);
	var m = this.matrix;
	
	a = m[0]*s+m[ 8]*c; m[0]=m[0]*c-m[ 8]*s; m[ 8]=a;
	a = m[1]*s+m[ 9]*c; m[1]=m[1]*c-m[ 9]*s; m[ 9]=a;
	a = m[2]*s+m[10]*c; m[2]=m[2]*c-m[10]*s; m[10]=a;
}


Mecho.Matrix.prototype.rotateXY = function(a)
{
	a = radians(a);
	var s = Math.sin(a), c = Math.cos(a);
	var m = this.matrix;
	
	a = m[0]*s+m[4]*c; m[0]=m[0]*c-m[4]*s; m[4]=a;
	a = m[1]*s+m[5]*c; m[1]=m[1]*c-m[5]*s; m[5]=a;
	a = m[2]*s+m[6]*c; m[2]=m[2]*c-m[6]*s; m[6]=a;
}


Mecho.Matrix.prototype.rotateYZ = function(a)
{
	a = radians(a);
	var s = Math.sin(a), c = Math.cos(a);
	var m = this.matrix;
	
	a = m[4]*s+m[ 8]*c; m[4]=m[4]*c-m[ 8]*s; m[ 8]=a;
	a = m[5]*s+m[ 9]*c; m[5]=m[5]*c-m[ 9]*s; m[ 9]=a;
	a = m[6]*s+m[10]*c; m[6]=m[6]*c-m[10]*s; m[10]=a;
}


Mecho.Matrix.prototype.translate = function(v)
{
	var m = this.matrix;

	m[12] += m[0]*v[0]+m[4]*v[1]+m[8]*v[2];
	m[13] += m[1]*v[0]+m[5]*v[1]+m[9]*v[2];
	m[14] += m[2]*v[0]+m[6]*v[1]+m[10]*v[2];
}


Mecho.Matrix.prototype.untranslate = function(v)
{
	var m = this.matrix;

	m[12] -= m[0]*v[0]+m[4]*v[1]+m[8]*v[2];
	m[13] -= m[1]*v[0]+m[5]*v[1]+m[9]*v[2];
	m[14] -= m[2]*v[0]+m[6]*v[1]+m[10]*v[2];
}


Mecho.Matrix.prototype.scale = function(s)
{
	var m = this.matrix;

	m[0] *= s[0]; m[1] *= s[0];	m[2] *= s[0];
	m[4] *= s[1]; m[5] *= s[1];	m[6] *= s[1];
	m[8] *= s[2]; m[9] *= s[2]; m[10]*= s[2];
}


Mecho.Matrix.prototype.mirror = function(s)
{
	var m = this.matrix;

	m[8] *= -1; m[9] *= -1; m[10]*= -1;
}

Mecho.Matrix.prototype.point = function(v)
{
	var m = this.matrix;

	var x = m[12]+m[0]*v[0]+m[4]*v[1]+m[8]*v[2];
	var y = m[13]+m[1]*v[0]+m[5]*v[1]+m[9]*v[2];
	var z = m[14]+m[2]*v[0]+m[6]*v[1]+m[10]*v[2];
	return [x,y,z];
}

//===================================================
//
// new Viewpoint()
//
//===================================================
Mecho.Viewpoint = function(ctx)
{
	this.ctx = ctx;
	this.mDistance = 30;
	this.mAlpha = 3.14;
	this.dAlpha = 0;
	this.mBeta = 0.3;
	this.dBeta = 0;
	this.mEye = [0,0,0];
	this.mTarget = [0,0,3];
	this.mUp = [0,0,1];
	this.dirtyA = true; // distance, alpha or beta
	this.dirtyP = true; // eye, target or up
	this.follow = undefined;
}

Mecho.Viewpoint.prototype.rotate = function(dX,dY)
{
	this.dAlpha = dX;
	this.dBeta = dY;
	this.alpha += this.dAlpha/250;
	this.beta -= this.dBeta/200;
	if (this.beta>1.57) this.beta=1.57;
	if (this.beta<-1.57) this.beta=-1.57;
}

Mecho.Viewpoint.prototype.pan = function(dX,dY)
{
	var x = this.target[0];
	var y = this.target[1];
	var z = this.target[2];
	
	if (abs(dY)>abs(dX))
	{
		var posZ = Math.sign(z+this.distance*sin(this.beta));
		x += posZ*dY*sin(this.alpha)/(30-20*cos(this.beta));
		y += posZ*dY*cos(this.alpha)/(30-20*cos(this.beta));
	}
	else
	{
		x += dX*cos(this.alpha)/30;
		y -= dX*sin(this.alpha)/30;
	}
	this.target = [x,y,z];
	
	// because the eye position must be recalculated
	this.dirtyA = true;
}

Mecho.Viewpoint.prototype.recalculate = function()
{
	// if automatic following is on, then change target
	var follow = this.follow;
	if (follow && follow.center)
	{
		var k = 0.9;
		this.dirtyA = true;
		this.target[0] = this.target[0]*k+(1-k)*follow.center[0];
		this.target[1] = this.target[1]*k+(1-k)*follow.center[1];
		this.target[2] = this.target[2]*k+(1-k)*follow.center[2];
	}
	
	if (Mecho.keysDown[Mecho.KEYS.LEFT] ||
		Mecho.keysDown[Mecho.KEYS.RIGHT] ||
		Mecho.keysDown[Mecho.KEYS.UP] ||
		Mecho.keysDown[Mecho.KEYS.DOWN] )
	{
		this.rotate(this.dAlpha,this.dBeta);
		this.dirtyA = true;
	} else
	if (Math.abs(this.dAlpha)>0.001 | Math.abs(this.dBeta)>0.001)
	{
		var kx=1-5*Mecho.dTime;
		var ky=1-10*Mecho.dTime;
		this.rotate(kx*this.dAlpha,ky*this.dBeta);
		this.dirtyA = true;
	}
//	console.log(this.dAlpha,this.dBeta);
	
	// if the spherical view point is changed (i.e. distance,
	// alpha or beta) then recalculate new cartesian view
	// point (i.e. eye, target and up vectors)
	if (this.dirtyA)
	{
		this.dirtyA = false;

		var posZ = this.target[2]+this.distance*sin(this.beta);
		if (this.ctx.groundObject && this.ctx.groundObject.visible)
		{
			var MIN_POS_Z = 0.2;
			if (posZ<MIN_POS_Z)
			{
				this.beta = Math.asin((MIN_POS_Z-this.target[2])/this.distance);
				posZ = MIN_POS_Z;
			}
		}
		
		this.eye = [ this.target[0]+this.distance*sin(this.alpha)*cos(this.beta),
					 this.target[1]+this.distance*cos(this.alpha)*cos(this.beta),
					 posZ ];
	}
	
	// if the cartesian view point is changed (i.e. eye,
	// target and up vectors), then recalculate the view
	// matrix and send it to the shader
	if (this.dirtyP)
	{
		this.dirtyP = false;
		var z = Mecho.unitVector(Mecho.vectorPoints(this.eye,this.target));
		var x = Mecho.unitVector(Mecho.vectorProduct(this.up,z));
		var y = Mecho.unitVector(Mecho.vectorProduct(z,x));
		this.ctx.viewMatrix = new Float32Array([
			x[0], y[0], z[0], 0,
			x[1], y[1], z[1], 0,
			x[2], y[2], z[2], 0,
			-Mecho.scalarProduct(x,this.mEye),
			-Mecho.scalarProduct(y,this.mEye),
			-Mecho.scalarProduct(z,this.mEye), 1 ]);
		this.ctx.gl.uniformMatrix4fv(this.ctx.uViewMatrix,false,this.ctx.viewMatrix);
	}
}

Object.defineProperty(Mecho.Viewpoint.prototype,'distance',
{
	get: function()  {return this.mDistance;},
	set: function(a) {this.mDistance=a; this.dirtyA=true;}
});

Object.defineProperty(Mecho.Viewpoint.prototype,'alpha',
{
	get: function()  {return this.mAlpha;},
	set: function(a) {this.mAlpha=a; this.dirtyA=true;}
});

Object.defineProperty(Mecho.Viewpoint.prototype,'beta',
{
	get: function()  {return this.mBeta;},
	set: function(a) {this.mBeta=a; this.dirtyA=true;}
});

Object.defineProperty(Mecho.Viewpoint.prototype,'eye',
{
	get: function()  {return this.mEye;},
	set: function(a) {this.mEye=a; this.dirtyP=true;}
});

Object.defineProperty(Mecho.Viewpoint.prototype,'target',
{
	get: function()  {return this.mTarget;},
	set: function(a) {this.mTarget=a; this.dirtyP=true;}
});

Object.defineProperty(Mecho.Viewpoint.prototype,'up',
{
	get: function()  {return this.mUp;},
	set: function(a) {this.mUp=a; this.dirtyP=true;}
});

Object.defineProperty(Mecho.prototype,'view',
{
	get: function()  {return [this.viewObject.distance, this.viewObject.alpha, this.viewObject.beta, this.viewObject.target];},
	set: function(a) {this.viewObject.distance=a[0]; this.viewObject.alpha=a[1]; this.viewObject.beta=a[2]; this.viewObject.target=a[3];}
});

Object.defineProperty(Mecho.prototype,'target',
{
	get: function()  {return this.viewObject.target;},
	set: function(a) {this.viewObject.target=a;}
});

//===================================================
//
// new Image(url)
//
//===================================================

Mecho.Image = function(url)
{
	this.ctx = Mecho.lastContext;
	this.url = url;
	this.texture = this.ctx.gl.createTexture();
	Mecho.loadImageForTexture(this.ctx.gl,this.url,this.texture);
}


Mecho.ongoingImageLoads = [];
Mecho.loadImageForTexture = function(gl,url,texture)
{
	var image = new Image();
	image.onload = function() {
		Mecho.ongoingImageLoads.splice(Mecho.ongoingImageLoads.indexOf(image),1);
		Mecho.textureFinishedLoading(gl,url,image,texture);
	}
	Mecho.ongoingImageLoads.push(image);
	image.src = Mecho.localImages ? (Mecho.localImages[url] || url) : url;
}


Mecho.textureFinishedLoading = function(gl,url,image,texture)
{
	gl.bindTexture(gl.TEXTURE_2D,texture);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
	gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
	gl.generateMipmap(gl.TEXTURE_2D);
	gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
	gl.bindTexture(gl.TEXTURE_2D,null);
}


// Materials
Mecho.BLACK = {color:[0,0,0]};
Mecho.WHITE = {color:[1,1,1]};
Mecho.YELLOW = {color:[1,1,0]};
Mecho.BLUE = {color:[0,0.5,1]};
Mecho.RED = {color:[1,0.2,0.2]};
Mecho.GREEN = {color:[0.1,0.8,0.2]};
Mecho.TILE = {
	color:[0.9,0.95,1],
	reflection:0.2,
	shininess: 5.0,
	name:'tile.jpg',
	groundScale: 1,
	groundReflection:0.6 };
Mecho.WOOD = {
	reflection:0.3,
	shininess: 1.0,
	name:'wood.jpg',
	groundScale: 4,
	groundReflection:0.9 };
Mecho.WOOD_ROUND = {
	reflection:0.4,
	shininess: 2.0,
	name:'wood_round.jpg',
	tiles:[1,1],
	groundReflection:0.9 };
Mecho.DARK_WOOD = {
	color: [0.8,0.6,0.4],
	reflection:0.3,
	shininess: 1.0,
	name:'wood.jpg',
	groundScale: 4,
	groundReflection:0.9 };
Mecho.DARK_WOOD_ROUND = {
	color: [0.8,0.6,0.4],
	reflection:0.4,
	shininess: 2.0,
	name:'wood_round.jpg',
	tiles:[1,1],
	groundReflection:0.9 };
Mecho.GOLD = {
	color:[1.3,1.1,0.7],
	reflection:1.0,
	shininess: 5.0,
	name:'gold.jpg' };
Mecho.METAL = {
	reflection:0.7,
	shininess: 2.0,
	name:'metal.jpg' };
Mecho.METAL_ROUND = {
	reflection:0.7,
	shininess: 2.0,
	name:'metal_round.jpg',
	tiles:[1,1] };
Mecho.SCRATCH = {
	reflection:0.6,
	shininess: 7.0,
	name:'scratch.jpg' };
Mecho.CHECK = {
	reflection:0.5,
	shininess: 1.0,
	name:'check.jpg' };
Mecho.METRIC = {
	reflection:0.0,
	shininess: 1.0,
	name:'metric.jpg' };
Mecho.METRIC_ROUND = {
	reflection:0.0,
	shininess: 1.0,
	name:'metric_round.jpg',
	tiles:[1,1] };
Mecho.PAPER = {
	color:[1.2,1.2,1],
	reflection:0.0,
	shininess: 1.2,
	name:'paper.jpg',
	groundReflection:1 };
Mecho.ASPHALT = {
	reflection:0.9,
	shininess: 1.0,
	name:'asphalt.jpg',
	groundReflection:0.9,
	groundScale: 5};		
Mecho.MARBLE = {
	reflection:0.2,
	shininess: 5.0,
	name:'marble.jpg',
	groundScale: 20};
Mecho.WATER = {
	reflection:0.2,
	shininess: 5.0,
	name:'water.jpg',
	groundScale: 50	};
Mecho.ROCK = {
	reflection:0.2,
	shininess: 5.0,
	name:'rock.jpg',
	groundReflection:0.9,
	groundScale: 20	};
Mecho.ROCK2 = {
	reflection:0.2,
	shininess: 5.0,
	name:'rock2.jpg',
	groundReflection:0.9 };
Mecho.INDUSTRIAL = {
	reflection:0.5,
	shininess: 5.0,
	name:'industrial.jpg',
	groundReflection:0.8,
	groundScale: 4	};
Mecho.DEFAULT_MATERIAL = [Mecho.TILE];

Mecho.material = function(m)
{
	Mecho.DEFAULT_MATERIAL = m;
}

Mecho.custom = function(obj,properties)
{
	var newObj={};
	for(var n in obj) newObj[n]=obj[n];
	for(var n in properties) newObj[n]=properties[n];
	return newObj;
}

function onResize(event)
{
	var ctx = Mecho.lastContext;
	if (ctx)
	{
		ctx.gl.canvas.width = window.innerWidth;
		ctx.gl.canvas.height = window.innerHeight;
		ctx.gl.viewport(0,0,window.innerWidth,window.innerHeight);
		ctx.perspective(30,0.5,1000);
	}
}


//===================================================
//
// new Button(imageName,key,handler,states,initialState)
//
//===================================================
Mecho.KEYS = {
        CANCEL: 3,
        HELP: 6,
        BACK_SPACE: 8,
        TAB: 9,
        CLEAR: 12,
        RETURN: 13,
        ENTER: 14,
        SHIFT: 16,
        CONTROL: 17,
        ALT: 18,
        PAUSE: 19,
        CAPS_LOCK: 20,
        ESCAPE: 27,
        SPACE: 32,
        PAGE_UP: 33,
        PAGE_DOWN: 34,
        END: 35,
        HOME: 36,
        LEFT: 37,
        UP: 38,
        RIGHT: 39,
        DOWN: 40,
        PRINTSCREEN: 44,
        INSERT: 45,
        DELETE: 46,
        0: 48,
        1: 49,
        2: 50,
        3: 51,
        4: 52,
        5: 53,
        6: 54,
        7: 55,
        8: 56,
        9: 57,
        SEMICOLON: 59,
        EQUALS: 61,
        A: 65,
        B: 66,
        C: 67,
        D: 68,
        E: 69,
        F: 70,
        G: 71,
        H: 72,
        I: 73,
        J: 74,
        K: 75,
        L: 76,
        M: 77,
        N: 78,
        O: 79,
        P: 80,
        Q: 81,
        R: 82,
        S: 83,
        T: 84,
        U: 85,
        V: 86,
        W: 87,
        X: 88,
        Y: 89,
        Z: 90,
        CONTEXT_MENU: 93,
        NUMPAD0: 96,
        NUMPAD1: 97,
        NUMPAD2: 98,
        NUMPAD3: 99,
        NUMPAD4: 100,
        NUMPAD5: 101,
        NUMPAD6: 102,
        NUMPAD7: 103,
        NUMPAD8: 104,
        NUMPAD9: 105,
        MULTIPLY: 106,
        ADD: 107,
        SEPARATOR: 108,
        SUBTRACT: 109,
        DECIMAL: 110,
        DIVIDE: 111,
        F1: 112,
        F2: 113,
        F3: 114,
        F4: 115,
        F5: 116,
        F6: 117,
        F7: 118,
        F8: 119,
        F9: 120,
        F10: 121,
        F11: 122,
        F12: 123,
        F13: 124,
        F14: 125,
        F15: 126,
        F16: 127,
        F17: 128,
        F18: 129,
        F19: 130,
        F20: 131,
        F21: 132,
        F22: 133,
        F23: 134,
        F24: 135,
        NUM_LOCK: 144,
        SCROLL_LOCK: 145,
        COMMA: 188,
        PERIOD: 190,
        SLASH: 191,
        BACK_QUOTE: 192,
        OPEN_BRACKET: 219,
        BACK_SLASH: 220,
        CLOSE_BRACKET: 221,
        QUOTE: 222,
        META: 224
};


function button(imageName,key,handler,states,initialState)
{
	return new Mecho.Button(imageName,key,handler,states,initialState);
}

Mecho.Button = function (imageName,key,handler,states,initialState)
{
	this.ctx = Mecho.lastContext;
	this.ctx.buttons++;
	this.ctx.panel.style.height = (5*this.ctx.buttons+0.4*(this.ctx.buttons-1))+'em';

	//http://stackoverflow.com/questions/1465374/javascript-event-keycode-constants
	var ch = key.toUpperCase();
	this.key = Mecho.KEYS[ch];
	this.handler = handler;
	
	var div = document.createElement('div');
	div.className = 'mechobutton';
	var that = this;
//			div.addEventListener('click',function(){that.nextState();});
//			div.addEventListener('click',handler);
	div.addEventListener('click',function(e){that.ctx.mouseClick(e,that);},false);
	
	var txt = document.createElement('div');
	txt.className = 'mechocaption';
	txt.innerHTML = key;
	div.appendChild(txt);
	
	var img = document.createElement('img');
	div.appendChild(img);
	img.src = 'images/buttons/'+imageName+'.png';

	this.states = states;
	this.state = initialState||0;
	if (this.states)
	{
		var statpan = document.createElement('div');
		statpan.className = 'mechostatpanel';
		div.appendChild(statpan);
		
		for (var i=0; i<this.states; i++)
		{
			var stat = document.createElement('div');
			stat.className = 'mechostat';
			stat.setAttribute('checked','false');
			stat.style.top = (4.1-i%5)+'em';
			stat.style.left = Math.floor(i/5)+'em';
			statpan.appendChild(stat);
		}
		statpan.children[this.state].setAttribute('checked','true');
	}
	this.statpan = statpan;
	this.ctx.panel.appendChild(div);
	this.ctx.buttonList.push(this);
	div.button = this;
	return this;
}

Mecho.Button.prototype.nextState = function()
{
	if (this.states)
	{
		this.statpan.children[this.state].setAttribute('checked','false');
		this.state = (this.state+1)%this.states;
		this.statpan.children[this.state].setAttribute('checked','true');
	}
}

Object.defineProperty(Array.prototype,'x',
{
	get: function()  {return this[0];},
	set: function(a) {this[0]=a;}
});

Object.defineProperty(Array.prototype,'y',
{
	get: function()  {return this[1];},
	set: function(a) {this[1]=a;}
});

Object.defineProperty(Array.prototype,'z',
{
	get: function()  {return this[2];},
	set: function(a) {this[2]=a;}
});


//=========

var random = Mecho.random;
var radians = Mecho.radians;
var unitVector = Mecho.unitVector;
var vectorProduct = Mecho.vectorProduct;
var scalarProduct = Mecho.scalarProduct;
var vectorPoints = Mecho.vectorPoints;
var sameAs = Mecho.sameAs;
var material = Mecho.material;
var custom = Mecho.custom;
var sin = Math.sin;
var cos = Math.cos;
var abs = Math.abs;
var min = Math.min;
var max = Math.max;
var sqrt = Math.sqrt;
var PI = Math.PI;
var pi = Math.PI;

window.addEventListener('resize',onResize,false);
mainAnimationLoop();

Mecho.version = '4.10 (150321)';
console.log('Mecho',Mecho.version);
﻿//===================================================
//
// Module:	Mecholet
// Library:	Mecho 4.0
// License:	CC-3.0 SA NC
//
// Constructor:
// 		Mecholet()
//
// Position properties:
//		center
//		centerOffset
//		imageOffset
//		rotH
//		rotV
//		rotS
//		rotT
//
// Material properties:
//		material[] - material or true/false
//		tiles[]
//
// Visual properties:
//		visible
//		interactive
//		nice
//		followed
//		optimize
//
// Misc:
//		custom(properties)
//
//===================================================

Mecho.Mecholet = function()
{
	Mecho.id += 3;
	this.id = Mecho.id;
	this.idColor = [
		(this.id & 0xff)/255,
		((this.id>>8) & 0xff)/255,
		((this.id>>16) & 0xff)/255 ];
	this.ctx = Mecho.lastContext;

	this.mCenter = [0,0,0];
	this.mH = 0;
	this.mV = 0;
	this.mS = 0;
	this.mT = 0;
	this.mCenterOffset = undefined;
	this.imageOffset = undefined;
	this.dirty = false; 		// rotation or center changed
	this.optimize = this.ctx.optimize||false;

	this.images = [];
	this.mTiles = [1,1,1,1];	// texture scale
	this.material = Mecho.DEFAULT_MATERIAL;
	//this.color = [1,1,1];
	//this.colorEx = [1,1,1];
	//this.mImage = null;
	//this.mImageEx = null;

	this.visible = true;
	this.interactive = false;
	this.nice = false;
	this.mFollowed = false;

	this.oxyz = new Mecho.Matrix();
	this.ctx.mecholetList.push(this);
	
	//collect custom options
	this.customValues = undefined;
	this.customIndex = undefined;
	for (var i=arguments.length-1; i>=0; i--)
	{
		if (arguments[i]==undefined)
			continue;
			
		if (arguments[i].constructor==Object)
		{
			this.customIndex = i;
			this.customValues = arguments[i];
		}
		else
			break;
	}
}


Object.defineProperty(Mecho.Mecholet.prototype,'rotH',
{
	get: function()  {return this.mRotH;},
	set: function(a) {this.mRotH=a; this.dirty=true;}
});


Object.defineProperty(Mecho.Mecholet.prototype,'rotV',
{
	get: function()  {return this.mRotV;},
	set: function(a) {this.mRotV=a; this.dirty=true;}
});


Object.defineProperty(Mecho.Mecholet.prototype,'rotS',
{
	get: function()  {return this.mRotS;},
	set: function(a) {this.mRotS=a; this.dirty=true;}
});


Object.defineProperty(Mecho.Mecholet.prototype,'rotT',
{
	get: function()  {return this.mRotT;},
	set: function(a) {this.mRotT=a; this.dirty=true;}
});


Object.defineProperty(Mecho.Mecholet.prototype,'center',
{
	get: function()  {return this.mCenter;},
	set: function(a) {this.mCenter=a; this.dirty=true; if (this.onCenter) this.onCenter();}
});


Object.defineProperty(Mecho.Mecholet.prototype,'centerOffset',
{
	get: function()  {return this.mCenterOffset;},
	set: function(a) {this.mCenterOffset=a; this.dirty=true;}
});


Object.defineProperty(Mecho.Mecholet.prototype,'followed',
{
	get: function()  {return this.mFollowed;},
	set: function(a)
		{
			if (a)
				this.ctx.viewObject.follow = this; // set new follow
			else
				this.ctx.viewObject.follow = undefined; // clear current follow
			this.mFollowed = a;
		}
});

Object.defineProperty(Mecho.Mecholet.prototype,'material',
{
	get: function()  {return this.mMaterial;},
	set: function(a)
		{
			if (a===true)
			{
				this.visible = true;
				return;
			}
			
			if (a===false)
			{
				this.visible = false;
				return;
			}
			
			// convert single values into arrays: v->[v]
			if (a.constructor != Array)
				a = [a];
				
			// convert color to array: [r,g,b]->[[r,g,b]]
			if (isFinite(a[0]))
				a = [a];
				
			this.mMaterial = [];
			for (var i=0; i<a.length; i++)
			{
				if (isFinite(a[i][0]))
				{
					// set materials
					this.mMaterial[i] = {
						color: a[i],
						image: null,
						reflection: 0.2,
						shininess: 3,
						tiles: null,
						groundReflection: 0.5,
						groundScale: 10,
					}
				}
				else
				{
					// if an image is not loaded, load it now
					if (a[i].name && !this.images[a[i].name])
						this.images[a[i].name] = new Mecho.Image('images/materials/'+a[i].name);

					// set materials
					this.mMaterial[i] = {
						color: a[i].color || [1,1,1],
						image: a[i].name?(this.images[a[i].name] || null):null,
						reflection: (a[i].reflection!=undefined)?a[i].reflection:0.2,
						shininess: (a[i].shininess!=undefined)?a[i].shininess:3,
						tiles: a[i].tiles || null,
						groundReflection: (a[i].groundReflection!=undefined)?a[i].groundReflection:0.5,
						groundScale: a[i].groundScale || 10,
					}
				}
			}
			if (this.onMaterial) this.onMaterial();
		}
});


Object.defineProperty(Mecho.Mecholet.prototype,'tiles',
{
	get: function()  {return this.mTiles;},
	set: function(a) {
			this.mTiles[0] = a[0]||1;
			this.mTiles[1] = a[1]||1;
			this.mTiles[2] = a[2]||1;

			this.mTiles[3] = a[3]||1;
			this.mTiles[4] = a[4]||1;
			this.mTiles[5] = a[5]||1;
			this.mTiles[6] = a[6]||1;

			this.mTiles[7] = a[7]||1;
			this.mTiles[8] = a[8]||1;
			this.mTiles[9] = a[9]||1;
			this.mTiles[10]= a[10]||1;
		}
});

Mecho.Mecholet.prototype.point = function(v)
{
	this.fixIfDirty();
	return this.oxyz.point(v);
}

Object.defineProperty(Mecho.Mecholet.prototype,'otherPoint',
{
	get: function()  {return this.atPoint(1);},
});

Object.defineProperty(Mecho.Mecholet.prototype,'midPoint',
{
	get: function()  {return this.atPoint(0.5);},
});

Mecho.Mecholet.prototype.fixIfDirty = function()
{
	if (this.dirty || !this.optimize)
	{
		if (this.parent)
		{
			this.parent.fixIfDirty();
			this.oxyz.matrix = this.ctx.cloneMatrix(this.parent.oxyz.matrix);
//			this.oxyz.matrix[12]=0;
//			this.oxyz.matrix[13]=0;
//			this.oxyz.matrix[14]=0;
//			this.oxyz.matrix[15]=1;
		}
		else
			this.oxyz.identity();
		
		this.oxyz.translate(this.center);

		if (this.rotH) this.oxyz.rotateXY(this.rotH);	//Z
		if (this.rotV) this.oxyz.rotateXZ(-this.rotV);	//Y

		if (this.rotT) this.oxyz.rotateYZ(this.rotT);	//X
		if (this.rotS) this.oxyz.rotateXY(this.rotS);	//Z

		//if (this.scale) this.oxyz.scale(this.scale);
		if (this.centerOffset) this.oxyz.untranslate(this.centerOffset);

		this.dirty = false;
	}
}


Mecho.Mecholet.prototype.done = function()
{
	this.oxyz.identity();
	
	this.oxyz.translate(this.center);

	if (this.rotH) this.oxyz.rotateXY(this.rotH);
	if (this.rotV) this.oxyz.rotateXZ(-this.rotV);

	if (this.rotT) this.oxyz.rotateYZ(this.rotT);
	if (this.rotS) this.oxyz.rotateXY(this.rotS);

	//if (this.scale) this.oxyz.scale(this.scale);
	if (this.centerOffset) this.oxyz.untranslate(this.centerOffset);

	this.dirty = false;
}


Mecho.Mecholet.prototype.prepareMaterial = function(m,m2)
{	// m - index of material
	var gl = this.ctx.gl;
	
	if (Mecho.normalRender)
	{	// normal render of shaded colors and textures
		if (!m)
		{
			gl.uniform1i(this.ctx.uLight,true);

			gl.enableVertexAttribArray(this.ctx.aXYZ);
			gl.enableVertexAttribArray(this.ctx.aNormal);
		}
		
		var material = this.material[m]||this.material[m2];
		if (material)
		{
			gl.uniform1f(this.ctx.uReflection,material.reflection);
			gl.uniform1f(this.ctx.uShininess,material.shininess);
			this.ctx.gl.uniform3fv(this.ctx.uColor,material.color);
		}
		
		if (material && material.image && gl.isTexture(material.image.texture))
		{
			gl.enableVertexAttribArray(this.ctx.aTexCoord);
			gl.uniform1i(this.ctx.uTexture,true);

			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D,material.image.texture);
			gl.uniform1i(this.ctx.uTexture,true);
		}
		else
		{
			if (!m)
			{
				gl.disableVertexAttribArray(this.ctx.aTexCoord);
				gl.bindTexture(gl.TEXTURE_2D,null);
				gl.uniform1i(this.ctx.uTexture,false);
			}
		}
	}
	else
	{	// special render for picking objects, uses only color id
		gl.uniform1i(this.ctx.uLight,false);
		gl.uniform1f(this.ctx.uReflection,0);
		gl.uniform1f(this.ctx.uShininess,0);
		gl.enableVertexAttribArray(this.ctx.aXYZ);
		gl.disableVertexAttribArray(this.ctx.aNormal);
		gl.disableVertexAttribArray(this.ctx.aTexCoord);
		this.ctx.gl.uniform3fv(this.ctx.uColor,this.idColor);
		gl.bindTexture(gl.TEXTURE_2D,null);
		gl.uniform1i(this.ctx.uTexture,false);
	}
}


Mecho.Mecholet.prototype.draw = function()
{
	this.fixIfDirty();

	if (!this.visible) return;
	if (!Mecho.normalRender && !this.interactive) return;

	this.ctx.pushMatrix();
	{
		var gl = this.ctx.gl;

//		if (this.centerOffset) this.oxyz.untranslate(this.centerOffset);
		if (this.imageOffset) this.oxyz.translate(this.imageOffset);

		var mat = this.ctx.matrixMultiply(this.ctx.modelMatrix,this.oxyz.matrix);
		gl.uniformMatrix4fv(this.ctx.uModelMatrix,false,mat);
		this.drawFaces(); // defined in successors
	}
	this.ctx.popMatrix();
}


Mecho.Mecholet.prototype.custom = function(properties)
{
	for(var n in properties) this[n]=properties[n];
	return this;
}


// Tracelet

Mecho.Tracelet = function(pencil)
{
	if (Mecho.Tracelet.vertices>Mecho.Tracelet.MAX_VERTICES)
	{
		throw new Error('Too many traces. Increase Mecho.Tracelet.MAX_VERTICES='+Mecho.Tracelet.MAX_VERTICES+'.');
	}
	
	this.ctx = Mecho.lastContext;
	var gl = this.ctx.gl;

	this.pencil = pencil;
	this.visible = true;
	
	if (pencil.trace)
	{	// the pencil has a trace, create the current instance
		// as a static-buffer copy of that trace
		this.size = pencil.trace.count;		// number of allocated vertices
		this.count = this.size;				// number of used vertices
		this.dynamic = false;

//console.log('Creating a cloned trace size =',this.size);
		// clone tha pencil buffer into a static buffer
		
		var mesh = pencil.trace.mesh.slice(0,3*this.size); // 1 vertex = 3 numbers
		this.buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
		gl.bufferData(gl.ARRAY_BUFFER,mesh,gl.STATIC_DRAW);
		
		pencil.trace.count = 0;
	}
	else
	{	// the pencil has no trace, create the main dynamic-buffer trace
		this.size = Mecho.Tracelet.VERTICES; // number of allocated vertices
		this.count = 0;		// number of used vertices
		this.dynamic = true;
//console.log('Creating a new trace size =',this.size);
		// create a new empty dynamic buffer
		this.mesh = new Float32Array(3*this.size); // 1 vertex = 3 numbers
		this.buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
		gl.bufferData(gl.ARRAY_BUFFER,this.mesh,gl.DYNAMIC_DRAW);
	}

	Mecho.lastContext.traceletList.push(this);
	Mecho.Tracelet.vertices += this.size;
}

Mecho.Tracelet.prototype.draw = function()
{
	if (!this.visible) return;

	var gl = this.ctx.gl;

	gl.uniform3fv(this.ctx.uColor,this.pencil.material[0].color);
	gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
	gl.vertexAttribPointer(this.ctx.aXYZ,3,gl.FLOAT,false,3*Mecho.FLOATS,0*Mecho.FLOATS);
	gl.drawArrays(gl.LINE_STRIP,0,this.count);
}

Mecho.Tracelet.prototype.isFull = function()
{
	return this.count>=this.size;
}

Mecho.Tracelet.prototype.breakTrace = function()
{
	var gl = this.ctx.gl;
	gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
	this.mesh[this.count*3] = undefined;
	this.mesh[this.count*3+1] = undefined;
	this.mesh[this.count*3+2] = undefined;
	gl.bufferSubData(gl.ARRAY_BUFFER,this.count*3/*coords*/*4/*size-of-float*/,Mecho.Tracelet.BREAK);
	this.count++;
	
	if (this.isFull())
	{
		new Mecho.Tracelet(this.pencil);
	}	
}

Mecho.Tracelet.prototype.add = function()
{
	var gl = this.ctx.gl;
	gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
	this.mesh[this.count*3] = this.pencil.center[0];
	this.mesh[this.count*3+1] = this.pencil.center[1];
	this.mesh[this.count*3+2] = this.pencil.center[2];
	gl.bufferSubData(gl.ARRAY_BUFFER,this.count*3/*coords*/*4/*size-of-float*/,new Float32Array(this.pencil.center));
	this.count++;
	
	// there is trace is full, copy current trace into a new
	// storage static trace and push again the center (the
	// cloning should reset the this.trace.count to 0)
	if (this.isFull())
	{
		new Mecho.Tracelet(this.pencil);
		this.add();
	}
}

Mecho.Tracelet.MAX_VERTICES = 1000000; // aprox 12 MB
Mecho.Tracelet.VERTICES = 5000; // aprox 60 kB
Mecho.Tracelet.vertices = 0;
Mecho.Tracelet.BREAK = new Float32Array([undefined,undefined,undefined]);
﻿//===================================================
//
// Module:  Ball
// Library:	Mecho 4.0
// License:	CC-3.0 SA NC
//
// Constructors:
//		ball(center)
//		ball(center,width)
//
// Properties:
//		width
//		tiles - [x,y]
//
//===================================================

Mecho.Ball = function(center,width,custom)
{
	Mecho.Mecholet.apply(this,arguments);
	arguments[this.customIndex] = undefined;

	this.nice = true;
	this.center = center;
	this.width = width||1;

	var n = Mecho.N(PI*this.width/2);
	this.tiles = [2*n,n];
	
	this.custom(this.customValues);
}


Mecho.Ball.prototype = Object.create(Mecho.Mecholet.prototype);


Mecho.Ball.prototype.drawFaces = function()
{
	this.prepareMaterial(0);
	this.ctx.gl.uniform3f(this.ctx.uPos,0,0,0);
	this.ctx.gl.uniform3f(this.ctx.uScale,this.width/2,this.width/2,this.width/2);
	this.ctx.gl.uniform2f(this.ctx.uTexScale,this.tiles[0],this.tiles[1]);
	this.ctx.geometrySphere[this.nice].drawFaces();
}


Mecho.Ball.prototype.atPoint = function(relX,relY,relZ)
{
	if (relY===undefined) // atPoint(z)
		return this.point([relX*this.width/2,0,0]);
	else // atPoint(x,y,z)
		return this.point([relX*this.width/2,relY*this.width/2,relZ*this.width/2]);
}


function ball(center,width,custom)
{
	return new Mecho.Ball(center,width,custom);
}
﻿//===================================================
//
// Module:  Beam
// Library:	Mecho 4.0
// License:	CC-3.0 SA NC
//
// Constructors:
//		beam(center)
//		beam(center,length)
//		beam(center,length,width)
//		beam(center,length,width,height)
//		beam(center,length,width,height,baseWidth)
//		beam(center,length,width,height,baseWidth,baseHeight)
//		beam(center,length,width,height,baseWidth,baseHeight,otherHeight)
//
// Properties:
//		length
//		width
//		height
//		baseWidth
//		baseHeight
//		otherHeight
//
//===================================================

Mecho.Beam = function(center,length,width,height,baseWidth,baseHeight,otherHeight,custom)
{
	Mecho.Mecholet.apply(this,arguments);
	arguments[this.customIndex] = undefined;
	
	this.center = center;
	this.length = length||10;
	this.width = width||1;
	this.height = height||0.25;

	this.baseWidth = baseWidth||(1.5*this.width);
	this.baseHeight = baseHeight||(2*this.height);
	this.otherHeight = otherHeight||(this.baseHeight+this.height);
	this.nice = true;
	
	this.tiles = [
/*0*/	Mecho.N(this.length),	// rod.x
/*1*/	Mecho.N(this.width),	// rod.y
/*2*/	Mecho.N(this.height),	// rod.z

/*3*/	Mecho.N(2*PI*this.width/2),	// cyl.B.x
/*4*/	Mecho.N(this.otherHeight),	// cyl.B.y
/*5*/	Mecho.N(2*this.width/2),	// cap.B.x
/*6*/	Mecho.N(2*this.width/2),	// cap.B.y

/*7*/	Mecho.N(2*PI*this.width/2),	// cyl.A.x
/*8*/	Mecho.N(this.baseHeight)/2,	// cyl.A.y
/*9*/	Mecho.N(2*this.width/2),	// cap.A.x
/*10*/	Mecho.N(2*this.width/2),	// cap.A.y
	]
	
	this.custom(this.customValues);
}


Mecho.Beam.prototype = Object.create(Mecho.Mecholet.prototype);
Mecho.Beam.prototype.drawFaces = function()
{
	// draw the main beam
	this.prepareMaterial(0);

	this.ctx.gl.uniform3f(this.ctx.uScale,this.length,this.width,this.height);
	this.ctx.gl.uniform3f(this.ctx.uPos,this.length/2,0,0);
	this.ctx.geometryCube.drawFaces(this,0,this.tiles[0],this.tiles[1],this.tiles[2]);
	
	if (this.otherHeight >= this.height && this.otherHeight >= this.baseHeight)
	{
		// draw extruders B
		this.ctx.gl.uniform2f(this.ctx.uTexScale,this.tiles[3],this.tiles[4]);
		this.ctx.gl.uniform3f(this.ctx.uScale,this.width/2,this.width/2,this.otherHeight);
		this.ctx.gl.uniform3f(this.ctx.uPos,0,0,0);
		this.ctx.geometryCylinder[this.nice].drawFaces();
		this.ctx.gl.uniform3f(this.ctx.uPos,this.length,0,0);
		this.ctx.geometryCylinder[this.nice].drawFaces();
		
		// draw caps B
		this.prepareMaterial(1,0);
		this.ctx.gl.uniform2f(this.ctx.uTexScale,this.tiles[5],this.tiles[6]);
		this.ctx.gl.uniform3f(this.ctx.uPos,0,0,0);
		this.ctx.geometryCirclePlates[this.nice].drawFaces(this.width/2,this.width/2,this.otherHeight);
		this.ctx.gl.uniform3f(this.ctx.uPos,this.length,0,0);
		this.ctx.geometryCirclePlates[this.nice].drawFaces(this.width/2,this.width/2,this.otherHeight);
	}
	
	if (this.baseHeight>this.height && this.baseWidth>this.width)
	{
		// draw extruders A
		this.prepareMaterial(2,0);
		this.ctx.gl.uniform2f(this.ctx.uTexScale,this.tiles[7],this.tiles[8]);
		this.ctx.gl.uniform3f(this.ctx.uScale,this.baseWidth/2,this.baseWidth/2,this.baseHeight);
		this.ctx.gl.uniform3f(this.ctx.uPos,0,0,0);
		this.ctx.geometryCylinder[this.nice].drawFaces();
		this.ctx.gl.uniform3f(this.ctx.uPos,this.length,0,0);
		this.ctx.geometryCylinder[this.nice].drawFaces();

		// draw caps A
		this.prepareMaterial(3,1);
		this.ctx.gl.uniform2f(this.ctx.uTexScale,this.tiles[9],this.tiles[10]);
		this.ctx.gl.uniform3f(this.ctx.uPos,0,0,0);
		this.ctx.geometryCirclePlates[this.nice].drawFaces(this.baseWidth/2,this.baseWidth/2,this.baseHeight);
		this.ctx.gl.uniform3f(this.ctx.uPos,this.length,0,0);
		this.ctx.geometryCirclePlates[this.nice].drawFaces(this.baseWidth/2,this.baseWidth/2,this.baseHeight);
	}
	
	this.ctx.gl.uniform3fv(this.ctx.uPos,[0,0,0]);
}

Mecho.Beam.prototype.onMaterial = function()
{
	// material has changed - set tiles for the disks
	if (this.material[1] && this.material[1].tiles)
	{
		this.tiles[5] = this.material[1].tiles[0];
		this.tiles[6] = this.material[1].tiles[1];
	}
	if (this.material[3] && this.material[3].tiles)
	{
		this.tiles[9] = this.material[3].tiles[0];
		this.tiles[10] = this.material[3].tiles[1];
	}
}

Mecho.Beam.prototype.atPoint = function(relX,relY,relZ)
{
	if (relY===undefined) // atPoint(z)
		return this.point([relX*this.length,0,0]);
	else // atPoint(x,y,z)
		return this.point([relX*this.length,relY*this.width/2,relZ*this.height/2]);
}


function beam(center,length,width,height,baseWidth,baseHeight,otherHeight,custom)
{
	return new Mecho.Beam(center,length,width,height,baseWidth,baseHeight,otherHeight,custom);
}
﻿//===================================================
//
// Module:  Box
// Library:	Mecho 4.0
// License:	CC-3.0 SA NC
//
// Constructors:
//		box(center)
//		box(center,length)
//		box(center,length,width)
//		box(center,length,width,height)
//
// Properties:
//		length
//		width
//		height
//		tiles - [x,y,z]
//
//===================================================

Mecho.Box = function(center,length,width,height,custom)
{
	Mecho.Mecholet.apply(this,arguments);
	arguments[this.customIndex] = undefined;
	
	this.center = center;
	this.length = length||1;
	this.width = width||this.length;
	this.height = height||this.width;

	this.centerOffset = [0,0,-this.height/2];
	this.tiles = [Mecho.N(this.length),Mecho.N(this.width),Mecho.N(this.height)];
	
	this.custom(this.customValues);
}

Mecho.Box.prototype = Object.create(Mecho.Mecholet.prototype);
Mecho.Box.prototype.drawFaces = function()
{
	this.ctx.gl.uniform3f(this.ctx.uScale,this.length,this.width,this.height);
	this.ctx.gl.uniform3f(this.ctx.uPos,0,0,0);

	this.prepareMaterial(0);
	this.ctx.geometryCube.drawFaces(this,1,this.tiles[0],this.tiles[1],this.tiles[2]);
}


Mecho.Box.prototype.atPoint = function(relX,relY,relZ)
{
	if (relY===undefined) // atPoint(z)
		return this.point([0,0,relX*this.height/2]);
	else // atPoint(x,y,z)
		return this.point([relX*this.length/2,relY*this.width/2,relZ*this.height/2]);
}


function box(center,length,width,height,custom)
{
	return new Mecho.Box(center,length,width,height,custom);
}
﻿//===================================================
//
// Module:  Disk
// Library:	Mecho 4.0
// License:	CC-3.0 SA NC
//
// Constructors:
//		disk(center)
//		disk(center,width)
//		disk(center,width,height)
//
// Properties:
//		width
//		height
//		hollow
//		tiles - [x-side,y-side,x-base,y-base]
//
//===================================================

Mecho.Disk = function(center,width,height,custom)
{
	Mecho.Mecholet.apply(this,arguments);
	arguments[this.customIndex] = undefined;
	
	this.center = center;
	this.width = width||2;
	this.height = height||1;

	this.hollow = false;
	this.nice = true;

	this.tiles = [
		Mecho.N(2*PI*this.width/2),	// horizontal side
		Mecho.N(this.height),		// vertical side
		Mecho.N(this.width/2),		// x axis base
		Mecho.N(this.width/2),		// y axis base
	];
	
	this.custom(this.customValues);
}


Mecho.Disk.prototype = Object.create(Mecho.Mecholet.prototype);
Mecho.Disk.prototype.drawFaces = function()
{
	// draw cylindrical surface
	this.prepareMaterial(0);
	this.ctx.gl.uniform3f(this.ctx.uPos,0,0,0);
	this.ctx.gl.uniform3f(this.ctx.uScale,this.width/2,this.width/2,this.height);
	this.ctx.gl.uniform2f(this.ctx.uTexScale,this.tiles[0],this.tiles[1]);
	this.ctx.geometryCylinder[this.nice].drawFaces();

	// draw bases
	if (!this.hollow)
	{
		this.prepareMaterial(1);
		this.ctx.gl.uniform2f(this.ctx.uTexScale,this.tiles[2],this.tiles[3]);
		this.ctx.geometryCirclePlates[this.nice].drawFaces(this.width/2,this.width/2,this.height);
	}
}

Mecho.Disk.prototype.atPoint = function(relX,relY,relZ)
{
	if (relY===undefined) // atPoint(z)
		return this.point([relX*this.width/2,0,0]);
	else // atPoint(x,y,z)
		return this.point([relX*this.width/2,relY*this.width/2,relZ*this.height/2]);
}

Mecho.Disk.prototype.onMaterial = function()
{
	// material has changed - set tiles for the bases if the
	// material for the bases has tiles
	if (this.material[1] && this.material[1].tiles)
	{
		this.tiles[2] = this.material[1].tiles[0];
		this.tiles[3] = this.material[1].tiles[1];
	}
}

function disk(center,width,height,custom)
{
	return new Mecho.Disk(center,width,height,custom);
}
﻿//===================================================
//
// Module:  Gear
// Library:	Mecho 4.0
// License:	CC-3.0 SA NC
//
// Constructors:
//		gear(center,width,height,baseWidth,baseHeight)
//
// Properties:
//		width
//		height
//		baseWidth
//		baseHeight
//		tiles - [cir, out-h, in-h, slope]
//		gears
//
//===================================================

Mecho.Gear = function(center,width,height,baseWidth,baseHeight,custom)
{
	Mecho.Mecholet.apply(this,arguments);
	arguments[this.customIndex] = undefined;
	
	this.center = center;
	this.width = width||5;
	this.mHeight = height||1;
	this.mBaseWidth = baseWidth||(this.width>=4?1:this.width/4);
	this.mBaseHeight = baseHeight||2*this.mHeight;
	this.gears = 1;
	
	this.nice = Mecho.VERYTRUE;

	this.tiles = [
		Mecho.N(2*PI*(this.width/2-this.baseWidth)),	// peripheral outer & inner
		Mecho.N(this.height),			// vertical outside
		Mecho.N(this.baseHeight),		// vertical inside
		Mecho.N(this.baseWidth),		// slope peripheral
	];
	
	// calculate changes for normal vectors
	this.adjustNormals();
	
	this.custom(this.customValues);
}


Mecho.Gear.prototype = Object.create(Mecho.Mecholet.prototype);
Mecho.Gear.prototype.drawFaces = function()
{
	if (this.needAdjust) this.adjustNormals();
	
	// draw external surface
	this.prepareMaterial(0);
	this.ctx.gl.uniform1i(this.ctx.uSharpCone,true);
	this.ctx.gl.uniform1f(this.ctx.uGears,this.gears*20*this.width);
	this.ctx.gl.uniform1f(this.ctx.uTeeth,1);
	this.ctx.gl.uniform3f(this.ctx.uScale,this.width/2,this.width/2,this.height);
	this.ctx.gl.uniform3f(this.ctx.uPos,0,0,0);
	this.ctx.gl.uniform2f(this.ctx.uTexScale,this.tiles[0],this.tiles[1]);
	this.ctx.geometryCylinder[this.nice].drawFaces();
	this.ctx.gl.uniform1f(this.ctx.uTeeth,0);

	// draw internal surface
	this.ctx.gl.uniform3f(this.ctx.uScale,-this.width/2+this.baseWidth,-this.width/2+this.baseWidth,this.baseHeight);
	this.ctx.gl.uniform3f(this.ctx.uPos,0,0,0);
	this.ctx.gl.uniform2f(this.ctx.uTexScale,this.tiles[0],this.tiles[2]);
	this.ctx.geometryCylinder[this.nice].drawFaces();

	// draw sloped surface
	this.ctx.gl.uniform4f(this.ctx.uRr,this.width/2,this.width/2-this.baseWidth,
		this.dx,this.dy);
	this.ctx.gl.uniform3f(this.ctx.uScale,1,1,(-this.height+this.baseHeight)/2);
	this.ctx.gl.uniform3f(this.ctx.uPos,0,0,this.height/2);
	this.ctx.gl.uniform2f(this.ctx.uTexScale,this.tiles[0],this.tiles[3]);
	this.ctx.geometryCone[this.nice].drawFaces();

	this.ctx.gl.uniform4f(this.ctx.uRr,this.width/2,this.width/2-this.baseWidth,
		this.dx,-this.dy);
	this.ctx.gl.uniform3f(this.ctx.uScale,1,1,-(-this.height+this.baseHeight)/2);
	this.ctx.gl.uniform3f(this.ctx.uPos,0,0,-this.height/2);
	this.ctx.gl.uniform2f(this.ctx.uTexScale,this.tiles[0],this.tiles[3]);
	this.ctx.geometryCone[this.nice].drawFaces();

	this.ctx.gl.uniform1i(this.ctx.uSharpCone,false);
	this.ctx.gl.uniform4f(this.ctx.uRr,1,1,1,0);
}

Object.defineProperty(Mecho.Gear.prototype,'height',
{
	get: function()  {return this.mHeight;},
	set: function(a) {this.mHeight=a; this.needAdjust=true;}
});

Object.defineProperty(Mecho.Gear.prototype,'baseHeight',
{
	get: function()  {return this.mBaseHeight;},
	set: function(a) {this.mBaseHeight=a; this.needAdjust=true;}
});

Object.defineProperty(Mecho.Gear.prototype,'baseWidth',
{
	get: function()  {return this.mBaseWidth;},
	set: function(a) {this.mBaseWidth=a; this.needAdjust=true;}
});

Mecho.Gear.prototype.adjustNormals = function()
{
	this.dx = (this.baseHeight-this.height)/2;
	this.dy = this.baseWidth;
	var d = Math.sqrt(this.dx*this.dx+this.dy*this.dy);
	this.dx = this.dx/d;
	this.dy = this.dy/d;
	this.needAdjust = false;
}

Mecho.Gear.prototype.atPoint = function(relX,relY,relZ)
{
	if (relY===undefined) // atPoint(z)
		return this.point([relX*this.width/2,0,0]);
	else // atPoint(x,y,z)
		return this.point([relX*this.width/2,relY*this.width/2,relZ*this.height/2]);
}

function gear(center,width,height,baseWidth,baseHeight,custom)
{
	return new Mecho.Gear(center,width,height,baseWidth,baseHeight,custom);
}
﻿//===================================================
//
// Module:  Pencil
// Library:	Mecho 4.0
// License:	CC-3.0 SA NC
//
// Constructors:
//		pencil(center)
//		pencil(center,height)
//		pencil(center,height,width)
//		pencil(center,height,width,baseHeight)
//		pencil(center,height,width,baseHeight,otherHeight)
//
// Properties:
//		height
//		width
//		baseHeight
//		otherHeight
//		up
//		down = true, false or number
//		downNext - true=drawing lines start at the first change AFTER down
//		hollow - no top
//
//===================================================

Mecho.Pencil = function(center,height,width,baseHeight,otherHeight,custom)
{
	Mecho.Mecholet.apply(this,arguments);
	arguments[this.customIndex] = undefined;
	
	this.mPencilUp = true; // must be before center

	this.center = center;
	this.height = height||10;
	this.mWidth = width||0.6;
	this.mBaseHeight = baseHeight||1.5*this.mWidth;
	this.otherHeight = otherHeight||1;
	this.material = [Mecho.BLACK];
	this.trace = undefined;
	this.downNext = true;
	this.downTimer = false;
	this.upTime = 0;

	this.needAdjust = true;
	this.nice = Mecho.PENCIL;
	this.hollow = false;
	this.lengthBody = this.height-this.baseHeight-(this.hollow?0:this.otherHeight);
	
	// calculate changes for normal vectors
	this.adjustNormals();
	
	this.custom(this.customValues);
}


Mecho.Pencil.prototype = Object.create(Mecho.Mecholet.prototype);
Mecho.Pencil.prototype.drawFaces = function()
{
	// draw body
	this.prepareMaterial(0);
	this.ctx.gl.uniform3f(this.ctx.uScale,this.width/2,this.width/2,this.lengthBody);
	this.ctx.gl.uniform3f(this.ctx.uPos,0,0,this.lengthBody/2+this.baseHeight);
	this.ctx.gl.uniform3fv(this.ctx.uColor,[1,0.7,0]); // orange body
	this.ctx.geometryCylinder[this.nice].drawFaces();
	// draw top
	if (!this.hollow)
	{
		// white collar
		this.ctx.gl.uniform3f(this.ctx.uScale,this.width/2,this.width/2,0.2);
		this.ctx.gl.uniform3f(this.ctx.uPos,0,0,this.height-this.otherHeight+0.1);
		this.ctx.gl.uniform3fv(this.ctx.uColor,[1,1,1]); // white collar
		this.ctx.geometryCylinder[this.nice].drawFaces();

		// top side
		this.ctx.gl.uniform3f(this.ctx.uScale,this.width/2,this.width/2,this.otherHeight-0.2);
		this.ctx.gl.uniform3f(this.ctx.uPos,0,0,this.height-this.otherHeight/2+0.1);
		this.ctx.gl.uniform3fv(this.ctx.uColor,this.material[0].color); // graphite color
		this.ctx.geometryCylinder[this.nice].drawFaces();
		
		// top cap
		this.ctx.gl.uniform3f(this.ctx.uScale,this.width/2,this.width/2,0.1);
		this.ctx.gl.uniform3f(this.ctx.uPos,0,0,this.height);
		this.ctx.geometrySphere[this.nice].drawFaces();
	}
	
	// wood cone
	this.ctx.gl.uniform3fv(this.ctx.uColor,[1,0.8,0.6]); // orange body
	this.ctx.gl.uniform4f(this.ctx.uRr,this.width/6,this.width/2,
		this.dx,this.dy);
	this.ctx.gl.uniform3f(this.ctx.uScale,1,1,2*this.baseHeight/3);
	this.ctx.gl.uniform3f(this.ctx.uPos,0,0,this.baseHeight/3);
	this.ctx.geometryCone[this.nice].drawFaces();
	
	// graphite cone
	this.ctx.gl.uniform3fv(this.ctx.uColor,this.material[0].color); // graphite color
	//this.ctx.gl.uniform1i(this.ctx.uLight,false);
	this.ctx.gl.uniform4f(this.ctx.uRr,this.width/32,this.width/6,
		2,-1);
	this.ctx.gl.uniform3f(this.ctx.uScale,1,1,this.baseHeight/3);
	this.ctx.gl.uniform3f(this.ctx.uPos,0,0,0);
	this.ctx.geometryCone[this.nice].drawFaces();
	this.ctx.gl.uniform4f(this.ctx.uRr,1,1,1,0);

	// graphite tip
	this.ctx.gl.uniform3f(this.ctx.uScale,this.width/32,this.width/32,this.width/128);
	this.ctx.gl.uniform3f(this.ctx.uPos,0,0,0);
	this.ctx.geometrySphere[this.nice].drawFaces();

}

Object.defineProperty(Mecho.Pencil.prototype,'width',
{
	get: function()  {return this.mWidth;},
	set: function(a) {this.mWidth=a; this.needAdjust=true;}
});

Object.defineProperty(Mecho.Pencil.prototype,'baseHeight',
{
	get: function()  {return this.mBaseHeight;},
	set: function(a) {this.mBaseHeight=a; this.needAdjust=true;}
});

Object.defineProperty(Mecho.Pencil.prototype,'up',
{
	get: function()  {return this.mPencilUp;},
	set: function(a) 
		{	// no need, state is not changed
			if (a == this.mPencilUp)
				return;
				
			if (a)
			{	//down->up
				this.trace.breakTrace(); 
				this.downTimer = false;
			}
			else
			{	//up->down
				if (!this.trace)
					this.trace = new Mecho.Tracelet(this);
				if (!this.downNext)
					this.trace.add(); 
			}
			this.mPencilUp=a;
		}
});

Object.defineProperty(Mecho.Pencil.prototype,'down',
{
	get: function()  {return !this.up;},
	set: function(a) 
		{
			// if parameter A is a number, then it also
			// sets the downtimer
			if (a!=true && a!=false)
			{
				this.upTime = Mecho.time+a;
				this.downTimer = true;
				a = true;
			}
			this.up = !a;
		}
});


Mecho.Pencil.prototype.adjustNormals = function()
{
	this.dy = this.width/2;
	this.dx = 2*this.baseHeight/2;
	var d = Math.sqrt(this.dx*this.dx+this.dy*this.dy);
	this.dx = this.dx/d;
	this.dy = this.dy/d;

	this.needAdjust = false;
}


Mecho.Pencil.prototype.onMaterial = function()
{
	if (!this.material[0]) this.material[0]={};
	this.material[0].image = undefined;
	this.material[0].reflection = 0.1;
	this.material[0].shininess = 1;
}

Mecho.Pencil.prototype.onCenter = function()
{
	// if pen is up - do not draw
	if (this.up) return;

	// check for automatic up
	if (this.downTimer && Mecho.time>this.upTime)
	{
		this.downTimer = false;
		this.up = true;
	}

	// if no trace instance exists, create a dynamic one now
	if (!this.trace)
		this.trace = new Mecho.Tracelet(this);

	// add the trace
	this.trace.add();
}

Mecho.Pencil.prototype.atPoint = function(relX,relY,relZ)
{
	if (relY===undefined) // atPoint(z)
		return this.point([0,0,relX*this.height]);
	else // atPoint(x,y,z)
		return this.point([relX*this.width/2,relY*this.width/2,relZ*this.height]);
}

function pencil(center,height,width,baseHeight,otherHeight,custom)
{
	return new Mecho.Pencil(center,height,width,baseHeight,otherHeight,custom);
}
﻿//===================================================
//
// Module:  Pillar
// Library:	Mecho 4.0
// License:	CC-3.0 SA NC
//
// Constructors:
//		pillar(center)
//		pillar(center,height)
//		pillar(center,height,width)
//		pillar(center,height,width,baseHeight)
//		pillar(center,height,width,baseHeight,baseWidth)
//
// Properties:
//		height
//		width
//		baseHeight
//		baseWidth
//		tiles - [x-rod,y-rod,x-top,y-top]
//		hollow - affects bottom base
//
//===================================================

Mecho.Pillar = function(center,height,width,baseHeight,baseWidth,custom)
{
	Mecho.Mecholet.apply(this,arguments);
	arguments[this.customIndex] = undefined;
	
	this.center = center;
	this.height = height||10;
	this.mWidth = width||1;
	this.mbaseHeight = baseHeight||(this.height>=2?1:this.height/2);
	this.mbaseWidth = baseWidth||(this.mWidth+2*this.mbaseHeight);

	this.needAdjust = true;
	this.nice = true;
	this.hollow = true;

	this.tiles = [
		Mecho.N(PI*this.width),	// horizontal side
		Mecho.N(this.height-this.baseHeight),		// vertical side
		Mecho.N(PI*this.width),		// x axis base
		Mecho.N(this.baseHeight),		// y axis base
	];
	
	// calculate changes for normal vectors
	this.adjustNormals();
	
	this.custom(this.customValues);
}


Mecho.Pillar.prototype = Object.create(Mecho.Mecholet.prototype);
Mecho.Pillar.prototype.drawFaces = function()
{
	if (this.needAdjust) this.adjustNormals();
	
	// draw rod surface
	this.prepareMaterial(0);
	this.ctx.gl.uniform3f(this.ctx.uScale,this.width/2,this.width/2,this.height-this.baseHeight);
	this.ctx.gl.uniform3f(this.ctx.uPos,0,0,(this.height+this.baseHeight)/2);
	this.ctx.gl.uniform2f(this.ctx.uTexScale,this.tiles[0],this.tiles[1]);
	this.ctx.geometryCylinder[this.nice].drawFaces();

	// draw base surface
	this.ctx.gl.uniform4f(this.ctx.uRr,this.baseWidth/2,this.width/2,
		this.dx,this.dy);
	this.ctx.gl.uniform3f(this.ctx.uScale,1,1,this.baseHeight);
	this.ctx.gl.uniform3f(this.ctx.uPos,0,0,0);
	this.ctx.gl.uniform2f(this.ctx.uTexScale,this.tiles[2],this.tiles[3]);
	this.ctx.geometryCone[this.nice].drawFaces();
	this.ctx.gl.uniform4f(this.ctx.uRr,1,1,1,0);

	// draw bases
	this.prepareMaterial(1,0);
	this.ctx.gl.uniform3f(this.ctx.uPos,0,0,this.height/2);
	this.ctx.gl.uniform2f(this.ctx.uTexScale,this.tiles[4],this.tiles[5]);
	this.ctx.geometryCirclePlates[this.nice].drawFaces(this.hollow?0:this.baseWidth/2,this.width/2,this.height);
	this.ctx.gl.uniform3f(this.ctx.uPos,0,0,0);
}

Object.defineProperty(Mecho.Pillar.prototype,'width',
{
	get: function()  {return this.mWidth;},
	set: function(a) {this.mWidth=a; this.needAdjust=true;}
});

Object.defineProperty(Mecho.Pillar.prototype,'baseWidth',
{
	get: function()  {return this.mbaseWidth;},
	set: function(a) {this.mbaseWidth=a; this.needAdjust=true;}
});

Object.defineProperty(Mecho.Pillar.prototype,'baseHeight',
{
	get: function()  {return this.mbaseHeight;},
	set: function(a) {this.mbaseHeight=a; this.needAdjust=true;}
});

Mecho.Pillar.prototype.adjustNormals = function()
{
	this.dx = this.baseHeight;
	this.dy = this.baseWidth/2-this.width/2;
	var d = Math.sqrt(this.dx*this.dx+this.dy*this.dy);
	this.dx = this.dx/d;
	this.dy = this.dy/d;
	//if (this.dy<0) this.dy = -this.dy;
	this.needAdjust = false;
}

Mecho.Pillar.prototype.atPoint = function(relX,relY,relZ)
{
	if (relY===undefined) // atPoint(z)
		return this.point([0,0,(relX)*this.height]);
	else // atPoint(x,y,z)
		return this.point([relX*this.width/2,relY*this.width/2,(relZ)*this.height]);
}

Mecho.Pillar.prototype.onMaterial = function()
{
	// material has changed - set tiles for the bases if the
	// material for the bases has tiles
	if (this.material[1] && this.material[1].tiles)
	{
		this.tiles[2] = this.material[1].tiles[0];
		this.tiles[3] = this.material[1].tiles[1];
	}
}

function pillar(center,height,width,baseHeight,baseWidth,custom)
{
	return new Mecho.Pillar(center,height,width,baseHeight,baseWidth,custom);
}
﻿//===================================================
//
// Module:  Rail
// Library:	Mecho 4.0
// License:	CC-3.0 SA NC
//
// Constructors:
//		rail(center)
//		rail(center,length)
//		rail(center,length,width)
//		rail(center,length,width,baseWidth)
//		rail(center,length,width,baseWidth,otherWidth)
//
// Properties:
//		width
//		baseWidth
//		otherWidth 
//		tiles - tx,ty of rod, tx,ty of base, tx,ty of other base
//		atPoint()
//
//===================================================

Mecho.Rail = function(center,length,width,baseWidth,otherWidth,custom)
{
	Mecho.Mecholet.apply(this,arguments);
	arguments[this.customIndex] = undefined;
	
	this.center = center;
	this.length = length||10;
	this.width = width||0.3;
	this.baseWidth = baseWidth||this.width*2;
	this.otherWidth = otherWidth||this.baseWidth;
	
	var tr = Mecho.N(PI*this.width/2);
	this.tiles = [tr,Mecho.N(this.length),tr,tr/2,tr,tr/2];
	
	this.custom(this.customValues);
}

Mecho.Rail.prototype = Object.create(Mecho.Mecholet.prototype);
Mecho.Rail.prototype.drawFaces = function()
{
	// draw the rod
	this.prepareMaterial(0);

	this.ctx.gl.uniform3f(this.ctx.uScale,this.width/2,this.width/2,this.length);
	this.ctx.gl.uniform2f(this.ctx.uTexScale,this.tiles[0],this.tiles[1]);
	this.ctx.gl.uniform3f(this.ctx.uPos,0,0,this.length/2);
	this.ctx.geometryCylinder[this.nice].drawFaces();

	this.prepareMaterial(1);
	
	// draw ball A (at 0)
	if (this.baseWidth>=this.width)
	{
		this.ctx.gl.uniform3f(this.ctx.uScale,this.baseWidth/2,this.baseWidth/2,this.baseWidth/2);
		this.ctx.gl.uniform2f(this.ctx.uTexScale,this.tiles[2],this.tiles[3]);
		this.ctx.gl.uniform3f(this.ctx.uPos,0,0,0);
		this.ctx.geometrySphere[this.nice].drawFaces();
	}

	// draw ball B (at 1)
	if (this.otherWidth>=this.width)
	{
		this.ctx.gl.uniform3f(this.ctx.uScale,this.otherWidth/2,this.otherWidth/2,this.otherWidth/2);
		this.ctx.gl.uniform2f(this.ctx.uTexScale,this.tiles[4],this.tiles[5]);
		this.ctx.gl.uniform3f(this.ctx.uPos,0,0,this.length);
		this.ctx.geometrySphere[this.nice].drawFaces();
	}

	this.ctx.gl.uniform3fv(this.ctx.uPos,[0,0,0]);
}

Mecho.Rail.prototype.atPoint = function(relX,relY,relZ)
{
	if (relY===undefined) // atPoint(z)
		return this.point([0,0,relX*this.length]);
	else // atPoint(x,y,z)
		return this.point([relX*this.width/2,relY*this.width/2,relZ*this.length]);
}

function rail(center,length,width,baseWidth,otherWidth,custom)
{
	return new Mecho.Rail(center,length,width,baseWidth,otherWidth,custom);
}
﻿//===================================================
//
// Module:  Ring
// Library:	Mecho 4.0
// License:	CC-3.0 SA NC
//
// Constructors:
//		ring(center,width,height,baseWidth,baseHeight)
//
// Properties:
//		width
//		height
//		baseWidth
//		baseHeight
//		tiles - [cir, in-h, out-h, slope]
//		gears
//
//===================================================

Mecho.Ring = function(center,width,height,baseWidth,baseHeight,custom)
{
	Mecho.Mecholet.apply(this,arguments);
	arguments[this.customIndex] = undefined;
	
	this.center = center;
	this.width = width||5;
	this.mHeight = height||2;
	this.mBaseWidth = baseWidth||1;
	this.mBaseHeight = baseHeight||this.mHeight/2;
	this.gears = 1;
	
	this.nice = Mecho.VERYTRUE;

	this.tiles = [
		Mecho.N(2*PI*(this.width/2-this.baseWidth)),	// periferal outer & inner
		Mecho.N(this.height),		// vertical inside
		Mecho.N(this.baseHeight),		// vertical outside
		Mecho.N(this.baseWidth),		// slope periferal
	];
	
	// calculate changes for normal vectors
	this.adjustNormals();
	
	this.custom(this.customValues);
}


Mecho.Ring.prototype = Object.create(Mecho.Mecholet.prototype);
Mecho.Ring.prototype.drawFaces = function()
{
	if (this.needAdjust) this.adjustNormals();
	
	// draw internal surface
	this.prepareMaterial(0);
	this.ctx.gl.uniform1i(this.ctx.uSharpCone,true);
	this.ctx.gl.uniform1f(this.ctx.uGears,this.gears*20*this.width);
	this.ctx.gl.uniform1f(this.ctx.uTeeth,1);
	this.ctx.gl.uniform3f(this.ctx.uScale,-this.width/2,-this.width/2,this.height);
	this.ctx.gl.uniform3f(this.ctx.uPos,0,0,0);
	this.ctx.gl.uniform2f(this.ctx.uTexScale,this.tiles[0],this.tiles[1]);
	this.ctx.geometryCylinder[this.nice].drawFaces();
	this.ctx.gl.uniform1f(this.ctx.uTeeth,0);

	// draw external surface
	this.ctx.gl.uniform3f(this.ctx.uScale,this.width/2+this.baseWidth,this.width/2+this.baseWidth,this.baseHeight);
	this.ctx.gl.uniform3f(this.ctx.uPos,0,0,0);
	this.ctx.gl.uniform2f(this.ctx.uTexScale,this.tiles[0],this.tiles[2]);
	this.ctx.geometryCylinder[this.nice].drawFaces();

	// draw sloped surface
	this.ctx.gl.uniform4f(this.ctx.uRr,this.width/2,this.width/2+this.baseWidth,this.dx,this.dy);
	this.ctx.gl.uniform3f(this.ctx.uScale,1,1,(-this.height+this.baseHeight)/2);
	this.ctx.gl.uniform3f(this.ctx.uPos,0,0,this.height/2);
	this.ctx.gl.uniform2f(this.ctx.uTexScale,this.tiles[0],this.tiles[3]);
	this.ctx.geometryCone[this.nice].drawFaces();

	this.ctx.gl.uniform4f(this.ctx.uRr,this.width/2,this.width/2+this.baseWidth,
		this.dx,-this.dy);
	this.ctx.gl.uniform3f(this.ctx.uScale,1,1,-(-this.height+this.baseHeight)/2);
	this.ctx.gl.uniform3f(this.ctx.uPos,0,0,-this.height/2);
	this.ctx.gl.uniform2f(this.ctx.uTexScale,this.tiles[0],this.tiles[3]);
	this.ctx.geometryCone[this.nice].drawFaces();

	this.ctx.gl.uniform4f(this.ctx.uRr,1,1,1,0);
	this.ctx.gl.uniform1i(this.ctx.uSharpCone,false);
}

Object.defineProperty(Mecho.Ring.prototype,'height',
{
	get: function()  {return this.mHeight;},
	set: function(a) {this.mHeight=a; this.needAdjust=true;}
});

Object.defineProperty(Mecho.Ring.prototype,'baseHeight',
{
	get: function()  {return this.mBaseHeight;},
	set: function(a) {this.mBaseHeight=a; this.needAdjust=true;}
});

Object.defineProperty(Mecho.Ring.prototype,'baseWidth',
{
	get: function()  {return this.mBaseWidth;},
	set: function(a) {this.mBaseWidth=a; this.needAdjust=true;}
});

Mecho.Ring.prototype.adjustNormals = function()
{
	this.dx = (this.height-this.baseHeight)/2;
	this.dy = this.baseWidth;
	var d = Math.sqrt(this.dx*this.dx+this.dy*this.dy);
	this.dx = this.dx/d;
	this.dy = this.dy/d;

	this.needAdjust = false;
}

Mecho.Ring.prototype.atPoint = function(relX,relY,relZ)
{
	if (relY===undefined) // atPoint(z)
		return this.point([relX*this.width/2,0,0]);
	else // atPoint(x,y,z)
		return this.point([relX*this.width/2,relY*this.width/2,relZ*this.height/2]);
}

function ring(center,width,height,baseWidth,baseHeight,custom)
{
	return new Mecho.Ring(center,width,height,baseWidth,baseHeight,custom);
}
﻿//===================================================
//
// Module:  Tube
// Library:	Mecho 4.0
// License:	CC-3.0 SA NC
//
// Constructors:
//		tube(center)
//		tube(center,height)
//		tube(center,height,width)
//		tube(center,height,width,baseHeight)
//		tube(center,height,width,baseHeight,baseWidth)
//
// Properties:
//		height
//		radius
//		baseHeight
//		baseWidth
//		tiles - [x-rod,y-rod,x-base,y-base]
//		hollow - affects bottom base
//
//===================================================

Mecho.Tube = function(center,height,width,baseHeight,baseWidth,custom)
{
	Mecho.Mecholet.apply(this,arguments);
	arguments[this.customIndex] = undefined;
	
	this.center = center;
	this.height = height||4;
	this.mWidth = width||1;
	this.mBaseWidth = baseWidth||this.mWidth/2;
	this.mBaseHeight = baseHeight||Math.min(this.mWidth-this.mBaseWidth,this.height/6);

	this.needAdjust = true;
	this.nice = true;
	this.hollow = false;

	this.tiles = [
		Mecho.N(2*PI*this.width/2),	// horizontal side
		Mecho.N(this.height-2*this.baseHeight),		// vertical side
		Mecho.N(2*PI*this.width/2),		// x axis base
		Mecho.N(this.height)*this.baseHeight/this.height,		// y axis base
	];
	
	// calculate changes for normal vectors
	this.adjustNormals();
	
	this.custom(this.customValues);
}


Mecho.Tube.prototype = Object.create(Mecho.Mecholet.prototype);
Mecho.Tube.prototype.drawFaces = function()
{
	if (this.needAdjust) this.adjustNormals();
	
	// draw rod surface
	this.prepareMaterial(0);
	this.ctx.gl.uniform3f(this.ctx.uScale,this.width/2,this.width/2,this.height-2*this.baseHeight);
	this.ctx.gl.uniform3f(this.ctx.uPos,0,0,0);
	this.ctx.gl.uniform2f(this.ctx.uTexScale,this.tiles[0],this.tiles[1]);
	this.ctx.geometryCylinder[this.nice].drawFaces();

	// draw base surface
	this.ctx.gl.uniform4f(this.ctx.uRr,this.baseWidth/2,this.width/2,
		this.dx,-this.dy);
	this.ctx.gl.uniform3f(this.ctx.uScale,1,1,-this.baseHeight);
	this.ctx.gl.uniform3f(this.ctx.uPos,0,0,this.height/2);
	this.ctx.gl.uniform2f(this.ctx.uTexScale,this.tiles[2],this.tiles[3]);
	this.ctx.geometryCone[this.nice].drawFaces();
	if (!this.hollow)
	{
		this.ctx.gl.uniform4f(this.ctx.uRr,this.baseWidth/2,this.width/2,
			this.dx,this.dy);
		this.ctx.gl.uniform3f(this.ctx.uScale,1,1,this.baseHeight);
		this.ctx.gl.uniform3f(this.ctx.uPos,0,0,-this.height/2);
		this.ctx.geometryCone[this.nice].drawFaces();
	}
	this.ctx.gl.uniform4f(this.ctx.uRr,1,1,1,0);
}

Object.defineProperty(Mecho.Tube.prototype,'width',
{
	get: function()  {return this.mWidth;},
	set: function(a) {this.mWidth=a; this.needAdjust=true;}
});

Object.defineProperty(Mecho.Tube.prototype,'baseWidth',
{
	get: function()  {return this.mBaseWidth;},
	set: function(a) {this.mBaseWidth=a; this.needAdjust=true;}
});

Object.defineProperty(Mecho.Tube.prototype,'baseHeight',
{
	get: function()  {return this.mBaseHeight;},
	set: function(a) {this.mBaseHeight=a; this.needAdjust=true;}
});

Mecho.Tube.prototype.adjustNormals = function()
{
	this.dx = this.baseHeight;
	this.dy = this.baseWidth-this.width;
	var d = Math.sqrt(this.dx*this.dx+this.dy*this.dy);
	this.dx = this.dx/d;
	this.dy = this.dy/d;

	this.needAdjust = false;
}

/*
Mecho.Tube.prototype.onMaterial = function()
{
	// material has changed - set tiles for the bases if the
	// material for the bases has tiles
	if (this.material[1] && this.material[1].tiles)
	{
		this.tiles[2] = this.material[1].tiles[0];
		this.tiles[3] = this.material[1].tiles[1];
	}
}
*/

Mecho.Tube.prototype.atPoint = function(relX,relY,relZ)
{
	if (relY===undefined) // atPoint(z)
		return this.point([0,0,relX*this.height/2]);
	else // atPoint(x,y,z)
		return this.point([relX*this.width/2,relY*this.width/2,relZ*this.height/2]);
}

function tube(center,height,width,baseHeight,baseWidth,custom)
{
	return new Mecho.Tube(center,height,width,baseHeight,baseWidth,custom);
}
﻿//===================================================
//
// Module:  Geometry
// Library:	Mecho 4.0
// License:	CC-3.0 SA NC
//
//===================================================

Mecho.VERYTRUE = 1;
Mecho.PENCIL = 2;
Mecho.prototype.defineGeometries = function()
{
	this.geometryGround = new Mecho.GeometryGround(this);
	this.geometryCube = new Mecho.GeometryCube(this);
	this.geometrySphere = [];
	this.geometrySphere[false] = new Mecho.GeometrySphere(this,16);
	this.geometrySphere[true]  = new Mecho.GeometrySphere(this,44);
	this.geometrySphere[Mecho.PENCIL]  = new Mecho.GeometrySphere(this,6);
	this.geometryCylinder = [];
	this.geometryCylinder[false] = new Mecho.GeometryCylinder(this,16);
	this.geometryCylinder[true]  = new Mecho.GeometryCylinder(this,44);
	this.geometryCylinder[Mecho.VERYTRUE]  = new Mecho.GeometryCylinder(this,80);
	this.geometryCylinder[Mecho.PENCIL]  = new Mecho.GeometryCylinder(this,6);
	this.geometryCirclePlates = [];
	this.geometryCirclePlates[false] = new Mecho.GeometryCirclePlates(this,16);
	this.geometryCirclePlates[true]  = new Mecho.GeometryCirclePlates(this,44);
	this.geometryCone = [];
	this.geometryCone[false] = new Mecho.GeometryCone(this,16);
	this.geometryCone[true]  = new Mecho.GeometryCone(this,44);
	this.geometryCone[Mecho.VERYTRUE]  = new Mecho.GeometryCone(this,80);
	this.geometryCone[Mecho.PENCIL]  = new Mecho.GeometryCone(this,6);
}


//===================================================
//
// new GeometryGround(ctx)
//
// A square primitive object
//
//===================================================
Mecho.GeometryGround = function(ctx)
{
	this.ctx = ctx;
	var gl = ctx.gl;
			
	var mesh = new Float32Array([
		-0.5,-0.5,0, 0,0, 0,0,1,
		 0.5,-0.5,0, 1,0, 0,0,1,
		-0.5, 0.5,0, 0,1, 0,0,1,
		 0.5, 0.5,0, 1,1, 0,0,1]);
	
	this.buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
	gl.bufferData(gl.ARRAY_BUFFER,mesh,gl.STATIC_DRAW);
}

Mecho.GeometryGround.prototype.drawFaces = function(tx,ty)
{
	var gl = this.ctx.gl;
	gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
	gl.vertexAttribPointer(this.ctx.aXYZ,3,gl.FLOAT,false,8*Mecho.FLOATS,0*Mecho.FLOATS);
	gl.vertexAttribPointer(this.ctx.aNormal,3,gl.FLOAT,false,8*Mecho.FLOATS,5*Mecho.FLOATS);
	gl.vertexAttribPointer(this.ctx.aTexCoord,2,gl.FLOAT,false,8*Mecho.FLOATS,3*Mecho.FLOATS);

	this.ctx.gl.uniform2f(this.ctx.uTexScale,tx,ty);
	gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
}



//===================================================
//
// new GeometryCube(ctx)
//
// A cubic primitive object. Top and bottom faces drawn if
// obj.hollow is false.
//
//===================================================
Mecho.GeometryCube = function(ctx)
{
	this.ctx = ctx;
	var gl = ctx.gl;
			
	//	  7-------6				Texture:
	//	 /|		 /|				
	//	4-------5 |				3---2
	//	| 3-----|-2				|   |
	//	|/	  	|/				0---1
	//	0-------1
	
	// normals
	var nX = [+1,0,0], nY = [0,+1,0], nZ = [0,0,+1];
	var nx = [-1,0,0], ny = [0,-1,0], nz = [0,0,-1];
	// textures
	var t0 = [0,0], t1 = [1,0], t2 = [1,1], t3 = [0,1],
	    t4 = [0,1], t5 = [1,1], t6 = [2,1], t7 = [3,1];
	// vertices
	var	v0 = [+0.5,-0.5,-0.5], v4 = [+0.5,-0.5,+0.5],
		v1 = [+0.5,+0.5,-0.5], v5 = [+0.5,+0.5,+0.5],
		v2 = [-0.5,+0.5,-0.5], v6 = [-0.5,+0.5,+0.5],
		v3 = [-0.5,-0.5,-0.5], v7 = [-0.5,-0.5,+0.5];

	var mesh = new Float32Array([].concat(
	// solid cube 36x8
		v0,t0,nX,	v1,t1,nX,	v4,t3,nX,	v4,t3,nX,	v1,t1,nX,	v5,t2,nX,	//front  X+
		v3,t1,nx,	v7,t2,nx,	v2,t0,nx,	v2,t0,nx,	v7,t2,nx,	v6,t3,nx,	//back   X-
		v5,t3,nY,	v1,t0,nY,	v6,t2,nY,	v6,t2,nY,	v1,t0,nY,	v2,t1,nY,	//right  Y+
		v7,t3,ny,	v3,t0,ny,	v4,t2,ny,	v4,t2,ny,	v3,t0,ny,	v0,t1,ny,	//left   Y-
		v4,t1,nZ,	v5,t2,nZ,	v7,t0,nZ,	v7,t0,nZ,	v5,t2,nZ,	v6,t3,nZ,	//top    Z+
		v0,t1,nz,	v3,t0,nz,	v1,t2,nz,	v1,t2,nz,	v3,t0,nz,	v2,t3,nz,	//bottom Z-
	[]));
	
	this.buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
	gl.bufferData(gl.ARRAY_BUFFER,mesh,gl.STATIC_DRAW);
}

Mecho.GeometryCube.prototype.drawFaces = function(obj,m,tx,ty,tz)
{
	var gl = this.ctx.gl;
	gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
	gl.vertexAttribPointer(this.ctx.aXYZ,3,gl.FLOAT,false,8*Mecho.FLOATS,0*Mecho.FLOATS);
	gl.vertexAttribPointer(this.ctx.aNormal,3,gl.FLOAT,false,8*Mecho.FLOATS,5*Mecho.FLOATS);
	gl.vertexAttribPointer(this.ctx.aTexCoord,2,gl.FLOAT,false,8*Mecho.FLOATS,3*Mecho.FLOATS);

	// draw +X and -X
	this.ctx.gl.uniform2f(this.ctx.uTexScale,ty,tz);
	gl.drawArrays(gl.TRIANGLES,0,12);
	
	// draw +Y and -Y
	this.ctx.gl.uniform2f(this.ctx.uTexScale,tx,tz);
	gl.drawArrays(gl.TRIANGLES,12,12);

	// draw +Z and -Z
	if (m) obj.prepareMaterial(m);
	this.ctx.gl.uniform2f(this.ctx.uTexScale,tx,ty);
	gl.drawArrays(gl.TRIANGLES,24,12);
}



//===================================================
//
// new GeometrySphere(ctx)
//
// A spherical primitive object. Texture sizes derived
// from obj.tiling=[tx,ty].
//
//===================================================
Mecho.GeometrySphere = function(ctx,n)
{
	this.ctx = ctx;
	var gl = ctx.gl;
			
	this.NU = n;	// horizontal precision
	this.NV = Math.round(n/2); // vertical precision
	if (n<=6) this.NV = 4; // for pencil tops
	
	var data = [];

	var b = -Math.PI/2;
	var db = Math.PI/this.NV;
	var tv = 0;
	var dtv = 1/this.NV;

	for( var j=0; j<this.NV; j++ )
	{
		var a = 0;
		var da = 2*Math.PI/this.NU;
		var tu = 0;
		var dtu = 1/this.NU;
	
		for( var i=0; i<this.NU+1; i++ )
		{
			var x = Math.cos(a)*Math.cos(b+db);
			var y = Math.sin(a)*Math.cos(b+db);
			var z = Math.sin(b+db); 

			data.push(x,y,z, tu,tv+dtv,	x,y,z);

			x = Math.cos(a)*Math.cos(b);
			y = Math.sin(a)*Math.cos(b);
			z = Math.sin(b); 

			data.push(x,y,z, tu,tv,	x,y,z);

			a += da;
			tu += dtu;
		}

		b += db;
		tv += dtv;
	}

	var mesh = new Float32Array(data);

	this.buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
	gl.bufferData(gl.ARRAY_BUFFER,mesh,gl.STATIC_DRAW);
}

Mecho.GeometrySphere.prototype.drawFaces = function()
{
	var gl = this.ctx.gl;
	gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
	gl.vertexAttribPointer(this.ctx.aXYZ,3,gl.FLOAT,false,8*Mecho.FLOATS,0*Mecho.FLOATS);
	gl.vertexAttribPointer(this.ctx.aNormal,3,gl.FLOAT,false,8*Mecho.FLOATS,5*Mecho.FLOATS);
	gl.vertexAttribPointer(this.ctx.aTexCoord,2,gl.FLOAT,false,8*Mecho.FLOATS,3*Mecho.FLOATS);

	for( var j=0; j<this.NV; j++ ) gl.drawArrays(gl.TRIANGLE_STRIP,(2*this.NU+2)*j,2*this.NU+2); // draw horizontal band
}



//===================================================
//
// new GeometryCylinder(ctx)
//
// A cylindrical primitive object. Drawn without bases.
//
//===================================================
Mecho.GeometryCylinder = function(ctx,n)
{
	this.ctx = ctx;
	var gl = ctx.gl;
			
	this.NU = n;	// horizontal precision
	
	var data = [];

	var a = 0;
	var da = 2*Math.PI/this.NU;
	var tu = 0;
	var dtu = 1/this.NU;

	for( var i=0; i<this.NU+1; i++ )
	{
		var x = Math.cos(a);
		var y = Math.sin(a);

		data.push(x,y,-0.5, tu,0,	x,y,0);
		data.push(x,y,+0.5, tu,1,	x,y,0);

		a += da;
		tu += dtu;
	}

	var mesh = new Float32Array(data);

	this.buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
	gl.bufferData(gl.ARRAY_BUFFER,mesh,gl.STATIC_DRAW);
}

Mecho.GeometryCylinder.prototype.drawFaces = function()
{
	var gl = this.ctx.gl;
	gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
	gl.vertexAttribPointer(this.ctx.aXYZ,3,gl.FLOAT,false,8*Mecho.FLOATS,0*Mecho.FLOATS);
	gl.vertexAttribPointer(this.ctx.aNormal,3,gl.FLOAT,false,8*Mecho.FLOATS,5*Mecho.FLOATS);
	gl.vertexAttribPointer(this.ctx.aTexCoord,2,gl.FLOAT,false,8*Mecho.FLOATS,3*Mecho.FLOATS);

	gl.drawArrays(gl.TRIANGLE_STRIP,0,2*this.NU+2); // draw horizontal band
}



//===================================================
//
// new GeometryCirclePlates(ctx)
//
// A circular primitive object - two coplanar plates.
//
//===================================================
Mecho.GeometryCirclePlates = function(ctx,n)
{
	this.ctx = ctx;
	var gl = ctx.gl;
			
	this.NU = n;	// horizontal precision
	
	var data = [];

	var a = 0;
	var da = 2*Math.PI/this.NU;

	// upper circle
	data.push(0,0,0.5, 0.5,0.5,	0,0,1);
	for( var i=0; i<this.NU+1; i++ )
	{
		var x = Math.cos(a);
		var y = Math.sin(a);

		data.push(x,y,0.5, x/2+0.5,y/2+0.5,	x,y,4);

		a += da;
	}
	// lower circle
	data.push(0,0,-0.5, 0.5,0.5,	x,y,-4);
	for( var i=0; i<this.NU+1; i++ )
	{
		var x = Math.cos(a);
		var y = Math.sin(a);

		data.push(x,y,-0.5, x/2+0.5,y/2+0.5,	0,0,-1);

		a += da;
	}

	var mesh = new Float32Array(data);

	this.buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
	gl.bufferData(gl.ARRAY_BUFFER,mesh,gl.STATIC_DRAW);
}

Mecho.GeometryCirclePlates.prototype.drawFaces = function(rLower,rUpper,height)
{
	var gl = this.ctx.gl;
	gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
	gl.vertexAttribPointer(this.ctx.aXYZ,3,gl.FLOAT,false,8*Mecho.FLOATS,0*Mecho.FLOATS);
	gl.vertexAttribPointer(this.ctx.aNormal,3,gl.FLOAT,false,8*Mecho.FLOATS,5*Mecho.FLOATS);
	gl.vertexAttribPointer(this.ctx.aTexCoord,2,gl.FLOAT,false,8*Mecho.FLOATS,3*Mecho.FLOATS);

	if (rUpper)
	{
		gl.uniform3f(this.ctx.uScale,rUpper,rUpper,height);
		gl.drawArrays(gl.TRIANGLE_FAN,0,this.NU+2);
	}
	if (rLower)
	{
		gl.uniform3f(this.ctx.uScale,rLower,rLower,height);
		gl.drawArrays(gl.TRIANGLE_FAN,this.NU+2,this.NU+2);
	}
}



//===================================================
//
// new GeometryCone(ctx)
//
// A conical primitive object. Drawn without bases.
// Originally looks like a cylinder from z=0 to z=1.
//
//===================================================
Mecho.GeometryCone = function(ctx,n)
{
	this.ctx = ctx;
	var gl = ctx.gl;
			
	this.NU = n;	// horizontal precision
	
	var data = [];

	var a = 0;
	var da = 2*Math.PI/this.NU;
	var tu = 0;
	var dtu = 1/this.NU;

	for( var i=0; i<this.NU+1; i++ )
	{
		var x = Math.cos(a);
		var y = Math.sin(a);

		data.push(x,y,0, tu,1,	x,y,0);
		data.push(x,y,1, tu,0,	x,y,0);

		a += da;
		tu += dtu;
	}

	var mesh = new Float32Array(data);

	this.buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
	gl.bufferData(gl.ARRAY_BUFFER,mesh,gl.STATIC_DRAW);
}

Mecho.GeometryCone.prototype.drawFaces = function()
{
	var gl = this.ctx.gl;
	gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
	gl.vertexAttribPointer(this.ctx.aXYZ,3,gl.FLOAT,false,8*Mecho.FLOATS,0*Mecho.FLOATS);
	gl.vertexAttribPointer(this.ctx.aNormal,3,gl.FLOAT,false,8*Mecho.FLOATS,5*Mecho.FLOATS);
	gl.vertexAttribPointer(this.ctx.aTexCoord,2,gl.FLOAT,false,8*Mecho.FLOATS,3*Mecho.FLOATS);

	gl.drawArrays(gl.TRIANGLE_STRIP,0,2*this.NU+2); // draw horizontal band
}
﻿//===================================================
//
// Module:  Ground
// Library:	Mecho 4.0
// License:	CC-3.0 SA NC
//
// Constructors:
//		new Mecho.Ground({scale,width})
//		ground({scale,width})
//
// Properties:
//		size
//		tiles - [scale,scale]
//
//===================================================

Mecho.Ground = function(size,custom)
{
	Mecho.Mecholet.apply(this,arguments);
	arguments[this.customIndex] = undefined;

	this.center = [0,0,0];
	this.size = size||10000;
	this.tiles = [Mecho.N(this.size),Mecho.N(this.size)];

	// remember the ground in the Mecho object
	// and remove it from the list of user objects
	this.ctx.groundObject = this.ctx.mecholetList.pop();
	
	this.custom(this.customValues);
}

Mecho.Ground.prototype = Object.create(Mecho.Mecholet.prototype);
Mecho.Ground.prototype.drawFaces = function()
{
	this.ctx.gl.uniform3f(this.ctx.uScale,this.size,this.size,1);
	this.ctx.gl.uniform3f(this.ctx.uPos,0,0,0);

	this.prepareMaterial(0);
	this.ctx.gl.uniform1i(this.ctx.uLight,0);
	this.ctx.geometryGround.drawFaces(this.tiles[0],this.tiles[1]);
}


Mecho.Ground.prototype.onMaterial = function()
{
	this.tiles[0] = Mecho.N(this.size/this.material[0].groundScale);
	this.tiles[1] = this.tiles[0];
}﻿//===================================================
//
// Module:  Target
// Library:	Mecho 4.0
// License:	CC-3.0 SA NC
//
// Constructors:
//		new Mecho.Target()
//
//===================================================

Mecho.Target = function()
{
	Mecho.Mecholet.apply(this,arguments);
	this.material = Mecho.CHECK;
	this.ctx.targetObject = this.ctx.mecholetList.pop();
	this.visible = false;

	this.buffer = this.ctx.gl.createBuffer();
	var a=1, b=2.5;
	var data = [
		-a,0,0,-b,0,0,
		+a,0,0,+b,0,0,
		0,-a,0,0,-b,0,
		0,+a,0,0,+b,0,
		0,0,-a,0,0,-b,
		0,0,+a,0,0,+b,
	];	
	var mesh = new Float32Array(data);	
		
	this.ctx.gl.bindBuffer(this.ctx.gl.ARRAY_BUFFER,this.buffer);
	this.ctx.gl.bufferData(this.ctx.gl.ARRAY_BUFFER,mesh,this.ctx.gl.STATIC_DRAW);
}


Mecho.Target.prototype = Object.create(Mecho.Mecholet.prototype);
Mecho.Target.prototype.drawFaces = function()
{
	var RAD = 0.7;
	
	// draw ball
	this.prepareMaterial(0);
	this.ctx.gl.uniform2f(this.ctx.uTexScale,1,1);
	this.ctx.gl.uniform3f(this.ctx.uScale,RAD,RAD,RAD);
	this.ctx.geometrySphere[true].drawFaces();

	this.ctx.gl.uniform3f(this.ctx.uScale,2*RAD,2*RAD,2*RAD);
	this.ctx.gl.bindBuffer(this.ctx.gl.ARRAY_BUFFER,this.buffer);
	this.ctx.gl.vertexAttribPointer(this.ctx.aXYZ,3,this.ctx.gl.FLOAT,false,3*Mecho.FLOATS,0*Mecho.FLOATS);
	this.ctx.gl.disableVertexAttribArray(this.ctx.aNormal);
	this.ctx.gl.disableVertexAttribArray(this.ctx.aTexCoord);
	this.ctx.gl.bindTexture(this.ctx.gl.TEXTURE_2D,null);
	this.ctx.gl.uniform1i(this.ctx.uTexture,false);
	this.ctx.gl.uniform1i(this.ctx.uLight,false);
	var c = 0.2;
	this.ctx.gl.uniform3fv(this.ctx.uColor,[c,c,c]);
	this.ctx.gl.drawArrays(this.ctx.gl.LINES,0,12);
}
