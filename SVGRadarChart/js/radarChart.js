var numOfRadarCharts = 0;

function createRadarChart(target,names,values,size,overflow,id,classes){
  
  var inputNames = names.split(",");
  var inputValues = values.split(",");
  var points = inputValues.length;
  var containerWidth = size;
  var width = containerWidth - 50;
  var milestonePoints1 = "";
  var milestonePoints2 = "";
  var milestonePoints3 = "";
  var milestonePoints4 = "";
  var milestonePoints5 = "";
  var textPoints = "";
  var polygonPoints = "";
  var pathPoints = "";
  var radius = width / 2;
  var point = (2 * Math.PI) / points;
  
  target.innerHTML += "<svg></svg>";
  target = target.lastChild;
  
  if(width){
    target.style.width = containerWidth;
    target.style.height = containerWidth;
  }
  if(id){
    target.setAttribute("id",id);
  }
  if(classes){
    target.setAttribute("class",classes);
  }
  if(overflow){
    target.style.overflow = "visible";
  }
  
  for (var i = 0; i < points; i++) {
    var actualWidthOffset;
    var largestWidths = [0,0];
    
    for(var j = 0;j < points; j++){
      target.innerHTML += "<text y=" + lineX + " x=" + lineY + ">" + inputNames[j] + "</text>";
      if(target.getElementsByTagName("text")[j].offsetWidth > largestWidths[0]){
        largestWidths[0] = target.getElementsByTagName("text")[j].offsetWidth;
      }else if(target.getElementsByTagName("text")[j].offsetWidth > largestWidths[1]){
        largestWidths[1] = target.getElementsByTagName("text")[j].offsetWidth;
      }
    }
    actualWidthOffset = largestWidths[0] + largestWidths[1];
    target.style.width = containerWidth + actualWidthOffset;
    //Start adding text. Text added once, width is read then re-added with calculations
    target.innerHTML += "<text y=" + lineX + " x=" + lineY + ">" + inputNames[i] + "</text>";
    var textWidth =  target.getElementsByTagName("text")[i].offsetWidth;
    var textHeight = target.getElementsByTagName("text")[i].offsetHeight;

    var lineY = (Math.round(Math.sin(Math.PI * 1 - (point * i)) * 1000000) / 1000000);
    var lineX = (Math.round(Math.cos(Math.PI * 1 - (point * i)) * 1000000) / 1000000);

    lineX = (lineX * (radius + (radius / 10) + textHeight * 0.7)) + (containerWidth / 2) + textHeight/2;
    if(lineY>0){
      lineY = (lineY * (radius + (radius / 10))) + (containerWidth / 2) + 5 + actualWidthOffset/2;
    }else{
      lineY = (lineY * (radius + (radius / 10))) + (containerWidth / 2) - textWidth/1 + actualWidthOffset/2;
    }

    textPoints += "<text y=" + lineX + " x=" + lineY + ">" + inputNames[i] + "</text>";
    
    //Graph Poly
    var y = (Math.round(Math.sin(Math.PI * 1 - (point * i)) * 1000000) / 1000000) * inputValues[i];
    var x = (Math.round(Math.cos(Math.PI * 1 - (point * i)) * 1000000) / 1000000) * inputValues[i];

    x = (x * radius) + (containerWidth / 2);
    y = (y * radius) + (containerWidth / 2) + (actualWidthOffset/2);

    polygonPoints += " " + y + "," + x;

    //Axis Lines
    var lineY = (Math.round(Math.sin(Math.PI * 1 - (point * i)) * 1000000) / 1000000);
    var lineX = (Math.round(Math.cos(Math.PI * 1 - (point * i)) * 1000000) / 1000000);

    lineX = (lineX * (radius + radius / 10)) + (containerWidth / 2);
    lineY = (lineY * (radius + radius / 10)) + (containerWidth / 2) + (actualWidthOffset/2);

    pathPoints += "M" + ((containerWidth / 2)  + (actualWidthOffset/2)) + "," + (containerWidth / 2);
    pathPoints += " " + lineY + "," + lineX;

    //Outer milestone
    var mileStoneY = (Math.round(Math.sin(Math.PI * 1 - (point * i)) * 1000000) / 1000000);
    var mileStoneX = (Math.round(Math.cos(Math.PI * 1 - (point * i)) * 1000000) / 1000000);

    mileStoneX = (mileStoneX * radius) + (containerWidth / 2);
    mileStoneY = (mileStoneY * radius) + (containerWidth / 2) + (actualWidthOffset/2);

    milestonePoints1 += " " + mileStoneY + "," + mileStoneX;

    //4th milestone
    mileStoneY = (Math.round(Math.sin(Math.PI * 1 - (point * i)) * 1000000) / 1000000);
    mileStoneX = (Math.round(Math.cos(Math.PI * 1 - (point * i)) * 1000000) / 1000000);

    mileStoneX = (mileStoneX * (radius * 0.80)) + (containerWidth / 2);
    mileStoneY = (mileStoneY * (radius * 0.80)) + (containerWidth / 2) + (actualWidthOffset/2);

    milestonePoints2 += " " + mileStoneY + "," + mileStoneX;

    //3rd milestone
    mileStoneY = (Math.round(Math.sin(Math.PI * 1 - (point * i)) * 1000000) / 1000000);
    mileStoneX = (Math.round(Math.cos(Math.PI * 1 - (point * i)) * 1000000) / 1000000);

    mileStoneX = (mileStoneX * (radius * 0.60)) + (containerWidth / 2);
    mileStoneY = (mileStoneY * (radius * 0.60)) + (containerWidth / 2) + (actualWidthOffset/2);

    milestonePoints3 += " " + mileStoneY + "," + mileStoneX;

    //2nd milestone
    mileStoneY = (Math.round(Math.sin(Math.PI * 1 - (point * i)) * 1000000) / 1000000);
    mileStoneX = (Math.round(Math.cos(Math.PI * 1 - (point * i)) * 1000000) / 1000000);

    mileStoneX = (mileStoneX * (radius * 0.40)) + (containerWidth / 2);
    mileStoneY = (mileStoneY * (radius * 0.40)) + (containerWidth / 2) + (actualWidthOffset/2);

    milestonePoints4 += " " + mileStoneY + "," + mileStoneX;

    //1st milestone
    mileStoneY = (Math.round(Math.sin(Math.PI * 1 - (point * i)) * 1000000) / 1000000);
    mileStoneX = (Math.round(Math.cos(Math.PI * 1 - (point * i)) * 1000000) / 1000000);

    mileStoneX = (mileStoneX * (radius * 0.20)) + (containerWidth / 2);
    mileStoneY = (mileStoneY * (radius * 0.20)) + (containerWidth / 2) + (actualWidthOffset/2);

    milestonePoints5 += " " + mileStoneY + "," + mileStoneX;
  }
  
   target.innerHTML = (textPoints + "<polygon class='radar-chart-milestone radar-chart-milestone-5' points='"+milestonePoints5+"'/><polygon class='radar-chart-milestone radar-chart-milestone-4' points='"+milestonePoints4+"'/><polygon class='radar-chart-milestone radar-chart-milestone-3' points='"+milestonePoints3+"'/><polygon class='radar-chart-milestone radar-chart-milestone-2' points='"+milestonePoints2+"'/><polygon class='radar-chart-milestone radar-chart-milestone-1' points='"+milestonePoints1+"'/><path class='radar-chart-axis' d='" + pathPoints + "' /><polygon class='radar-chart-values' points='" + polygonPoints + "'/>");
  
  numOfRadarCharts++;
}


function changeValues(){
  polygonPoints = "";
  input = String(Math.random())+","+String(Math.random())+","+String(Math.random())+","+String(Math.random())+","+String(Math.random());
  pointValues = input.split(",");
  for (var i = 0; i < points; i++) {
    //Graph Poly
    var y = (Math.round(Math.sin(Math.PI * 1 - (point * i)) * 1000000) / 1000000) * pointValues[i];
    var x = (Math.round(Math.cos(Math.PI * 1 - (point * i)) * 1000000) / 1000000) * pointValues[i];

    x = (x * radius) + containerwidth / 2;
    y = (y * radius) + containerwidth / 2;

    polygonPoints += " " + y + "," + x;
    
    document.getElementById("graph-values").innerHTML("<animate calcMode='spline' keySplines='.5 0 .5 1' keyTimes='0;1' fill='freeze' onend='graphAnimationEnded()' id='graph-animation' begin='indefinite' attributeName='points' dur='500ms' to='"+ polygonPoints +"' />");
    graphAnimation = document.getElementById("graph-animation");
    graphAnimation.beginElement();
  }
}


function graphAnimationEnded(){
  document.getElementById('graph-values').setAttribute('points',polygonPoints);
  document('graph-animation').remove();
}

createRadarChart(document.body,"HTML,CSS,Javascript,jQuery,PHP,Asp.Net",String(Math.random())+","+String(Math.random())+","+String(Math.random())+","+String(Math.random())+","+String(Math.random())+","+String(Math.random()),200,true,"","radar-chart");
createRadarChart(document.body,"C#,VB.Net,LUA,",String(Math.random())+","+String(Math.random())+","+String(Math.random()),200,true,"","radar-chart");
createRadarChart(document.body,"MySQL,SQL Server 2008,Microsoft Access",String(Math.random())+","+String(Math.random())+","+String(Math.random()),200,true,"","radar-chart");











