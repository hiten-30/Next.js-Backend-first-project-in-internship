import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { MongoClient } from "mongodb";
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const client = new MongoClient("mongodb://localhost:27017/");
const app = express();
const PORT = 8000;

app.use(express.json());
app.use(bodyParser.json());
app.use(cors());

// MongoDB connection
const MongoConnect = async() =>{
    await client.connect();
}

// Login validation
const loginValidate = async (req: Request, res: Response) =>{

    const {username, password} = req.body;

    await MongoConnect();

    const db = client.db("Hiten'sDB");
    const userCollection = db.collection("users");

    // Check user exists 
    const userExists = await userCollection.findOne({username});

    // If user exists and password matched
    if( userExists){
        const isValidPassword = await bcrypt.compare(password, userExists.password)
        if(isValidPassword){
            const token = await jwt.sign({userId: userExists._id, username: userExists.username}, "your_jwt_secret", {expiresIn: "1h"});
           return res.status(201).json({ message: "Login Success", username, token });
        }
    else {
       return res.status(401).json({message: "Invalid username & password"});
    }
   }
};

// New user registration (SignUp) 
const userRegister = async (req: Request, res: Response) =>{

    const {username, password} = req.body;

    await MongoConnect();

    // Create Database and collection
    const db = client.db("Hiten'sDB");
    const userCollection = db.collection("users");

    // Check if user already exists
    const userExisted = await userCollection.findOne({username});
    if(userExisted){
       return  res.json({message: "user already exists"});
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password,10);

    //Insert new user in to the collection
    const newUser = await userCollection.insertOne({username,password: hashedPassword});
    res.json({message: "User Registrated successfully", userId: newUser.insertedId})
};

app.post("/login", async (req: Request, res: Response)=>{
    await loginValidate(req,res);
});


app.post("/register", async (req: Request, res: Response)=>{
    await userRegister(req,res);
});

app.get("/", async (req: Request, res: Response, next: NextFunction) =>{

    // const {username, password} = req.query;

    // await MongoConnect();

    // // Create Database and collection
    // const db = client.db("Hiten'sDB");
    // const userCollection = db.collection("users");

    // // Check if user already exists
    // const userExisted = await userCollection.findOne({username});
    // if(userExisted){
    //    return  res.json({message: "user already exists"});
    // }

    // //Insert new user in to the collection
    // const newUser = await userCollection.insertOne({username: username, password: password});
    // res.json({message: "User Registrated successfully", userId: newUser.insertedId})

    const {username, password} = req.query;

    await MongoConnect();

    const db = client.db("Hiten'sDB");
    const userCollection = db.collection("users");

//   // Check if the username already exists
//   const userExists = await userCollection.findOne({ username });
//   if (userExists) {
//    return res.status(409).json({ message: "Username already exists." });
//   }

//   // Insert the new user into the collection
//   const newUser = { username, password };
//   const result = await userCollection.insertOne(newUser);
//   res.status(201).json({ message: "User registered successfully", userId: result.insertedId });

 // fetch All users from collection
  const fetchUser = await userCollection.find({}).toArray();
  res.send(fetchUser);

// // // Update the user
// // const updateUser = await userCollection.updateOne({username}, {$set: { password}});
// // res.json({message: "user Updated successful", userId: updateUser.upsertedCount});

// //// delete user from collection
// // const deleteUser = await userCollection.deleteOne({username});
// // res.json({message: "deteled successful",deleteUser})

});


// Error handling middleware
app.use((err: Error, req: Request, res: Response ) =>{
    console.error(err.stack);
    res.status(500).send("Something broke");
});

// Start the server
app.listen(PORT, () =>{
    console.log(`Server is running on http://localhost:${PORT}`);
});
