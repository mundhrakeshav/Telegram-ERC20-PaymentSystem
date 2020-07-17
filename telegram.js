const axios = require("axios");
const WebSocket = require("ws");
const TelegramBot = require("node-telegram-bot-api");
const mongoose = require("mongoose");
const ethers = require("ethers");
const bodyParser = require("body-parser");

const config = require("./config.js");

telegram = new TelegramBot(config.telegramBotToken, { polling: true });

mongoose.connect("mongodb://localhost:27017/botPayDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const contractInstance = axios.create({
  baseURL: encodeURI(config.blockVigilApiPrefix + config.contractAddress),
  timeout: 5000,
  headers: { "X-API-KEY": config.blockVigilApiKey },
});

const ws = new WebSocket(config.blockVigilWsUrl);

const userSchema = new mongoose.Schema({
  username: String,
  address: String,
});

const BotPayUser = new mongoose.model("botPayUser", userSchema);

telegram.on("text", (message) => {
  //
  const messageList = message.text.split(" ");

  const defaultTextReply =
    "Text according to the following commands \n1) SIGNUP - to signup\n2) SEND <Amount> <Receiver's UserName> to send money \n3) ADDRESS - to get your address  \n4) BALANCE - to get  your balance";

  const username = message.chat.username;
  if (!username) {
    telegram.sendMessage(
      message.chat.id,
      "No Username, DUDE GET A USERNAME IN YOUR TELEGRAM SETTINGS"
    );
    return;
  }
  switch (messageList[0].toLowerCase()) {
    //
    case "send":
      if (messageList.length != 3) {
        telegram.sendMessage(
          message.chat.id,
          "send correct format to transfer tokens"
        );
        telegram.sendMessage(
          message.chat.id,
          "send <Amount> <Receiver's UserName>"
        );
        return;
      } else {
        let senderAddress = "";
        let recieverAddress = "";

        BotPayUser.findOne({ username: username }, (err, user) => {
          if (err) {
            telegram.sendMessage(message.chat.id, err);
            console.log(err);
            return;
          }
          if (user) {
            senderAddress = user.address;
          } else {
            telegram.sendMessage(
              message.chat.id,
              "you are not registered please signup first"
            );
          }
        }).then((result) => {
          BotPayUser.findOne({ username: messageList[2] }, (err, user) => {
            if (err) {
              telegram.sendMessage(message.chat.id, err);
              console.log(err);
              return;
            }
            if (user) {
              recieverAddress = user.address;
            } else {
              telegram.sendMessage(
                message.chat.id,
                "reciever is not registered please make them signup first"
              );
            }
          }).then(() => {
            console.log(recieverAddress, senderAddress);
            const amount = parseInt(messageList[1]);
            contractInstance
              .post("/transferFrom", {
                from: senderAddress,
                to: recieverAddress,
                amount: amount,
              })
              .then((result) => {
                telegram.sendMessage(
                  message.chat.id,
                  "specified tokens are on their way to be transferred, account balance will reflect very soon and here's your reciept\n " +
                    "https://goerli.etherscan.io/tx/" +
                    result.data.data[0].txHash
                );

                console.log(result.data.data[0].txHash);
              })
              .catch((err) => {
                console.log(err);
                console.log("err");
              });
          });
        });
      }
      break;

    case "address":
      BotPayUser.findOne({ username: username }, (err, user) => {
        if (user) {
          telegram.sendMessage(
            message.chat.id,
            "your address is:" + user.address
          );
        } else if (err) {
          telegram.sendMessage(message.chat.id, err);
        } else {
          telegram.sendMessage(
            message.chat.id,
            "you are not signed up send <signup> to register"
          );
        }
      });
      break;

    case "balance":
      BotPayUser.findOne({ username: username }, (err, user) => {
        console.log(user.address);
        if (!user) {
          telegram.sendMessage(
            message.chat.id,
            "you are not signed up send <signup> to register"
          );
        } else if (err) {
          telegram.sendMessage(message.chat.id, err);
        } else {
          contractInstance
            .get("/balanceOf/" + user.address)
            .then((res) => {
              const balance = res.data.data[0].balance;
              telegram.sendMessage(
                message.chat.id,
                "your balance is " + balance + " tokens"
              );
            })
            .catch((err) => console.error(err));
        }
      });

      break;

    case "signup":
      BotPayUser.findOne({ username: username }, (err, user) => {
        if (user) {
          telegram.sendMessage(
            message.chat.id,
            "you are already registered and your address is:" + user.address
          );

          return;
        } else if (err) {
          telegram.sendMessage(message.chat.id, err);
          console.log(err);
        } else {
          //
          const accountAddress = ethers.Wallet.createRandom(
            message.chat.username
          ).address;

          const user = new BotPayUser({
            username: username,
            address: accountAddress,
          });
          contractInstance
            .post("/signup", {
              account: accountAddress,
            })
            .then((result) => {
              console.log(result.data.data[0].txHash);
              user.save();
              telegram.sendMessage(
                message.chat.id,
                "you have been signed up and your account address is:" +
                  accountAddress
              );
              telegram.sendMessage(
                message.chat.id,
                "Also, you have recieved signing bonus of 1000 tokens, and heres the proof of transaction: \n " +
                  "https://goerli.etherscan.io/tx/" +
                  result.data.data[0].txHash
              );
            })
            .catch((err) => {
              console.log(err);

              console.log("error");
            });
        }
      });
      break;

    default:
      telegram.sendMessage(message.chat.id, defaultTextReply);
      break;
  }
});
