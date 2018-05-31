const express = require('express');
var router = express.Router();
const gravatar = require('gravatar');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const keys = require('../../config/keys');
const passport = require('passport');

// Load Input Validation
const validateRegisterInput = require('../../validation/register');
const validateLoginInput = require('../../validation/login');


//Load User Model
const User = require('../../models/User');

// @route GET api/users/test
// @desc Tests post route
// @access Public
router.get("/test", (req, res) =>
    res.json({
        msg: "Users Works"
    })
);

// @route post api/users/register
// @desc Register route
// @access Public

router.post("/register", (req, res) => {
    // pull out errors from validation by destructured from it
    const {
        errors,
        isValid
    } = validateRegisterInput(req.body);

    //check validation
    if (!isValid) {
        return res.status(400).json(errors);
    }

    User.findOne({
        email: req.body.email
    }).then(user => {
        if (user) {
            errors.email = 'Email already exists'
            return res.status(400).json({
                errors
            });
        } else {
            const avatar = gravatar.url(req.body.email, {
                s: "200", //size
                r: "pg", //rating
                d: "mm" //default
            });

            const newUser = new User({
                name: req.body.name,
                email: req.body.email,
                avatar: avatar,
                password: req.body.password
            });

            bcrypt.genSalt(10, (err, salt) => {
                bcrypt.hash(newUser.password, salt, (err, hash) => {
                    if (err) throw err;
                    newUser.password = hash;
                    newUser
                        .save()
                        .then(user => res.json(user))
                        .catch(err => console.log(err));
                });
            });
        }
    });
});

// @route GET api/users/login
// @desc Login User / Returning JWT Token
// @access Public
router.post("/login", (req, res) => {

    // pull out errors from validation by destructured from it
    const {
        errors,
        isValid
    } = validateLoginInput(req.body);

    //check validation
    if (!isValid) {
        return res.status(400).json(errors);
    }


    const email = req.body.email;
    const password = req.body.password;

    //Find user by email
    User.findOne({
        email
    }).then(user => {
        //Check for user
        if (!user) {
            errors.email = 'User not found';
            return res.status(404).json(errors);
        }

        //Check Password
        bcrypt.compare(password, user.password).then(isMatch => {
            if (isMatch) {
                // User Matched

                const payload = {
                    id: user.id,
                    name: user.name,
                    avatar: user.avatar
                }; //Create JWT Payload

                //Sign Token using payload and key
                jwt.sign(
                    payload,
                    keys.secretOrKey, {
                        expiresIn: 3600
                    },
                    (err, token) => {
                        res.json({
                            success: true,
                            token: 'Bearer ' + token
                        }); //returns token with bearer in the front
                    }
                );
            } else {
                errors.password = 'Password Incorrect'
                return res.status(400).json({
                    password: "Password incorrect"
                });
            }
        });
    });
});



// @route GET api/users/current
// @desc  Return current user
// @access Private

router.get('/current', passport.authenticate('jwt', {
    session: false
}), (req, res) => {
    res.json({
        id: req.user.id,
        name: req.user.name,
        email: req.user.email
    });
});



module.exports = router;