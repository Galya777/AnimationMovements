function makeBike(){

    //the base of the bike
    rudder= tube([7.5, 0, 10], 8, 1, 1, 0);
    rudder.material= Mecho.BLACK;
    rudder.rotV =90;
    rudder.rotH =90;

    basepart1=tube([7.5, 0, 7.9], 5);
    basepart1.material= Mecho.BLACK;

    basepart2=tube([4, 0, 5.7], 8);
    basepart2.material= Mecho.RED;
    basepart2.rotV =-70;
    
    basepart3=tube([0.6, 0, 6.1], 4);
    basepart3.material= Mecho.BLACK;
    
    basepart4=tube([1.5, 0, 4], 3, 0.5);
    basepart4.material= Mecho.BLACK;
    basepart4.rotV =45;

    basepart5=tube([0.2, 0, 3], 6.5, 0.5);
    basepart5.material= Mecho.BLACK;
    basepart5.rotV =90;

     //left cycle
     leftone= ring([-2.5,0,3],4, 0);
     leftone.material= Mecho.BLACK;
     leftone.rotH =90;
     leftone.rotV =90;
     
     //right cycle
     rightone= ring([7.5,0,3],4, 0);
     rightone.material= Mecho.BLACK;
     rightone.rotH =90;
     rightone.rotV =90;
 
     //seat
     seat= rail([1.5, 0, 8],2.5, 1, 1, 1.1);
     seat.material= Mecho.BLACK;
     seat.rotV =90;
 
     //pedals
     pedal1= beam([3, 3, 3],5, 0.9, 0.2, 2, 0.5, 0.6);
     pedal1.material= Mecho.BLACK;
     pedal1.rotH = 90;
 
     //connect
     leftconnect= beam([-2.5, 0,3], 0.1);
     leftconnect.material= Mecho.METAL;
     leftconnect.rotH = 90;
     leftconnect.rotV = 90;

     rightconnect= beam([7.5, 0,3], 0.1);
     rightconnect.material= Mecho.METAL;
     rightconnect.rotH = 90;
     rightconnect.rotV = 90;
     //spokes
     leftspoke= beam([-2.5, 0,3], 0.6, 3);
     leftspoke.material= Mecho.BLACK;
     leftspoke.rotH = 90;
     leftspoke.rotV = 90;

     rightspoke= beam([7.5, 0,3], 0.6, 3);
     rightspoke.material= Mecho.BLACK;
     rightspoke.rotH = 90;
     rightspoke.rotV = 90;

     part=gear([2.5, 0, 3], 2, 0.1, 1);
     part.material=Mecho.BLACK;
     part.rotV=90;
     part.rotH=90;

    
}

function animate(){
    var t =  Mecho.time;
    if(rightone.center.x<13){
    rightone.center.x+=Mecho.dTime;
    rightconnect.center.x+=Mecho.dTime;
    rightspoke.center.x+=Mecho.dTime;
    }else if(basepart2.otherPoint.z>5.7){
       basepart2.rotV -= 1; 
    }
    else if(basepart1.center.z>5.7){	
    basepart1.center.z -= Mecho.dTime;
    rudder.center.z -= Mecho.dTime;    
    } else if(rudder.otherPoint.x<11.5){
        rudder.rotH += 1; 
    } else if(basepart1.center.x >-2.5){
    basepart2.otherPoint=basepart4.otherPoint;
    basepart2.rotH = 180*t;
    basepart1.rotH = -180/Math.PI*t;
    basepart1.center.x = 8*Math.cos(t);
    basepart1.center.y = 2*Math.sin(t);
    rudder.rotH = -180/Math.PI*t;
    rudder.center.x = 8*Math.cos(t);
    rudder.center.y = 2*Math.sin(t);
   } else if(rightone.center.x>-2.5) {
    rightone.center.x-=Mecho.dTime;
    rightconnect.center.x-=Mecho.dTime;
    rightspoke.center.x-=Mecho.dTime;
}

    
}