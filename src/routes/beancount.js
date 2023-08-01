const router = require('express').Router();

router.get('/test', (req, res) => {
  res.send('test all\'interno di beancount. Funzionante!!!');
});

module.exports = router;