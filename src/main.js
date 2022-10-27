const fs = require('fs');
const axios = require('axios');
const FormData = require("form-data");


const camera_url = process.env.CAMERA_URL;
const fromNumber = process.env.FROM_NUMBER;
const toNumber = process.env.TO_NUMBER;
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const prToken = process.env.PLATE_RECOGNIZER_TOKEN;
const client = require('twilio')(accountSid, authToken);
const plates = process.env.WHITELIST.split(", ");

async function downloadImage(url, filepath) {
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
    });
    return new Promise((resolve, reject) => {
        response.data.pipe(fs.createWriteStream(filepath))
            .on('error', reject)
            .once('close', () => resolve(filepath)); 
    });
}

console.log('Loading vehicle-notifier');
console.log('Plates to match: ' + plates)

setInterval(function(){
	downloadImage(camera_url, 'stored.png')
    .then(function() {
    	let body = new FormData();
    	body.append("upload", fs.createReadStream('stored.png'));
    	body.append("regions", "us-ca");

    	axios({
    	  method: "post",
    	  url: "https://api.platerecognizer.com/v1/plate-reader/",
    	  data: body,
    	  headers: { "Content-Type": "multipart/form-data", "Authorization": "Token " + prToken },
    	})
    	  .then(function (response) {
    	    //handle success
    	    console.log(response.data.results);
    	    if (response.data.results.length > 0) {
    	    	const plateID = response.data.results[0]['plate'];
    	    	if (plates.includes(plateID)) {
    	    		console.log('matched plate! ' + plateID)
		    	    client.messages
			          .create({
			             body: 'Vehicle ' + plateID + ' has been spotted!',
			             from: fromNumber,
			             to: toNumber
			           })
			          .then(message => console.log(message.sid))
			          .catch(console.error);;
    	    	}
	      	}
    	  })
    	  .catch(function (response) {
    	    //handle error
    	    console.log(response);
    	  });
    })
    .catch(console.error);
}, 5000); 