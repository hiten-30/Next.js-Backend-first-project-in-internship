// import express, { Request, Response, NextFunction } from "express";
// const cors = require("cors");
// const { validateLogin } = require("./middleware");
// const bodyParser = require("body-parser");

// import { MongoClient } from "mongodb";
// const client = new MongoClient("mongodb://localhost:27017/");

// const app = express();
// const PORT = 8000;

// app.use(express.json());
// app.use(bodyParser.json());
// app.use(cors());

// const MongoConnect = async () => {
//   await client.connect();
// };

// app.get("/", async (req: Request, res: Response) => {
//   const { Name, Password } = req.query;
//   MongoConnect();

//   // Create database
//   const db = client.db("Hiten'sDB");

//   // Create Collection (Table)
//   const userCollection = db.collection("users");

//   //Insert data in Collection Using INSERTONE
// //   const userResult = await userCollection.insertOne({
// //     Name: Name,
// //     Password: Password,
// //   });
// //   res.send(userResult.insertedId);

//   //Insert data in Collection using INSERTMANY
// //   const userRecords = [
// //    {Name: 'Test 1', Password: '123456'},
// //    {Name: 'Test 2', Password: '654321'}
// // ]
// // const userResults = await userCollection.insertMany(userRecords);
// // res.send(userResults.insertedIds);

//   //Select data from Collection in form of Multiple Data
//    const document = await userCollection.find({}).toArray();
//    res.send(document);


//    //Select data from Collection in form of Single Data
//    // const document = await userCollection.findOne({Name:"Test 1"});
//    // res.send(document);

// });



// // Login request Validate
// app.get("/login", (req: Request, res: Response) => {
//   res.send(validateLogin(req, res));
 
// });

// // Error Handling
// app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
//   console.error(err.stack);
//   res.status(500).send("Something Broke!");
// });

// app.listen(PORT, () => {
//   console.log(`Server is running on http://localhost:${PORT}`);
// });

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { MongoClient } from "mongodb";

const client = new MongoClient("mongodb://localhost:27017/");
const app = express();
const PORT = 8000;

app.use(express.json());
app.use(bodyParser.json());
app.use(cors());

// MongoDB connection
const MongoConnect = async () => {
    await client.connect();
};

// Login validation function
const validateLogin = async (req: Request, res: Response) => {
  const username = req.body.username;
  const password = req.body.password;

  await MongoConnect();

  const db = client.db("Hiten'sDB");
  const userCollection = db.collection("users");

  // Check if the user exists and if the password matches
  const user = await userCollection.findOne({ username });

  if (user && user.password === password) {
    res.json({ message: "Login Success", username });
  } else {
    res.json({ message: "Invalid Username or Password" });
  }
};

// Register new user function
const registerUser = async (req: Request, res: Response) => {
  const { username, password } = req.body;

  await MongoConnect();

  // Create database and collection
  const db = client.db("Hiten'sDB");
  const userCollection = db.collection("users");

  // Check if the username already exists
  const existingUser = await userCollection.findOne({ username });
  if (existingUser) {
    return res.status(409).json({ message: "Username already exists." });
  }

  // Insert the new user into the collection
  const newUser = { username, password };
  const result = await userCollection.insertOne(newUser);

  // Respond with success message and inserted ID
  res.status(201).json({ message: "User registered successfully", userId: result.insertedId });
};

// Route to get all users from MongoDB
app.get("/", async (req: Request, res: Response) => {
  const {username, password}  = req.query;

  await MongoConnect();


  const db = client.db("Hiten'sDB");
  const userCollection = db.collection("users");

   // Check if the user exists and if the password matches
  //  const user = await userCollection.findOne({ username });

  //  if (user && user.password === password) {
  //    return res.json({ message: "Login Success", username });
  //  } else {
  //    return res.status(401).json({ message: "Invalid Username or Password" });
  //  }

  // const documents = await userCollection.find({}).toArray();
  // res.send(documents);

  // /Insert data in Collection Using INSERTONE
  // const userResult = await userCollection.insertOne({
  //   username: username,
  //   password: password,
  // });
  // res.send(userResult.insertedId);

    // Check if the username already exists
    const userExists = await userCollection.findOne({ username });
    if (userExists) {
      return res.status(409).json({ message: "Username already exists." });
    }
  
    // Insert the new user into the collection
    const newUser = { username, password };
    const result = await userCollection.insertOne(newUser);
    res.status(201).json({ message: "User registered successfully", userId: result.insertedId });

  // Delete user from Database using deleteOne
  // const deleteUser = await userCollection.deleteOne({username});
  // res.send(deleteUser + "Deleted success")
});

// Login request validation
app.post("/login", async (req: Request, res: Response) =>{
  await validateLogin(req, res);
});

// Register new user
app.post("/register", async (req: Request, res: Response) =>{
  await registerUser(req, res);
});

// Error Handling Middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});