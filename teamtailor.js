const readline = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout,
  });;
const https = require ('https');
const fs = require ('fs');

/**
 * @param {Array<String>} argv  
 */
function processArgv (argv) {
    let arguments = {};
    argv.forEach ((arg, i) => {
        switch (arg) {
            case '--help':
            case '-h': console.log(`Tool for bulk-uploading applicants from a CSV-File to Teamtailor
The Semicolon-Separated-Data-File is required to be of this format: 

\tname; github-url, github-user; email; location

Arguments:
\t--help -h
\t\tDisplay this text
\t-v
\t\tshow version info
\t--verbose
\t\tdisplay debug info while running
\t--api
\t\tdefine the API-Key from the command line
\t-f --file
\t\tSpecify a file path

Distributed under the MIT-License, 
Copyright 2022 Maximilian Wittmer`); 
            process.exit (0);
            case '-v': console.log ('version 1.0'); process.exit (0);
            case '--verbose': arguments.verbose = true; break;
            case '--api': arguments.apiKey = argv [i + 1]; break;
            case '--file': arguments.fileName = argv [i + 1]; break;
        }
    });
    return arguments;
}

function outputDebug (text, arguments) {
    if (arguments.verbose)
        console.info ('[INFO]' + text);
}

const getLine = (function () {
    const getLineGen = (async function* () {
        for await (const line of readline) {
            yield line;
        }
    })();
    return async () => ((await getLineGen.next()).value);
})();

async function askFor (text) {  
    console.log (text);  
    let data = await getLine ();
    return data;
}

function getFileCsv(fileName) {
    const data = fs.readFileSync (fileName, 'utf-8');
    const lines = data.split('\n');
    return lines.map (line => line.split (';'));
}

async function uploadApplicant (applicant, options) {
    let httpsOptions = {
        hostname: 'api.teamtailor.com',
        path: '/v1/candidates',
        method: 'POST',
        
        headers: {
            'Authorization': `Token token=${options.apiKey}`,
            'X-Api-Version': '20210218',
            'Content-Type': 'application/vnd.api+json'
        }, 
    };

    let postData = {
        data: {
            "type": "candidates", 
            "attributes": {
                "first-name": applicant[0].split (' ')[0],
                "last-name": applicant[0].split (' ')[1],
                "email": applicant[3],
                "pitch": `${applicant[1]} ${applicant[2]}, location: ${applicant[4]}`
            }
        }
    }
    
    const req = https.request(httpsOptions, res => {
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
            outputDebug(`BODY: ${chunk}`, options);
        });
    });

    req.on('error', (e) => {
        outputDebug(`problem with request: ${e.message}`, options);
    });

    req.write (JSON.stringify(postData));
    outputDebug (`Done trying uploading ${applicant[0]}`, options);
    console.log ('.');
    req.end();
}

async function uploadApplicants (applicants, options) {
    outputDebug('Starting upload', options);
    for await (const app of applicants) {
        await uploadApplicant (app, options);
    }
    outputDebug(`Done with upload, ${ applicants.length } applicants sent`, options);
}

(async function main () {
    let csv = [];
    let arguments = processArgv(process.argv);
    if (typeof arguments.apiKey === 'undefined')
        arguments.apiKey = await askFor('Do you have an API-Key?');
    if (typeof arguments.fileName === 'undefined')
        arguments.fileName = await askFor('Which file contains the CSV?');

    console.log (arguments);

    csv = getFileCsv(arguments.fileName);
    uploadApplicants(csv, arguments);

})();
