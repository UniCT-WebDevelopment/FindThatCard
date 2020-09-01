var express = require('express');
var router = express.Router();

const mongoose = require('mongoose');


mongoose.connect('mongodb://localhost:27017/findthatcard');
var db = mongoose.connection;
db.on('error', console.log.bind(console, "connection error"));
db.once('open', function (callback) {
  console.log("connection succeeded");
})
/* GET home page. */
router.get('/', function (req, res, next) {
  /* res.render('index', { title: 'Express' }); */

  res.json({ username: 'Flavio' })
});



router.post('/cardlist', (req, res) => {
  const projection = { "_id": 0 };
 
  let query = {}

  db.collection('selling-cards').find(query, projection)
    .sort({ name: 1 })
    .toArray()
    .then(items => {
      console.log(`Successfully found ${items.length} documents.`)

      return res.status(200).send(JSON.stringify({
        code: 200,
        error: false,
        message: 'Payment succefull',
        items: items
      }));
    })


});



router.post('/ownercards', (req, res) => {
  const projection = { "_id": 0 };
  console.log(req.body.username)
  let query = {username: req.body.username}

  db.collection('selling-cards').find(query, projection)
    .sort({ name: 1 })
    .toArray()
    .then(items => {
      console.log(`Successfully found ${items.length} documents.`)

      return res.status(200).send(JSON.stringify({
        code: 200,
        error: false,
        message: 'List ok',
        items: items
      }));
    })


});

router.post('/searchcardlist', (req, res) => {

  var data = {
    "brand": req.body.data.brand,
    "lower": req.body.data.min_price,
    "hight": req.body.data.max_price,
    "name": req.body.data.name,
    "date": new Date().toISOString().
      replace(/T/, ' ').      // replace T with a space
      replace(/\..+/, ''),
    "username": req.body.data.username,

  }

  db.collection('search_log').insertOne(data, function (err, collection) {
    if (err) throw err;
    console.log("Record inserted Successfully");

  });

  const projection = { "_id": 0 };

  let query = {
    'price': {
      $gte: parseFloat(data.lower), $lte: parseFloat(data.hight)
    },

    "name": { '$regex': new RegExp(data.name, 'i') }
  }
  if (data.brand != 'All') {
    query = {
      brand: data.brand,

    }
  }


  db.collection('selling-cards').find(query, projection)
    .sort()
    .toArray()
    .then(items => {
      console.log(`Successfully found ${items.length} documents.`)

      return res.status(200).send(JSON.stringify({
        code: 200,
        error: false,
        message: 'Payment succefull',
        items: items
      }));
    })


});
module.exports = router;
