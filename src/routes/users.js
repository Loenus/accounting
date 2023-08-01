const jwt = require('jsonwebtoken');
const { cookieJwtAuth } = require('./cookieJwtAuth');

module.exports = function build(couch) {
  const router = require('express').Router();
  const userDB = couch.use('_users');

  router.post('/add', async (req, res) => {
    const { username, password } = req.body;
    try {
      // mi devo identificare come admin (o membro) per aggiungere un user in _users
      await couch.auth(process.env.COUCHDB_USER, process.env.COUCHDB_PASSWORD);

      let result = await couch.request({
        'method': 'PUT',
        'path': '_users/org.couchdb.user:' + username, // _id = org.couchdb.user:' + username
        'body': {
          'name': username, 
          'password': password, 
          'roles': [], 
          //"realname": 'first' + " " + 'last',
          'type': 'user'
        }
      });
      console.log('Risposta all\'aggiunta dell\'utente: ' +JSON.stringify(result));

      const user = await couch.auth(username, password);
      const token = jwt.sign(user, process.env.JWT_SECRET, {expiresIn: '10m'});
      res.cookie('token', token, {
        httpOnly: true
      });

      res.redirect('/test');

      /*let doc = await couch.session()
      console.log("permessi prima (admin): " + JSON.stringify(doc))
      await couch.auth(nome, password);
      doc = await couch.session()
      console.log("permessi dopo (user): " + JSON.stringify(doc))

      couch.auth(nome, password, async (err, data, header) => {
      if (err) {
          console.log(err);
      } else {
          console.log('AOAOAO: ' + JSON.stringify(header))
          console.log('session: ' + header['set-cookie'])
          res.cookie('session', header['set-cookie']);
          res.redirect('/test');
      }
      })*/

      // creare un db in cui aggiungere -> nome utente (identificativo) e nome file associato
    } catch (error) {
      if (error.message == 'Document update conflict.') {
        res.render('registration.ejs', {warning: `utente '${username}' già esistente!`});
      } else {
        console.log('Error:', error.message);
        res.status(error.statusCode || 500).send('An error occurred: ' + error.reason);
      }
    }
  });

  router.post('/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await couch.auth(username, password);
      delete password;

      const token = jwt.sign(user, process.env.JWT_SECRET, {expiresIn: '10m'});

      res.cookie('token', token, {
        httpOnly: true
      });

      return res.redirect('/test');
    } catch (error) {
      console.log('Error: ' + JSON.stringify(error));
      return res.send(error.message + `<a class="nav-link" href="/" id="landingPage">landingPage</a>`);
    }
  });

  router.post('/delete', cookieJwtAuth, async (req, res) => {
    const userId = req.user['name'];
    
    // TODO: aggiungere un livello di sicurezza: chiedere la password? O un <dialog> di conferma almeno..
    
    await couch.auth(process.env.COUCHDB_USER, process.env.COUCHDB_PASSWORD);
    try {
      const user = await userDB.get(`org.couchdb.user:${userId}`);
      await userDB.destroy(user._id, user._rev);
      res.clearCookie('token');
      res.redirect('/');
    } catch (error) {
      if (error.message == 'deleted') {
        console.log('Account già eliminato e non più presente su db..');
        res.clearCookie('token');
        res.redirect('/');
      } else {
        console.log(error.message);
        throw new Error('Failed to delete the user: ' + error.message);
      }
    }
  });

  router.post('/changePass', cookieJwtAuth, async (req, res) => {
    const userId = req.user['name'];
    const newPass = req.body.newPass;
    console.log(`Aggiorna ${userId} con la nuova password ${newPass}`);
    await couch.auth(process.env.COUCHDB_USER, process.env.COUCHDB_PASSWORD);
    try {
      const user = await userDB.get(`org.couchdb.user:${userId}`);
      user.password = newPass;
      await userDB.insert(user);
      res.redirect('/test');
    } catch (error) {
      res.status(500).json({ error: 'Failed to change the password.', message: error.message });
    }
  });

  return router;
};


// se route singola:
/*
module.exports = (couch) => {
    return async (req, res) => {
        // eseguisce la route, in index -> app.post('/test', loginRoute);
    }
}
*/