var main_game = {
  seats: [new Seat(0),new Seat(1),new Seat(2),new Seat(3),new Seat(4),new Seat(5)],
  gameState: gameStates.waitingForPlayers,
  lastGameState: null,
  
  windowSeat: null,
  windowState: windowStates.spectator,

  round:0,
  timeLeft: 30,
  hostSeat: 0,
  hinter: 0,
  hint: "",
  answer: "",
  answerer: 0,

  fuzzyCompare: null,

  intervalId: null,
  timeoutId: null,

  chatRef: database.ref("chat"),
  hChatRef: database.ref("q-chat"),
  gameRef: database.ref("game"),



  reset: function() {
    this.windowSeat=this.seats[0];
  },

  fbPlayerInit: function() {
    for(var i=1; i<this.seats.length; ++i)
      this.seats[i].fbSetSeat();

    this.gameRef.set({gameState: gameStates.waitingForPlayers, hinter: 0, hint: "", answerer: 0, answer: ""});

  },

  fbSetGame: function () {
    this.gameRef.set({gameState: this.gameState, hint: this.hint, hinter: this.hinter, answer: this.answer, answerer: this.answerer});
  },

  fbUpdateGame: function(val) {
    this.gameState=val.gameState;
    this.hinter=val.hinter;
    this.hint=val.hint;
    this.answer=val.answer;
    this.answerer=val.answerer;
    this.checkGameState();
  },

  fbUpdateSeat: function(num, val) {
    var tempSeat=this.seats[num];
    if(tempSeat.joined===true && val.joined===false)
      if(this.gameState!==gameStates.waitingForPlayers)
        this.playerLeftDuringGame(tempSeat.name);

    tempSeat.name=val.name;
    tempSeat.joined=val.joined;
    tempSeat.points=val.points;
    tempSeat.ready=val.ready;
  },

  playerLeftDuringGame: function(name) {
    this.gameStopTimers();
    this.hinter=0;
    this.jqGameText1(name+" has left during an active game!");
    this.jqGameText2("Restarting Game");
    this.gameStartTimers(3,0,gameStates.waitingForPlayers);
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

  fbSetState: function(num, state) {
    console.log("fb Set State "+num+" "+state);
    var tempSeat=null;
    if(num===0)
      tempSeat=this.getTempHost();
    else
      tempSeat=this.seats[num];

    if(this.windowSeat.number===tempSeat.number) {
      console.log("This Window is changing state to: "+state);
      this.gameRef.set({gameState: state, hint: this.hint, hinter: this.hinter, answer: this.answer, answerer: this.answerer});
    }
  },

  joinGame: function(num, name){
    if(this.seats[num].joined) {
      alert("This seat is taken");
    }
    else if(this.windowSeat.number!==0)
      alert("You already are in a seat!");
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

  windowReady: function() {
    if(this.windowState!==windowStates.spectator) {
      if(this.gameState===gameStates.waitingForPlayers || this.gameState===gameStates.readyToStartGame) {
        if(this.windowSeat.ready){
          this.windowSeat.ready=false;
          this.windowSeat.fbSetSeat();
          this.jqGameText2("You are not ready.");

          //you set unready when timer is going, need to stop it if the timer 
          //This will happen for the first person to click unready after all players have cliked ready.
          if(this.gameState===gameStates.readyToStartGame){
            this.fbSetState(this.windowSeat.number, gameStates.waitingForPlayers);
          }
        } else {
          this.windowSeat.ready=true;
          this.windowSeat.fbSetSeat();
          this.jqGameText2("You are Ready!");
          //the Last person to be able to be ready clicks ready
          if(this.allSeatsJoinedReady()) {
            this.fbSetState(this.windowSeat.number,gameStates.readyToStartGame);
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
          this.gameStopTimers();
          this.jqGameText1("Waiting for players"); //Wiatin for more than 2 players to sit and hit ready.
          break;
        case gameStates.readyToStartGame:
          this.startGame(3); //Interval to start Game and timeout
          break;
        case gameStates.readyToStartRound:
          this.gameStopTimers();  
          this.startRound();  //Includes startRound
          this.setAllSeatsUnReady();
          break;
        case gameStates.waitingForGetAnswer:
          this.getHintAnswer();
          break;
        case gameStates.waitingForHint:
          this.setFuzzyCompare();
          this.displayGetHint();
          break;
        case gameStates.waitingForAnswer:
          this.displayHint();
          //this.startAnswerTimers(30);
          this.gameStartTimers(30, this.hinter, gameStates.hintUnanswered);
          break;
        case gameStates.hintAnswered:
          this.gameStopTimers();
          this.clearHChat();
          this.displayResults();
          this.calculatePoints();
          //this.nextRoundTimers(3);
          //this.startRound();// after an interval
          this.gameStartTimers(3, this.hinter, gameStates.readyToStartRound);
          break;
        case gameStates.hintUnanswered:
          this.gameStopTimers();
          this.clearHChat();
          this.displayNotAnswered();
          //this.nextRoundTimers(3);
          //this.startRound();
          this.gameStartTimers(3, this.hinter, gameStates.readyToStartRound);
          break;
        case gameStates.roundOver:
          this.displayGameOver();
          this.gameStartTimers(0, this.hinter, gameStates.waitingForPlayers);
          break;
      }
    }
  },

  gameStopTimers: function() {
    if(this.intervalId!==null){
      clearInterval(this.intervalId);
      this.intervalId=null;
    }
    if(this.timeoutId!==null) {
      clearTimeout(this.timeoutId);
      this.timeoutId=null;
    }
  },

  gameStartTimers(time, seat=0, state=gameStates.waitingForPlayers){
    //just as a precaution;
    clearInterval(this.intervalId);
    clearTimeout(this.timeoutlId);

    this.timeLeft=time;
    this.displayTimerCount();
    //this.jqGameText1("Countdown to game start has begun!");
    this.intervalId=setInterval(function(){
        main_game.displayTimerCount();
      }, 1000);
    this.timeoutId=setTimeout(function(){
        main_game.fbSetState(seat, state);
      }, time*1000);
  },

  startGame: function(time) {
    this.round=0;
    this.jqGameText1("Countdown to game start has begun!");

    this.gameStartTimers(3, 0, gameStates.readyToStartRound);
  },

  startRound: function() {
    this.hinter=this.getHinter();
    if(this.hinter===-1){
      this.hinter=0;
      this.fbSetState(0,gameStates.roundOver);
    }
    else 
      this.fbSetState(this.hinter, gameStates.waitingForGetAnswer);
  },

  getHinter: function() {
    var temp=this.hinter;
    ++temp;
    while(temp<this.seats.length && !this.seats[temp].joined)
      ++temp;
    if(temp<this.seats.length)
      return temp;
    else
      return -1;
  },

  getHintAnswer: function() {
    if(this.windowSeat.number === this.hinter)
        this.windowSeat.getAnswer();
  },

  displayTimerCount: function() {
    this.jqDisplayTimeLeft();
    --(this.timeLeft);
  },

  setFuzzyCompare: function() {
    this.fuzzyCompare = FuzzySet();
    this.fuzzyCompare.add(this.answer);
  },

  displayGetHint: function() {
    this.jqGameText1("The Hinter is "+this.seats[this.hinter].name);
    if(this.hinter===this.windowSeat.number) {
      this.jqGameText2("Please enter in a hint in the chat box");
    }
    else {
      this.jqGameText2("Waiting on Questiner to enter in a hint");
    }
  },

  displayHint: function() {
    this.jqGameText1("The Hint is: "+this.hint);
     if(this.hinter===this.windowSeat.number) {
      this.jqGameText2("You may offer hints if you want");
    }
    else {
      this.jqGameText2("The chat box is also used as your submit answer box");
    }
  },



  displayResults: function() {
    this.jqGameText1(this.seats[this.answerer].name+" has answered the hint!");
    this.jqGameText2("The answer was: "+this.answer);
  },

   calculatePoints: function() {
    if(this.answerer!==0) {
      if(this.windowSeat.number===this.hinter){
        this.windowSeat.points+=1;
        this.windowSeat.fbSetSeat();
      }
      else if(this.windowSeat.number===this.answerer) {
        this.windowSeat.points+=3;
        this.windowSeat.fbSetSeat();
      }
    }

  },

  displayNotAnswered: function() {
    this.jqGameText1("Time over!  No one gets any points!");
    this.jqGameText2("The answer was: "+this.answer);
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
      if(this.gameState===gameStates.waitingForHint && this.windowSeat.number===this.hinter)
        this.setHint(message);
      else if(this.gameState===gameStates.waitingForAnswer && this.windowSeat.number!==this.hinter)
        this.checkAnswer(message);

      if(this.gameState===gameStates.waitingForAnswer && this.windowSeat.number===this.hinter){
        this.hChatRef.push({msg: message});
      } else {
        var tempMsg = this.windowSeat.name+": "+message;
        this.chatRef.push({msg: tempMsg});
      }
    }

  },

  jqDisplayTimeLeft: function() {
    $("#timer").text(this.timeLeft);
  },

  jqDisplayChatMessage: function(message) {
    var p = $("<p>");
    p.text(message);

    var chatBox=$("#chat-history");
    chatBox.append(p);
    chatBox.scrollTop(chatBox[0].scrollHeight);
  },

  jqDisplayHinterChat: function(message) {
    var p = $("<p>");
    p.text(message);

    var chatBox=$("#chat-history-hinter");
    chatBox.append(p);
    chatBox.scrollTop(chatBox[0].scrollHeight);
  },

  clearHChat: function() {
    $("#chat-history-hinter").empty();
    this.hChatRef.remove();
  },

  displayGameOver: function() {
    var winStr=this.getWinner();
    this.jqGameText1(winStr);
    this.jqGameText2("Waiting for all people to be ready to start again");
    //this.fbSetState(0,gameStates.waitingForPlayers);

  },

  getWinner: function() {
    var maxPoints=0;
    var names=[];
    for(var i=1; i<this.seats.length; ++i){
      if(this.seats[i].points>maxPoints)
        maxPoints=this.seats[i].points;
    }
    for(var i=1; i<this.seats.length; ++i){
      if(this.seats[i].points===maxPoints) {
        names.push(this.seats[i].name);
      }
    }

    var str="";

    for(var i=0; i<names.length; ++i){
      if(i!==0)
        str+=", ";
      str+=names[i];
    }

    if(names.length===1)
      str+=" is the Winner! With "+maxPoints+ " Points!";
    else
      str+=" have tied! With "+maxPoints+ " Points!";

    return str;

  },

  //only the hinter is going to call this function
  setAnswer: function(str) {
    this.answer=str;
    this.fbSetState(this.hinter, gameStates.waitingForHint);
  },

  //only the hinter is going to call this function
  setHint: function(str) {
    console.log("we be getting called");
    this.hint=str;
    this.fbSetState(this.hinter, gameStates.waitingForAnswer);
  },

  //only the first window to submit the correct answer will call this function
  checkAnswer: function(str, prob=.8) {
    var tempFuzzArray=this.fuzzyCompare.get(str);
    if(tempFuzzArray.length>0)
      if(tempFuzzArray[0][0] > prob){
        this.answerer=this.windowSeat.number;
        this.fbSetState(this.answerer, gameStates.hintAnswered);
      }
  },

  jqGameText1: function(str){
    $("#game-text-1").text(str);
  },
  jqGameText2: function(str){
    $("#game-text-2").text(str);
  },

};