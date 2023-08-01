require('dotenv').config();
const express = require('express');
const app = express();

const path = require('path');
const winston = require('winston');
const fs = require('fs');
const http = require('http');
const couch = require('nano')({url:'http://couchdb:5984', requestDefaults: {jar: true}}); // http://127.0.0.1:5984/_utils
const { execSync } = require('child_process');

app.use(express.json()); // Middleware to parse JSON bodies (for application/json content-type)
app.use(express.urlencoded({ extended: true })); // Middleware to parse URL-encoded bodies (for application/x-www-form-urlencoded content-type)
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

const cookieParser = require("cookie-parser");
app.use(cookieParser());
const { cookieJwtAuth } = require("./routes/cookieJwtAuth");
const userRoutes = require('./routes/users')(couch);
const beancountRoutes = require('./routes/beancount');

// https://sematext.com/blog/docker-container-monitoring/
// https://sematext.com/guides/elk-stack/

// https://www.openbankingtracker.com/provider/intesa-sanpaolo
// Codat? TrueLayer? in cosa sono diversi da Plaid e Salt Edge (e nordigen?) ?


app.get('/', (req, res) => {
  res.render('landingPage');
});
app.get('/login', (req, res) => {
  res.render('login');
});
app.get('/registration', (req,res) => {
  res.render('registration');
})
app.get('/logOut', (req, res) => {
  res.clearCookie("token");
  res.redirect("/login");
})
app.get('/profile', cookieJwtAuth, (req, res) => {
  res.render('profile', {user: req.user['name']});
})

app.use('/users', userRoutes);
app.use('/beancount', beancountRoutes);

// TODO: sistemare "aggiungi" transizione, con una completa
// TODO: associare un documento creato alla visualizzazione della rendicontazione in test

app.post('/aggiungi', cookieJwtAuth, (req, resOut) => {
  req.body.user = req.user['name'];
  const jsonData = JSON.stringify(req.body);
  /*const jsonData = JSON.stringify({ //merge two json
    ...req.body,
    ...req.user
  });*/
  console.log('Data to Python: ' + jsonData)

  // comunicazione con il container python
  const options = {
    hostname: 'python',
    port: 3003,
    path: '/prova',
    method: 'POST',
    headers: {
      "Content-type": "application/json",
    },
  };
  console.log("Call for Python: " + JSON.stringify(options))
  const reqPython = http.request(options, (res) => {
    let data = [];
    const headerDate = res.headers && res.headers.date ? res.headers.date : 'no response date';
    console.log('Status Code:', res.statusCode);
    console.log('Date in Response header:', headerDate);

    // A chunk of data has been received.
    res.on('data', (chunk) => {
      data.push(chunk);
    });

    // The whole response has been received. Print out the result.
    res.on('end', () => {
      console.log("Response Stringa: " + data.toString());
      //console.log("Response array di oggetti (json parse): " + JSON.parse(data)[0].name);

      //response to the request:
      //resOut.status(res.statusCode).send(data.toString());
      resOut.redirect('/test')
    });
  }).on('error', (err) => {
    console.log('Error: ', err.message);
  });
  reqPython.write(jsonData); // Write the JSON data to the request body
  reqPython.end();
})

app.get('/crea', cookieJwtAuth, async (req, res) => {
  const username = req.user['name'];
  fs.readdir('/usr/src/app/beancount_data/', (err, files) => {
    if (err) {
      console.error('Error reading folder:', err);
      return res.send(err);
    }
    const foundFiles = files.filter(file => file === `${username}.beancount`);
    if (foundFiles.length > 0) {
      console.log('File found:', path.join('/usr/src/app/beancount_data/', foundFiles[0]));
      // va visualizzato... oppure impedita la creazione, se il bottone si trova dopo il login?
      res.redirect('/test')
    } else {
      console.log('File not found. Calling Python to create it.');
      const jsonData = JSON.stringify({"user": username});
      const options = {
        hostname: 'python',
        port: 3003,
        path: '/crealo',
        method: 'POST',
        headers: {
          "Content-type": "application/json",
        },
      };
      const reqPython = http.request(options, (innerRes) => {
        let data = [];
        const headerDate = innerRes.headers && innerRes.headers.date ? innerRes.headers.date : 'no response date';
        console.log('Status Code:', innerRes.statusCode);
        console.log('Date in Response header:', headerDate);
        innerRes.on('data', (chunk) => {
          data.push(chunk);
        });
        innerRes.on('end', () => {
          console.log("Response Stringa: " + data.toString());
          res.redirect('/test')
        });
      }).on('error', (err) => {
        console.log('Error: ', err.message);
      });
      reqPython.write(jsonData);
      reqPython.end();
    }
  })
})

//https://stackoverflow.com/questions/23100132/using-nano-auth-correctly
app.get('/test', cookieJwtAuth, async (req, res) => {
  //let doc = await couch.session()
  //console.log('utente è autenticato?? ' + JSON.stringify(doc))
  //console.log('cookies: ' + JSON.stringify(req.cookies.session))

  const environment = {
    title: 'Docker with Nginx and Express',
    node: process.env.NODE_ENV,
    instance: process.env.INSTANCE,
    port: process.env.PORT,
    user: req.user.name,
    report: null
  };

  const filePath = `/usr/src/app/beancount_data/${req.user['name']}.beancount`;
  const fileExists = fs.existsSync(filePath);

  fs.readFile('/usr/src/app/beancount_data/test1.txt', 'utf8', (err, inputD) => {
    if (err) { console.error(err); throw err; }
    console.log('Leggo: ' + inputD.toString());
    environment.title = inputD;

    if (fileExists) {
      const command = `bean-report ${filePath} balances`;
      /*execSync(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`Errore durante esecuzione di Beancount: ${error.message}`);
          return;
        }
        if (stderr) {
          console.error(`Errore da Beancount: ${stderr}`);
        }
        //console.log(`Output Beancount: \n${stdout}`);
        console.log('Output: ' + stdout.toString());
        environment.report = stdout;
        console.log('secondo testtttt: ' + environment.report)
      })*/
      let eee = execSync(command);
      console.log('Report: ' + eee); //JSON.stringify(eee)
      environment.report = eee;
    }

    res.render('test', { environment });
  })

  console.log('at the end (ma non è la fine...): ' + environment.title);
});
//res.sendFile(path.join(__dirname,'public','test.html'));








/**
 * ROUTE UTILS o TESTs
 */


// TEST NON FUNZIONANTE
app.get('/duplicati', (req, res) => {
  const options = {
    hostname: 'python',
    port: 3003,
    path: '/duplicati',
    method: 'GET'
  };
  http.request(options, (innerRes) => {
    let data = [];
    const headerDate = innerRes.headers && innerRes.headers.date ? innerRes.headers.date : 'no response date';
    console.log('Status Code:', innerRes.statusCode);
    console.log('Date in Response header:', headerDate);
    innerRes.on('data', (chunk) => {
      data.push(chunk);
    });
    innerRes.on('end', () => {
      console.log("Response Stringa: " + data.toString());
      res.redirect('/duplicat')
    });
  }).on('error', (err) => {
    console.log('Error: ', err.message);
  }).end();
})

app.get('/pp', cookieJwtAuth, (req, res) => {
  res.send('sei proprio tu!!!')
});

app.get('/ttt', (req, res) => {
  const environment = {
    title: 'Docker with Nginx and Express',
    node: process.env.NODE_ENV,
    instance: process.env.INSTANCE,
    port: process.env.PORT
  };

  res.render('index', { environment });
});

// https://stackoverflow.com/questions/62976160/how-can-i-send-put-request-to-backend-through-ejs-template-without-using-form


app.get('/all_dbs', async (req, res) => {
  couch.auth(process.env.COUCHDB_USER, process.env.COUCHDB_PASSWORD, (err, body, headers) => {
    if (err) {
      res.send('Error authenticating with CouchDB: ', err.message);
    } else {
      // Successfully authenticated, pass the CouchDB instance to the callback function
      couch.db.list(function (err, allDbs) {
        if (err) {
          console.log('Error fetching database list:', err.message);
          res.status(err.status).send('Error fetching database list');
        } else {
          console.log('List of all databases:', allDbs);
          res.send('List of all databases: ' + allDbs.join(', '));
        }
      });
    }
  });

  /*
  // USING HTTP module (less secure for credentials)
  const credentials = Buffer.from(process.env.COUCHDB_USER + ":" + process.env.COUCHDB_PASSWORD).toString('base64');
  const options = {
    hostname: 'couchdb',
    port: 5984,
    path: '/_all_dbs',
    method: 'GET',
    headers: {
      'Authorization': `Basic ${credentials}`
    }
  };
  http.request(options, (innerRes) => {
    let data = [];
    const headerDate = innerRes.headers && innerRes.headers.date ? innerRes.headers.date : 'no response date';
    console.log('Status Code:', innerRes.statusCode);
    console.log('Date in Response header:', headerDate);
    innerRes.on('data', (chunk) => {
      data.push(chunk);
    });
    innerRes.on('end', () => {
      console.log("Response Stringa: " + data.toString());
      res.redirect('/test')
    });
  }).on('error', (err) => {
    console.log('Error: ', err.message);
  }).end();*/
})

app.get('/all_users', async (req, res) => {
  try {
    await couch.auth(process.env.COUCHDB_USER, process.env.COUCHDB_PASSWORD);
    const result = await couch.use('_users').list();
    res.send(result);
  } catch (error) {
    console.log('Error:', error.message);
    res.status(error.statusCode || 500).send('An error occurred while fetching users.');
  }
})


app.get('/provaaa', (req, res) => {
  try {
    const options = {
      hostname: 'python',
      port: 3003,
      path: '/provaaa',
      method: 'GET'
    };
    http.request(options, (innerRes) => {
      let data = [];
      const headerDate = innerRes.headers && innerRes.headers.date ? innerRes.headers.date : 'no response date';
      console.log('Status Code:', innerRes.statusCode);
      console.log('Date in Response header:', headerDate);
      innerRes.on('data', (chunk) => {
        data.push(chunk);
      });
      innerRes.on('end', () => {
        console.log("Response Stringa: " + data.toString());
        res.redirect('/test')
      });
    }).on('error', (err) => {
      console.log('Error: ', err.message);
    }).end();
  } catch (error) {
    console.log(error.message);
    res.send(error.message)
  }
})


app.listen(process.env.PORT, () => {
  winston.info(`NODE_ENV: ${process.env.NODE_ENV}`);
  winston.info(`INSTANCE: ${process.env.INSTANCE}`);
  winston.info(`EXPRESS: ${process.env.PORT}`);
});
