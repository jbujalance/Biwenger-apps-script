//Liga: https://biwenger.as.com/api/v1/rounds/league
//News: https://biwenger.as.com/api/v1/league/news

function getName(id){
  switch(id) {
    case 2087668: return 'PABLO'
    case 2088028: return 'JAVI'
    case 2088105: return 'GONZA'
    case 2088275: return 'ADRI'
    case 2088353: return 'ALEX'
    case 2125636: return 'JOSE'
    case 2180739: return 'IVAN'
    case 2212555: return 'CESAR'
    default: return 'ROLDAN' //2087763
  }
}

function getGlobalIndex(id){
  switch(id) {
    case 'PABLO': return 0
    case 'JAVI': return 1
    case 'GONZA': return 2
    case 'ADRI': return 3
    case 'ALEX': return 4
    case 'IVAN': return 5
    case 'JOSE': return 7
    case 'CESAR': return 8
    default: return 6 //'ROLDAN'
  }
}

function getBiwengerData(){
  var options = {
    contentType: "application/json",
    headers : {
      'x-version': '537',
      'x-league': '504434',
      'authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOjI1MzIzNjgxLCJpYXQiOjE1MTM4MTM0MjZ9.r9hRfUjcDF0UgGuEWyP1z0hSvYAE9Qc24hcaEw74xZc',
      'referer': 'https://biwenger.as.com/round',
      'authority': 'biwenger.as.com'
    }
  };
  
  var newsresponse = UrlFetchApp.fetch('https://biwenger.as.com/api/v1/league/news?limit=1000', options)
  var news = JSON.parse(newsresponse.getContentText())
  var rounds = news.data.filter(function(item){return item.type=="roundFinished"});//|| item.type=="roundStarted"});
  var result = {
    finished : false,
    round : rounds[0].content.round.name.substr(6)
  }
  if (rounds[0].type == "roundFinished"){
    result.finished = true;
    result.standings = rounds[0].content.results
  }
  return result;
}

function dataFormat(data){
  newdata = {
    round : parseInt(data.round, 10),
    players : []
  }
  for (var i = 0; i < data.standings.length; i++){
    var player = {
      name : getName(data.standings[i].user.id),
      position : i + 1,
      points : data.standings[i].points,
      biwengerbonus : data.standings[i].bonus,
      realbonus : 0,
      paga : 0,
      idealLineUp : 0
    }
    if (i > 0 && (data.standings[i].points == data.standings[i-1].points)){
      player.position = newdata.players[i-1].position;
    }
    if (data.standings[i].reason && data.standings[i].reason.bonusIdealLineup){
      player.idealLineUp = data.standings[i].reason.bonusIdealLineup[1];
    }
    newdata.players.push(player)
  }
  return newdata;
}

function writeStandings(data){
  var sheet = SpreadsheetApp.getActiveSheet();
  var column = 15;
  sheet.getRange(8, column + 1).setValue(data.round);
  for (var i = 0; i < data.players.length; i++){
    var row = 10 + i;
    sheet.getRange(row, column).setValue(data.players[i].position)
    sheet.getRange(row, column + 1).setValue(data.players[i].name)
    sheet.getRange(row, column + 2).setValue(data.players[i].points)
    sheet.getRange(row, column + 3).setValue(data.players[i].idealLineUp);
    sheet.getRange(row, column + 4).setValue(data.players[i].biwengerbonus);
    sheet.getRange(row, column + 5).setValue(data.players[i].realbonus);
    sheet.getRange(row, column + 6).setValue(data.players[i].paga);
    
    if (data.players[i].realbonus == data.players[i].biwengerbonus){
      sheet.getRange(row, column + 4).setBackground("white")
    }
    else{
      sheet.getRange(row, column + 4).setBackground("yellow")
    }
  }
}

function writeGlobal(data){
  var sheet = SpreadsheetApp.getActiveSheet();
  for (var i = 0; i < data.players.length; i++){
    sheet.getRange(8 + data.round, 3 + getGlobalIndex(data.players[i].name)).setValue(data.players[i].paga);
  }
}

function calcularPaga(data){
  var paga = [0.5, 0.75, 1]
  for (var i = 3; i < data.players.length; i++) paga.unshift(0);
  
  var pagados = 0;
  
  for (var i = data.players.length - 1; i >= 0 && pagados < 3; i--){
    var j = i;
    while (i > 0 && data.players[i].position == data.players[i-1].position) i--;
    var count = j - i + 1;
    
    var dinero = 0;
    for (var k = i; k <= j; k++) dinero += paga[k];
    dinero /= count;
    for (var k = i; k <= j; k++) data.players[k].paga = dinero;
    
    pagados += count;
  }
}

function calcularPrima(data){
  var prima = []
  for (var i = 0; i < data.players.length - 3; i++) prima.push((data.players.length - 3 - i) * 100000);
  prima = prima.concat([0,0,0]);
  
  for (var i = 0; i < data.players.length; i++){
    var j = i;
    while (i < data.players.length - 1 && data.players[i].position == data.players[i+1].position) i++;
    var count = i - j + 1;
    
    var bonus = 0;
    for (var k = j; k <= i; k++) bonus += prima[k];
    bonus /= count;
    for (var k = j; k <= i; k++) data.players[k].realbonus = bonus;  
  }
  
  for (var i = 0; i < data.players.length; i++){
    data.players[i].realbonus += data.players[i].idealLineUp * 100000;
    data.players[i].realbonus += data.players[i].points * 20000;
    if (data.players[i].paga > 0){
      data.players[i].realbonus += (data.players.length - 4) * 100000 + 400000 * data.players[i].paga;
    }
  }
}

function sendMails(data) {
  var mailSender = new MailSender(data);
  mailSender.sendMails();
}

function updateData() {
  var data = getBiwengerData();
  if (data.finished){
    data = dataFormat(data);
    calcularPaga(data);
    calcularPrima(data);
    writeStandings(data);
    writeGlobal(data);
    sendMails(data);
  }
}
