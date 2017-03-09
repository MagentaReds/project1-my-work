var main_game = {
  seats: [new Seat(0),new Seat(1),new Seat(2),new Seat(3),new Seat(4),new Seat(5)],
  gameState: gameStates.waitingForPlayers,
  lastGameState: null,
  round:0,
  windowSeat: null,
  windowState: windowStates.spectator,
  hostSeat: 0,
  questioner: 0,
  question: "",
  answer: "",
  answerer: 0,
  timerId: null,
  timeLeft: 30,
  chatRef: database.ref("chat"),
  qChatRef: database.ref("q-chat"),
  gameRef: database.ref("game"),

  reset: function() {
    this.windowSeat=this.seats[0];
  },

  fbPlayerInit: function() {
    for(var i=1; i<this.seats.length; ++i)
      this.seats[i].fbSetSeat();

    this.gameRef.set({gameState: gameStates.waitingForPlayers, questioner: 0, question: "", answerer: 0, answer: ""});

  },

  fbSetGame: function () {
    this.gameRef.set({gameState: this.gameState, question: this.question, questioner: this.questioner, answer: this.answer, answerer: this.answerer});
  },

  joinGame: function(num, name){
    if(this.seats[num].joined) {
      alert("This seat is taken");
    }
    else {
      this.seats[num]= new Seat(num, name, true);
      this.windowSeat=this.seats[num];
      this.windowSeat.fbSetSeat();
      this.windowSeat.fbDisconnectAttach();
      this.windowState=windowStates.player;

      var tempMsg = name+" has taken seat "+num
      this.chatRef.push({msg: tempMsg});
    }
  },

  fbUpdateGame: function(val) {
    this.gameState=val.gameState;
    this.questioner=val.questioner;
    this.question=val.question;
    this.answer=val.answer;
    this.answerer=val.answerer;
    this.checkGameState();
  },

  fbUpdateSeat: function(num, val) {
    var tempSeat=this.seats[num];
    tempSeat.name=val.name;
    tempSeat.joined=val.joined;
    tempSeat.points=val.points;
    tempSeat.ready=val.ready;
    this.checkGameState();
  },

  getTempHost: function() {
    for(var i=1; i<this.seats.length; ++i){
      if(this.seats[i].joined)
        return this.seats[i];
    }
  },

  fbTempHostSetGame: function(){
    var tempSeat=this.getTempHost();
    if(tempSeat.number===this.windowSeat.number)
        this.fbSetGame();

  },

  windowReady: function() {
    if(this.gameState===gameStates.waitingForPlayers) {
      if(this.windowState!==windowStates.spectator) {
        if(this.windowSeat.ready){
          this.windowSeat.ready=false;
          this.windowSeat.fbSetSeat();
          this.jqGameText2("You are not ready.");
        } else {
          this.windowSeat.ready=true;
          this.windowSeat.fbSetSeat();
          this.jqGameText2("You are Ready!");
          //the Last person to be able to be ready clicks ready
          if(this.allSeatsJoinedReady()) {
            this.gameState=gameStates.readyToStartGame;
            this.fbSetGame();
          }
        }
      }
    }
  },

  allSeatsJoinedReady: function() {
    var numReady=0;
    var allReady=true;
    for(var i=1; i<this.seats.length; ++i)
      if(this.seats[i].joined)
        if(this.seats[i].ready)
          ++numReady;
        else
          allReady=false;
    return allReady && (numReady>1);
  },

  checkGameState: function() {
    if(this.lastGameState!==this.gameState) {
      this.lastGameState=this.gameState;

      switch(this.gameState) {
        case gameStates.waitingForPlayers:
          this.jqGameText1("Waiting for players"); //Wiatin for more than 2 players to sit and hit ready.
          break;
        case gameStates.readyToStartGame:
          this.startGame(); //Interval to start Game
          break;
        case gameStates.readyToStartRound:
          this.startRound();  //Includes startRound
          this.setAllSeatsUnReady();
          break;
        case gameStates.waitingForQuestion:
          this.displayGetQuestion();
          break;
        case gameStates.waitingForAnswer:
          this.displayQuestion();
          break;
        case gameStates.questionAnswered:
          this.clearQChat();
          this.displayResults();
          this.calculatePoints();
          this.startRound();
          break;
        case gameStates.roundOver:
          this.displayGameOver();
          break;
      }
    }
  },

  startGame: function() {
    this.round=0;
    this.gameState=gameStates.readyToStartRound;
    this.fbTempHostSetGame();
  },

  startRound: function() {
    this.questioner=this.getQuestioner();
    if(this.questioner===-1){
      this.questioner=0;
      this.gameState=gameStates.roundOver;
      this.fbTempHostSetGame();
      return;
    }
    else if(this.windowSeat.number === this.questioner)
        this.windowSeat.getAnswer();
  },

  getQuestioner: function() {
    var temp=this.questioner;
    ++temp;
    while(temp<this.seats.length && !this.seats[temp].joined)
      ++temp;
    if(temp<this.seats.length)
      return temp;
    else
      return -1;
  },

  displayGetQuestion: function() {
    this.jqGameText1("The Questioner is "+this.seats[this.questioner].name);
    if(this.questioner===this.windowSeat.number) {
      this.jqGameText2("Please enter in a question in the chat box");
    }
    else {
      this.jqGameText2("Waiting on Questiner to enter in a question");
    }
  },

  displayQuestion: function() {
    this.jqGameText1("The Question is: "+this.question);
     if(this.questioner===this.windowSeat.number) {
      this.jqGameText2("You may offer hints if you want");
    }
    else {
      this.jqGameText2("The chat box is also used as your submit answer box");
    }
  },

  displayResults: function() {
    this.jqGameText1(this.seats[this.answerer].name+" has answered the question!");
    this.jqGameText2("The answer was: "+this.answer);
  },

   calculatePoints: function() {
    if(this.answerer!==0) {
      if(this.windowSeat.number===this.questioner){
        this.windowSeat.points+=1;
        this.windowSeat.fbSetSeat();
      }
      else if(this.windowSeat.number===this.answerer) {
        this.windowSeat.points+=3;
        this.windowSeat.fbSetSeat();
      }
    }

  },

  setAllSeatsUnReady: function() {
    for(var i=1; i<this.seats.length; ++i){
      this.seats[i].ready=false;
      this.seats[i].fbSetSeat();
    }
  },

  setAllSeatsPoints: function() {
    for(var i=1; i<this.seats.length; ++i){
      this.seats[i].points=0;
      this.seats[i].fbSetSeat();
    }
  },

  fbSendChatMessage: function(message) {
    if(this.windowSeat.number!==0) {
      if(this.gameState===gameStates.waitingForQuestion && this.windowSeat.number===this.questioner)
        this.setQuestion(message);
      else if(this.gameState===gameStates.waitingForAnswer && this.windowSeat.number!==this.questioner)
        this.checkAnswer(message);

      if(this.gameState===gameStates.waitingForAnswer && this.windowSeat.number===this.questioner){
        this.qChatRef.push({msg: message});
      } else {
        var tempMsg = this.windowSeat.name+": "+message;
        this.chatRef.push({msg: tempMsg});
      }
    }

  },

  jqDisplayChatMessage: function(message) {
    var p = $("<p>");
    p.text(message);

    var chatBox=$("#chat-history");
    chatBox.append(p);
    chatBox.scrollTop(chatBox[0].scrollHeight);
  },

  jqDisplayQuestionerChat: function(message) {
    var p = $("<p>");
    p.text(message);

    var chatBox=$("#chat-history-questioner");
    chatBox.append(p);
    chatBox.scrollTop(chatBox[0].scrollHeight);
  },

  clearQChat: function() {
    $("#chat-history-questioner").empty();
    this.qChatRef.remove();
  },

  displayGameOver: function() {
    var winObject=this.getWinner();
    this.jqGameText1(winObject.name+winObject.result+" With "+winObject.points+" Points!");
    this.jqGameText2("Waiting for all people to be ready to start again");
    this.gameState=gameStates.waitingForPlayers;
    this.fbTempHostSetGame();
  },

  getWinner: function() {
    var maxPoints=0;
    var names="";
    var number=0;
    for(var i=i; i<this.seats.length; ++i){
      if(this.seat[i].points>maxPoints)
        maxPoints=this.seat[i].points;
    }
    for(var i=i; i<this.seats.length; ++i){
      if(this.seat[i].points===maxPoints) {
        names=names+this.seat[i]+" ,";
        ++number;
      }
    }

    if(number===1) {
      return {points: maxPoints, name: names, result: " is the Winner!"};
    }
    else
      return {points: maxPoints, name: names.substring(0, names.length-2), result: " have tied!"};

  },

  setAnswer: function(str) {
    this.answer=str;
    this.gameState=gameStates.waitingForQuestion;
    this.fbSetGame();
  },

  setQuestion: function(str) {
    this.question=str;
    this.gameState=gameStates.waitingForAnswer;
    this.fbSetGame();
  },

  checkAnswer: function(str) {
    if(str===this.answer){
      this.answerer=this.windowSeat.number;
      this.gameState=gameStates.questionAnswered;
      this.fbSetGame();
    }
  },

  jqGameText1: function(str){
    $("#game-text-1").text(str);
  },
  jqGameText2: function(str){
    $("#game-text-2").text(str);
  },

};