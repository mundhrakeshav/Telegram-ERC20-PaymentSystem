//TODO ADD NGROK URL CORRECTLY
//TODO REGISTER USER
const config = require("./config.js");
const express = require("express");
const bodyParser = require("body-parser");
const ethers = require("ethers");
// Initialize express and define a port
const app = express();
const PORT = 3000;
app.use(bodyParser.urlencoded({ extended: true }));
// Tell express to use body-parser's JSON parsing
app.use(bodyParser.json());

const client = require("twilio")(
  config.twilioAccountSID,
  config.twilioAuthoken
);

app.post("/onTwilioMessage", (req, res) => {
  console.log(req.body.Body, req.body.To); // Call your action on the request here
  console.log(req.body);
  let message = "";
  switch (req.body.Body) {
    case SIGNUP:
      break;

    default:
      break;
  }
});
app.get("/onTwilioMessage", (req, res) => {
  console.log(req.body); // Call your action on the request here
  console.log(req.headers);
});

// client.messages
//   .create({
//     from: "whatsapp:+14155236",
//     body: "Hello, there!",
//     to: "whatsapp:+910000000000",
//   })
//   .then((message) => console.log(message));

// Start express on the defined port
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
