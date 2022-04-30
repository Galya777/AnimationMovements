//Галя Георгиева Додова 45616
//този модел е авторски
//прочетох К44
function main()
{
        stage = new Mecho(); 
        
        stage.ground= Mecho.ASPHALT;       
        stage.sky = Mecho.BLUE; 
        button('start','Start',start);
        button( 'time','Time', setSpeed);  
        makeBike();
       	button('center', 'Center', centerButton);		
	button('show', 'Zoom', setZoom);
        stage.viewObject.distance = zooms[1];    
        stage.onTime = animate;
}