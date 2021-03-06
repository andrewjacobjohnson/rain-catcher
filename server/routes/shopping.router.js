const express = require('express');
const pool = require('../modules/pool.js');
const calculations = require('../modules/addComponents.js');
const router = express.Router();
const authenticated = require('../models/authenticated')


/******************************************/
/*              GET REQUESTS              */
/******************************************/

router.get('/all', authenticated, (req, res) => {
    const queryText = 'SELECT * FROM shoppinglist ORDER BY "name"';

    pool.query(queryText)
        .then((results) => {
        res.send(results.rows);
    })
    .catch((error) => {
        console.log('Error on GET shoppinglist request', error);
        res.sendStatus(500);
    });

});

router.get('/list/:id', authenticated, (req, res) => {
    let queryString = 'SELECT id FROM shopping_list WHERE id = $1';
    pool.query(queryString, [req.params.id])
        .then(result => {
            res.send(result);
        })
        .catch(err => {
            console.log('hit error on getting object', err);
            res.sendStatus(500);
        });
})//end get


router.get('/components/:id', authenticated, (req, res) => {

  let queryText = `
  SELECT modules_shopping.shopping_id, components_modules.pieces_per_kit, modules_shopping.quantity, shoppinglist.name AS shoppinglist_name,
  shopping_components.ordered, shopping_components.in_house, components.*, shopping_components.id AS ordered_inHouse_id
  FROM components_modules
  JOIN modules_shopping ON modules_shopping.module_id = components_modules.module_id
  JOIN shoppinglist ON shoppinglist.id = modules_shopping.shopping_id
  JOIN components ON components_modules.component_id = components.id
  LEFT OUTER JOIN shopping_components ON shopping_components.component_id = components.id
  AND shopping_components.shopping_id = modules_shopping.shopping_id
  WHERE modules_shopping.shopping_id = $1;
  `;

  pool.query(queryText, [req.params.id])
    .then((results) => {
        // res.send(results.rows);
        res.send(calculations.addComponents(results.rows));
    })
    .catch(err => {
        console.log('Error getting shopping list components', err);
        res.sendStatus(500);
    });

});


/******************************************/
/*             POST REQUESTS              */
/******************************************/
router.post('/', authenticated, (req, res) => {
    let queryString = 'INSERT INTO shoppinglist (name, date, user_created_by) VALUES ($1, $2, $3) RETURNING id';
    pool.query(queryString, [req.body.name, req.body.date, req.body.user_created_by])
        .then(result => {
            let queryString = `
            SELECT id
            FROM shoppinglist
            WHERE name = '${req.body.name}';`
            pool.query(queryString)
                .then(result => {
                    res.send(result);
                })
                .catch(err => {
                    console.log('hit error on posting of new Item', err);
                    res.sendStatus(500);
                });
        })//end then
        .catch(err => {
            console.log('hit error on posting of new Item', err);
            res.sendStatus(500);
        });
});

  //Start of add shoppinglist junction function
router.post('/shoppinglist/:id', authenticated, (req, res) => {
    let shoppinglistId = req.params.id;
    let modulesAdded = req.body;

    for (let i = 0; i < modulesAdded.length; i++) {
        let queryText = `
            INSERT INTO modules_shopping (shopping_id, module_id, quantity)
            VALUES (${shoppinglistId}, ${modulesAdded[i].id}, ${modulesAdded[i].quantity});`;

        pool.query(queryText)
            .then((results) => {
                // success
            })
            .catch((error) => {
                console.log('Error registering user: ', error);
            });
    }

    res.sendStatus(200);

});  //End of add shoppinglist junction function

router.post('/addOrderedInHouse', authenticated, (req, res) => {
  let item = req.body;

  let queryText = `
  INSERT INTO shopping_components ("shopping_id", "component_id", "ordered", "in_house")
  VALUES ($1, $2, $3, $4)`;

  pool.query(queryText, [item.shopping_id, item.id, item.ordered, item.in_house])
    .then((results) => {
      res.sendStatus(201);
    })
    .catch((error) => {
      console.log('Error adding component to shopping_components', error);
      res.sendStatus(500);
    });

});

/******************************************/
/*              PUT REQUESTS              */
/******************************************/

router.put('/updateOrderedInHouse', authenticated, (req, res) => {
  let item = req.body;
  let queryText = `UPDATE shopping_components SET ordered = $1, in_house = $2 WHERE id = $3`;

  pool.query(queryText, [item.ordered, item.in_house, item.ordered_inhouse_id])
    .then((results) => {
      res.sendStatus(201);
    })
    .catch((error) => {
      console.log('Error updating component in shopping_components', error);
      res.sendStatus(500);
    });

});


module.exports = router;
