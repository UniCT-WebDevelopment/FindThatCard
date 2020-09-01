
const { User, validate } = require('../models/user');
const express = require('express');
const router = express.Router();
var { nanoid } = require("nanoid");
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
var multer = require('multer')
const request = require('request')
var { ObjectId } = require('mongodb');

mongoose.connect('mongodb://localhost:27017/findthatcard');
var db = mongoose.connection;
db.on('error', console.log.bind(console, "connection error"));
db.once('open', function (callback) {
  console.log("connection succeeded");
})

router.post('/signup', async (req, res) => {
  var username = req.body.username;
  var email = req.body.email;
  var pass = req.body.password;
  let user = await db.collection('registered').findOne({ email: email });
  let user2 = await db.collection('registered').findOne({ username: username });
  if (user) {
    return res.status(400).send(JSON.stringify({
      code: 400,
      error: true,
      message: 'This email is already used'
    }));
  }
  else if (user2) {
    return res.status(400).send(JSON.stringify({
      code: 400,
      error: true,
      message: 'This username is already used'
    }));
  }
  else {
    var data = {
      "username": username,
      "email": email,
      "password": pass,
      "balance": 0,
      "address": '',
      "phone": '',
      "transactions": []
    }
    console.log(data)
    db.collection('registered').insertOne(data, function (err, collection) {
      if (err) throw err;
      console.log("Record inserted Successfully");

    });
    return res.status(200).send(JSON.stringify({
      code: 200,
      message: 'ok'
    }));
  }
});

router.post('/login', async (req, res) => {
  var username = req.body.username;
  var pass = req.body.password;
  let user = await db.collection('registered').findOne({ username: username });
  console.log(username, pass)
  if (user) {
    if (user.username == username && user.password == pass) {
      console.log('loggato con successo')
      return res.status(200).send(JSON.stringify({
        code: 200,
        error: false,
        message: 'Logged In',
        user: user,
        token: nanoid()
      }));
    }
    else {
      return res.status(400).send(JSON.stringify({
        code: 400,
        error: true,
        message: 'Wrong credentials'
      }));
    }
  }
  else {
    return res.status(400).send(JSON.stringify({
      code: 400,
      error: true,
      message: 'This username does not exist'
    }));
  }

});

router.post('/detail', async (req, res) => {
  var username = req.body.username;

  let user = await db.collection('registered').findOne({ username: username });

  if (user) {
    if (user.username == username) {

      return res.status(200).send(JSON.stringify({
        code: 200,
        error: false,
        message: 'Logged In',
        user: user,
        token: nanoid()
      }));
    }
    else {
      return res.status(400).send(JSON.stringify({
        code: 400,
        error: true,
        message: 'Wrong credentials'
      }));
    }
  }
  else {
    return res.status(400).send(JSON.stringify({
      code: 400,
      error: true,
      message: 'This username does not exist'
    }));
  }

});


router.post('/refill', async (req, res) => {
  var username = req.body.username;

  let user = await db.collection('registered').findOne({ username: username });

  if (user) {
    let transactions = []
    if (user.transactions) { transactions = user.transactions }
    transactions.push({
      "date": new Date().toISOString().
        replace(/T/, ' ').      // replace T with a space
        replace(/\..+/, ''),
      "amount": req.body.money,
      "status": "paid",
      "order_id": req.body.payment_data.orderID
    });
    if (user.username == username) {
      db.collection('registered').updateOne({ username: username }, { $set: { "balance": user.balance + req.body.money } })
      db.collection('registered').updateOne({ username: username }, { $set: { "transactions": transactions } })
      return res.status(200).send(JSON.stringify({
        code: 200,
        error: false,
        message: 'Payment succefull',
        user: user,
      }));
    }
    else {
      return res.status(400).send(JSON.stringify({
        code: 400,
        error: true,
        message: 'Error'
      }));
    }
  }
  else {
    return res.status(400).send(JSON.stringify({
      code: 400,
      error: true,
      message: 'Error'
    }));
  }

});
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    req.body.data = JSON.parse(req.body.data)

    fs.mkdir(path.join('public/SellingCards', req.body.data.username), (err) => {
      if (err) {
        return console.error(err);
      }
      console.log('Directory created successfully!');
    })
    req.body.data['path'] = path.join('public/SellingCards', req.body.data.username)
    cb(null, path.join('public/SellingCards', req.body.data.username))
  },
  filename: function (req, file, cb) {
    req.body.data['filename'] = Date.now() + '-' + file.originalname
    cb(null, Date.now() + '-' + file.originalname)
  },


})
var upload = multer({ storage: storage }).single('file')

router.post('/newcard', (req, res) => {


  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(500).json(err)
    } else if (err) {
      return res.status(500).json(err)
    }

    db.collection('selling-cards').insertOne(req.body.data, function (err, collection) {
      if (err) throw err;
      console.log("Record inserted Successfully");

    });
    return res.status(200).send(JSON.stringify({
      code: 200,
      error: false,
      message: 'Card added successfully',
    }));

  })

});

router.post('/wishlist', async (req, res) => {
  var username = req.body.username;

  let user = await db.collection('registered').findOne({ username: username });

  if (user) {
    /* let wishlist = []
    if (user.wishlist) { wishlist = user.wishlist } */

    db.collection('registered').update(
      { username: username },
      { $addToSet: { wishlist: req.body.data } }
    )
    /*   wishlist.push(
  
        req.body.data
      ); */

    /* db.collection('registered').updateOne({ username: username }, { $set: { "wishlist": wishlist } }) */
    return res.status(200).send(JSON.stringify({
      code: 200,
      error: false,
      message: 'Card added to wishlist',
      user: user,
    }));
  }
  else {
    return res.status(400).send(JSON.stringify({
      code: 400,
      error: true,
      message: 'Error'
    }));
  }

});


router.post('/remove-wishlist', async (req, res) => {
  var username = req.body.username;

  let user = await db.collection('registered').findOne({ username: username });

  if (user) {

    await db.collection('registered').update(
      { username: username },
      { $pull: { wishlist: req.body.data } }
    )
    var new_user = await db.collection('registered').findOne({ username: username });
    return res.status(200).send(JSON.stringify({
      code: 200,
      error: false,
      message: 'Card removed from wishlist',
      user: new_user,
    }));
  }
  else {
    return res.status(400).send(JSON.stringify({
      code: 400,
      error: true,
      message: 'Error'
    }));
  }

});

router.post('/buy', async (req, res) => {
  var username = req.body.username;

  let user = await db.collection('registered').findOne({ username: username });

  if (user) {
    console.log(user.balance, req.body.data.price)
    if (user.username != req.body.data.username) {
      if (user.balance > req.body.data.price) {
        var new_balance = user.balance - req.body.data.price
        db.collection('registered').updateOne(
          { "username": username },
          { $set: { "balance": new_balance } }
        )
        var site_percentage = (req.body.data.price * 5) / 100
        db.collection('registered').updateOne(
          { "username": req.body.data.username },
          { $inc: { "balance": req.body.data.price - site_percentage } }
        )
        db.collection('registered').update(
          { username: username },
          { $addToSet: { buyed: req.body.data } }
        )
        db.collection('selling-cards').remove({ filename: req.body.data.filename })
        let utente = await db.collection('registered').findOne({ username: username });
        if (utente.wishlist != undefined) {
          let wishlist = utente.wishlist
          const filterWishlist = wishlist.filter((item) => item.filename !== req.body.data.filename);
          console.log(filterWishlist)
          db.collection('registered').updateOne(
            { "username": username },
            { $set: { "wishlist": filterWishlist } }
          )
        }
        let allCards = await db.collection('selling-cards').find().sort()
          .toArray();
        var data = {
          "buyer": username,
          "seller": req.body.data.username,
          "card": req.body.data,
          "amount": req.body.data.price,
          "ship_to": user.address,
          "date": new Date().toISOString().
            replace(/T/, ' ').      // replace T with a space
            replace(/\..+/, ''),
        }
        db.collection('orders').insertOne(data, function (err, collection) {
          if (err) throw err;
          console.log("Record inserted Successfully");

        });
        return res.status(200).send(JSON.stringify({
          code: 200,
          error: false,
          message: 'Card buyed',
          user: user,
          cards: allCards
        }));
      }

      else {
        let allCards2 = await db.collection('selling-cards').find().sort()
          .toArray();
        return res.status(400).send(JSON.stringify({
          code: 400,
          error: true,
          message: 'Not enough balance',
          cards: allCards2
        }));
      }
    }
    else {
      return res.status(400).send(JSON.stringify({
        code: 400,
        error: true,
        message: "You can't buy tour own cards",

      }));
    }
  }
  else {
    let allCards3 = await db.collection('selling-cards').find().sort()
      .toArray();
    return res.status(400).send(JSON.stringify({
      code: 400,
      error: true,
      message: 'Error',
      cards: allCards3
    }));
  }

});


router.get('/stats', async (req, res) => {
  var username = req.query.username;

  const projection = { "_id": 0 };
  let query = {
    "username": req.query.username
  }
  let logs = await db.collection('search_log').find(query, projection).sort()
    .toArray();

  var brandAll = 0
  var brandPokemon = 0
  var brandYugioh = 0
  var brandMagic = 0
  logs.forEach(element => {
    if (element.brand == 'All') brandAll = brandAll + 1
    else if (element.brand == 'Pokémon') brandPokemon = brandPokemon + 1
    else if (element.brand == 'Yugioh') brandYugioh = brandYugioh + 1
    else if (element.brand == 'Magic') brandMagic = brandMagic + 1

  });
  let Alllogs = await db.collection('search_log').find().sort()
    .toArray();

  var AllbrandAll = 0
  var AllbrandPokemon = 0
  var AllbrandYugioh = 0
  var AllbrandMagic = 0
  Alllogs.forEach(element => {
    if (element.brand == 'All') AllbrandAll = AllbrandAll + 1
    else if (element.brand == 'Pokémon') AllbrandPokemon = AllbrandPokemon + 1
    else if (element.brand == 'Yugioh') AllbrandYugioh = AllbrandYugioh + 1
    else if (element.brand == 'Magic') AllbrandMagic = AllbrandMagic + 1

  });
  let data = {
    'count': logs.length,
    'brandAll': brandAll,
    'brandPokemon': brandPokemon,
    'brandYugioh': brandYugioh,
    'brandMagic': brandMagic,
    'global': {
      'count': Alllogs.length,
      'brandAll': AllbrandAll,
      'brandPokemon': AllbrandPokemon,
      'brandYugioh': AllbrandYugioh,
      'brandMagic': AllbrandMagic,
    }
  }

  return res.status(200).send(JSON.stringify({
    code: 200,
    error: false,
    message: 'Card added to wishlist',
    stats: data,
  }));



});


router.post('/address', async (req, res) => {
  var username = req.body.username;
  let user = await db.collection('registered').findOne({ username: username });
  if (user) {
    db.collection('registered').updateOne({ username: username }, { $set: { "address": req.body.data } })
    let new_user = await db.collection('registered').findOne({ username: username });
    return res.status(200).send(JSON.stringify({
      code: 200,
      error: false,
      message: 'Address saved succefully',
      user: new_user,
    }));
  }
  else {
    return res.status(400).send(JSON.stringify({
      code: 400,
      error: true,
      message: 'Error'
    }));
  }

});


router.post('/remove-card', async (req, res) => {
  var username = req.body.username;
  let user = await db.collection('registered').findOne({ username: username });
  var card = await db.collection('selling-cards').findOne({ filename: req.body.data.filename })

  if (username == card.username || user.admin == true) {


    let removec = await db.collection('selling-cards').remove({ filename: req.body.data.filename })
    var cards = await db.collection('selling-cards').find().sort().toArray()
    var owner = await db.collection('selling-cards').find({ 'username': req.body.username }).sort().toArray();
    return res.status(200).send(JSON.stringify({
      code: 200,
      error: false,
      message: 'Card removed',
      items: cards,
      owner: owner
    }));
  }


});


router.post('/orders', async (req, res) => {
  var username = req.body.username;
  let orders_ad_seller = await db.collection('orders').find({ 'seller': username }).sort()
    .toArray();;
  let orders_ad_buyer = await db.collection('orders').find({ 'buyer': username }).sort()
    .toArray();;


  return res.status(200).send(JSON.stringify({
    code: 200,
    error: false,
    message: 'orders_ad_seller',
    orders: {
      'as_seller': orders_ad_seller,
      'as_buyer': orders_ad_buyer
    }
  }));



});

router.post('/confirm-received', async (req, res) => {
  var username = req.body.username;
  var id = req.body.id

  var that_order = await db.collection('orders').findOne(
    { "_id": ObjectId(req.body.id) });
  console.log(that_order)
  if (that_order.status != 'received') {

    if (req.body.status != '' && req.body.status != undefined) {
      db.collection('orders').findOneAndUpdate(
        { "_id": ObjectId(req.body.id) },
        { $set: { "status": req.body.status } }
      )

      let orders_ad_seller = await db.collection('orders').find({ 'seller': username }).sort()
        .toArray();;
      let orders_ad_buyer = await db.collection('orders').find({ 'buyer': username }).sort()
        .toArray();;


      return res.status(200).send(JSON.stringify({
        code: 200,
        error: false,
        message: 'Order status modified: ' + req.body.status,
        orders: {
          'as_seller': orders_ad_seller,
          'as_buyer': orders_ad_buyer
        }
      }));
    }
    else {
      return res.status(400).send(JSON.stringify({
        code: 400,
        error: true,
        message: 'Not valid status',

      }));
    }
  }
  else {
    return res.status(400).send(JSON.stringify({
      code: 400,
      error: true,
      message: 'Cannot modify order status',

    }));
  }

});


module.exports = router;