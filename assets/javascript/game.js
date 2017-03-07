const gameStates = {
  waitingForPlayers: "Waiting for all players",
  readyToStart: "Everyone has joined that is going to, ready to start round",
  waitingForQuestion: "Waiting for Questioneer to enter a question",
  waitingForAnswers: "Waiting for correct answer",
  questionAnswered: "Question has been correctly answered"
};

const playerStates = {
  waitingForPlayer: "No one has claimed this seat",
  questioner: "You are the questioner",
  emptySlot: "Empty slot during the game",
  answerer: "You are trying to answer the question"
};

  // Initialize Firebase
var config = {
  apiKey: "AIzaSyBRyByGGGi7bmIeFskezDVuuRWPfw0jpkQ",
  authDomain: "ut-bootcamp-project1.firebaseapp.com",
  databaseURL: "https://ut-bootcamp-project1.firebaseio.com",
  storageBucket: "ut-bootcamp-project1.appspot.com",
  messagingSenderId: "1065980904141"
};
firebase.initializeApp(config);
var database=firebase.database();

function Player(num){
  this.name="";
  this.joined=false;
  this.number=num;
  this.points=0;
  this.ref=database.ref("player/"+num);

  this.updateValues = function(snapshot){
    var val=snapshot.val();
    this.name=val.name;
    this.points=val.points;
    this.joined=val.joined;
  };
  this.sendAnswer = function(message){
    //main_game.checkAnswer(message, this.number);
  };
  this.refSetValues = function(){
    this.ref.set({name: this.name, joined: this.joined, points: this.points});
  };
  this.refDisconnectAttach = function(){
    this.ref.onDisconnect().remove();
  };
}

var player1= new Player(1);
var player2= new Player(2);
var player3= new Player(3);
var player4= new Player(4);
var player5= new Player(5);

var main_game = {
  players: [null,player1,player2,player3,player4,player5],
  gameState: gameStates.waitingForPlayers,
  round:0,
  windowPlayer: null,
  currentPlayer: null,
  questioner: null,
  question: "",
  answer: "",

  reset: function() {

  },
  
  joinGame: function(name, num){
    this.windowPlayer=this.players[num];
    this.windowPlayer.name=name;
    this.windowPlayer.joined=true;
    this.windowPlayer.points=0;
    this.windowPlayer.refSetValues();
    this.windowPlayer.refDisconnectAttach();
  },

};

$(document).ready(function(){

  $("#player1-name-submit").on("click", function(event){
    event.preventDefualt();
    main_game.joinGame($("player1-name-input").val().trim(),1);
  });
  $("#player2-name-submit").on("click", function(event){
    event.preventDefualt();
    main_game.joinGame($("player2-name-input").val().trim(),2);
  });
  $("#player3-name-submit").on("click", function(event){
    event.preventDefualt();
    main_game.joinGame($("player3-name-input").val().trim(),3);
  });
  $("#player4-name-submit").on("click", function(event){
    event.preventDefualt();
    main_game.joinGame($("player4-name-input").val().trim(),4);
  });
  $("#player5-name-submit").on("click", function(event){
    event.preventDefualt();
    main_game.joinGame($("player5-name-input").val().trim(),5);
  });


  database.ref("player/1").on("value", function(snapshot){
      if(snapshot.exists())
        player1.updateValues(snapshot);
    }, function(errorObject){
      console.log("Errors handled: " + errObject.code);
  });
  database.ref("player/2").on("value", function(snapshot){
      if(snapshot.exists())
        player2.updateValues(snapshot);
    }, function(errorObject){
      console.log("Errors handled: " + errObject.code);
  });
  database.ref("player/3").on("value", function(snapshot){
      if(snapshot.exists())
        player3.updateValues(snapshot);
    }, function(errorObject){
      console.log("Errors handled: " + errObject.code);
  });
  database.ref("player/4").on("value", function(snapshot){
      if(snapshot.exists())
        player4.updateValues(snapshot);
    }, function(errorObject){
      console.log("Errors handled: " + errObject.code);
  });
  database.ref("player/5").on("value", function(snapshot){
      if(snapshot.exists())
        player5.updateValues(snapshot);
    }, function(errorObject){
      console.log("Errors handled: " + errObject.code);
  });
});