var zooms = [6, 30, 60];
var speed = 1;
var rot_angle = 30;
function centerButton(){
    stage.viewObject.distance = 0;
}
function setZoom(){
    stage.viewObject.distance = zooms[this.state];
}
function setSpeed(){
    speed = 6-speed;
}
function start()
		{
			scene.target = [0,0,3];
			scene.onTime = animate;
		}
