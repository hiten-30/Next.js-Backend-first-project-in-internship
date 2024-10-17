import express, {Request, Response, NextFunction} from 'express';
const data = require('./data.json');


const validateLogin = (req: Request, res: Response) =>{
   const username = req.body.username;
   const password = req.body.password;
//    const username = 'vipulrathod';
//    const password = 'Welcome@123';
   var validLogin = false;


   for (let i = 0; i <= data.users.length; i++ ) {
      
    if (username === data.users[i].username && password === data.users[i].password) {
        validLogin = true;
        res.json({message: 'Login Success', username: username, password: password});
        break;
    } 
   }}
module.exports = {
   validateLogin
}
